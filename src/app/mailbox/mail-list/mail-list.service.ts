import { Injectable } from "@angular/core";
import { Tag, Folder, Message, FolderType, InOut, ENTITIES_STRUCTURE, FluxPermission, PecPermission, Note, MessageTag, Utente, Azienda, MessageType, MessageStatus } from "@bds/ng-internauta-model";
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
import { ReaddressComponent } from "../readdress/readdress.component";

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
        if (this.folders) {
          this.trashFolder = this.folders.find(f => f.type === FolderType.TRASH);
        }
        if (this.tags) {
          this.annotedTag = this.tags.find(t => t.name === "annotated");
        }
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

  /*
   * Questa funzione ritorna un booleano che indica se il messaggio selezionato è protocollabile.
   */
  public isRegisterActive(specificMessage?: Message): boolean {
    const message: Message = specificMessage ? specificMessage : this.selectedMessages[0];
    if ((!specificMessage && this.selectedMessages.length !== 1) ||
      message.inOut !== InOut.IN ||
      (message.messageType !== MessageType.MAIL && message.messageType !== MessageType.PEC) ||
      message.messageFolderList[0].idFolder.type === "TRASH" ||
      (message.messageTagList && message.messageTagList
        .some(messageTag => messageTag.idTag.name === "readdressed_out" || messageTag.idTag.name === "registered"))) {
      return false;
    } else {
      return true;
    }
  }

  /**
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
          additionalData: null,
          returnProjection: null
        });
      }
    });
    if (messagesToUpdate.length > 0) {
      this.messageService.batchHttpCall(messagesToUpdate).subscribe();
    }
  }

  /**
   * Questa funzione si occupa di aggiungere o rimuovere il tag in Errore ad uno o più messaggi
   * @param toInsert Boolean per aggiungere il tag Errore (true) o toglierlo (false)
  */
  public toggleError(toInsert: boolean): void {
    const messageTagOperations: BatchOperation[] = [];
    const mtp: MessageTagOp[] = [];
    let idTag;  // Conterrà l'id del tag nella TagList della PEC per fare la reload nella callback
    for (const message of this.selectedMessages) {
      if (toInsert) {
        const mTag: MessageTag = new MessageTag();
        mTag.idMessage = message;
        mTag.idUtente = { id: this.loggedUser.getUtente().id } as Utente;
        mTag.idTag = this.tags.find(tag => tag.name === "in_error");
        idTag = mTag.idTag.id;
        mtp.push({ message: message, operation: "INSERT" });
        messageTagOperations.push({
          id: null,
          operation: BatchOperationTypes.INSERT,
          entityPath:
            BaseUrls.get(BaseUrlType.Shpeck) + "/" + ENTITIES_STRUCTURE.shpeck.messagetag.path,
          entityBody: mTag,
          additionalData: null,
          returnProjection: ENTITIES_STRUCTURE.shpeck.messagetag.standardProjections.MessageTagWithIdTagAndIdUtente
        });
      } else if (message.messageTagList && message.messageTagList.length > 0) {
        const mTag: MessageTag = message.messageTagList.find(messageTag => messageTag.idTag.name === "in_error");
        if (mTag) {
          idTag = mTag.idTag.id;
          mtp.push({ message: message, operation: "DELETE", messageTag: mTag });
          messageTagOperations.push({
            id: mTag.id,
            operation: BatchOperationTypes.DELETE,
            entityPath:
              BaseUrls.get(BaseUrlType.Shpeck) + "/" + ENTITIES_STRUCTURE.shpeck.messagetag.path,
            entityBody: null,
            additionalData: null,
            returnProjection: null
          });
        }
      }
    }
    if (messageTagOperations.length > 0) {
      this.messageService.batchHttpCall(messageTagOperations).subscribe((res: BatchOperation[]) => {
        this.mailFoldersService.doReloadTag(idTag);
        /* Aggiungiamo o rimuoviamo il tag in base all'operazione ad ogni
         * messaggio precedentemente selezionato */
        mtp.forEach((item) => {
          if (item.operation === "INSERT" && res) {
            const messageTagToPush: MessageTag =
              res.find(bo => (bo.entityBody as MessageTag).fk_idMessage.id === item.message.id).entityBody as MessageTag;
            if (!item.message.messageTagList) {
              item.message.messageTagList = [];
            }
            item.message.messageTagList.push(messageTagToPush);
            this.setIconsVisibility(item.message);
          } else if (item.operation === "DELETE" && res) {
            item.message.messageTagList.splice(item.message.messageTagList.indexOf(item.messageTag), 1);
            this.setIconsVisibility(item.message);
          }
        });
      },
      err => console.log("error during the operation -> ", err));
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
        additionalData: null,
        returnProjection: null
      });
    } else if (noteObj.id && noteObj.memo === "") {
      batchOperations.push({
        id: noteObj.id,
        operation: BatchOperationTypes.DELETE,
        entityPath:
          BaseUrls.get(BaseUrlType.Shpeck) + "/" + ENTITIES_STRUCTURE.shpeck.note.path,
        entityBody: null,
        additionalData: null,
        returnProjection: null
      });
    } else if (noteObj.memo !== "") {
      noteObj.idMessage = message;
      batchOperations.push({
        id: null,
        operation: BatchOperationTypes.INSERT,
        entityPath:
          BaseUrls.get(BaseUrlType.Shpeck) + "/" + ENTITIES_STRUCTURE.shpeck.note.path,
        entityBody: noteObj,
        additionalData: null,
        returnProjection: null
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
        additionalData: null,
        returnProjection: null
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
        additionalData: null,
        returnProjection: null
      });
    }
    return this.messageService.batchHttpCall(batchOperations);
  }

  /**
   * Questa funzione si occupa di aprire la dialog per il reindirizzamento
   */
  public readdressMessage(message?: Message) {
    const ref = this.dialogService.open(ReaddressComponent, {
      data: {
        message: message ? message : this.selectedMessages[0]
      },
      header: "Reindirizza",
      width: "auto",
      contentStyle: {}
    });
  }

  /**
   * Questa funzione ritorna un booleano che indica se i messaggi selezionati sono reindirizzabili.
   */
  public isReaddressActive(specificMessage?: Message): boolean {
    const message: Message = specificMessage ? specificMessage : this.selectedMessages[0];
    if ((!specificMessage && this.selectedMessages.length !== 1) ||
      message.inOut !== "IN" ||
      message.messageFolderList[0].idFolder.type === "TRASH" ||
      (message.messageTagList && message.messageTagList
        .some(messageTag => messageTag.idTag.name === "readdressed_out" || messageTag.idTag.name === "registered"))) {
      return false;
    } else {
      return true;
    }
  }
  /**
   * Abilita/Disabilita il pulsante ToggleError.
   * Viene disabilitato e ritorna TRUE se il messaggio non è in errore e se il tag è già presente.
   * @param toggleTrue Boolean per indicare il caso in cui si deve aggiungere il tag
   */
  public isToggleErrorDisabled(toggleTrue: boolean): boolean {
    return this.selectedMessages.some(mess => {
      if (mess.messageStatus === MessageStatus.ERROR) {
        if (mess.messageTagList) {
          return mess.messageTagList.find(messageTag => messageTag.idTag.name === "in_error") !== undefined;
        } else {
          return false;
        }
      } else {
        // Se il messaggio non è in errore ritorna TRUE per il caso di aggiunta e FALSE
        // per l'altro caso in quanto il metodo viene usato con la negazione
        return toggleTrue ? true : false;
      }
    });
  }

  public setIconsVisibility(message: Message) {
    message["iconsVisibility"] = [];
    if (message.messageTagList && message.messageTagList.length > 0) {
      message.messageTagList.forEach((messageTag: MessageTag) => {
        message["iconsVisibility"][messageTag.idTag.name] = true;
      });
    }
  }
}

interface MessageTagOp {
  message: Message;
  operation: "INSERT" | "DELETE";
  messageTag?: MessageTag;
}