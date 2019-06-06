import { Injectable } from "@angular/core";
import { Tag, Folder, Message, FolderType, InOut, ENTITIES_STRUCTURE, FluxPermission, PecPermission, Note, MessageTag, Utente, Azienda, MessageType } from "@bds/ng-internauta-model";
import { MenuItem } from "primeng/api";
import { Utils } from "src/app/utils/utils";
import { MessageFolderService } from "src/app/services/message-folder.service";
import { Subscription } from "rxjs";
import { MailFoldersService, FoldersAndTags } from "../mail-folders/mail-folders.service";
import { NtJwtLoginService, UtenteUtilities } from "@bds/nt-jwt-login";
import { BatchOperation, BatchOperationTypes } from "@nfa/next-sdr";
import { BaseUrls, BaseUrlType } from "src/environments/app-constants";
import { ShpeckMessageService } from "src/app/services/shpeck-message.service";
import { DialogService } from "primeng/api";
import { ReaddressComponent } from '../readdress/readdress.component';

@Injectable({
  providedIn: "root"
})
export class MailListService {

  public messages: Message[] = [];
  public folders: Folder[] = [];
  public tags: Tag[] = [];
  public trashFolder: Folder;
  public annotedTag: Tag;
  public selectedMessages: Message[] = [];
  public loggedUser: UtenteUtilities;

  private subscriptions: Subscription[] = [];


