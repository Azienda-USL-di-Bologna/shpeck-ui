import { Injectable } from "@angular/core";
import { Tag, Folder, Message, FolderType, InOut, ENTITIES_STRUCTURE, FluxPermission, PecPermission, Note, MessageTag,
  Utente, Azienda, MessageType, MessageStatus, TagType, Pec, MessageFolder, AddresRoleType, MessageAddress, getInternautaUrl, BaseUrlType, BaseUrls, ItemMenu, CommandType, MessageWithFolderViewService, MessageWithTagViewService, ConfigurazioneService, ParametroAziende } from "@bds/internauta-model";
import { ConfirmationService, MenuItem, MessageService } from "primeng/api";
import { Utils } from "src/app/utils/utils";
import { MessageFolderService } from "src/app/services/message-folder.service";
import { Subscription, Observable, BehaviorSubject, Subject } from "rxjs";
import { MailFoldersService, FoldersAndTags, PecFolderType, PecFolder } from "../mail-folders/mail-folders.service";
import { JwtLoginService, UtenteUtilities } from "@bds/jwt-login";
import { BatchOperation, BatchOperationTypes, FILTER_TYPES, FiltersAndSorts, FilterDefinition, SORT_MODES, AdditionalDataDefinition, SortDefinition, NextSDREntityProvider } from "@bds/next-sdr";
import { CUSTOM_SERVER_METHODS } from "src/environments/app-constants";
import { MessageEvent, ShpeckMessageService } from "src/app/services/shpeck-message.service";
import { ReaddressComponent } from "../readdress/readdress.component";
import { TagService } from "src/app/services/tag.service";
import { MailboxService, TotalMessageNumberDescriptor, Sorting } from "../mailbox.service";
import { HttpClient } from "@angular/common/http";
import { DialogService } from "primeng/dynamicdialog";
import { find } from "rxjs/operators";

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
  public loggedUserCanDelete: boolean = false;

  public sorting: Sorting = {
    field: "receiveTime",
    sortMode: SORT_MODES.desc
  };
  public selectedProjection: string =
    ENTITIES_STRUCTURE.shpeck.message.customProjections
      .CustomMessageForMailList;

  public dynamicPrjectionForLoadData: string = this.selectedProjection;
  public dynamicServiceForLoadData: NextSDREntityProvider;

  private subscriptions: Subscription[] = [];
  private selectedTag: Tag = null;

  private _newTagInserted$: BehaviorSubject<Tag> = new BehaviorSubject<Tag>(null);
  private messageEvent: MessageEvent;
  private idPec: number;
  public totalRecords: number = 0;
  private pecFolderSelected: PecFolder;
  public displayArchivioRicerca: boolean = false;
  public idAziendaFascicolazione: number;


  constructor(
    private dialogService: DialogService,
    private messagePrimeService: MessageService,
    private messageFolderService: MessageFolderService,
    private mailFoldersService: MailFoldersService,
    private loginService: JwtLoginService,
    private messageService: ShpeckMessageService,
    private messageWithFolderViewService: MessageWithFolderViewService,
    private messageWithTagViewService: MessageWithTagViewService,
    private mailboxService: MailboxService,
    private tagService: TagService,
    private httpClient: HttpClient,
    private confirmationService: ConfirmationService,
    private configurazioneService: ConfigurazioneService ) {
    this.subscriptions.push(this.loginService.loggedUser$.subscribe((utente: UtenteUtilities) => {
      if (utente) {
        if (!this.loggedUser || utente.getUtente().id !== this.loggedUser.getUtente().id) {
          this.loggedUser = utente;
          this.loggedUserCanDelete = this.loggedUserHasPermission(PecPermission.ELIMINA);
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
          this.idPec = this.folders[0].idPec.id;
          this.loggedUserCanDelete = this.loggedUserHasPermission(PecPermission.ELIMINA);
        }
        if (this.tags) {
          this.annotedTag = this.tags.find(t => t.name === "annotated");
        }
      }
    }));
    this.subscriptions.push(this.mailFoldersService.pecFolderSelected.subscribe((pecFolderSelected: PecFolder) => {
      if (pecFolderSelected) {
        this.pecFolderSelected = pecFolderSelected;
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
    return this._newTagInserted$.asObservable();
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
      if (f.type !== FolderType.DRAFT && f.type !== FolderType.OUTBOX && f.type !== FolderType.TRASH && f.name !== "in_error") {
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
    return this.selectedMessages.filter((m: Message) => {
      if (m.messageTagList) {
        return m.messageTagList.find(mt =>
          mt.idTag.id === tag.id) !== undefined;
      }
      return false;
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
/*   public isRegisterActive(specificMessage?: Message): boolean {
    const message: Message = specificMessage ? specificMessage : this.selectedMessages[0];
    if ((!specificMessage && this.selectedMessages.length !== 1) ||
      message.inOut !== InOut.IN ||
      (message.messageType !== MessageType.MAIL && message.messageType !== MessageType.PEC) ||
      message.messageFolderList[0].idFolder.type === "TRASH" ||
      (message.messageTagList && message.messageTagList
        .some(messageTag => messageTag.idTag.name === "readdressed_out" || messageTag.idTag.name === "registered" || messageTag.idTag.name === "in_registration")) ||
      this.loggedUser.getAziendeWithPermission(FluxPermission.REDIGE).length === 0
    ) {
      return false;
    } else {
      return true;
    }
  } */

  // il messaggio è protocollabile se non è già stato protocollato in tutte le aziende
  public isRegisterActive(message: Message, codiceAzienda?: string): boolean {
    if (!message ||
      message.inOut !== InOut.IN ||
      message.messageType !== MessageType.MAIL ||
      (message.messageFolderList && message.messageFolderList[0] && message.messageFolderList[0].idFolder.type === "TRASH") ||
      (message.messageTagList && message.messageTagList
        .some(messageTag => messageTag.idTag.name === "readdressed_out"))) {
      return false;
    } else {
      const aziendeProtocollabili = this.getCodiciMieAziendeProtocollabili(message);
      if (aziendeProtocollabili.length === 0) {
        return false;
      } else { // se ho aziende protocollabil
        if (codiceAzienda) { // se ho passato l'azienda vado a vedere se è tra le aziende protocollabili
          return aziendeProtocollabili.some(e => e === codiceAzienda);
        } else { // se non ho passato un codice azienda è protocollabile
          return true;
        }
      }
    }
  }

  /**
   * Questa funzione torna una stringa direttamente mostrabile all'utente.
   * La scritta informa sul perché il messaggio passato non è protocollabile.
   */
  public getInfoPercheNonRegistrabile(message: Message): string {
    if (!message) {
      return "Nessun messaggio selezionato";
    }
    if (message.inOut !== InOut.IN) {
      return "Messaggio in uscita non protocollabile";
    }
    if (message.messageType !== MessageType.MAIL) {
      return "Tipo di messaggio non protocollabile";
    }
    if (message.messageFolderList && message.messageFolderList[0] && message.messageFolderList[0].idFolder.type === "TRASH") {
      return "Messaggio nel cestino, non protocollabile";
    }
    if (message.messageTagList && message.messageTagList.some(messageTag => messageTag.idTag.name === "readdressed_out")) {
      return "Messaggio reindirizzato, non protocollabile";
    }
    const aziendeProtocollabili = this.getCodiciMieAziendeProtocollabili(message);
    //message.messageTagList.some(messageTag => messageTag.idTag.name === "registered");
    if (aziendeProtocollabili.length === 0 && (message.messageTagList && message.messageTagList.some(messageTag => messageTag.idTag.name === "registered"))) {
      return "Questo messaggio già protocollato";
    }
    else {
      return "Messaggio non protocollabile";
    }
    return "";
  }

  /**
   * Ricarica il messaggio assicurandosi che non sia già registrato.
   * Se non lo è lancia la funzione passata in ingresso che si deve occupare di far partire la regisdtrazione
   * @param exe 
   * @param codiceAzienda 
   */
  public checkCurrentStatusAndRegister(exe: any, codiceAzienda: string): void {
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
          if (this.isRegisterActive(message, codiceAzienda)) {
            exe();
          } else {
            this.messagePrimeService.add(
              { key: "c", severity: "warn", sticky: true, summary: "Attenzione", detail: "Il messaggio risulta già protocollato. Si consiglia di aggiornare la pagina." });
          }
        }
      });
    }
  }

  /* public checkCurrentStatusAndRegister(exe: any): void {
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
  } */

  /**
   * Questa funzione ritorna un booleano che indica se i messaggi selezionati sono spostabili.
   */
  public isMoveActive(): boolean {
    if (!this.selectedMessages || this.selectedMessages.length === 0) {
      return false;
    } else {
      return !this.selectedMessages.some((message: Message) => !message.messageFolderList || (message.messageFolderList && message.messageFolderList[0] && message.messageFolderList[0].idFolder.type === FolderType.TRASH));
    }
  }


  public loggedUserHasPermission(permission: PecPermission): boolean {
    return this.loggedUser.hasPecPermission(this.idPec, permission);
  }


  /**
   * Questa funzione ritorna un booleano che indica se i messaggi selezionati sono cancellabili (spostabili nel cestino).
   */
  public isDeleteActive(): boolean {
    // return this.isMoveActive() && this.loggedUser.hasPecPermission(this.selectedMessages[0].fk_idPec.id, PecPermission.ELIMINA);
    return !this.selectedMessages.some((message: Message) => !message.messageFolderList) && this.selectedMessages && this.selectedMessages.length > 0 && this.loggedUserHasPermission(PecPermission.ELIMINA);
  }

  public isNewMailActive(selectedPec?: Pec, isDraft = false): boolean {
    if ((selectedPec && selectedPec.attiva) || isDraft) {
      if (selectedPec) {
        this.idPec = selectedPec.id;
      }
      return this.loggedUserHasPermission(PecPermission.RISPONDE) || this.loggedUserHasPermission(PecPermission.ELIMINA);
    } else {
      return false;
    }
  }


  /**
   * Questa funzione si occupa di spostare i selectedMessages nel folder passato
   * @param idFolder di folder passato ( fk_idPreviousFolder )
   */
  public moveMessages(idFolder: number): void {
    if (idFolder && (typeof (idFolder) === "number")) {
      const numberOfSelectedMessages: number = this.selectedMessages.length;
      console.log("dentro move message:", this.selectedMessages[0].messageFolderList);
      const messagesFolder: MessageFolder[] = this.selectedMessages.map((message: Message) => {
        return message.messageFolderList[0];  // Basta prendere il primo elemente perché ogni messaggio può essere in una sola cartella
      });
        this.messageFolderService
          .moveMessagesToFolder(
            messagesFolder,
            idFolder,
            this.loggedUser.getUtente().id
          ).subscribe(
            res => {
              if (this.pecFolderSelected.type === PecFolderType.FOLDER) {
                this.messages = Utils.arrayDiff(this.messages, this.selectedMessages, "id");
                this.mailFoldersService.doReloadFolder(messagesFolder[0].fk_idFolder.id);
                this.mailFoldersService.doReloadFolder(idFolder);
                this.selectedMessages = [];
                this.messageService.manageMessageEvent(
                  null,
                  null,
                  this.selectedMessages
                );
                this.refreshAndSendTotalMessagesNumber(numberOfSelectedMessages);
              } else {
                const filter: FiltersAndSorts = new FiltersAndSorts();
                this.selectedMessages.forEach(m => {
                  const filterDefinition = new FilterDefinition("id", FILTER_TYPES.not_string.equals, m.id);
                  filter.addFilter(filterDefinition);
                });
                this.messageService.getData(this.selectedProjection, filter, null, null).subscribe((data: any) => {
                  (data.results as Message[]).forEach(reloadedMessage => {
                    this.messages = [...this.messages];
                    const messageIndex = this.messages.findIndex(m => m.id === reloadedMessage.id);
                    if (messageIndex >= 0) {
                      this.setMailTagVisibility([reloadedMessage]);
                      this.mailFoldersService.doReloadTag(this.tags.find(t => t.name === "in_error").id);
                      this.messages.splice(messageIndex, 1, reloadedMessage);
                    }
                    this.selectedMessages = [];
                    this.messageService.manageMessageEvent(
                      null,
                      null,
                      this.selectedMessages
                    );
                  });
                });
              }

          });
    }
  }

  public setMailTagVisibility(messages: Message[]) {
    messages.map((message: Message) => {
      this.setFromOrTo(message);
      this.setIconsVisibility(message);
    });
  }

  public setFromOrTo(message: Message) {
    let addresRoleType: string;
    switch (message.inOut) {
      case InOut.IN:
        addresRoleType = AddresRoleType.FROM;
        break;
      case InOut.OUT:
        addresRoleType = AddresRoleType.TO;
        break;
      default:
        addresRoleType = AddresRoleType.FROM;
    }
    if (this.sorting.field === "messageExtensionList.addressFrom") {
      addresRoleType = AddresRoleType.FROM;
    }
    message["fromOrTo"] = {
      description: "",
      fromOrTo: addresRoleType
    };
    if (message.messageAddressList) {
      const messageAddressList: MessageAddress[] = message.messageAddressList.filter(
        (messageAddress: MessageAddress) =>
          messageAddress.addressRole === addresRoleType
      );
      messageAddressList.forEach((messageAddress: MessageAddress) => {
        // message["fromOrTo"].description += ", " + (messageAddress.idAddress.originalAddress ? messageAddress.idAddress.originalAddress : messageAddress.idAddress.mailAddress);
        message["fromOrTo"].description += ", " + messageAddress.idAddress.mailAddress;
      });
      if ((message["fromOrTo"].description as string).startsWith(",")) {
        message["fromOrTo"].description = (message["fromOrTo"].description as string).substr(
          1,
          (message["fromOrTo"].description as string).length - 1
        );
      }
    }
  }

  public refreshAndSendTotalMessagesNumber(movedMessages: number, pecFolder: PecFolder = this.pecFolderSelected) {
    this.totalRecords -= movedMessages;
      // mando l'evento con il numero di messaggi (serve a mailbox-component perché lo deve scrivere nella barra superiore)
      this.mailboxService.setTotalMessageNumberDescriptor({
        messageNumber: this.totalRecords,
        pecFolder: pecFolder // folder/tag che era selezionato quando lo scaricamento dei messaggi è iniziato
      } as TotalMessageNumberDescriptor);
  }

  /**
   * Questa funzione si occupa di spostare i selectedMessages nel cestino.
   * @param selectedMessages
   * @param loggedUser
   */
  public moveMessagesToTrash(): void {
    if(this.selectedMessages.some(m => m.messageTagList)){
      if(this.selectedMessages
        .some(m => m.messageTagList
          .some(mt => mt.idTag.name === "in_error"))){
            this.toggleError(false);
          } 
    }      
    this.moveMessages(this.trashFolder.id);  
  }


  public createAndApplyTag(tagName) {
    this.createTag(tagName).subscribe(
      (res: Tag) => {
        this._newTagInserted$.next(res);
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
    messagesWithTag = this.filterMessagesWithTag(tag);
    const tagIconAndAction: TagIconAction = this.getTagIconAction(messagesWithTag);
    const mtp: MessageTagOp[] = [];
    let messaggioOperazione = "";
    if (tagIconAndAction.operation === "INSERT") {
      const messagesToInsert: Message[] = this.selectedMessages.filter(m => messagesWithTag.indexOf(m) === -1);
      messaggioOperazione = "associata";
      for (const message of messagesToInsert) {
        const mTagCall = this.buildMessageTagOperationInsert(message, tag.name);
        messageTagOperations.push(mTagCall.batchOp);
        mtp.push({ message: message, operation: "INSERT" });
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
    } else {
      messaggioOperazione = "rimossa";
      const idMessageTagToDelete: number[] = [];
      for (const message of messagesWithTag) {
        const mTag: MessageTag = message.messageTagList.find(messageTag => messageTag.idTag.name === tag.name);
        // const mTagCall = this.buildMessageTagOperationDelete(message, tag.name);
        if (mTag) {
          idMessageTagToDelete.push(mTag.id);
          mtp.push({ message: message, operation: "DELETE", messageTag: mTag });
        }
      }
      const url = getInternautaUrl(BaseUrlType.Shpeck) + "/" + CUSTOM_SERVER_METHODS.deleteMessageTagCustom;
      if (idMessageTagToDelete.length > 0) {
        this.httpClient.post(url, idMessageTagToDelete).subscribe(() => {
          this.updateMessageTagList(mtp, []);
          if (showMessage) {
            this.messagePrimeService.add(
              { severity: "success", summary: "Successo", detail: `Etichetta ${messaggioOperazione} con successo.` });
          }
        });
      }
    }
  }

  public deleteSelectedMessageFromTrash(): void {
    const messageFolderOperations: BatchOperation[] = [];
    let idFolder: any;
    // const mfp: MessageFolderOp[] = []; // Credo non serva
    const numberOfSelectedMessages: number = this.selectedMessages.length;

    for (const message of this.selectedMessages) {
      const mFolderCall = this.buildMessageFolderOperations(message, FolderType.TRASH, BatchOperationTypes.UPDATE, true);
        idFolder = mFolderCall.idFolder;
        messageFolderOperations.push(mFolderCall.batchOp);
        // mfp.push({ message: message, operation: "DELETE" }); // Credo non serva
    }
    if (messageFolderOperations.length > 0) {
      this.messageService.batchHttpCall(messageFolderOperations).subscribe((res: BatchOperation[]) => {
          this.messages = this.messages.filter(m => this.selectedMessages.find(sm => sm.id !== m.id));
          this.mailFoldersService.doReloadFolder(idFolder);
          this.selectedMessages = [];
          this.messageService.manageMessageEvent(
            null,
            null,
            this.selectedMessages
          );
          this.refreshAndSendTotalMessagesNumber(numberOfSelectedMessages);
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

  // private buildMessageTagOperationDelete(message: Message, tagName: string): any {
  //   const mTag: MessageTag = message.messageTagList.find(messageTag => messageTag.idTag.name === tagName);
  //   if (mTag) {
  //     return {
  //       idTag: mTag.idTag.id,
  //       batchOps: null,
  //       mTag: mTag
  //     };
  //   }
  // }

  private buildMessageFolderOperations(message: Message, typeFolder: string, batchOp: BatchOperationTypes, setDeleted: boolean): any {
    const mFolder: MessageFolder = message.messageFolderList.find(messageFolder => messageFolder.idFolder.type === typeFolder);

    if (mFolder) {
      const messageFolderToUpdate = new MessageFolder();
      messageFolderToUpdate.id = mFolder.id;
      messageFolderToUpdate.version = mFolder.version;
      
      messageFolderToUpdate.idFolder = new Folder();
      messageFolderToUpdate.idFolder.id = mFolder.idFolder.id;
      messageFolderToUpdate.idFolder.version = mFolder.idFolder.version;

      // mFolder.deleted = setDeleted !== null ? setDeleted : mFolder.deleted;
      if (setDeleted) {
        messageFolderToUpdate.deleted = true;
        const utenteEliminatore: Utente = new Utente();
        /* if (mFolder.idUtente) {
          utenteEliminatore = mFolder.idUtente;
        } else {
          utenteEliminatore = new Utente();
        } */
        utenteEliminatore.id = this.loggedUser.getUtente().id;
        utenteEliminatore.version = this.loggedUser.getUtente().version;
        messageFolderToUpdate.idUtente = utenteEliminatore;
      }
      return {
        idFolder: mFolder.idFolder.id,
        batchOp: {
          id: mFolder.id,
          operation: batchOp,
          entityPath: BaseUrls.get(BaseUrlType.Shpeck) + "/" + ENTITIES_STRUCTURE.shpeck.messagefolder.path,
          entityBody: batchOp === BatchOperationTypes.DELETE ? null : messageFolderToUpdate,
          additionalData: null,
          returnProjection: null
        },
        mFolder: mFolder
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
    //const selectedMessagesTemp = this.selectedMessages;
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
          returnProjection: this.selectedProjection
        });
      }
    });
    // const inFolder = this.folders.filter(folder => folder.type === "INBOX")[0].id;
    if (messagesToUpdate.length > 0) {
      this.messageService.batchHttpCall(messagesToUpdate).subscribe((messages: any[]) => {
        console.log(messages);
        // reload Folder
        if (reloadUnSeen) {
          const map: any = {};
          messages.forEach((bacthOperation: BatchOperation) => {
            let index: number = this.selectedMessages.findIndex(m => m.id === bacthOperation.id);
            let updatedMessage = bacthOperation.entityBody as Message;
            this.setMailTagVisibility([updatedMessage]);
            if (index >= 0) {
              this.selectedMessages.splice(index, 1, updatedMessage);
            }
            index = this.messages.findIndex(m => m.id === bacthOperation.id);
            if (index >= 0) {
              //this.messages.splice(index, 1, updatedMessage);
              this.messages[index].seen = updatedMessage.seen;
              this.messages[index].version = updatedMessage.version;
              updatedMessage = this.messages[index];
            }
            if (!map[updatedMessage.messageFolderList[0].idFolder.id]) {
              this.mailFoldersService.doReloadFolder(updatedMessage.messageFolderList[0].idFolder.id);
              map[updatedMessage.messageFolderList[0].idFolder.id] = true;
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
    let idTag: number;
    if (toInsert) {
      for (const message of this.selectedMessages) {
        const mTagCall = this.buildMessageTagOperationInsert(message, "in_error");
        idTag = mTagCall.idTag;
        messageTagOperations.push(mTagCall.batchOp);
        mtp.push({ message: message, operation: "INSERT" });
      }
      if (messageTagOperations.length > 0) {
        this.messageService.batchHttpCall(messageTagOperations).subscribe((res: BatchOperation[]) => {
          this.mailFoldersService.doReloadTag(idTag);
          this.updateMessageTagList(mtp, res);
        },
          err => console.log("error during the operation -> ", err));
      }
    } else {
      const idMessageTagToDelete: number[] = [];
      for (const message of this.selectedMessages) {
        const mTag: MessageTag = message.messageTagList.find(messageTag => messageTag.idTag.name === "in_error");
        if (mTag) {
          idTag = mTag.idTag.id;
          idMessageTagToDelete.push(mTag.id);
          mtp.push({ message: message, operation: "DELETE", messageTag: mTag });
        }
      }
      if (idMessageTagToDelete.length > 0) {
        const url = getInternautaUrl(BaseUrlType.Shpeck) + "/" + CUSTOM_SERVER_METHODS.deleteMessageTagCustom;
        this.httpClient.post(url, idMessageTagToDelete).subscribe(() => {
          this.mailFoldersService.doReloadTag(idTag);
          this.updateMessageTagList(mtp, []);
        });
      }
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
          this.totalRecords--;
        // mando l'evento con il numero di messaggi (serve a mailbox-component perché lo deve scrivere nella barra superiore)
          this.refreshAndSendTotalMessagesNumber(0, this.pecFolderSelected);
        }
      }
    });
  }

  private updateMessageFolderList(mFolderOp: MessageFolderOp[], result: BatchOperation[]) {
    mFolderOp.forEach((item) => {
      if (item.operation === "INSERT" && result) {
        const messageFolderToPush: MessageFolder =
          result.find(bo => (bo.entityBody as MessageFolder).fk_idMessage.id === item.message.id).entityBody as MessageFolder;
        if (!item.message.messageFolderList) {
          item.message.messageFolderList = [];
        }
        item.message.messageFolderList.push(messageFolderToPush);
        this.setIconsVisibility(item.message);
      } else if (item.operation === "DELETE" && result) {
        item.message.messageFolderList.splice(item.message.messageFolderList.indexOf(item.messageFolder), 1);
        this.setIconsVisibility(item.message);

        if (this.pecFolderSelected && this.pecFolderSelected.data["FOLDER"] === item.messageFolder.fk_idFolder.id) {
          this.messages.splice(this.messages.indexOf(this.messages.find(m => m.id === item.messageFolder.fk_idMessage.id)), 1);
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
    message.version = this.selectedMessages[0].version;
    const batchOperations: BatchOperation[] = [];
    const utente = new Utente();
    utente.id = this.loggedUser.getUtente().id;
    utente.version = this.loggedUser.getUtente().version;
    noteObj.idUtente = utente;
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
      const tag = new Tag();
      tag.id = this.annotedTag.id;
      tag.version = this.annotedTag.version;
      const messageTagToInsert: MessageTag = new MessageTag();
      messageTagToInsert.idMessage = message;
      messageTagToInsert.idUtente = utente;
      messageTagToInsert.idTag = tag;
      batchOperations.push({
        id: null,
        operation: BatchOperationTypes.INSERT,
        entityPath:
          BaseUrls.get(BaseUrlType.Shpeck) + "/" + ENTITIES_STRUCTURE.shpeck.messagetag.path,
        entityBody: messageTagToInsert,
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
      
      this.subscriptions.push(
        this.configurazioneService.getParametriAziende("usaGediInternauta", null, [azienda.id]).subscribe(
          (parametriAziende: ParametroAziende[]) => {
            //console.log(parametriAziende);
            const showArchivioRicercaDialog = JSON.parse(parametriAziende[0]?.valore || false);
            if (showArchivioRicercaDialog) {
              this.idAziendaFascicolazione=azienda.id;
              this.displayArchivioRicerca = true;


            } else {
              //this open the old 
              let decodedUrl = "";
              decodedUrl = decodeURI(azienda.urlCommands["ARCHIVE_MESSAGE"]);
              decodedUrl = decodedUrl.replace("[id_message]", this.selectedMessages[0].id.toString());
              decodedUrl = decodedUrl.replace("[richiesta]", Utils.genereateGuid());
              console.log("command", decodedUrl);
              const encodeParams = false;
              const addRichiestaParam = true;
              const addPassToken = true;
              this.loginService.buildInterAppUrl(decodedUrl, encodeParams, addRichiestaParam, addPassToken, true).subscribe((url: string) => {
                console.log("urlAperto:", url);
              });
            }
           
  
            // Tolgo subito queste due sottoscrizioni che mi disturbano quando per qualche motivo riscattano.
            this.subscriptions.forEach(
              s => s.unsubscribe()
            );
            this.subscriptions = [];
          }
        )  
      );

      // window.open(decodedUrl);
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
  public buildAziendeMenuItems(codiciAziende: string[], selectedPec: Pec, idCommand: string, command: (any) => any, longDescriptionItem: boolean = false): MenuItem[] {
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
          label: longDescriptionItem ? azienda.descrizione : azienda.nome,
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
    * Questo metodo si occupa di construire un menu che contenga le aziende passate come items.
    * Le aziende non associate alla pec passata (selectedPec) avranno un messaggio d'avviso.
    * @param codiciAziende
    * @param selectedPec
    * @param idCommand
    * @param command
    */
   public buildAziendeBdsMenuItems(codiciAziende: string[], selectedPec: Pec, idCommand: string, command: (any) => any, longDescriptionItem: boolean = false): ItemMenu[] {
    const aziendeMenuItems: ItemMenu[] = [];
    codiciAziende.forEach(codiceAzienda => {
      const azienda = this.loggedUser.getUtente().aziende.find(a => a.codice === codiceAzienda);
      let item = new ItemMenu();
      item.commandType = CommandType.URL;
      item.descrizione = longDescriptionItem ? azienda.descrizione : azienda.nome;
      item.openCommand = codiceAzienda;
      aziendeMenuItems.push(item);
    });
    return aziendeMenuItems;
  }

  /**
   *  restituisce array d'interi con gli id delle aziende su cui il messaggio è stato protocollato
   * @param message il messaggio
   */
  private getIdAziendeDoveMessaggioGiaProtocollato(message: Message): number[] {
    let additionalDataAziende: number[] = [];
    if (message && message.messageTagList) {
      const mtRegistered: MessageTag = message.messageTagList.find(mt => mt.idTag.name === "registered");
      let additionaDataRegistered: any;
      if (mtRegistered) {
        additionaDataRegistered = JSON.parse(mtRegistered.additionalData);
      }
      const mtInRegistration = message.messageTagList.find(mt => mt.idTag.name === "in_registration");
      let additionaDataInRegistration: any;
      if (mtInRegistration) {
        additionaDataInRegistration = JSON.parse(mtInRegistration.additionalData);
      }
      if (additionaDataRegistered) {
        if (additionaDataRegistered instanceof Array) {
          additionaDataRegistered.forEach(element => {
            additionalDataAziende.push(element.idAzienda.id);
          });
        } else {
          if (additionaDataRegistered && additionaDataRegistered.idAzienda && additionaDataRegistered.idAzienda.id) {
            additionalDataAziende.push(additionaDataRegistered.idAzienda.id);
          }
        }
      }
      if (additionaDataInRegistration) {
        if (additionaDataInRegistration instanceof Array) {
          additionaDataInRegistration.forEach(element => {
            additionalDataAziende.push(element.idAzienda.id);
          });
        } else {
          if (additionaDataInRegistration && additionaDataInRegistration.idAzienda && additionaDataInRegistration.idAzienda.id) {
            additionalDataAziende.push(additionaDataInRegistration.idAzienda.id);
          }
        }
      }
      // tolgo i duplicati
      if (additionalDataAziende.length > 0) {
        additionalDataAziende = Array.from(new Set(additionalDataAziende));
      }
    }
    return additionalDataAziende;
  }

  /**
   * torna i codici delle aziende su cui il messaggio è protocollabile (quelle su cui ho un permesso e non è già protocollato)
   * @param message il messaggio
   */
  private getCodiciMieAziendeProtocollabili(message: Message): string[] {
    let mieAziendeProtocollabili: string[] = [];
    if (message) {
      const aziendeWithFluxPermission = this.loggedUser.getAziendeWithPermission(FluxPermission.REDIGE);
      if (aziendeWithFluxPermission && aziendeWithFluxPermission.length > 0) {
        const mieAziendeGiaProtocoll: string[] = this.loggedUser.getUtente()["aziende"].filter(x => this.getIdAziendeDoveMessaggioGiaProtocollato(message).indexOf(x.id) >= 0)
          .map(a => a.codice);
        mieAziendeProtocollabili = aziendeWithFluxPermission.filter(x => mieAziendeGiaProtocoll.indexOf(x) < 0);
      }
    }
    return mieAziendeProtocollabili;
  }

  /**
   * Questa funzione si occupa di creare un MenuItem[] che contenga come items la
   * lista delle aziende su cui l'utente loggato ha il permesso redige per la funzione protocolla Pec.
   * @param command
   */
  public buildRegistrationMenuItems(message: Message, selectedPec: Pec, command: (any) => any, longDescriptionItem: boolean = false): MenuItem[] {
    return this.buildAziendeMenuItems(
      this.getCodiciMieAziendeProtocollabili(message),
      selectedPec,
      "MessageRegistration",
      command,
      longDescriptionItem
    );
  }

  /**
   * Come la buildRegistrationMenuItems, ma gli item sono preparati per il bds-menu nostro e non per quello di primeng
   * @param message 
   * @param selectedPec 
   * @param command 
   * @param longDescriptionItem 
   * @returns 
   */
  public buildRegistrationBdsMenuItems(message: Message, selectedPec: Pec, command: (any) => any, longDescriptionItem: boolean = false): ItemMenu[] {
    return this.buildAziendeBdsMenuItems(
      this.getCodiciMieAziendeProtocollabili(message),
      selectedPec,
      "MessageRegistration",
      command,
      longDescriptionItem 
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
      !message.messageFolderList || message.messageFolderList.length === 0 ||
      message.messageFolderList[0].idFolder.type === FolderType.TRASH ||
      (message.messageTagList && message.messageTagList.some(messageTag =>
            messageTag.idTag.name === "readdressed_out" ||
            ((messageTag.idTag.name === "registered" ||
            messageTag.idTag.name === "in_registration") && this.messageTagAdditionalDataContainsAziendaOfPec(messageTag))
        ))
    ) {
      return false;
    } else {
      return true;
    }
  }

  private messageTagAdditionalDataContainsAziendaOfPec(messageTag: MessageTag) {
    let contains = false;
    const additionalData = JSON.parse(messageTag.additionalData);
    const pec: Pec = (this.pecFolderSelected.type === PecFolderType.PEC ? this.pecFolderSelected.data : this.pecFolderSelected.pec) as Pec;
    const idAziendePec = pec.pecAziendaList.map(pa => {
      return pa.fk_idAzienda.id;
    });
    if (additionalData) {
      if (Array.isArray(additionalData)) {
        additionalData.forEach(ad => {
          if (idAziendePec.indexOf(ad.idAzienda.id) > -1 ) {
            contains = true;
          }
        });
      } else if (additionalData.idAzienda && idAziendePec.indexOf(additionalData.idAzienda.id) > -1 ) {
        contains = true;
      }
    }
    return contains;
  }

  /**
   * Questa funzione ritorna un booleano che indica se il messaggio selezionato è archiviabile.
   */
  public isArchiveActive(specificMessage?: Message): boolean {
    const message: Message = specificMessage ? specificMessage : this.selectedMessages[0];
    if ((!specificMessage && this.selectedMessages.length !== 1) ||
      !message.messageFolderList || message.messageFolderList.length === 0 ||
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
    if ( (this.selectedMessages.length === 1) && (message.messageFolderList && message.messageFolderList[0] && message.messageFolderList[0].idFolder.type === FolderType.TRASH)) {
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
      if (mess.messageStatus === MessageStatus.ERROR || mess.messageStatus === MessageStatus.CONFIRMED) {
        if (mess.messageTagList) {
          const aaa = this.messages;
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

  public fixMessageTagInRegistration(messageId: number): Observable<any> {
    const url = getInternautaUrl(BaseUrlType.Shpeck) + "/" + CUSTOM_SERVER_METHODS.fixMessageTagInRegistration + "/" + messageId;
      return this.httpClient.get(url);
  }

  
  /**
   * Questa funzione si preoccupa di creare gli opportuni filtri per la query.
   * Di base si può cercare su un folder, su un tag oppure ovunque dentro al pec;
   * in quest'ultimo caso viene tipicamente esclusa la folder TRASH
   * @param folder 
   * @param tag 
   * @param selectedPecId 
   * @returns 
   */
  public buildInitialFilterAndSort(folder: Folder, tag: Tag, selectedPecId: number): FiltersAndSorts {
    const filtersAndSorts: FiltersAndSorts = new FiltersAndSorts();

    // Innanzitutto i filtri standard:
    filtersAndSorts.addFilter(new FilterDefinition("idPec.id", FILTER_TYPES.not_string.equals, selectedPecId));
    filtersAndSorts.addFilter(new FilterDefinition("messageType",FILTER_TYPES.not_string.equals, MessageType.MAIL));

    if (folder) {
      // Uso la vista MessageWithFolderView
      this.dynamicPrjectionForLoadData = "CustomMessageWithFolderViewForMailList";
      this.dynamicServiceForLoadData = this.messageWithFolderViewService;
      filtersAndSorts.addFilter(new FilterDefinition("idFolder.id", FILTER_TYPES.not_string.equals, folder.id));
      filtersAndSorts.addFilter(new FilterDefinition("deleted", FILTER_TYPES.not_string.equals, false));
    } else if (tag) {
      this.dynamicPrjectionForLoadData = "CustomMessageWithTagViewForMailList";
      this.dynamicServiceForLoadData = this.messageWithTagViewService;
      filtersAndSorts.addFilter(new FilterDefinition("idTag.id",FILTER_TYPES.not_string.equals, tag.id));
      filtersAndSorts.addFilter(new FilterDefinition("messageFolderList.deleted",FILTER_TYPES.not_string.equals, false));
    } else if (tag === null && folder === null) {
       // quando effettuo una ricerca generica (avendo selezionato la casella) non vengano considerate le mail nel cestino
      this.dynamicPrjectionForLoadData = this.selectedProjection;
      this.dynamicServiceForLoadData = this.messageService;
      filtersAndSorts.addAdditionalData(new AdditionalDataDefinition("OperationRequested", "FiltraSuTuttiFolderTranneTrash"));
      filtersAndSorts.addFilter(new FilterDefinition("messageFolderList.deleted",FILTER_TYPES.not_string.equals, false));
    }
    
    // Aggiungo l'ordinamento
    filtersAndSorts.addSort(new SortDefinition(this.sorting.field, this.sorting.sortMode));

    return filtersAndSorts;
  }

  public getSubscriptionReadyForLoadData(folder, tag, _selectedPecId,lazyFilterAndSort, pageConf) {
    const filtersAndSorts = this.buildInitialFilterAndSort(folder, tag, _selectedPecId);
    return this.dynamicServiceForLoadData
      .getData(
        this.dynamicPrjectionForLoadData,
        filtersAndSorts,
        lazyFilterAndSort,
        pageConf
      )
  }

}

interface MessageTagOp {
  message: Message;
  operation: "INSERT" | "DELETE";
  messageTag?: MessageTag;
}

interface MessageFolderOp {
  message: Message;
  operation: "INSERT" | "DELETE";
  messageFolder?: MessageFolder;
}

interface TagIconAction {
  iconType: string;                   // L'icona da mostrare in corrispondenza del tag
  operation?: "INSERT" | "DELETE";    // Viene utilizzato in fase di applicazione/rimozione del tag
  title?: string;
  order?: number;
}
