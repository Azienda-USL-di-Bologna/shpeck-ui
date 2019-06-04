import { Injectable } from "@angular/core";
import { Folder, Message, FolderType, InOut, ENTITIES_STRUCTURE, FluxPermission, PecPermission } from "@bds/ng-internauta-model";
import { MenuItem } from "primeng/api";
import { Utils } from "src/app/utils/utils";
import { MessageFolderService } from "src/app/services/message-folder.service";
import { Subscription } from "rxjs";
import { MailFoldersService } from "../mail-folders/mail-folders.service";
import { NtJwtLoginService, UtenteUtilities } from "@bds/nt-jwt-login";
import { BatchOperation, BatchOperationTypes } from "@nfa/next-sdr";
import { BaseUrls, BaseUrlType } from "src/environments/app-constants";
import { ShpeckMessageService } from "src/app/services/shpeck-message.service";

@Injectable({
  providedIn: "root"
})
export class MailListService {

  public messages: Message[] = [];
  public folders: Folder[] = [];
  public trashFolder: Folder;
  public selectedMessages: Message[] = [];
  public loggedUser: UtenteUtilities;

  private subscriptions: Subscription[] = [];


  constructor(
    private messageFolderService: MessageFolderService,
    private mailFoldersService: MailFoldersService,
    private loginService: NtJwtLoginService,
    private messageService: ShpeckMessageService) {
    this.subscriptions.push(this.loginService.loggedUser$.subscribe((utente: UtenteUtilities) => {
      if (utente) {
        if (!this.loggedUser || utente.getUtente().id !== this.loggedUser.getUtente().id) {
          this.loggedUser = utente;
        }
      }
    }));
    this.subscriptions.push(this.mailFoldersService.pecFolders.subscribe((folders: Folder[]) => {
      if (!folders) {
        this.folders = [];
        this.trashFolder = null;
      } else {
        this.folders = folders;
        this.trashFolder = this.folders.find(f => f.type === FolderType.TRASH);
      }
    }));
  }


  /**
   * Questa funzione si occupa di creare un MenuItem[] che contenga come items le folders passate.
   * Inoltre in base al selectedFolder e ai selectedMessages i vari items saranno abilitati o meno.
   * @param folders
   * @param selectedFolder
   * @param selectedMessages
   * @param command // La funzione che verrà chiamata al click sul singolo item.
   */
  public buildMoveMenuItems(folders: Folder[], selectedFolder: Folder, command: (any) => any): MenuItem[] {
    const foldersSubCmItems = [];
    folders.forEach(f => {
      if (f.type !== FolderType.DRAFT && f.type !== FolderType.OUTBOX && f.type !== FolderType.TRASH) {
        let subElementDisabled = false;
        if (selectedFolder && f.id === selectedFolder.id) {
          subElementDisabled = true;
        } else if (selectedFolder && this.selectedMessages && this.selectedMessages.length === 1 &&
          this.selectedMessages[0].messageFolderList && this.selectedMessages[0].messageFolderList[0].idFolder.id === f.id) {
          subElementDisabled = true;
        } else {
          switch (f.type) {
            case FolderType.INBOX:
              if (this.selectedMessages.some((message: Message) => message.inOut === InOut.OUT)) {
                subElementDisabled = true;
              }
              break;
            case "SENT": // TODO BLABLA
              if (this.selectedMessages.some((message: Message) => message.inOut === InOut.IN)) {
                subElementDisabled = true;
              }
              break;
          }
        }
        foldersSubCmItems.push(
          {
            label: f.description,
            id: "MessageMove",
            disabled: subElementDisabled,
            queryParams: {
              folder: f
            },
            command: event => command(event)
          }
        );
      }
    });
    return foldersSubCmItems;
  }


  /**
   * Questa funzione si occupa di creare un MenuItem[] che contenga come items la
   * lista delle aziende su cui l'utente loggato ha il permesso redige.
   * @param command
   */
  public buildRegistrationMenuItems(command: (any) => any): MenuItem[] {
    const registrationItems = [];
    this.loggedUser.getAziendeWithPermission(FluxPermission.REDIGE).forEach(codiceAzienda => {
      registrationItems.push(
        {
          label: codiceAzienda,
          id: "MessageRegistration",
          disabled: false,
          queryParams: {
            codiceAzienda: codiceAzienda
          },
          command: event => command(event)
        }
      );
    });
    return registrationItems;
  }

  /**
   * Questa funzione si occupa di iniziare la protocollazione del messaggio selezionato.
   * @param event
   */
  public registerMessage(event) {
    console.log(event, this.selectedMessages);
    // window.open("www.google.it");
  }

  /**
   * Questa funzione ritorna un booleano che indica se i messaggi selezionati sono spostabili.
   */
  public isMoveActive(): boolean {
    if (!this.selectedMessages || this.selectedMessages.length === 0) {
      return false;
    } else {
      return !this.selectedMessages.some((message: Message) => !message.messageFolderList || message.messageFolderList[0].idFolder.type === FolderType.TRASH);
    }
  }


  /**
   * Questa funzione ritorna un booleano che indica se i messaggi selezionati sono cancellabili (spostabili nel cestino).
   */
  public isDeleteActive(): boolean {
    return this.isMoveActive() && this.loggedUser.hasPecPermission(this.selectedMessages[0].fk_idPec.id, PecPermission.ELIMINA);
  }


  /**
   * Questa funzione si occupa di spostare i selectedMessages nel folder passato.
   * @param folder
   * @param selectedMessages
   * @param loggedUser
   */
  public moveMessages(folder: Folder): void {
    if (folder && folder.id) {
      this.messageFolderService
        .moveMessagesToFolder(
          this.selectedMessages.map((message: Message) => {
            return message.messageFolderList[0];  // Basta prendere il primo elemente perché ogni messaggio può essere in una sola cartella
          }),
          folder.id,
          this.loggedUser.getUtente().id
        )
        .subscribe(res => {
          this.messages = Utils.arrayDiff(this.messages, this.selectedMessages);
        });
    }
  }


  /**
   * Questa funzione si occupa di spostare i selectedMessages nel cestino.
   * @param selectedMessages
   * @param loggedUser
   */
  public moveMessagesToTrash(): void {
    this.moveMessages(this.trashFolder);
  }


  /**
   * Questa funzione si occupa di settare i messaggi come visti o non visti.
   * @param menuItem
   */
  public setSeen(seen: boolean): void {
    const messagesToUpdate: BatchOperation[] = [];
    this.selectedMessages.forEach((message: Message) => {
      if (message.seen !== seen) {
        message.seen = seen;
        messagesToUpdate.push({
          id: message.id,
          operation: BatchOperationTypes.UPDATE,
          entityPath:
            BaseUrls.get(BaseUrlType.Shpeck) +
            "/" +
            ENTITIES_STRUCTURE.shpeck.message.path,
          entityBody: message,
          additionalData: null
        });
      }
    });
    if (messagesToUpdate.length > 0) {
      this.messageService.batchHttpCall(messagesToUpdate).subscribe();
    }
  }
}