  constructor(
    private dialogService: DialogService,
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
    this.subscriptions.push(this.mailFoldersService.pecFoldersAndTags.subscribe((foldersAndTags: FoldersAndTags) => {
      if (!foldersAndTags) {
        this.folders = [];
        this.trashFolder = null;
        this.annotedTag = null;
      } else {
        this.folders = foldersAndTags.folders;
        this.tags = foldersAndTags.tags;
        this.trashFolder = this.folders.find(f => f.type === FolderType.TRASH);
        this.annotedTag = this.tags.find(t => t.name === "annotated");
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
      const azienda = this.loggedUser.getUtente().aziende.find(a => a.codice === codiceAzienda);
      registrationItems.push(
        {
          label: azienda.nome,
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
   * Questa funzione ritorna un booleano che indica se il messaggio selezionato è protocollabile.
   */
  public isRegisterActive(selectedFolder: Folder): boolean {
    if (this.selectedMessages.length !== 1 ||
      this.selectedMessages[0].inOut !== InOut.IN ||
      (this.selectedMessages[0].messageType !== MessageType.MAIL && this.selectedMessages[0].messageType !== MessageType.PEC) ||
      selectedFolder.type === "TRASH" ||
      (this.selectedMessages[0].messageTagList && this.selectedMessages[0].messageTagList
        .some(messageTag => messageTag.idTag.name === "readdressed_out" || messageTag.idTag.name === "registered"))) {
      return false;
    } else {
      return true;
    }
  }

  /**
   * Questa funzione si occupa di iniziare la protocollazione del messaggio selezionato.
   * @param event
   */
  public registerMessage(event, registrationType) {
    console.log(event, this.selectedMessages);
    console.log("loggedUser", this.loggedUser);
    const azienda: Azienda = this.loggedUser.getUtente().aziende.find(a => a.codice === event.item.queryParams.codiceAzienda);

    let decodedUrl = "";
    if (registrationType === "NEW") {
      decodedUrl = decodeURI(azienda.urlCommands["PROTOCOLLA_PEC_NEW"]); // mi dovrei fare le costanti
    } else if (registrationType === "ADD") {
      decodedUrl = decodeURI(azienda.urlCommands["PROTOCOLLA_PEC_ADD"]); // mi dovrei fare le costanti
    }
    decodedUrl = decodedUrl.replace("[id_pec]", this.selectedMessages[0].id.toString());

    console.log("command", decodedUrl);

    window.open(decodedUrl);
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

  /**
   * Salva la nota aggiunta ad un messaggio e aggiorna il tag associato
   * @param noteObj L'oggetto nota da salvare
   */
  public saveNoteAndUpdateTag(noteObj: Note) {
    const message: Message = new Message();
    message.id = this.selectedMessages[0].id;
    const batchOperations: BatchOperation[] = [];
    noteObj.idUtente = { id: this.loggedUser.getUtente().id } as Utente;
    noteObj.memo = noteObj.memo.trim();
    if (noteObj.id && noteObj.memo !== "") {
      batchOperations.push({
        id: noteObj.id,
        operation: BatchOperationTypes.UPDATE,
        entityPath:
          BaseUrls.get(BaseUrlType.Shpeck) + "/" + ENTITIES_STRUCTURE.shpeck.note.path,
        entityBody: noteObj,
        additionalData: null
      });
    } else if (noteObj.id && noteObj.memo === "") {
      batchOperations.push({
        id: noteObj.id,
        operation: BatchOperationTypes.DELETE,
        entityPath:
          BaseUrls.get(BaseUrlType.Shpeck) + "/" + ENTITIES_STRUCTURE.shpeck.note.path,
        entityBody: null,
        additionalData: null
      });
    } else if (noteObj.memo !== "") {
      noteObj.idMessage = message;
      batchOperations.push({
        id: null,
        operation: BatchOperationTypes.INSERT,
        entityPath:
          BaseUrls.get(BaseUrlType.Shpeck) + "/" + ENTITIES_STRUCTURE.shpeck.note.path,
        entityBody: noteObj,
        additionalData: null
      });
    }
    let messageTag: MessageTag = null;
    if (this.selectedMessages[0].messageTagList !== null) {
      messageTag = this.selectedMessages[0].messageTagList.find(mt => mt.idTag.name === "annotated");
    }
    const isAnnotedTagPresent = messageTag !== null && messageTag !== undefined;
    if (!isAnnotedTagPresent && noteObj.memo !== "") { // Insert
      batchOperations.push({
        id: null,
        operation: BatchOperationTypes.INSERT,
        entityPath:
          BaseUrls.get(BaseUrlType.Shpeck) + "/" + ENTITIES_STRUCTURE.shpeck.messagetag.path,
        entityBody: {
          idMessage: message,
          idUtente: { id: this.loggedUser.getUtente().id } as Utente,
          idTag: { id: this.annotedTag.id } as Tag
        } as MessageTag,
        additionalData: null
      });
    } else if (isAnnotedTagPresent && noteObj.memo === "") {  // Delete
      batchOperations.push({
        id: messageTag.id,
        operation: BatchOperationTypes.DELETE,
        entityPath:
          BaseUrls.get(BaseUrlType.Shpeck) +
          "/" +
          ENTITIES_STRUCTURE.shpeck.messagetag.path,
        entityBody: null,
        additionalData: null
      });
    }
    return this.messageService.batchHttpCall(batchOperations);
  }

  /**
   * Questa funzione si occupa di aprire la dialog per il reindirizzamento
   */
  public readdressMessage() {
    const ref = this.dialogService.open(ReaddressComponent, {
      data: {
        message: this.selectedMessages[0]
      },
      header: "Reindirizza",
      width: "auto",
      contentStyle: { }
    });
  }

  /**
   * Questa funzione ritorna un booleano che indica se i messaggi selezionati sono reindirizzabili.
   * @param selectedFolder 
   */
  public isReaddressActive(selectedFolder: Folder): boolean {
    if (this.selectedMessages.length !== 1 ||
      this.selectedMessages[0].inOut !== "IN" ||
      selectedFolder.type === "TRASH" ||
      (this.selectedMessages[0].messageTagList && this.selectedMessages[0].messageTagList
        .some(messageTag => messageTag.idTag.name === "readdressed_out" || messageTag.idTag.name === "registered"))) {
        return false;
    } else {
      return true;
    }
  }

}
