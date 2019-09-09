import { Injectable } from "@angular/core";
import { Tag, Folder, Message, FolderType, InOut, ENTITIES_STRUCTURE, FluxPermission, PecPermission, Note, MessageTag, Utente, Azienda, MessageType, MessageStatus, TagType, Pec, MessageFolder } from "@bds/ng-internauta-model";
import { MenuItem, MessageService } from "primeng/api";
import { Utils } from "src/app/utils/utils";
import { MessageFolderService } from "src/app/services/message-folder.service";
import { Subscription, Observable, BehaviorSubject } from "rxjs";
import { MailFoldersService, FoldersAndTags, PecFolderType, PecFolder } from "../mail-folders/mail-folders.service";
import { NtJwtLoginService, UtenteUtilities } from "@bds/nt-jwt-login";
import { BatchOperation, BatchOperationTypes, FILTER_TYPES, FiltersAndSorts, FilterDefinition } from "@nfa/next-sdr";
import { BaseUrls, BaseUrlType } from "src/environments/app-constants";
import { MessageEvent, ShpeckMessageService } from "src/app/services/shpeck-message.service";
import { DialogService } from "primeng/api";
import { ReaddressComponent } from "../readdress/readdress.component";
import { TagService } from "src/app/services/tag.service";

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
  private selectedTag: Tag = null;

  private _newTagInserted: BehaviorSubject<Tag> = new BehaviorSubject<Tag>(null);
  private messageEvent: MessageEvent;


  constructor(
    private dialogService: DialogService,
    private messagePrimeService: MessageService,
    private messageFolderService: MessageFolderService,
    private mailFoldersService: MailFoldersService,
    private loginService: NtJwtLoginService,
    private messageService: ShpeckMessageService,
    private tagService: TagService) {
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
    this.subscriptions.push(this.mailFoldersService.pecFolderSelected.subscribe((pecFolderSelected: PecFolder) => {
      if (pecFolderSelected) {
        if (pecFolderSelected.type === PecFolderType.TAG) {
          this.selectedTag = pecFolderSelected.data as Tag;
        } else {
          this.selectedTag = null;
        }
      }
    }));
    this.subscriptions.push(this.messageService.messageEvent.subscribe((messageEvent: MessageEvent) => {
      this.messageEvent = messageEvent;
    }));
  }

  public get newTagInserted(): Observable<Tag> {
    return this._newTagInserted.asObservable();
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
            case FolderType.SENT: // TODO BLABLA
              if (this.selectedMessages.some((message: Message) => message.inOut === InOut.IN)) {
                subElementDisabled = true;
              }
              break;
            case FolderType.REGISTERED: // posso spostare i messaggi nella cartella protocollati solo se tutti i messaggi selezionati hanno il tag "registered"
              if (this.selectedMessages.some( // se c'è almeno un messaggio che non ha nessun tag, oppure ha almeno un tag, ma non ha il tag "registered" la funzione "some" torna "true" e quindi disabilito la voce
                (message: Message) => (
                  !message.messageTagList || !message.messageTagList.find(
                    (messageTag: MessageTag) => messageTag.idTag.name === "registered")
                  )
                )) {
                subElementDisabled = true;
              }
              break;
          }
        }
        foldersSubCmItems.push(
          {
            label: f.description,
            title: f.description,
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
   * Questa funzione costruisce le voci di menu per i tag.
   * @param command La funzione che verrà chiamata al click sul singolo item
   * @returns di MenuItem
   */
  buildTagsMenuItems(command: (any) => any, newTag: (any) => any): MenuItem[] {
    const items: MenuItem[] = [];
    if (this.tags) {
      for (const tag of this.tags) {
        if (tag.type !== TagType.SYSTEM_NOT_INSERTABLE_DELETABLE &&
          tag.type !== TagType.SYSTEM_NOT_INSERTABLE_NOT_DELETABLE &&
          tag.visible && !tag.firstLevel) {
          let messagesWithTag: Message[] = [];
          messagesWithTag = this.filterMessagesWithTag(tag);
          const tagIconAndAction: TagIconAction = this.getTagIconAction(messagesWithTag);
          items.push({
            label: tag.description,
            styleClass: (tag.description && tag.description.length > 21) ? "d-inline-flex" : "",
            icon: tagIconAndAction.iconType,
            id: "MessageLabels",
            title: tagIconAndAction.title,
            disabled: false,
            queryParams: {
              tag: tag,
              order: tagIconAndAction.order
            },
            command: event => command(event)
          });
        }
      }
    }
    const firstItems = items.filter(el => el.queryParams.order === 1).sort((a, b) => a.label.toLowerCase() < b.label.toLowerCase() ? -1 : 1);
    firstItems.push({ separator: true });
    const secondItems = items.filter(el => el.queryParams.order === 2).sort((a, b) => a.label.toLowerCase() < b.label.toLowerCase() ? -1 : 1);
    secondItems.push({ separator: true });
    const thirdItems = items.filter(el => el.queryParams.order === 3).sort((a, b) => a.label.toLowerCase() < b.label.toLowerCase() ? -1 : 1);
    const finalItems: MenuItem[] = [{
      label: "<Nuova Etichetta>",
      icon: "fas new-tag",
      id: "MessageLabels",
      title: "Seleziona per creare una nuova etichetta e associarla al messaggio",
      disabled: false,
      queryParams: {
      },
      command: event => newTag(event)
    }];
    return finalItems.concat(firstItems).concat(secondItems).concat(thirdItems);
  }

  /**
   * Questa funzione filtra i messaggi selezionati che hanno il tag passato come parametro
   * @param tag Il tag per filtrare i messaggi
   * @returns L'array dei messaggi filtrati
   */
  private filterMessagesWithTag(tag: Tag): Message[] {
    return this.selectedMessages.filter(m => {
      if (m.messageTagList) {
        return m.messageTagList.find(mt =>
          mt.idTag.id === tag.id) !== undefined;
      }
    });
  }

  /**
   * Questa funzione confronta un array di messaggi con un tag specifico con i messaggi
   * selezionati per calcolare l'icona da mostrare di fianco al tag e l'operazione da effettuare
   * in caso di selezione di un tag dal menu.
   * @param messagesWithTag Array dei messaggi che hanno un tag specifico
   */
  private getTagIconAction(messagesWithTag: Message[]): TagIconAction {
    const tia: TagIconAction = { iconType: "" };
    switch (messagesWithTag.length) {
      case 0:                             // Nessun messaggio ha il tag
        tia.iconType = "fas no-tag";
        tia.operation = "INSERT";
        tia.title = "Etichetta non associata, seleziona per applicarla";
        tia.order = 3;
        break;
        case this.selectedMessages.length:  // Tutti i messaggi hanno il tag
        tia.iconType = "material-icons local-offer-icon color-green";
        tia.operation = "DELETE";
        tia.title = "Etichetta associata, seleziona per rimuoverla";
        tia.order = 1;
        break;
        default:                            // Almeno un messaggio ha il tag
        tia.iconType = "material-icons local-offer-icon color-yellow";
        tia.operation = "INSERT";
        tia.title = "Uno dei messaggi selezionati ha l'etichetta associata, seleziona per applicarla a tutti i selezionati";
        tia.order = 2;
        break;
    }
    return tia;
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
        .some(messageTag => messageTag.idTag.name === "readdressed_out" || messageTag.idTag.name === "registered")) ||
      this.loggedUser.getAziendeWithPermission(FluxPermission.REDIGE).length === 0
    ) {
      return false;
    } else {
      return true;
    }
  }

  public checkCurrentStatusAndRegister(exe: any): void {
    if (this.selectedMessages && this.selectedMessages.length === 1) {
      const filtersAndSorts: FiltersAndSorts = new FiltersAndSorts();
      filtersAndSorts.addFilter(new FilterDefinition("id", FILTER_TYPES.not_string.equals, this.selectedMessages[0].id));
      this.messageService
      .getData(
        ENTITIES_STRUCTURE.shpeck.message.customProjections.CustomMessageForMailList,
        filtersAndSorts,
        null,
        null
      )
      .subscribe(data => {
        if (data && data.results && data.results.length === 1) {
          const message =  (data.results[0] as Message);
          let registrable = true;
          if (message.messageTagList && message.messageTagList.length > 0) {
            registrable = !message.messageTagList.some(mt => mt.idTag.name === "registered" || mt.idTag.name === "in_registration");
          }
          if (registrable) {
            exe();
          } else {
            this.messagePrimeService.add(
              { severity: "error", summary: "Attenzione", detail: "Il messaggio risulta già protocollato. Si consiglia di aggiornare la pagina." });
          }
        }
      });
    }
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

  public isNewMailActive(idPec?: number, selectedPec?: Pec): boolean {
    idPec = idPec || this.selectedMessages[0].fk_idPec.id;
    if (selectedPec && selectedPec.attiva) {
      return this.loggedUser.hasPecPermission(idPec, PecPermission.RISPONDE) || this.loggedUser.hasPecPermission(idPec, PecPermission.ELIMINA);
    } else {
      return false;
    }
  }


  /**
   *Questa funzione si occupa di spostare i selectedMessages nel folder passato
   *@param idFolder di folder passato ( fk_idPreviousFolder )
   */
  public moveMessages(idFolder: number): void {
    if (idFolder && (typeof(idFolder) === "number" )) {
      const messagesFolder: MessageFolder[] = this.selectedMessages.map((message: Message) => {
        return message.messageFolderList[0];  // Basta prendere il primo elemente perché ogni messaggio può essere in una sola cartella
      });
      this.messageFolderService
        .moveMessagesToFolder(
          messagesFolder,
          idFolder,
          this.loggedUser.getUtente().id
        )
        .subscribe(res => {
          this.messages = Utils.arrayDiff(this.messages, this.selectedMessages);
          this.mailFoldersService.doReloadFolder(messagesFolder[0].fk_idFolder.id);
          this.mailFoldersService.doReloadFolder(idFolder);
        });
    }
  }


  /**
   * Questa funzione si occupa di spostare i selectedMessages nel cestino.
   * @param selectedMessages
   * @param loggedUser
   */
  public moveMessagesToTrash(): void {
    this.moveMessages(this.trashFolder.id);
  }

  public createAndApplyTag(tagName) {
    this.createTag(tagName).subscribe(
      (res: Tag) => {
        this._newTagInserted.next(res);
        // this.tags.push(res);
        this.toggleTag(res);
        this.messagePrimeService.add(
          { severity: "success", summary: "Successo", detail: "Etichetta creata e associata con successo." });
      }
    );
  }

  private createTag(tagName: string): Observable<Tag> {
    const newTag: Tag = new Tag();
    tagName = tagName.trim();
    newTag.name = tagName.replace(/\s+/, "_").toLowerCase();
    newTag.description = tagName;
    newTag.type = TagType.CUSTOM;
    newTag.idPec = { id: this.selectedMessages[0].fk_idPec.id } as Pec;
    newTag.visible = true;
    newTag.firstLevel = false;
    return this.tagService.postHttpCall(newTag);
  }

  /**
   * Questa funzione applica/rimuove il tag passato come parametro ai messaggi selezionati.
   * @param tag Il tag da applicare o rimuovere.
   */
  public toggleTag(tag: Tag, showMessage?: boolean) {
    const messageTagOperations: BatchOperation[] = [];
    let messagesWithTag = [];
    let idTag;  // Conterrà l'id del tag nella TagList della PEC per fare la reload nella callback
    messagesWithTag = this.filterMessagesWithTag(tag);
    const tagIconAndAction: TagIconAction = this.getTagIconAction(messagesWithTag);
    const mtp: MessageTagOp[] = [];
    let messaggioOperazione = "";
    if (tagIconAndAction.operation === "INSERT") {
      const messagesToInsert: Message[] = this.selectedMessages.filter(m => messagesWithTag.indexOf(m) === -1);
      messaggioOperazione = "associata";
      for (const message of messagesToInsert) {
        const mTagCall = this.buildMessageTagOperationInsert(message, tag.name);
        idTag = mTagCall.idTag;
        messageTagOperations.push(mTagCall.batchOp);
        mtp.push({ message: message, operation: "INSERT" });
      }
    } else {
      messaggioOperazione = "rimossa";
      for (const message of messagesWithTag) {
        const mTagCall = this.buildMessageTagOperationDelete(message, tag.name);
        idTag = mTagCall.idTag;
        messageTagOperations.push(mTagCall.batchOp);
        mtp.push({ message: message, operation: "DELETE", messageTag: mTagCall.mTag });
      }
    }
    if (messageTagOperations.length > 0) {
      this.messageService.batchHttpCall(messageTagOperations).subscribe((res: BatchOperation[]) => {
        this.updateMessageTagList(mtp, res);
        if (showMessage) {
          this.messagePrimeService.add(
            { severity: "success", summary: "Successo", detail: `Etichetta ${messaggioOperazione} con successo.` });
        }
      },
        err => console.log("error during the operation -> ", err));
    }
  }

  private buildMessageTagOperationInsert(message: Message, tagName: string) {
    const mTag: MessageTag = new MessageTag();
    mTag.idMessage = { id: message.id } as Message;
    mTag.idUtente = { id: this.loggedUser.getUtente().id } as Utente;
    mTag.idTag = { id: this.tags.find(tag => tag.name === tagName).id } as Tag;
    return {
      idTag: mTag.idTag.id,
      batchOp: {
      id: null,
      operation: BatchOperationTypes.INSERT,
      entityPath:
        BaseUrls.get(BaseUrlType.Shpeck) + "/" + ENTITIES_STRUCTURE.shpeck.messagetag.path,
      entityBody: mTag,
      additionalData: null,
      returnProjection: ENTITIES_STRUCTURE.shpeck.messagetag.standardProjections.MessageTagWithIdTagAndIdUtente
    }};
  }

  private buildMessageTagOperationDelete(message: Message, tagName: string) {
    const mTag: MessageTag = message.messageTagList.find(messageTag => messageTag.idTag.name === tagName);
    if (mTag) {
      return {
        idTag: mTag.idTag.id,
        batchOp: {
          id: mTag.id,
          operation: BatchOperationTypes.DELETE,
          entityPath:
            BaseUrls.get(BaseUrlType.Shpeck) + "/" + ENTITIES_STRUCTURE.shpeck.messagetag.path,
          entityBody: null,
          additionalData: null,
          returnProjection: null
        },
        mTag: mTag
      };
    }
  }

  /**
   * Questa funzione si occupa di settare i messaggi come visti o non visti.
   * @param menuItem
   */
  public setSeen(seen: boolean, reloadUnSeen: boolean = false): void {
    console.log("setseen messaggi: ", this.selectedMessages);
    const messagesToUpdate: BatchOperation[] = [];
    let messaggioDaInviare: Message = null;
    const selectedMessagesTemp = this.selectedMessages;
    this.selectedMessages.forEach((message: Message) => {
      if (message.seen !== seen) {
        messaggioDaInviare = new Message();
        messaggioDaInviare.seen = seen;
        messaggioDaInviare.id = message.id;
        messaggioDaInviare.version = message.version;
        messagesToUpdate.push({
          id: message.id,
          operation: BatchOperationTypes.UPDATE,
          entityPath:
            BaseUrls.get(BaseUrlType.Shpeck) +
            "/" +
            ENTITIES_STRUCTURE.shpeck.message.path,
          entityBody: messaggioDaInviare,
          additionalData: null,
          returnProjection: ENTITIES_STRUCTURE.shpeck.message.customProjections
          .CustomMessageForMailList
        });
      }
    });
    // const inFolder = this.folders.filter(folder => folder.type === "INBOX")[0].id;
    if (messagesToUpdate.length > 0) {
      this.messageService.batchHttpCall(messagesToUpdate).subscribe((messages) => {
        console.log(messages);
        // reload Folder
        if (reloadUnSeen) {
          const map: any = {};
          selectedMessagesTemp.forEach((message: Message) => {
            message.seen = seen;
            message.version = messages.find(m => m.id === message.id).entityBody.version;
            if (!map[message.messageFolderList[0].idFolder.id]) {
              this.mailFoldersService.doReloadFolder(message.messageFolderList[0].idFolder.id);
              map[message.messageFolderList[0].idFolder.id] = true;
            }
          });
        }
      });
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
        const mTagCall = this.buildMessageTagOperationInsert(message, "in_error");
        idTag = mTagCall.idTag;
        messageTagOperations.push(mTagCall.batchOp);
        mtp.push({ message: message, operation: "INSERT" });
      } else if (message.messageTagList && message.messageTagList.length > 0) {
        const mTagCall = this.buildMessageTagOperationDelete(message, "in_error");
        idTag = mTagCall.idTag;
        messageTagOperations.push(mTagCall.batchOp);
        mtp.push({ message: message, operation: "DELETE", messageTag: mTagCall.mTag });
      }
    }
    if (messageTagOperations.length > 0) {
      this.messageService.batchHttpCall(messageTagOperations).subscribe((res: BatchOperation[]) => {
        this.mailFoldersService.doReloadTag(idTag);
        this.updateMessageTagList(mtp, res);
      },
        err => console.log("error during the operation -> ", err));
    }
  }

  /**
   * Aggiungiamo o rimuoviamo il tag in base all'operazione ad ogni messaggio precedentemente selezionato.
   * Aggiorna la visibilità delle icone. Toglie il messaggio dalla lista nel caso stessimo filtrando per tag.
   * @param mTagOp Array delle operazioni fatte sui messaggi
   * @param result Il risultato della chiamata al backend che contiene le entità aggiornate
   */
  private updateMessageTagList(mTagOp: MessageTagOp[], result: BatchOperation[]) {
    mTagOp.forEach((item) => {
      if (item.operation === "INSERT" && result) {
        const messageTagToPush: MessageTag =
        result.find(bo => (bo.entityBody as MessageTag).fk_idMessage.id === item.message.id).entityBody as MessageTag;
        if (!item.message.messageTagList) {
          item.message.messageTagList = [];
        }
        item.message.messageTagList.push(messageTagToPush);
        this.setIconsVisibility(item.message);
      } else if (item.operation === "DELETE" && result) {
        item.message.messageTagList.splice(item.message.messageTagList.indexOf(item.messageTag), 1);
        this.setIconsVisibility(item.message);

        if (this.selectedTag && this.selectedTag.id === item.messageTag.fk_idTag.id) {
          this.messages.splice(this.messages.indexOf(this.messages.find(m => m.id === item.messageTag.fk_idMessage.id)), 1);
        }
      }
    });
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
   * Apre l'url di archiviazione su Babel
   * @param event
   */
  public archiveMessage(event: any) {
    console.log("event", event);
    if (this.selectedMessages && this.selectedMessages.length === 1 && event && event.item && event.item) {
      const azienda: Azienda = this.loggedUser.getUtente().aziende.find(a => a.codice === event.item.queryParams.codiceAzienda);
      let decodedUrl = "";
      decodedUrl = decodeURI(azienda.urlCommands["ARCHIVE_MESSAGE"]);
      decodedUrl = decodedUrl.replace("[id_message]", this.selectedMessages[0].id.toString());
      decodedUrl = decodedUrl.replace("[richiesta]", Utils.genereateGuid());
      console.log("command", decodedUrl);
      window.open(decodedUrl);
    }
  }

  /**
    * Questo metodo si occupa di construire un menu che contenga le aziende passate come items.
    * Le aziende non associate alla pec passata (selectedPec) avranno un messaggio d'avviso.
    * @param codiciAziende
    * @param selectedPec
    * @param idCommand
    * @param command
    */
  public buildAziendeMenuItems(codiciAziende: string[], selectedPec: Pec, idCommand: string, command: (any) => any): MenuItem[] {
    const aziendeMenuItems = [];
    codiciAziende.forEach(codiceAzienda => {
      const azienda = this.loggedUser.getUtente().aziende.find(a => a.codice === codiceAzienda);
      let pIspecDellAzienda = true;
      let pIcon = "";
      let pTitle = "";
      if (!selectedPec.pecAziendaList.find(pecAzienda => pecAzienda.fk_idAzienda.id === azienda.id)) {
        pIspecDellAzienda = false;
        pIcon = "pi pi-question-circle";
        pTitle = "L'azienda non è associata alla casella del messaggio selezionato.";
      }
      aziendeMenuItems.push(
        {
          label: azienda.nome,
          icon: pIcon,
          id: idCommand,
          title: pTitle,
          disabled: false,
          queryParams: {
            codiceAzienda: codiceAzienda,
            isPecDellAzienda: pIspecDellAzienda,
          },
          command: event => command(event)
        }
      );
    });
    return aziendeMenuItems;
  }

  /**
   * Questa funzione si occupa di creare un MenuItem[] che contenga come items la
   * lista delle aziende su cui l'utente loggato ha il permesso redige per la funzione protocolla Pec.
   * @param command
   */
  public buildRegistrationMenuItems(selectedPec: Pec, command: (any) => any): MenuItem[] {
    return this.buildAziendeMenuItems(
      this.loggedUser.getAziendeWithPermission(FluxPermission.REDIGE),
      selectedPec,
      "MessageRegistration",
      command
    );
  }

  /**
   * Questa funzione si occupa di creare un MenuItem[] che contenga come items la
   * lista delle aziende dell'utente loggato .
   * @param command
   */
  public buildAziendeUtenteMenuItems(selectedPec: Pec, command: (any) => any): MenuItem[] {
    return this.buildAziendeMenuItems(
      this.loggedUser.getUtente()["aziende"].map(a => a.codice),
      selectedPec,
      "MessageArchive",
      command
    );
  }

  /**
   * Questa funzione ritorna un booleano che indica se il messaggio selezionato è reindirizzabile.
   */
  public isReaddressActive(specificMessage?: Message): boolean {
    const message: Message = specificMessage ? specificMessage : this.selectedMessages[0];
    if (
      (!specificMessage && this.selectedMessages.length !== 1) ||
      message.inOut !== "IN" ||
      message.messageFolderList[0].idFolder.type === FolderType.TRASH ||
      (message.messageTagList && message.messageTagList.some(messageTag =>
            messageTag.idTag.name === "readdressed_out" ||
            messageTag.idTag.name === "registered" ||
            messageTag.idTag.name === "in_registration"
        ))
    ) {
      return false;
    } else {
      return true;
    }
  }

  /**
   * Questa funzione ritorna un booleano che indica se il messaggio selezionato è archiviabile.
   */
  public isArchiveActive(specificMessage?: Message): boolean {
    const message: Message = specificMessage ? specificMessage : this.selectedMessages[0];
    if ((!specificMessage && this.selectedMessages.length !== 1) ||
      message.messageFolderList[0].idFolder.type === FolderType.TRASH) {
      return false;
    } else {
      return true;
    }
  }

    /**
   *
   * Questa funzione ritorna un booleano che indica se i messaggi selezionati sono ripristinabili.
   */
  public isUndeleteActive(specificMessage?: Message): boolean {
    const message: Message = specificMessage ? specificMessage : this.selectedMessages[0];
    if ( (this.selectedMessages.length === 1) && message.messageFolderList[0].idFolder.type === FolderType.TRASH ) {
      return true;
    } else {
      return false;
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

interface TagIconAction {
  iconType: string;                   // L'icona da mostrare in corrispondenza del tag
  operation?: "INSERT" | "DELETE";    // Viene utilizzato in fase di applicazione/rimozione del tag
  title?: string;
  order?: number;
}
