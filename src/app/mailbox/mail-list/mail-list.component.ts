import {AfterViewInit, Component, ElementRef, EventEmitter, HostListener, OnDestroy, OnInit, Output, ViewChild} from "@angular/core";
import {buildLazyEventFiltersAndSorts} from "@bds/primeng-plugin";
import {Azienda, ENTITIES_STRUCTURE, Folder, FolderType, Message, MessageTag, MessageType, Note, Pec, Tag, TagType} from "@bds/ng-internauta-model";
import {MessageEvent, ShpeckMessageService} from "src/app/services/shpeck-message.service";
import {BatchOperation, BatchOperationTypes, FILTER_TYPES, FilterDefinition, FiltersAndSorts, PagingConf, SortDefinition, AdditionalDataDefinition} from "@nfa/next-sdr";
import {TagService} from "src/app/services/tag.service";
import {Observable, Subscription} from "rxjs";
import {DatePipe} from "@angular/common";
import {Table} from "primeng/table";
import {BaseUrls, BaseUrlType, EMLSOURCE, FONTSIZE, TOOLBAR_ACTIONS} from "src/environments/app-constants";
import {ConfirmationService, FilterMetadata, LazyLoadEvent, MenuItem, MessageService} from "primeng/api";
import {Utils} from "src/app/utils/utils";
import {MailFoldersService, PecFolder, PecFolderType} from "../mail-folders/mail-folders.service";
import {ToolBarService} from "../toolbar/toolbar.service";
import {MailListService} from "./mail-list.service";
import {NoteService} from "src/app/services/note.service";
import {NtJwtLoginService, UtenteUtilities} from "@bds/nt-jwt-login";
import {Menu} from "primeng/menu";
import {AppCustomization} from "src/environments/app-customization";
import {SettingsService} from "src/app/services/settings.service";
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {MailboxService, Sorting} from "../mailbox.service";
import {IntimusClientService, IntimusCommand, IntimusCommands, RefreshMailsParams, RefreshMailsParamsEntities, RefreshMailsParamsOperations} from "@bds/nt-communicator";
import { ContextMenu } from "primeng/contextmenu";
import { DialogService } from "primeng/dynamicdialog";


@Component({
  selector: "app-mail-list",
  templateUrl: "./mail-list.component.html",
  styleUrls: ["./mail-list.component.scss"],
  providers: [ConfirmationService]
})
export class MailListComponent implements OnInit, OnDestroy, AfterViewInit {

  public lazy: boolean = false;

  constructor(
    public mailListService: MailListService,
    private messageService: ShpeckMessageService,
    private tagService: TagService,
    private mailFoldersService: MailFoldersService,
    private toolBarService: ToolBarService,
    private datepipe: DatePipe,
    public confirmationService: ConfirmationService,
    private messagePrimeService: MessageService,
    private noteService: NoteService,
    private settingsService: SettingsService,
    private loginService: NtJwtLoginService,
    private mailboxService: MailboxService,
    private dialogService: DialogService,
    private intimusClient: IntimusClientService
  ) {
    this.selectedContextMenuItem = this.selectedContextMenuItem.bind(this);
    this.showNewTagPopup = this.showNewTagPopup.bind(this);
  }

  @Output() public messageClicked = new EventEmitter<Message>();

  @ViewChild("selRow", {}) private selRow: ElementRef;
  @ViewChild("dt", {}) private dt: Table;
  @ViewChild("noteArea", {}) private noteArea;
  @ViewChild("idtag", {}) private inputTextTag;
  @ViewChild("registrationMenu", {}) private registrationMenu: Menu;
  @ViewChild("alternativeMenu", {}) private alternativeMenu: Menu;
  @ViewChild("archiviationMenu", {}) private archiviationMenu: Menu;
  @ViewChild("tagMenu", {}) private tagMenu: Menu;
  // @ViewChild("ordermenu") private ordermenu: Menu;

  // serve per mandarlo al mailbox-component
  private pecFolderSelected: PecFolder;

  public _selectedTag: Tag;
  public _selectedFolder: Folder;
  public _selectedPecId: number;
  public _selectedPec: Pec;
  public _filters: FilterDefinition[];

  // private tempSelectedMessages: Message[] = null;

  private pageConf: PagingConf = {
    mode: "LIMIT_OFFSET",
    conf: {
      limit: 0,
      offset: 0
    }
  };

  private subscriptions: {id: number, type: string, subscription: Subscription}[] = [];
  private previousFilter: FilterDefinition[] = [];
  private foldersSubCmItems: MenuItem[] = null;
  public aziendeProtocollabiliSubCmItems: MenuItem[] = null;
  public aziendeFascicolabiliSubCmItems: MenuItem[] = null;
  private registerMessageEvent: any = null;
  private loggedUser: UtenteUtilities;
  private timeoutOnFocusEvent = null;

  public tagMenuItems:  MenuItem[] = null;
  public cmItems: MenuItem[] = [
    {
      label: "NOT_SET",
      id: "MessageSeen",
      disabled: false,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Rispondi",
      id: "MessageReply",
      disabled: true,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Rispondi a tutti",
      id: "MessageReplyAll",
      disabled: true,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Inoltra",
      id: "MessageForward",
      disabled: true,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Protocolla",
      id: "MessageRegistration",
      disabled: true,
      queryParams: {},
      items: this.aziendeProtocollabiliSubCmItems,
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Sposta",
      id: "MessageMove",
      disabled: true,
      queryParams: {},
      items: this.foldersSubCmItems,
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Etichette",
      id: "MessageLabels",
      disabled: true,
      items: [] as MenuItem[],
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Elimina",
      id: "MessageDelete",
      disabled: true,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Segna come errore visto",
      id: "ToggleErrorFalse",
      disabled: true,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Segna come errore non visto",
      id: "ToggleErrorTrue",
      disabled: true,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Nota",
      id: "MessageNote",
      disabled: false,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Scarica",
      id: "MessageDownload",
      disabled: true,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Fascicola",
      id: "MessageArchive",
      disabled: true,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Reindirizza",
      id: "MessageReaddress",
      disabled: true,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    },
    {
      label: "Ripristina",
      id: "MessageUndelete",
      disabled: true,
      queryParams: {},
      command: event => this.selectedContextMenuItem(event)
    }
  ];

  public displayNote: boolean = false;
  public displayNewTagPopup: boolean = false;
  public displayProtocollaDialog = false;
  public displayDetailPopup = false;
  public openDetailInPopup = false;
  public readdressDetail: any = {
    displayReaddressDetail: false,
    buttonReaddress: false,
    testo: {
      in: null,
      out: null
    }
  };
  public registrationDetail: any = {
    message: undefined,
    additionalData: undefined,
    displayRegistrationDetail: false,
    buttonRegistration: false,
  };
  public tagForm;
  public archiviationDetail: any = {
    displayArchiviationDetail: false,
    buttonArchivable: false,
    message: null,
    additionalData: null
  };
  public noteObject: Note = new Note();
  public fromOrTo: any;
  public loading = false;
  public fontSize = FONTSIZE.BIG;
  private VIRTUAL_ROW_HEIGHTS = {
    small: 79,
    medium: 84,
    big: 89
  };
  // private SMALL_SIZE_VIRTUAL_ROW_HEIGHT = 77;
  // private MEDIUM_SIZE_VIRTUAL_ROW_HEIGHT = 83;
  // private LARGE_SIZE_VIRTUAL_ROW_HEIGHT = 89;
  public virtualRowHeight: number = this.VIRTUAL_ROW_HEIGHTS[FONTSIZE.BIG];
  public rowsNmber = 50;
  public cols = [
    {
      field: "subject",
      header: "Oggetto",
      filterMatchMode: FILTER_TYPES.string.containsIgnoreCase,
      width: "85px",
      minWidth: "85px"
    }
  ];

  @ViewChild("cm", {}) private contextMenu: ContextMenu;
  private tagsMenuOpened = {
    registerMenuOpened : false,
    archiveMenuOpened : false,
    tagMenuOpened : false
  };
  public loggedUserIsSuperD: boolean = false;


 /*  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    console.log(event);
    
    if (event.altKey == true && event.code == "KeyN") { 
      console.log("creo nuova mail");
      this.toolBarService.newMail("new");
    }
    
    if (event.altKey == true && event.code == "KeyR") { 
      this.toolBarService.newMail("reply");
    }

    if (event.altKey == true && event.code == "KeyA") { 
      this.toolBarService.newMail("reply_all");
    }

    if (event.altKey == true && event.code == "KeyI") { 
      this.toolBarService.newMail("forward");
    }

    if (event.altKey == true && event.code == "KeyC") { 
      this.toolBarService.handleDelete();
    }
    
    
  } */


  ngOnInit() {
    
    this.subscriptions.push({id: null, type: "pecFolderSelected", subscription: this.mailFoldersService.pecFolderSelected.subscribe((pecFolderSelected: PecFolder) => {
      // this.tempSelectedMessages = null;
      this.mailListService.selectedMessages = [];
      this.pecFolderSelected = pecFolderSelected;
      if (pecFolderSelected) {
        if (pecFolderSelected.type === PecFolderType.FOLDER) {
          const selectedFolder: Folder = pecFolderSelected.data as Folder;
          if ((selectedFolder.type !== FolderType.DRAFT) && (selectedFolder.type !== FolderType.OUTBOX)) {
            this._selectedPecId = selectedFolder.fk_idPec.id;
            this._selectedPec = pecFolderSelected.pec;
            console.log("selezionata ", selectedFolder);
            this.setFolder(selectedFolder);
            this.cmItems.map(element => {
              if (element.id === "MessageDelete" && selectedFolder.type === FolderType.TRASH) {
                element.label = "Elimina definitivamente";
              }
          });
          }
        } else if (pecFolderSelected.type === PecFolderType.TAG) {
          const selectedTag: Tag = pecFolderSelected.data as Tag;
          this._selectedPecId = selectedTag.fk_idPec.id;
          this._selectedPec = pecFolderSelected.pec;
          this.setTag(selectedTag);
        } else {
          const pec: Pec = pecFolderSelected.data as Pec;
          this._selectedPec = pec;
          this._selectedPecId = pec.id;
          this.setFolder(null);
        }
      }
    })});
    this.subscriptions.push({id: null, type: "getFilterTyped", subscription: this.toolBarService.getFilterTyped.subscribe((filters: FilterDefinition[]) => {
      if (filters) {
        this.setFilters(filters);
      }
    })});
    this.subscriptions.push({id: null, type: "loggedUser", subscription: this.loginService.loggedUser$.subscribe((utente: UtenteUtilities) => {
      if (utente) {
        if (!this.loggedUser || utente.getUtente().id !== this.loggedUser.getUtente().id) {
          this.loggedUser = utente;
          this.loggedUserIsSuperD = this.loggedUser.isSD();
        }
      }
    })});
    this.subscriptions.push({id: null, type: "settingsChangedNotifier", subscription: this.settingsService.settingsChangedNotifier$.subscribe(newSettings => {
      this.openDetailInPopup = newSettings[AppCustomization.shpeck.hideDetail] === "true";
      const newFontSize = newSettings[AppCustomization.shpeck.fontSize] ? newSettings[AppCustomization.shpeck.fontSize] : FONTSIZE.BIG;
      if (newFontSize !== this.fontSize) {
        this.fontSize = newFontSize;
        this.virtualRowHeight = this.VIRTUAL_ROW_HEIGHTS[this.fontSize];
        this.setFolder(this._selectedFolder);
      }
    })});
    if (this.settingsService.getImpostazioniVisualizzazione()) {
      this.openDetailInPopup = this.settingsService.getHideDetail() === "true";
      this.fontSize = this.settingsService.getFontSize() ? this.settingsService.getFontSize() : FONTSIZE.BIG;
      this.virtualRowHeight = this.VIRTUAL_ROW_HEIGHTS[this.fontSize];
    }
    this.subscriptions.push({id: null, type: "messageEvent", subscription: this.messageService.messageEvent.subscribe(
      (messageEvent: MessageEvent) => {
        // console.log("in messageEvent", messageEvent);
        // if (messageEvent && (!messageEvent.selectedMessages || messageEvent.selectedMessages.length === 0)) {
        //   console.log("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa ", messageEvent);
        //   this.mailListService.selectedMessages.push(this.mailListService.messages[1]);
        //   this.mailListService.selectedMessages.push(this.mailListService.messages[2]);
        // }
      })});
    this.subscriptions.push({id: null, type: "sorting", subscription: this.mailboxService.sorting.subscribe((sorting: Sorting) => {
      if (sorting) {
        this.mailListService.sorting = sorting;
        if (this.dt && this.dt.el && this.dt.el.nativeElement) {
          this.dt.el.nativeElement.getElementsByClassName("p-datatable-virtual-scrollable-body")[0].scrollTop = 0;
        }
        this.lazyLoad(null);
      }
    })});
    this.subscriptions.push({id: null, type: "intimusClient.command", subscription: this.intimusClient.command$.subscribe((command: IntimusCommand) => {
      this.manageIntimusCommand(command);
      // setTimeout(() => {
      // }, 5000);
    })});
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.setAccessibilityProperties(false);
    }, 0);
  }

  /**
   * gestisce un comando intimus
   * @param command il comando ricevuto
   */
  private manageIntimusCommand(command: IntimusCommand) {
    switch (command.command) {
      case IntimusCommands.RefreshMails: // comando di refresh delle mail
        const params: RefreshMailsParams = command.params as RefreshMailsParams;
        if (params.entity !== RefreshMailsParamsEntities.DRAFT && params.entity !== RefreshMailsParamsEntities.OUTBOX) {
          switch ((command.params as RefreshMailsParams).operation) {
            case RefreshMailsParamsOperations.INSERT:
              console.log("INSERT");
              this.manageIntimusInsertCommand(command);
              break;
            case RefreshMailsParamsOperations.UPDATE:
              console.log("UPDATE");
              this.manageIntimusUpdateCommand(command);
              break;
            case RefreshMailsParamsOperations.DELETE:
              console.log("DELETE");
              this.manageIntimusDeleteCommand(command);
              break;
          }
          this.refreshOtherBadgeAndDoOtherOperation(command);
          break;
        }
    }
  }
  

  /**
   * gestisce l'inserimento di un messaggio nella lista dei messaggi che sto guardando
   * @param command il comando intimus arrivato
   * @param ignoreSameUserCheck indica se eseguire l'inserimento anche all'utente che ha eseguito l'azione
   * @param times uso interno, serve per dare un limite alle chiamate ricorsive del metodo nel caso il messaggio da inserire non c'è ancora sul database
   */
  private manageIntimusInsertCommand(command: IntimusCommand, ignoreSameUserCheck: boolean = false, times: number = 1) {
    console.log("manageIntimusInsertCommand");
    const params: RefreshMailsParams = command.params as RefreshMailsParams;
    /*
     * se non sono io ad aver fatto l'azione o devo ignorare il controllo e
     * sul messaggio è cambiato il tag e io sto guardando quel tag, oppure
     * sul messaggio è cambiata la cartella e sto guardando quella cartella
    */
    if (  (ignoreSameUserCheck || (params.newRow && params.newRow["id_utente"] !== this.loggedUser.getUtente().id)) &&
          (
            (params.entity === RefreshMailsParamsEntities.MESSAGE_TAG && this.pecFolderSelected.type === PecFolderType.TAG &&
              params.newRow && params.newRow["id_tag"] && params.newRow["id_tag"] === this.pecFolderSelected.data.id) ||
            (params.entity === RefreshMailsParamsEntities.MESSAGE_FOLDER && this.pecFolderSelected.type === PecFolderType.FOLDER &&
              params.newRow && params.newRow["id_folder"] && params.newRow["id_folder"] === this.pecFolderSelected.data.id)
          )
      ) {
      // chiedo il messaggio al backend
      const idMessage: number = params.newRow["id_message"];
      const filterDefinition = new FilterDefinition("id", FILTER_TYPES.not_string.equals, idMessage);
      const filter: FiltersAndSorts = new FiltersAndSorts();
      filter.addFilter(filterDefinition);
      this.subscriptions.push({id: idMessage, type: "AutoRefresh", subscription: this.messageService.getData(this.mailListService.selectedProjection, filter, null, null).subscribe((data: any) => {
        /*
         * può capitare che il comando arrivi prima che la transazione sia conclusa, per cui non troverei il messaggio sul database.
         * Se capita, riprovo dopo 30ms per un massimo di 10 volte
        */
        if (!data || !data.results || data.results.length === 0) {
          console.log("message not ready");
          if (times <= 10) {
            console.log(`rescheduling after ${30 * times}ms for the ${times} time...`);
            setTimeout(() => {
              this.manageIntimusInsertCommand(command, ignoreSameUserCheck, times + 1);
            }, 30 * times);
          } else {
            console.log("too many tries, stop!");
          }
          return;
        }
        console.log("message ready, proceed...");

        const newMessage = data.results[0];
        // cerco il messaggio perché potrebbe essere già nella cartella disabilitato (ad esempio se qualcuno l'ha spostato e poi rispostato in questa cartella mentre io la guardo)
        console.log("searching message in list...");
        const messageIndex = this.mailListService.messages.findIndex(m => m.id === idMessage);
        if (messageIndex >= 0) { // se lo trovo lo riabilito
          console.log("message found, updating...");
          this.mailListService.messages.splice(messageIndex, 1, newMessage);
        } else { // se non lo trovo lo inserisco in testa
          console.log("message not found in list, pushing on top...");
          this.mailListService.messages.unshift(newMessage);

          this.mailListService.totalRecords++; // ho aggiunto un messaggio per cui aumento di uno il numero dei messaggi visualizzati
          // mando l'evento con il numero di messaggi (serve a mailbox-component perché lo deve scrivere nella barra superiore)
          this.mailListService.refreshAndSendTotalMessagesNumber(0, this.pecFolderSelected);
        }

        // se nuovo il messaggio ricaricato/inserito è tra i messaggi selezionati lo sostituisco
        const smIndex = this.mailListService.selectedMessages.findIndex(sm => sm.id === newMessage.id);
        if (smIndex >= 0) {
          this.mailListService.selectedMessages[smIndex] = newMessage;
        }

        console.log("setMailTagVisibility...");
        this.mailListService.setMailTagVisibility([newMessage]);
        if (params.entity === RefreshMailsParamsEntities.MESSAGE_FOLDER) {
          console.log("reloading folder badge...");
          if (this.pecFolderSelected.type === PecFolderType.FOLDER) {
            const folder: Folder = this.pecFolderSelected.data as Folder;
            this.mailFoldersService.doReloadFolder(folder.id, true, folder.type, folder.idPec.id);
          }
        } else if (params.entity === RefreshMailsParamsEntities.MESSAGE_TAG) {
          console.log("reloading tag badge...");
          this.mailFoldersService.doReloadTag(this.pecFolderSelected.data.id);
        }
      })
    });
    } else if (params.newRow["id_utente"] !== this.loggedUser.getUtente().id) { // se non sono l'utente che ha eseguito l'azione
      // e se non lo devo inserire o riabilitare, ci sono casi in cui devo ricaricare il messaggio
      const idMessage: number = params.newRow["id_message"];
      if (
          // se il comando ricevuto è su una cartella, ma sto guardando un tag, oppure
          (params.entity === RefreshMailsParamsEntities.MESSAGE_FOLDER && this.pecFolderSelected.type === PecFolderType.TAG) ||
          // se il comando ricevuto è su un tag, ma sto guardando un cartella, oppure
          (params.entity === RefreshMailsParamsEntities.MESSAGE_TAG && this.pecFolderSelected.type === PecFolderType.FOLDER) ||
          // se il comando ricevuto è su un messaggio (per ora solo il cambio da "letto" a "da leggere" e viceversa)
          (params.entity === RefreshMailsParamsEntities.MESSAGE)
         ) {
           setTimeout(() => { // il setTimeout forse non serve, ma ho paura che se lo tolgo si rompa qualcosa
             this.reloadMessage(idMessage, params);
           }, 0);
      }
      // this.refreshBadges(params); // poi ricarico anche i badge da ricaricare
    }
  }

  /**
   * gestisce un comando di cancellazione, cioè quando un messaggio deve essere disabilitato dalla lista dei messaggi che sto guardando
   * @param command il comando intimus arrivato
   * @param permanentDelete se il comando è un'eliminazione dal cestino
   * @param ignoreSameUserCheck indica se eseguire la cancellazione (disabilitando il messaggio) anche all'utente che ha eseguito l'azione
   */
  private manageIntimusDeleteCommand(command: IntimusCommand, permanentDelete: boolean = false, ignoreSameUserCheck: boolean = false) {
    console.log("manageIntimusDeleteCommand");
    const params: RefreshMailsParams = command.params as RefreshMailsParams;
    // entro in questo if se voglio disabilitare il messaggio a cui il comando ricevuto fa riferimento
    /* ci entro:
     * se non sono l'utente autore dell'azione (a meno che non passo ignoreSameUserCheck = true) e
     * ho ricevuto un comando di rimozione di un tag (o di update di un tag) e il tag è stato tolto è quello che sto guardando oppure
     * ho ricevuto un comando di update di una cartella e la cartella da cui è stato spostato il messaggio è quella che sto guardando oppure
     * ho ricevuto un comando di eliminazione di un messaggio dal cestino e sto guardando un tag (poi controllerò che il messaggio sia tra quelli che sto guardando)
    */
    if (
          ( (ignoreSameUserCheck || // se l'utente che ha eseguito il comando sono io non devo fare nulla a menoche non passo ignoreSameUserCheck = true
              (params.newRow && params.newRow["id_utente"] !== this.loggedUser.getUtente().id) || // se c'è newRow considero quella per verificare l'utente che esegue l'azione
              (params.oldRow && params.oldRow["id_utente"] !== this.loggedUser.getUtente().id) || // se non c'è newRow, ma c'è oldRow considero quella per verificare l'utente che esegue l'azione
              (params["id_utente"] !== this.loggedUser.getUtente().id) // se non ci sono nè newRow, nè oldRow allora è un caso custom di elimazione tag, in quel caso l'utente che esegue l'azione è in params
            ) &&
            ( (params.entity === RefreshMailsParamsEntities.MESSAGE_TAG && params.newRow && params.oldRow && params.oldRow["id_tag"] === this.pecFolderSelected.data.id) ||
              (params.entity === RefreshMailsParamsEntities.MESSAGE_TAG && !params.oldRow && !params.newRow && params["id"] === this.pecFolderSelected.data.id) ||
              (params.entity === RefreshMailsParamsEntities.MESSAGE_FOLDER && params.oldRow["id_folder"] === this.pecFolderSelected.data.id) ||
              (permanentDelete && this.pecFolderSelected.type === PecFolderType.TAG)
            )
          )
      ) {
      let idMessage: number ;
      // a seconda del tipo di comando che ricevo l'id del messaggio lo posso trovare in posti diversi. Lo prendo dal posto giusto
      if (params.newRow) {
        idMessage = params.newRow["id_message"];
      } else if (params.oldRow) {
        idMessage = params.oldRow["id_message"];
      } else {
        idMessage = params["id_message"];
      }
      // this.mailListService.totalRecords--;
      // this.mailListService.refreshAndSendTotalMessagesNumber(0, this.pecFolderSelected);
      /* se ho una sottoscrizione relativa al messaggio che voglio diisabilitare la disabilito.
       * questo perché può essere che arrivi una callback relativa ad un'operazione precedente, che ora non sarebbe più valida455
      */
     this.unsubscribeFromMessage(idMessage);
      const messageIndex = this.mailListService.messages.findIndex(message => message.id === idMessage);
      if (messageIndex >= 0  && !!!this.mailListService.messages[messageIndex]["moved"]) {

        if (this.mailListService.selectedMessages.length > 0 && this.mailListService.selectedMessages.find(m => m.id === idMessage)) {
          let messageToShowPreview = null;
          if (this.mailListService.selectedMessages.length === 1 && this.mailListService.selectedMessages[0].id === idMessage) {
            messageToShowPreview = this.mailListService.messages[messageIndex];
          }
          // filtro i messaggi selezionati togliendo quello che sto disabilitando, devo per forza riassegnare l'array e non fare un semplice splice perché
          // altrimenti angular non si accorgerebbe che l'array è cambiato e non mi scatterebbero gli eventi di deselezione della tabella
          this.mailListService.selectedMessages = this.mailListService.selectedMessages.filter(m => m.id !== idMessage);
          this.messageService.manageMessageEvent(null, messageToShowPreview, this.mailListService.selectedMessages);
        }
        // per disabilitare il messaggio gli setto la proprietà "moved" a true
        this.mailListService.messages[messageIndex]["moved"] = true;
        // in movedInfo metto una stringa che spiega cosa è successo al messaggio, sarà poi visualizzata in un tooltip
        let movedInfo: string = null;
        if (permanentDelete) { // il messaggio è stato cancellato dal cestino
          movedInfo = `il messaggio è appena stato eliminato definitivamente da ${params.newRow["persona"]}`;
        } else if (params.newRow) {
          if (params.newRow["id_folder"]) {
            movedInfo = `il messaggio è appena stato spostato nella cartella ${params.newRow["folder_description"]} da ${params.newRow["persona"]}`;
          } else if (params.newRow["id_tag"]) {
            movedInfo = `al messaggio è appena stata cambiata l'etichetta da ${params.oldRow["tag_description"]} a ${params.newRow["tag_description"]} da ${params.newRow["persona"]}`;
          }
        } else {
          if (params.oldRow && params.oldRow["id_folder"]) { // non dovvrebbe mai capitare
            movedInfo = `il messaggio è appena stato rimosso dalla cartella ${params.oldRow["folder_description"]}`;
          } else if (params.oldRow && params.oldRow["id_tag"]) {
            movedInfo = `al messaggio è appena stata rimossa l'etichetta ${params.oldRow["tag_description"]}`;
          } else if (!params.oldRow && !params.newRow && params.entity === RefreshMailsParamsEntities.MESSAGE_TAG && params.operation === RefreshMailsParamsOperations.DELETE && params["id"]) {
            movedInfo = `al messaggio è appena stata rimossa l'etichetta ${params["tag_description"]} da ${params["persona"]}`;
          } else if (!params.oldRow && !params.newRow && params.entity === RefreshMailsParamsEntities.MESSAGE_FOLDER && params.operation === RefreshMailsParamsOperations.DELETE && params["id"]) { // non dovvrebbe mai capitare
            movedInfo = `il messaggio è appena stato rimosso dalla cartella ${params["folder_description"]} da ${params["persona"]}`;
          }
        }
        this.mailListService.messages[messageIndex]["movedInfo"] = movedInfo;
        // this.refreshBadges(params);
        // this.mailListService.messages.splice(messageIndex, 1);
      }
    } else if ((params.newRow && params.newRow["id_utente"] !== this.loggedUser.getUtente().id) || (!params.oldRow && !params.newRow && params["id_utente"] !== this.loggedUser.getUtente().id)) {
      // se nei messaggi che sto guardando c'è il messaggio interessato lo ricarico
      let idMessage: number;
      if (params.newRow) {
        idMessage = params.newRow["id_message"];
      } else if (!params.oldRow && !params.newRow) {
        idMessage = params["id_message"];
      }
      setTimeout(() => { // il setTimeout forse non serve, ma ho paura che se lo tolgo si rompa qualcosa
        this.reloadMessage(idMessage, params);
      }, 0);
      // this.refreshBadges(params); // ricarico i badge da ricaricare
    }
  }

  /**
   * gestisce un comando di update
   * @param command il comando intimus arrivato
   */
  private manageIntimusUpdateCommand(command: IntimusCommand, ignoreSameUserCheck: boolean = false) {
    console.log("manageIntimusUpdateCommand");
    const params: RefreshMailsParams = command.params as RefreshMailsParams;
    if (!ignoreSameUserCheck && params.newRow["id_utente"] === this.loggedUser.getUtente().id) {
      console.log("same user");
      return;
    }
    // se l'entità interessata dal comando è message_folder e il messaggio è passato da deleted = false a delete = true, allora vuol dire che il messaggio è stato eliminato dal cestino
    if (params.entity === RefreshMailsParamsEntities.MESSAGE_FOLDER && !!!params.oldRow["deleted"] && !!params.newRow["deleted"]) {
      console.log("removed from trash");
      // chiamo la gestione delete passato "true" come permanentDelete, in modo che gestirà il particolare caso di eliminazione dal cestino
      this.manageIntimusDeleteCommand(command, true, ignoreSameUserCheck);
    } else {
        if (params.entity === RefreshMailsParamsEntities.MESSAGE_TAG && params.oldRow["id_tag"] !== params.newRow["id_tag"]) { // se è cambiato il tag
          console.log("changed tag");
          // se sto guardando un tag è il tag cambiato è proprio quello che sto guardando vuol dire che devo eliminare il messaggio perché è stato spostato
          if (this.pecFolderSelected.type === PecFolderType.TAG && params.oldRow["id_tag"] === this.pecFolderSelected.data.id) {
            this.manageIntimusDeleteCommand(command, false, ignoreSameUserCheck);
            // se sto guardando un tag è il nuovo tag è proprio quello che sto guardando vuol dire che devo inserire il messaggio nella lista
          } else if (this.pecFolderSelected.type === PecFolderType.TAG && params.newRow["id_tag"] === this.pecFolderSelected.data.id) {
            this.manageIntimusInsertCommand(command, ignoreSameUserCheck);
            // altrimenti devo cercare il messaggio nei messaggi che sto vedendo e se lo trovo aggiornarlo, ma solo se non sono io che sto facendo l'azione
          } else if (params.newRow["id_utente"] !== this.loggedUser.getUtente().id) {
            const idMessage: number = params.newRow["id_message"];
            setTimeout(() => {
              this.reloadMessage(idMessage, params);
            }, 0);
          }
        // è cambiata la cartella di un messaggio e sto guardando una cartella (non un tag), devo fare qualcosa solo se è cambiata la cartella che sto guardando
        } else if (params.entity === RefreshMailsParamsEntities.MESSAGE_FOLDER && params.oldRow["id_folder"] !== params.newRow["id_folder"] && this.pecFolderSelected.type === PecFolderType.FOLDER) {
          console.log("changed folder");
          // se la cartella che sto guardando è in oldRow vuol dire che devo eliminare il messaggio perché è stato spostato
          if (params.oldRow["id_folder"] === this.pecFolderSelected.data.id) {
            this.manageIntimusDeleteCommand(command, false, ignoreSameUserCheck);
            // se la cartella che sto guardando è in newRow vuol dire che devo inserire il messaggio perché è stato spostato in questa cartella
          } else if (params.newRow["id_folder"] === this.pecFolderSelected.data.id) {
            this.manageIntimusInsertCommand(command, ignoreSameUserCheck);
          }
        } else if (params.newRow["id_utente"] !== this.loggedUser.getUtente().id) {
        // cerco il messaggio nei messaggi che sto vedendo e se lo trovo lo aggiorno, ma solo se non sono io che sto facendo l'azione
        const idMessage: number = params.newRow["id_message"];
        setTimeout(() => { // il setTimeout forse non serve, ma ho paura che se lo tolgo si rompa qualcosa
          this.reloadMessage(idMessage, params);
        }, 0);
      }
      // this.refreshBadges(params); // ricarico i badge da ricaricare
    }
  }

  /**
   * disattiva le sottoscrizioni relative al messaggio passato
   * @param idMessage l'id del messaggio del quale disattivare le sottoscrizioni
   */
  private unsubscribeFromMessage(idMessage: number) {
    const subscriptionIndex: number = this.subscriptions.findIndex(s => s.id === idMessage);
    if (subscriptionIndex >= 0) {
      this.subscriptions[subscriptionIndex].subscription.unsubscribe();
      this.subscriptions.splice(subscriptionIndex, 1);
    }
  }

  /**
   * ricarica il messagio: se il messaggio è presente nella lista dei messaggi lo richiede al backend e lo sostituisce nella lista
   * @param idMessage il messaggio da ricaricare
   */
  private reloadMessage(idMessage: number, params: RefreshMailsParams) {
    const messageIndex = this.mailListService.messages.findIndex(m => m.id === idMessage);
    let reload: boolean = false; // indica se il messaggio anrà ricaricato
    if (messageIndex >= 0) { // se il messaggio è presente della lista
      reload = true;

      // se si tratta di un'operazione di update
      if (params.operation === RefreshMailsParamsOperations.UPDATE) {
        // se ho fatto un update di un tag e sto guardando un tag
        if (params.entity === RefreshMailsParamsEntities.MESSAGE_TAG && this.pecFolderSelected.type === PecFolderType.TAG) {
          // e il tag nuovo non è quello che sto guardando
          if (params.newRow["id_tag"] !== this.pecFolderSelected.data.id) {
            // devo ricaricare il messaggio solo se il messaggio non è disabilitato
            reload = !!!this.mailListService.messages[messageIndex]["moved"];
          } // se ho fatto un update di una folder e sto guardando una folder
        } else if (params.entity === RefreshMailsParamsEntities.MESSAGE_FOLDER && this.pecFolderSelected.type === PecFolderType.FOLDER) {
          // e sto guardando la folder in cui il messaggio e stato spostato
          if (params.newRow["id_folder"] === this.pecFolderSelected.data.id) {
            // e se il messaggio è stato eliminato dal cestino
            if (!!!params.oldRow["deleted"] && !!params.newRow["deleted"]) {
              // non lo deco ricaricare
              reload = false;
            }
          }
        } else { // sempre se è un update, ma non è un caso dei precedenti, lo devo ricaricare se il messaggio non è disabilitato
          reload = !!!this.mailListService.messages[messageIndex]["moved"];
        }
      } else { // se non è un operazione di update, lo devo ricaricare se il messaggio non è disabilitato
        reload = !!!this.mailListService.messages[messageIndex]["moved"];
      }
    }

    if (reload) { // se devo ricaricare il messaggio
      this.unsubscribeFromMessage(idMessage); // disabilito le sottoscrizioni relative al messaggio da ricaricare
      console.log("message found, refreshing...");
      // ricarico il messaggio tramite una chiamata al backend
      const filterDefinition = new FilterDefinition("id", FILTER_TYPES.not_string.equals, idMessage);
      const filter: FiltersAndSorts = new FiltersAndSorts();
      filter.addFilter(filterDefinition);
      this.subscriptions.push({id: idMessage, type: "AutoRefresh", subscription: this.messageService.getData(this.mailListService.selectedProjection, filter, null, null).subscribe((data: any) => {
        const newMessage = data.results[0];
        // ricarico le icome relative ai tag
        this.mailListService.setMailTagVisibility([newMessage]);

        // aggiorno il messaggio nella lista inserendo quello ricaricato
        this.mailListService.messages[messageIndex] = newMessage;

        // se il messaggio è anche presente nei messaggi selezioni, lo sostituisco anche lì
        const smIndex = this.mailListService.selectedMessages.findIndex(sm => sm.id === newMessage.id);
        if (smIndex >= 0) {
          this.mailListService.selectedMessages[smIndex] = newMessage;
        }
      })});
    }
  }

  /**
   * ricarica i badge dei tag e delle cartelle a seconda del caso
   * @param params i params estratti dal comando intimus
   */
  private refreshBadges(params: RefreshMailsParams) {
    console.log("refreshing badges...");
    // se è cambiato un tag ricarico i badge dei tag
    if (params.entity === RefreshMailsParamsEntities.MESSAGE_TAG) {
      // se ho rimosso un tag ricarico il badge del tag rimosso
      if (params.oldRow) {
        this.mailFoldersService.doReloadTag(params.oldRow["id_tag"]);
      }
      // caso di rimozione di tag tramite servlet custom
      if (params.entity === RefreshMailsParamsEntities.MESSAGE_TAG && params["id"]) {
        this.mailFoldersService.doReloadTag(params["id"]);
      }
      // se ho inserito un tag ricarico il badge del tag inserito
      if (params.newRow) {
        this.mailFoldersService.doReloadTag(params.newRow["id_tag"]);
      }
    } else { // per tutti gli altri cambiamenti ricarico i badge delle cartelle interessati nel comando
      if (params.newRow) {
        /* nel caso di nuovo messaggio, capita che la transazione non sia conclusa quando arriva il comando, quindi il numero dei messaggi non letti
         * non terrebbe conto del nuovo. Per ovviare a questo caso, chiamo una funzione apposita che chiama la doReloadFolder solo dopo che il messaggio
         * è visibile sul DB, cioè, dopo che la chiamata al backend lo ritnorna
        */
        if (!params.newRow["id_utente"] && params.operation === RefreshMailsParamsOperations.INSERT) { // è un nuovo messaggio in arrivo
          // questa funzione ricarica il messaggio, riprovando fino a che il messaggio non è visibile su DB
          this.reloadBadgesAfterMessageReady(params);
        } else { // in tutti gli altri casi mi comporto normalmente e ricarico subito il badge della cartella
          this.mailFoldersService.doReloadFolder(params.newRow["id_folder"], true);
        }
      }
      if (params.oldRow) {
        this.mailFoldersService.doReloadFolder(params.oldRow["id_folder"], true);
      }
    }
  }

  /**
   * esegue tutte le altre operazioni non contemplate nelle altre funzioni:
   * fa il refresh del tag degli errori nel caso sia eliminato dal cestino un messaggio in errore
   * - ricarica il messaggio per aggiornare i tag di fascicolazione, protocollazione e in_protocollazione
   *  per l'utente che esegue l'operazione (per gli altri utenti viene fatta nel giro standard dell'autoaggiornamento)
   * - sposta il messaggio nella cartella dei protocollati
   *  per l'utente che esegue l'operazione (per gli altri utenti viene fatta nel giro standard dell'autoaggiornamento)
   * @param command il comando ricevuto
   */
  private refreshOtherBadgeAndDoOtherOperation(command: IntimusCommand) {
    const params: RefreshMailsParams = command.params as RefreshMailsParams;
    // se è un caso di eliminazione di messaggio da cestino e il messaggio ha l'error-tag ricarico il badge degli errori
    if (params.entity === RefreshMailsParamsEntities.MESSAGE_FOLDER && params.oldRow && params.newRow && !!!params.oldRow["deleted"] && !!params.newRow["deleted"] && params.newRow["id_error_tag"] && params.newRow["id_error_tag"] !== "") {
      console.log("refreshing error tag...");
      this.mailFoldersService.doReloadTag(params.newRow["id_error_tag"]);
    }

    /*
     * caso in cui devo ricaricare i tag anche nel caso sono io stesso ad aver eseguito l'azione.
     * Questo caso serve per ricaricare i tag sopo la protocollazione o la fascicolazione. In generale nei casi in cui l'azione non è controllata dal frontend
    */
    if (params.entity === RefreshMailsParamsEntities.MESSAGE_TAG) { // se ho ricevuto un comando su un tag
      // se sono l'utente che ha eseguito l'azione (questo è il caso di inserimento o di update di un tag)
      if (params.newRow && params.newRow["id_utente"] === this.loggedUser.getUtente().id) {
        // e il tag è uno di quelli nello switch devo ricaricare il messaggio per aggiornare i suoi tag e ricarico i badge relativi al tag interessato
        switch (params.newRow["tag_name"]) {
          case "archived":
          case "registered":
          case "in_registration":
            console.log(`insert refreshOtherBadge: ${params.entity} with ${params.newRow["tag_name"]}`);
            setTimeout(() => {
              this.reloadMessage(params.newRow["id_message"], params);
            }, 0);
            this.mailFoldersService.doReloadTag(params.newRow["id_tag"]);
        } // questo è un caso simile a quello sopra, ma riguarda l'eliminazione di un tag
      } else if ((!params.newRow && params.oldRow) || (!params.newRow && !params.oldRow && params["id_utente"] === this.loggedUser.getUtente().id)) {
        let tagName: string;
        let idMessage: number;
        let idTag: number;
        // l'azione può derivare dal trigger della normale eliminazione di un tag tramite framework oppure da un'eliminazione custom
        if (params.oldRow) { // eliminazione tramite framework
          tagName = params.oldRow["tag_name"];
          idMessage = params.oldRow["id_message"];
          idTag = params.oldRow["id_tag"];
        } else { // eliminazione custom
          tagName = params["tag_name"];
          idMessage = params["id_message"];
          idTag = params["id"];
        }
        switch (tagName) {
          case "archived":
          case "registered":
          case "in_registration":
            console.log(`deletetag refreshOtherBadge: ${params.entity} with ${tagName}`);
            setTimeout(() => {
              this.reloadMessage(idMessage, params);
            }, 0);
            this.mailFoldersService.doReloadTag(idTag);
        }
      } // caso di spostamento del messaggio nella cartella dei messaggi protocollati per l'utente che ha eseguito l'azione
    } else if (params.entity === RefreshMailsParamsEntities.MESSAGE_FOLDER && params.newRow && params.newRow["id_utente"] === this.loggedUser.getUtente().id && params.newRow["folder_name"] === "registered") {
      console.log(`refreshOtherBadge: ${params.entity}, manageIntimusUpdateCommand...`);
      // lancio un update riconducendomi al caso in cui l'utente non è l'utente che esegue l'azione, passando ignoreSameUserCheck = true
      this.manageIntimusUpdateCommand(command, true);
    }
  }

  /**
   * Aspetta che il messaggio sia pronto prima di ricaricare il badge
   * @param params i parametri estratti dal comando ricevuto
   * @param times usato in automatico per la ricorsione, non passare
   */
  private reloadBadgesAfterMessageReady(params: RefreshMailsParams, times: number = 1) {
    const idMessage: number = params.newRow["id_message"];
      const filterDefinition = new FilterDefinition("id", FILTER_TYPES.not_string.equals, idMessage);
      const filter: FiltersAndSorts = new FiltersAndSorts();
      filter.addFilter(filterDefinition);
      this.messageService.getData(this.mailListService.selectedProjection, filter, null, null).subscribe((data: any) => {
        // può capitare che il comando arrivi prima che la transazione sia conclusa, per cui non troverei il messaggio sul database. Se capita, riprovo dopo 30ms per un massimo di 10 volte
        if (!data || !data.results || data.results.length === 0) {
          console.log("message not ready");
          if (times <= 10) {
            console.log(`rescheduling after ${30 * times}ms for the ${times} time...`);
            setTimeout(() => {
              this.reloadBadgesAfterMessageReady(params, times + 1);
            }, 30 * times);
          } else {
            console.log("too many tries, stop!");
          }
          return;
        }
        console.log("message ready, proceed...");
        // ricarico il badge interessato
        if (params.newRow["id_folder"]) {
          this.mailFoldersService.doReloadFolder(params.newRow["id_folder"], true);
        }
    });
  }

  public openDetailPopup(event, row, message) {
    if (this.openDetailInPopup) {
      this.displayDetailPopup = true;
    }
  }


  private setTag(tag: Tag) {
    this._selectedTag = null;
    this._selectedFolder = null;
    this._filters = null;
    this.mailListService.selectedMessages = [];
    this.mailListService.messages = [];
    // trucco per far si che la table vanga tolta e rimessa nel dom (in modo da essere resettata) altrimenti sminchia
    // NB: nell'html la visualizzazione della table è controllata da un *ngIf
    setTimeout(() => {
      this._selectedTag = tag;
      if (tag) {
        //this.lazyLoad(null);
      }
    }, 0);
  }

  private primavolta = true;
  public mostratable = false;

  private setFolder(folder: Folder) {
    this._selectedFolder = null;
    this._selectedTag = null;
    this._filters = null;
    this.mailListService.selectedMessages = [];
    this.mailListService.messages = [];
    // trucco per far si che la table vanga tolta e rimessa nel dom (in modo da essere resettata) altrimenti sminchia
    // NB: nell'html la visualizzazione della table è controllata da un *ngIf
    setTimeout(() => {
      this._selectedFolder = folder;
      if (folder) {
        //this.lazy = true;
        //this.lazyLoad(null);
        if (this.primavolta) {
          this.primavolta = false;
          this.mostratable = true;
        } else {
          //this.lazyLoad(null);
        }
      }
    }, 0);
  }

  private setFilters(filters: FilterDefinition[]) {
    // this._selectedFolder = null;
    this.mostratable = false;
    this._filters = null;
    this.mailListService.selectedMessages = [];
    this.mailListService.messages = [];
    setTimeout(() => {
      this._filters = filters;
      this.mostratable = true;
      if (filters) {
        // this.resetPageConfig = true;
        // this.filtering = true;
        //this.lazyLoad(null);
      }
    }, 0);
  }

  /* public toggleOrderMenu(event) {

    this.ordermenu.toggle(event);
  } */

  public getTagDescription(tagName: string): string {
    if (this.mailListService.tags) {
      const tag = this.mailListService.tags.find(t => t.name === tagName);
      if (tag) {
        return tag.description;
      } else {
        return null;
      }
    }
    return null;
  }

  private loadTag(pec: Pec): Observable<Tag[]> {
    const filtersAndSorts: FiltersAndSorts = new FiltersAndSorts();
    filtersAndSorts.addFilter(
      new FilterDefinition("idPec.id", FILTER_TYPES.not_string.equals, pec.id)
    );
    return this.tagService.getData(null, filtersAndSorts, null, null);
  }

  private loadData(pageConf: PagingConf, lazyFilterAndSort?: FiltersAndSorts, folder?: Folder, tag?: Tag, event?) {
    this.loading = true;
    // mi devo salvare la folder/tag selezionata al momento del caricamento,
    // perché nella subscribe quando la invio al mailbox-component per scrivere il numero di messaggi
    // la selezione potrebbe essere cambiata e quindi manderei un dato errato
    const folderSelected = this.pecFolderSelected;

    /* mi devo dissottoscrivere dalla precedente sottoscrizione di richiesta dei dati prima di sottoscrivermi alla nuova
     * per farlo mi metto come tipo della sottocrizione "folder_message" in modo da rintracciarla nell'array delle sottoscrizioni e rimuoverla
    */
    const currentSubscription = this.subscriptions.findIndex(s => s.type === "folder_message");
    if (currentSubscription >= 0) {
      if (this.subscriptions[currentSubscription].subscription) {
        this.subscriptions[currentSubscription].subscription.unsubscribe();
      }
      this.subscriptions.splice(currentSubscription, 1);
    }
    
    this.subscriptions.push({id: folderSelected.data.id, type: "folder_message", subscription: this.messageService
      .getData(
        this.mailListService.selectedProjection,
        this.buildInitialFilterAndSort(folder, tag),
        lazyFilterAndSort,
        pageConf
      )
      .subscribe(data => {
        if (data && data.results) {
          this.mailListService.totalRecords = data.page.totalElements;
          // mando l'evento con il numero di messaggi (serve a mailbox-component perché lo deve scrivere nella barra superiore)
          this.mailListService.refreshAndSendTotalMessagesNumber(0, folderSelected);

          //this.mailListService.messages = data.results;

          Array.prototype.splice.apply(this.mailListService.messages, [event.first, event.rows, ...data.results]);
        
          //trigger change detection
          this.mailListService.messages = [...this.mailListService.messages];


          console.log("this.mailListService.messages", this.mailListService.messages);
          this.mailListService.setMailTagVisibility(this.mailListService.messages);
          this.mailFoldersService.doReloadTag(this.mailListService.tags.find(t => t.name === "in_error").id);
          
        }
        this.loading = false;
        // setTimeout(() => {
        //   console.log(this.selRow.nativeElement.offsetHeight);
        // });

        // I selected messages sono quelli che sono.
        // Ma dopo il caricamento devo far puntare tra i messages quelli che sono selected
        // Altimenti la table non li evidenzia
        let index;
        for (let i = 0; i < this.mailListService.selectedMessages.length; i++) {
          index = this.isMessageinList(this.mailListService.selectedMessages[i].id, this.mailListService.messages);
          if (index !== -1) {
            this.mailListService.selectedMessages[i] = this.mailListService.messages[index];
          }
        }
        this.setAccessibilityProperties(true);
        
      })
    });
  }

  private isMessageinList(id: number, messages: Message[]) {
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].id === id) {
        return i;
      }
    }
    return -1;
  }

  public buildTableEventFilters(filtersDefinition: FilterDefinition[]): { [s: string]: FilterMetadata } {
    if (filtersDefinition && filtersDefinition.length > 0) {
      const eventFilters: { [s: string]: FilterMetadata } = {};
      filtersDefinition.forEach(filter => {
        const filterMetadata: FilterMetadata = {
          value: filter.value,
          matchMode: filter.filterMatchMode
        };
        eventFilters[filter.field] = filterMetadata;
      });
      return eventFilters;
    } else {
      return null;
    }
  }

  /* private needLoading(event: LazyLoadEvent): boolean {
    let needLoading = this.pageConf.conf.limit !== event.rows ||
      this.pageConf.conf.offset !== event.first;
    if (!needLoading) {
      if (this._filters && !this.previousFilter || !this._filters && this.previousFilter) {
        needLoading = true;
      } else if (this._filters && this.previousFilter) {
        for (const filter of this._filters) {
          if (this.previousFilter.findIndex(e =>
            e.field === filter.field && e.filterMatchMode === filter.filterMatchMode && e.value === filter.value) === -1) {
            needLoading = true;
            break;
          }
        }
      }
    }
    return needLoading;
  } */

  public lazyLoad(event: LazyLoadEvent) {
    console.log("lazyload", event);
    const eventFilters: { [s: string]: FilterMetadata } = this.buildTableEventFilters(this._filters);
    if (event) {
      if (eventFilters && Object.entries(eventFilters).length > 0) {
        event.filters = eventFilters;
      }

      // questo if è il modo più sicuro per fare "event.first === Nan"
      if (event.first !== event.first) {
        event.first = 0;
      }
     /*  if (this.needLoading(event)) { */
        //event.rows = event.rows - 50;
        this.pageConf.conf = {
          limit: event.rows,
          offset: event.first
        };
        const filtersAndSorts: FiltersAndSorts = buildLazyEventFiltersAndSorts(
          event,
          this.cols,
          this.datepipe
        );

        this.loadData(this.pageConf, filtersAndSorts, this._selectedFolder, this._selectedTag, event);
      /* } */
    } else {
      event = {
        rows: this.rowsNmber,
        first: 0
      };
      if (eventFilters) {
        event["filters"] = eventFilters;
      }
      this.pageConf.conf = {
        limit: this.rowsNmber,
        offset: 0
      };
      const filtersAndSorts: FiltersAndSorts = buildLazyEventFiltersAndSorts(
        event,
        this.cols,
        this.datepipe
      );

      this.loadData(this.pageConf, filtersAndSorts, this._selectedFolder, this._selectedTag, event);
    }
    this.previousFilter = this._filters;
    // this.filtering = false;
  }

  trackByFn(index, item) {
    if (item) {
      return item.id;
    }
  }

  buildInitialFilterAndSort(folder: Folder, tag: Tag): FiltersAndSorts {
    const filtersAndSorts: FiltersAndSorts = new FiltersAndSorts();
    if (folder) {
      filtersAndSorts.addFilter(
        new FilterDefinition(
          "messageFolderList.idFolder.id",
          FILTER_TYPES.not_string.equals,
          folder.id
        )
      );
    }
    if (tag) {
      filtersAndSorts.addFilter(
        new FilterDefinition(
          "messageTagList.idTag.id",
          FILTER_TYPES.not_string.equals,
          tag.id
        )
      );
    }
    // escludo i messaggi cancellati logicamente
    filtersAndSorts.addFilter(
      new FilterDefinition(
        "messageFolderList.deleted",
        FILTER_TYPES.not_string.equals,
        false
      )
    );

    // quando effettuo una ricerca generica (avendo selezionato la casella) non vengano considerate le mail nel cestino
    if (tag === null && folder === null) {
      //const folderList = this._selectedPec.folderList;
      filtersAndSorts.addAdditionalData(new AdditionalDataDefinition("OperationRequested", "FiltraSuTuttiFolderTranneTrash"));
      //const cestino = folderList.find(f => f.type === "TRASH");
      
      /* folderList.forEach(f => {
        if (f.type !== "TRASH") {
          filtersAndSorts.addFilter(
            new FilterDefinition("messageFolderList.idFolder.id", FILTER_TYPES.not_string.equals, f.id)
          );
        }
      }); */
    }
    filtersAndSorts.addFilter(
      new FilterDefinition(
        "idPec.id",
        FILTER_TYPES.not_string.equals,
        this._selectedPecId
      )
    );
    filtersAndSorts.addFilter(
      new FilterDefinition(
        "messageType",
        FILTER_TYPES.not_string.equals,
        MessageType.MAIL
      )
    );
    // filtersAndSorts.addSort(new SortDefinition("receiveTime", SORT_MODES.desc));
    // filtersAndSorts.addSort(new SortDefinition("createTime", SORT_MODES.desc));
    filtersAndSorts.addSort(new SortDefinition(this.mailListService.sorting.field, this.mailListService.sorting.sortMode));

    // filtersAndSorts.addSort(new SortDefinition("messageAddressList.address_role", SORT_MODES.desc));
    return filtersAndSorts;
  }

  public handleEvent(name: string, event: any) {
    console.log("handleEvent", name);
    // console.log("this.mailListService.selectedMessages  fuori", this.mailListService.selectedMessages);
    switch (name) {
      // non c'è nella documentazione, ma pare che scatti sempre una sola volta anche nelle selezioni multiple.
      // le righe selezionati sono in this.mailListService.selectedMessages e anche in event
      case "onRowSelect":
      case "selectionChange": // paroladacercare
      case "onRowUnselect":
        event.originalEvent.stopPropagation();
        this.contextMenu.hide();
        // console.log("this.selectionKeys", this.dt.selectionKeys);
        /* setTimeout(() => {
          if (name === "onRowSelect" && event.type === "checkbox" && this.tempSelectedMessages) {
            const self = this;
            this.mailListService.selectedMessages = this.mailListService.selectedMessages.concat(self.tempSelectedMessages.filter(function (item) {
                return self.mailListService.selectedMessages.indexOf(item) < 0;
            }));
          }
          this.tempSelectedMessages = this.mailListService.selectedMessages;
          console.log("this.tempSelectedMessages", this.tempSelectedMessages);
          console.log("this.mailListService.selectedMessages", this.mailListService.selectedMessages); */
          // selezione di un singolo messaggio (o come click singolo oppure come click del primo messaggio con il ctrl)
          //debugger;
            //debugger;
          if (this.mailListService.selectedMessages.length === 1 /* && !this.mailListService.selectedMessages.some(m => m.id === event.data.id) */) {
            const selectedMessage: Message = this.mailListService.selectedMessages[0];
            /* if (event.type === "row") {
              this.mailListService.setSeen(true, true);
            } */
            const emlSource: string = this.getEmlSource(selectedMessage);
            this.messageService.manageMessageEvent(
              emlSource,
              selectedMessage,
              this.mailListService.selectedMessages
            );
          } else {
            this.messageService.manageMessageEvent(null, null, this.mailListService.selectedMessages);
          }
          // this.dt.rows;
          /* this.dt.updateSelectionKeys();
          this.dt.tableService.onSelectionChange(); */
        /* }, 0); */
        break;

        /* this.tempSelectedMessages = this.mailListService.selectedMessages; */
        // break;
      case "onMouseEnter":
        if (this.tagsMenuOpened.registerMenuOpened) {
          this.registrationMenu.hide();
          this.alternativeMenu.hide();
        }
        if (this.tagsMenuOpened.archiveMenuOpened) {
          this.archiviationMenu.hide();
          this.alternativeMenu.hide();
        }
        if (this.tagsMenuOpened.tagMenuOpened) {
          this.tagMenu.hide();
          this.alternativeMenu.hide();
        }
        break;
      case "onContextMenuSelect":
        const s: Message[] = [];
        Object.assign(s, this.mailListService.selectedMessages);
        console.log("dentro on contextmenuselect:", this.mailListService.selectedMessages[0].messageFolderList);
        this.setContextMenuItemLook();
        // workaround per evitare il fatto che la selezione dei messaggi si rompe quando si clicca sul messaggi prima con il tasto sinistro e poi quello destro
        setTimeout(() => {this.mailListService.selectedMessages = s; console.log("dentro timeout:", this.mailListService.selectedMessages[0].messageFolderList); }, 0);
        break;
      case "saveNote":
        this.saveNote();
        break;
    }
  }

  private getEmlSource(message: Message): string {
    let emlSource: string;
    if (message.messageFolderList && message.messageFolderList[0] && message.messageFolderList[0].idFolder.type === FolderType.OUTBOX) {
      emlSource = EMLSOURCE.OUTBOX;
    } else {
      emlSource = EMLSOURCE.MESSAGE;
    }
    return emlSource;
  }

  /**
   * Setto il look del menu contestuale.
   * In particolare attivo e disattivo le varie voci.
   */
  private setContextMenuItemLook() {
    this.cmItems.map(element => {
      if (this.mailListService.selectedMessages.some((message: Message) => !!message["moved"])) {
        element.disabled = true;
      } else {
        // element.disabled = false;
        switch (element.id) {
          case "MessageSeen":
            if (
              this.mailListService.selectedMessages.some((message: Message) => !!!message.seen)
            ) {
              element.label = "Letto";
              element.queryParams = { seen: true };
            } else {
              element.label = "Da Leggere";
              element.queryParams = { seen: false };
            }
            break;
          case "MessageMove":
            element.disabled = false;
            element.styleClass = "message-moves";
            if (!this.mailListService.isMoveActive()) {
              element.disabled = true;
              this.cmItems.find(f => f.id === "MessageMove").items = null;
            } else {
              this.cmItems.find(f => f.id === "MessageMove").items = this.mailListService.buildMoveMenuItems(this.mailListService.folders, this._selectedFolder, this.selectedContextMenuItem);
            }
            break;
          case "MessageLabels":
            element.disabled = false;
            element.styleClass = "message-labels";
            this.cmItems.find(f => f.id === "MessageLabels").items = this.mailListService.buildTagsMenuItems(this.selectedContextMenuItem, this.showNewTagPopup);
            break;
          case "MessageDelete":
            element.disabled = !this.mailListService.isDeleteActive();
            break;
          case "MessageReply":
          case "MessageReplyAll":
          case "MessageForward":
            element.disabled = false;
            if (this.mailListService.selectedMessages.length > 1 || !this.mailListService.isNewMailActive(this._selectedPec)) {
              element.disabled = true;
            }
            break;
          case "MessageRegistration":
            element.disabled = true;
            if (this.mailListService.selectedMessages.length === 1) {
              const selectedMessaage = this.mailListService.selectedMessages[0];
              if (this.mailListService.isRegisterActive(selectedMessaage)) {
                element.disabled = false;
                this.cmItems.find(f => f.id === "MessageRegistration").items = this.mailListService.buildRegistrationMenuItems(selectedMessaage, this._selectedPec, this.selectedContextMenuItem);
              } else {
                this.cmItems.find(f => f.id === "MessageRegistration").items = null;
              }
            }
            break;
          case "MessageNote":
          case "MessageDownload":
            element.disabled = false;
            if (this.mailListService.selectedMessages.length > 1) {
              element.disabled = true;
            }
            break;
          case "ToggleErrorTrue":
            element.disabled = false;
            element.disabled = this.mailListService.isToggleErrorDisabled(true);
            break;
          case "ToggleErrorFalse":
            element.disabled = false;
            element.disabled = !this.mailListService.isToggleErrorDisabled(false);
            break;
          case "MessageReaddress":
            element.disabled = false;
            if (!this.mailListService.isReaddressActive()) {
              element.disabled = true;
            }
            break;
          case "MessageArchive":
            element.disabled = false;
            if (!this.mailListService.isArchiveActive()) {
              element.disabled = true;
              this.cmItems.find(f => f.id === "MessageArchive").items = null;
            } else {
              this.cmItems.find(f => f.id === "MessageArchive").items = this.mailListService.buildAziendeUtenteMenuItems(this._selectedPec, this.selectedContextMenuItem);
            }
            break;
          case "MessageUndelete":
            element.disabled = false;
            if (!this.mailListService.isUndeleteActive()) {
              element.disabled = true;
            }
            break;
        }
      }
    });
    this.cmItems = [...this.cmItems]
  }


  /**
   * Questa funzione si occupa di creare un MenuItem[] che contenga come items la
   * lista delle aziende su cui l'utente loggato ha il permesso redige per la funzione protocolla Pec.
   * Con un futuro refactoring si potrebbe spostare tutto quello che riguarda la protocollazione nel mail-list.service
   * @param command
   */
  /* public buildRegistrationMenuItems(command: (any) => any): MenuItem[] {
    const registrationItems = [];
    this.loggedUser.getAziendeWithPermission(FluxPermission.REDIGE).forEach(codiceAzienda => {
      const azienda = this.loggedUser.getUtente().aziende.find(a => a.codice === codiceAzienda);
      let pIspecDellAzienda = true;
      let pIcon = "";
      let pTitle = "";
      if (!this._selectedPec.pecAziendaList.find(pecAzienda => pecAzienda.fk_idAzienda.id === azienda.id)) {
        pIspecDellAzienda = false;
        pIcon = "pi pi-question-circle";
        pTitle = "L'azienda non è associata alla casella del messaggio selezionato.";
      }
      registrationItems.push(
        {
          label: azienda.nome,
          icon: pIcon,
          id: "MessageRegistration",
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
    return registrationItems;
  } */

  /**
   * Questa funzione si occupa di iniziare la protocollazione del messaggio selezionato.
   * @param event
   */
  public registerMessage(event: any, registrationType: string) {
    console.log("selectedMessages", event, this.mailListService.selectedMessages);
    console.log("loggedUser", this.loggedUser);
    const azienda: Azienda = this.loggedUser.getUtente().aziende.find(a => a.codice === event.item.queryParams.codiceAzienda);
    let decodedUrl = "";
    if (registrationType === "NEW") {
      decodedUrl = decodeURI(azienda.urlCommands["PROTOCOLLA_PEC_NEW"]); // mi dovrei fare le costanti
    } else if (registrationType === "ADD") {
      decodedUrl = decodeURI(azienda.urlCommands["PROTOCOLLA_PEC_ADD"]); // mi dovrei fare le costanti
    }

    decodedUrl = decodedUrl.replace("[id_message]", "null" + ";" + window.btoa(this.mailListService.selectedMessages[0].uuidMessage));

    decodedUrl = decodedUrl.replace("[richiesta]", encodeURIComponent(Utils.genereateGuid()));
    decodedUrl = decodedUrl.replace("[id_sorgente]", encodeURIComponent(this.mailListService.selectedMessages[0].id.toString()));
    decodedUrl = decodedUrl.replace("[pec_ricezione]", encodeURIComponent(this._selectedPec.indirizzo));

    console.log("command", decodedUrl);

    // prova per far recuperare dal branch default per deploy emergenza
    this.mailListService.checkCurrentStatusAndRegister(() => {

      // const encodeParams = attivita.idApplicazione.urlGenerationStrategy === UrlsGenerationStrategy.TRUSTED_URL_WITH_CONTEXT_INFORMATION ||
      //                     attivita.idApplicazione.urlGenerationStrategy === UrlsGenerationStrategy.TRUSTED_URL_WITHOUT_CONTEXT_INFORMATION;
      const encodeParams = false;
      const addRichiestaParam = true;
      const addPassToken = true;
      this.loginService.buildInterAppUrl(decodedUrl, encodeParams, addRichiestaParam, addPassToken, true).subscribe((url: string) => {
        console.log("urlAperto:", url);
      });
      // window.open(decodedUrl);
    },
/*       // Setto subito il tag in modo che l'icona cambi
      if (!this.mailListService.selectedMessages[0].messageTagList) {
        this.mailListService.selectedMessages[0].messageTagList = [];
      }
      const newTag = new Tag();
      newTag.idPec = this.mailListService.selectedMessages[0].idPec;
      newTag.description = "In protocollazione";
      newTag.name = "in_registration";
      newTag.type = "SYSTEM_NOT_INSERTABLE_NOT_DELETABLE";
      const newMessageTag = new MessageTag();
      newMessageTag.idMessage = this.mailListService.selectedMessages[0];
      newMessageTag.idTag = newTag;
      newMessageTag.inserted = new Date();
      this.mailListService.selectedMessages[0].messageTagList.push(newMessageTag);
    }, */
    event.item.queryParams.codiceAzienda);
  }


  /**
   * Manager delle varie funzionalità del contextMenu.
   * Si limita a chiamare il metodo giusto a seconda dell'ItemMenu selezionata.
   * @param event
   */
  private selectedContextMenuItem(event: any) {
    // console.log("check: ", event);
    const menuItem: MenuItem = event.item;
    switch (menuItem.id) {
      case "MessageSeen":
        this.mailListService.setSeen(menuItem.queryParams.seen, true);
        break;
      case "MessageDelete":
          const selectedFolder: Folder = this.pecFolderSelected.data as Folder;
          if (selectedFolder.type === FolderType.TRASH) {
            this.mailListService.deleteSelectedMessageFromTrash();
          } else {
            this.deletingConfirmation();
          }
        break;
      case "MessageMove":
        this.mailListService.moveMessages(event.item.queryParams.folder.id);
        break;
      case "MessageLabels":
        this.checkTagAndConfirm(event.item.queryParams);
        break;
      case "MessageRegistration":
        this.chooseRegistrationType(event, null);
        break;
      case "MessageDownload":
        this.dowloadMessage(this.mailListService.selectedMessages[0]);
        break;
      case "MessageReply":
        this.toolBarService.newMail(TOOLBAR_ACTIONS.REPLY);
        break;
      case "MessageReplyAll":
        this.toolBarService.newMail(TOOLBAR_ACTIONS.REPLY_ALL);
        break;
      case "MessageForward":
        this.toolBarService.newMail(TOOLBAR_ACTIONS.FORWARD);
        break;
      case "MessageReaddress":
        this.mailListService.readdressMessage();
        break;
      case "MessageNote":
        this.noteHandler();
        break;
      case "ToggleErrorTrue":
        this.mailListService.toggleError(true);
        break;
      case "ToggleErrorFalse":
        this.mailListService.toggleError(false);
        break;
      case "MessageUndelete":
        let idPreviousFolder = this.mailListService.selectedMessages[0].messageFolderList[0].fk_idPreviousFolder.id;
        const received = this.mailListService.selectedMessages[0].inOut === "IN" ? true : false;
        if (idPreviousFolder === null && received === true) {
          idPreviousFolder = this._selectedPec.folderList.filter(folder => folder.type === "INBOX")[0].id;
          this.mailListService.moveMessages(idPreviousFolder);
        } else if (idPreviousFolder === null && received === false) {
          idPreviousFolder = this._selectedPec.folderList.filter(folder => folder.type === "SENT")[0].id;
          this.mailListService.moveMessages(idPreviousFolder);
        } else {
          this.mailListService.moveMessages(idPreviousFolder);
        }
        break;
      case "MessageArchive":
        this.archiviationDetail.displayArchiviationDetail = false;
        this.askConfirmationBeforeArchiviation(event);
        break;
    }
  }

  private askConfirmationBeforeArchiviation(event) {
    if (this.mailListService.selectedMessages && this.mailListService.selectedMessages.length === 1 && event && event.item && event.item) {
      if (!event.item.queryParams.isPecDellAzienda) {
        this.confirmationService.confirm({
          header: "Conferma",
          message: "<b>Attenzione! Stai fascicolando su una azienda non associata alla casella selezionata su cui è arrivato il messaggio.</b><br/><br/>Sei sicuro?",
          icon: "pi pi-exclamation-triangle",
          accept: () => {
            this.mailListService.archiveMessage(event);
          }
        });
      } else {
        this.mailListService.archiveMessage(event);
      }
    }
  }

  private checkTagAndConfirm(queryParams) {
    if (queryParams && queryParams.order === 1) { // 1 indica che l'etichetta è applicata, quindi è da rimuovere
      this.confirmationService.confirm({
        message: "Vuoi davvero rimuovere l'etichetta?",
        header: "Conferma",
        icon: "pi pi-exclamation-triangle",
        accept: () => {
          this.mailListService.toggleTag(queryParams.tag, true);
        },
        reject: () => { }
      });
    } else {
      this.mailListService.toggleTag(queryParams.tag, true);
    }
  }

  private showNewTagPopup() {
    this.tagForm = new FormGroup({
      tagName: new FormControl("", Validators.required)
    });
    this.displayNewTagPopup = true;
    setTimeout(() => {
      this.inputTextTag.nativeElement.focus();
      this.setAttribute("idtag", "autocomplete", "false");
    }, 50);
  }

  private setAttribute(feild, attribute, value): void {
    const field = document.getElementById(feild);
    field.setAttribute(attribute, value);
  }

  public noteHandler(specificMessage?: Message) {
    if (specificMessage) {
      this.mailListService.selectedMessages[0] = specificMessage;
    }
    let messageTag: MessageTag = null;
    this.noteObject = new Note();
    this.noteObject.memo = "";
    if (this.mailListService.selectedMessages[0].messageTagList !== null) {
      messageTag = this.mailListService.selectedMessages[0].messageTagList.find(mt => mt.idTag.name === "annotated");
    }
    if (messageTag) {
      this.noteService.loadNote(this.mailListService.selectedMessages[0].id).subscribe(
        res => {
          console.log("RES = ", res);
          if (res && res.results && res.results.length > 0) {
            const notes: Note[] = res.results;
            this.noteObject = notes[0];
          }
          this.showNotePopup();
        },
        err => {
          console.log("ERR = ", err);
        }
      );
    } else {
      this.showNotePopup();
    }
  }

  /**
   * Chiedo conferma sulla cancellazione dei messaggi selezioni.
   * In caso affermativo faccio partire la cancellazione spostamento nel cestino).
   */
  public deletingConfirmation(newMessage?: string) {
    setTimeout(() => {
      const almenoUnoConTag = this.mailListService.selectedMessages
        .some(m => m.messageTagList)
        if(almenoUnoConTag){
          var almenoUnoInErrore = this.mailListService.selectedMessages
            .some(m => m.messageTagList
              .some(mt => mt.idTag.name === "in_error"));
        }else{
          almenoUnoInErrore = false;
        }
      const defaultMessage = almenoUnoInErrore ? "Almeno uno dei messaggi selezionati è in errore, sei sicuro di volerli eliminare" : "Sei sicuro di voler eliminare i messaggi selezionati?"
      if (almenoUnoInErrore) {
        newMessage = "Il messaggio è in errore, sei sicuro di volerlo eliminare?"
      }
      var message: string = newMessage ? newMessage : defaultMessage;
      this.confirmationService.confirm({
        message: message,
        header: "Conferma",
        icon: "pi pi-exclamation-triangle",
        accept: () => {
          this.mailListService.moveMessagesToTrash();
        },
        reject: () => { }
      });  
    }, 0);
  }

  private showNotePopup() {
    this.displayNote = true;
    setTimeout(() => {
      this.noteArea.nativeElement.focus();
    }, 50);
  }

  private saveNote() {
    const previousMessage = this.mailListService.selectedMessages[0];
    this.mailListService.saveNoteAndUpdateTag(this.noteObject).subscribe(
      (res: BatchOperation[]) => {
        console.log("BATCH RES = ", res);
        const messageTag = res.find(op =>
          op.entityPath === BaseUrls.get(BaseUrlType.Shpeck) + "/" + ENTITIES_STRUCTURE.shpeck.messagetag.path);
        if (messageTag && messageTag.operation === BatchOperationTypes.INSERT) {
          if (!previousMessage.messageTagList) {
            previousMessage.messageTagList = [];
          }
          const newTag = new Tag();
          newTag.idPec = previousMessage.idPec;
          newTag.description = "Annotato";
          newTag.name = "annotated";
          newTag.type = "SYSTEM_NOT_INSERTABLE_NOT_DELETABLE";
          const newMessageTag = messageTag.entityBody as MessageTag;
          newMessageTag.idMessage = previousMessage;
          newMessageTag.idTag = newTag;
          newMessageTag.inserted = new Date();
          previousMessage.messageTagList.push(newMessageTag);
        } else if (messageTag && messageTag.operation === BatchOperationTypes.DELETE) {
          previousMessage.messageTagList = previousMessage.messageTagList.filter(m => m.id !== messageTag.id);
        }
        this.mailListService.setIconsVisibility(previousMessage);
        this.messagePrimeService.add(
          { severity: "success", summary: "Successo", detail: "Nota salvata correttamente" });
      },
      err => {
        console.log("ERR = ", err);
        this.messagePrimeService.add(
          { severity: "error", summary: "Errore", detail: "Errore durante il salvaggio, contattare BabelCare", life: 3500 });
      });
    this.displayNote = false;
  }

  /**
   * Scarico il messaggio passato
   * @param selectedMessage
   */
  private dowloadMessage(selectedMessage: Message): void {
    this.messageService.downloadEml(selectedMessage.id, this.getEmlSource(selectedMessage)).subscribe(response => {
      const nomeEmail = "Email_" + selectedMessage.subject + "_" + selectedMessage.id + ".eml";
      Utils.downLoadFile(response, "message/rfc822", nomeEmail, false);
    });
  }

  public onNewTag(tagName: string) {
    console.log("WEV = ", tagName);
    this.mailListService.createAndApplyTag(tagName);
    this.displayNewTagPopup = false;
  }

  public chooseRegistrationType(event, registrationType) {
    if (!registrationType && event) { // vengo dal click sul menu
      if (!event.item.items) {
        if (event.item.queryParams.isPecDellAzienda === false) {
          this.confirmationService.confirm({
            header: "Conferma",
            message: "<b>Attenzione! Stai avviando la protocollazione su una azienda non associata alla casella selezionata su cui è arrivato il messaggio.</b><br/><br/>Sei sicuro?",
            icon: "pi pi-exclamation-triangle",
            accept: () => {
              this.displayProtocollaDialog = true;
              this.registerMessageEvent = event;
            }
          });
        } else {
          this.displayProtocollaDialog = true;
          this.registerMessageEvent = event;
        }
      }
    } else if (registrationType && !event) { // vengo dalla dialog di conferma
      // this.registerMessageEvent questo mi aspetto che sia popolato in quanto devo essere passato al giro prima dal click sul menu
      if (this.registerMessageEvent) {
        this.registerMessage(this.registerMessageEvent, registrationType);
        this.registerMessageEvent = null;
      }
      this.displayProtocollaDialog = false;
    }
  }

  public ngOnDestroy() {
    for (const s of this.subscriptions) {
      s.subscription.unsubscribe();
    }
    this.subscriptions = [];
  }


  /**
   * Dato un message torno lo stato di protocollazione dello stesso
   * @param message
   */
  public getRegistrationStatus(message: Message): string {
    if (!message.messageTagList) {
      // se non ha nessun tag, vado a vedere se è protocollabile
      return this.mailListService.isRegisterActive(message) ? "REGISTRABLE" : "NOT_REGISTRABLE";
    }
    // ha dei tag. restituisco REGISTERED se ha il tag registered, IN_REGISTRATION se ha il tag in_registration, altrimenti guardo se è protocollabile

    const registeredMessageTag: MessageTag = message.messageTagList.find(mt => mt.idTag.name === "registered");
    if (registeredMessageTag) {
      const idAziende: number[] = this.getIdAziendeFromAddtitionalData(registeredMessageTag.additionalData);
      if (Utils.arrayOverlap(idAziende, this.loggedUser.getUtente().aziendeAttive.map(azienda => azienda.id)).length > 0) {
        return "REGISTERED";
      }
    }
    const inRegistrationMessageTag: MessageTag = message.messageTagList.find(mt => mt.idTag.name === "in_registration");
    if (inRegistrationMessageTag) {
      const idAziende: number[] = this.getIdAziendeFromAddtitionalData(inRegistrationMessageTag.additionalData);
      if (Utils.arrayOverlap(idAziende, this.loggedUser.getUtente().aziendeAttive.map(azienda => azienda.id)).length > 0) {
        return "IN_REGISTRATION";
      }
    }
    if (this.mailListService.isRegisterActive(message)) {
      return "REGISTRABLE";
    }
    return "NOT_REGISTRABLE";
    // return message.messageTagList.find(mt => mt.idTag.name === "registered") ? "REGISTERED" :
    //   message.messageTagList.find(mt => mt.idTag.name === "in_registration") ? "IN_REGISTRATION" :
    //     this.mailListService.isRegisterActive(message) ? "REGISTRABLE" : "NOT_REGISTRABLE";
  }

  private getIdAziendeFromAddtitionalData(additionalData: any, res: number[] = []): number[] {
    if ((typeof additionalData) === "string") {
      additionalData = JSON.parse(additionalData);
    }
    if (Array.isArray(additionalData)) {
      additionalData.forEach(a => this.getIdAziendeFromAddtitionalData(a, res));
    } else {
      if (additionalData && additionalData.idAzienda && additionalData.idAzienda.id) {
        res.push(additionalData.idAzienda.id);
      }
    }
    return res;
  }

  /**
   * Questa funzione scatta al click sull'icona di protocollazione.
   * A seconda dello stato del message vengono eseguite diverse azioni.
   * Nel caso venga clickato 'Protocolla ancora' scatta questa funzione col parametro 'true' del menu alternativo.
   * @param event
   * @param message
   * @param registrable
   */
  public iconRegistrationClicked(event: any, message: Message, registrationStatus: string, openAlternativeMenu = false) {
    const messageTag = null;
    debugger;
    if (message) {
      switch (registrationStatus) {
        case "REGISTERED":
          // apro la popup con le informazioni sul tag
          this.prepareAndOpenDialogRegistrationDetail(message);
          break;
        case "REGISTRABLE":
          // apro il menu
          this.aziendeProtocollabiliSubCmItems = this.mailListService.buildRegistrationMenuItems(message, this._selectedPec, this.selectedContextMenuItem);
          if (openAlternativeMenu) {
            this.alternativeMenu.toggle(event);
          } else {
            this.registrationMenu.toggle(event);
          }
          break;
        case "NOT_REGISTRABLE":
          this.messagePrimeService.add({
            severity: "warn",
            summary: "Attenzione",
            detail: "Questo messaggio non può essere protocollato.", life: 3500
          });
          break;
        case "IN_REGISTRATION":
/*           messageTag = message.messageTagList.find(mt => mt.idTag.name === "in_registration");
          if (!messageTag.additionalData || messageTag.additionalData === "{}") {
            this.messagePrimeService.add({
              severity: "warn",
              summary: "Attenzione",
              detail: "Questo messaggio è in fase di protocollazione.", life: 3500
            });
          } else {
          } */
          this.prepareAndOpenDialogRegistrationDetail(message);
          break;
      }
    }
  }

  /**
   * crea il menù con i dettagli di protocollazione, sia per i messaggi protocollati, che per quelli in protocollazione
   * @param message il messaggio interessato
   */
  public prepareAndOpenDialogRegistrationDetail(message: Message) {
    this.registrationDetail = {
      message: undefined,
      additionalData: undefined,
      displayRegistrationDetail: false,
      buttonRegistration: false,
    };

    if (message && message.messageTagList) {
      const registrationDetailsAdditionalData: any[] = [];
      const messageTagRegistered: MessageTag = message.messageTagList.find(mt => mt.idTag.name === "registered");
      const messageTagInRegistration: MessageTag  = message.messageTagList.find(mt => mt.idTag.name === "in_registration");
      const messageTagsRegInReg: MessageTag[] = [];
      if (messageTagRegistered) {
        messageTagsRegInReg.push(messageTagRegistered);
      }
      if (messageTagInRegistration) {
        messageTagsRegInReg.push(messageTagInRegistration);
      }

      messageTagsRegInReg.forEach(mt => {
        const additionalData: any = JSON.parse(mt.additionalData);
        if (additionalData) {
          if (additionalData instanceof Array) {
            additionalData.forEach(element => {
              if (this.loggedUser.getUtente().aziendeAttive.find(a => a.id === element.idAzienda.id) ) {
                registrationDetailsAdditionalData.push(this.buildSingleRegistrationAdditionaData(element, mt));
              }
            });
          } else {
            if (this.loggedUser.getUtente().aziendeAttive.find(a => a.id === additionalData.idAzienda.id) ) {
              registrationDetailsAdditionalData.push(this.buildSingleRegistrationAdditionaData(additionalData, mt));
            }
          }
        }
      });

      if (registrationDetailsAdditionalData.length > 0) {
        this.registrationDetail = {
          message: message,
          additionalData: registrationDetailsAdditionalData,
          displayRegistrationDetail: true,
          buttonRegistration: this.mailListService.isRegisterActive(message),
        };
      }

    }
  }

  private buildSingleRegistrationAdditionaData(additionalDataElement: any, messageTag: MessageTag): any {
    let data = new Date(messageTag.inserted).toLocaleDateString("it-IT", { hour: "numeric", minute: "numeric" });
    if (additionalDataElement.idDocumento && additionalDataElement.idDocumento.dataProtocollo) {
      data = additionalDataElement.idDocumento.dataProtocollo.replace(" ", ", ");
    } else if (additionalDataElement.idDocumento && additionalDataElement.idDocumento.dataProposta) {
      data = additionalDataElement.idDocumento.dataProposta.replace(" ", ", ");
    }
    return {
      numeroProposta: additionalDataElement.idDocumento ? additionalDataElement.idDocumento.numeroProposta : "(informazione non disponibile)",
      numeroProtocollo: additionalDataElement.idDocumento ? additionalDataElement.idDocumento.numeroProtocollo : "(informazione non disponibile)",
      oggetto: additionalDataElement.idDocumento ? additionalDataElement.idDocumento.oggetto : "(informazione non disponibile)",
      descrizioneUtente: additionalDataElement.idUtente ? additionalDataElement.idUtente.descrizione : "(informazione non disponibile)",
      codiceRegistro: additionalDataElement.idDocumento ? additionalDataElement.idDocumento.codiceRegistro : null,
      anno: additionalDataElement.idDocumento ? additionalDataElement.idDocumento.anno : null,
      descrizioneAzienda: additionalDataElement.idAzienda ? additionalDataElement.idAzienda.descrizione : "(informazione non disponibile)",
      data: data
    };
  }

  /**
   * Dato un message torno lo stato di reindirizzamento dello stesso
   * @param message
   */
  public getReaddressStatus(message: Message): string {
    if (!message.messageTagList) {
      return this.mailListService.isReaddressActive(message) ? "READDRESSABLE" : "NOT_READDRESSABLE";
    }
    const readdrresedIn = message.messageTagList.find(mt => mt.idTag.name === "readdressed_in");
    const readdrresedOut = message.messageTagList.find(mt => mt.idTag.name === "readdressed_out");
    if (readdrresedIn && readdrresedOut) {
      return "FULL_READDRESSED";
    }
    if (readdrresedIn) {
      return "READDRESSED_IN";
    }
    if (readdrresedOut) {
      return "READDRESSED_OUT";
    }
    return this.mailListService.isReaddressActive(message) ? "READDRESSABLE" : "NOT_READDRESSABLE";
  }


  /**
   * Questa funzione scatta al click sull'icona di reindirizzamento.
   * A seconda dello stato del message vengono eseguite diverse azioni.
   * @param event
   * @param message
   * @param registrable
   */
  public iconReaddressClicked(event: any, message: Message, readdressStatus: string) {
    switch (readdressStatus) {
      case "FULL_READDRESSED":
      case "READDRESSED_IN":
      case "READDRESSED_OUT":
        this.prepareAndOpenDialogReaddressDetail(message, readdressStatus);
        break;
      case "READDRESSABLE":
        this.mailListService.readdressMessage(message);
        break;
      case "NOT_READDRESSABLE":
        this.messagePrimeService.add({
          severity: "warn",
          summary: "Attenzione",
          detail: "Questo messaggio non può essere reindirizzato.", life: 3500
        });
        break;
    }
  }

  /**
   * Perapato e mostro la popup del dettaglio reindirizzamenti
   * @param message
   * @param readdressStatus
   */
  private prepareAndOpenDialogReaddressDetail(message: Message, readdressStatus: string) {
    this.readdressDetail = {
      displayReaddressDetail: false,
      buttonReaddress: false,
      testo: {
        in: null,
        out: null
      },
      message: message
    };
    this.readdressDetail.buttonReaddress = this.mailListService.isReaddressActive(message);
    this.readdressDetail.testo.in = this.buildMessageReaddres(message, "readdressed_in");
    this.readdressDetail.testo.out = this.buildMessageReaddres(message, "readdressed_out");
    this.readdressDetail.displayReaddressDetail = true;
  }

  private buildMessageReaddres(message, tagName): string {
    let testo = null;
    const messageTag = message.messageTagList.find(mt => mt.idTag.name === tagName);
    if (messageTag) {
      const mtAdditionalData = JSON.parse(messageTag.additionalData);
      if (tagName === "readdressed_in") {
        testo = `<b>${new Date(messageTag.inserted).toLocaleDateString("it-IT", { hour: "numeric", minute: "numeric" })}</b>: `
          + `reindirizzato da ${mtAdditionalData["idUtente"]["descrizione"]}`
          + ` (${mtAdditionalData["idPec"]["indirizzo"]}).`;
      } else if (tagName === "readdressed_out") {
        testo = `<b>${new Date(messageTag.inserted).toLocaleDateString("it-IT", { hour: "numeric", minute: "numeric" })}</b>: `
          + ` ${mtAdditionalData["idUtente"]["descrizione"]} ha reindirizzato a `
          + `${mtAdditionalData["idPec"]["indirizzo"]}.`;
      }
    }
    return testo;
  }

  public isAlreadyTagged(message: Message, tagname: string): boolean {
    if (!message.messageTagList) { return false; }
    return message.messageTagList.some(mt => mt.idTag.name === tagname) ? true : false;
  }

  public getArchiviationStatus(message: Message) {
    if (!message.messageTagList) {
      return this.mailListService.isArchiveActive(message) ? "ARCHIVABLE" : "NOT_ARCHIVABLE";
    }
    return message.messageTagList.find(mt => mt.idTag.name === "archived") ? "ARCHIVED" :
      this.mailListService.isArchiveActive(message) ? "ARCHIVABLE" : "NOT_ARCHIVABLE";
  }


  public iconArchiveClicked(event: any, message: Message, archivedstatus: string) {
    let messageTag = null;
    switch (archivedstatus) {
      case "ARCHIVED":
        messageTag = message.messageTagList.find(mt => mt.idTag.name === "archived");
        this.prepareAndOpenDialogArchiviationDetail(messageTag, JSON.parse(messageTag.additionalData), message);
        break;
      case "ARCHIVABLE":
        this.aziendeFascicolabiliSubCmItems = this.mailListService.buildAziendeUtenteMenuItems(this._selectedPec, this.selectedContextMenuItem);
        this.archiviationMenu.toggle(event);
        break;
      case "NOT_ARCHIVABLE":
        this.messagePrimeService.add({
          severity: "warn",
          summary: "Attenzione",
          detail: "Questo messaggio non può essere fascicolato.", life: 3500
        });
        break;
    }
  }

  public prepareAndOpenDialogArchiviationDetail(messageTag: MessageTag, additionalData: any, message: Message) {
    this.archiviationDetail = {
      displayArchiviationDetail: true,
      buttonArchivable: this.mailListService.isArchiveActive(message),
      message: message,
      additionalData: additionalData
    };
  }


  public getTaggedStatus(message: Message): any {
    if (!message.messageTagList) {
      return false;
    }
    // Se ho almeno un tag CUSTOM o un tag SYSTEM_INSERTABLE_DELETABLE (tranne il tag con name in_error)
    const messagetagList = message.messageTagList.filter(
      mt => {
        return mt.idTag.firstLevel === false && mt.idTag.visible === true;
      });

    if (messagetagList && messagetagList.length > 0) {
      const tagList = messagetagList.map(mt => mt.idTag);
      let tooltip = "Etichette associate:\n";
      tagList.forEach(t => {
        tooltip = tooltip + "- " + t.description + "\n";
      });
      return {tooltip: tooltip};
    } else {
      return false;
    }
  }

  public iconTaggedClicked(event: any, message: Message, taggedStatus: string) {
    this.mailListService.selectedMessages = [message];
    this.tagMenuItems = this.mailListService.buildTagsMenuItems(this.selectedContextMenuItem, this.showNewTagPopup);
    this.tagMenu.toggle(event);
  }

  public tagsMenuStatus(status) {
    switch (status) {
      case "registerMenuOpened":
        this.tagsMenuOpened.registerMenuOpened = true;
        if (this.tagsMenuOpened.archiveMenuOpened) {
          this.archiviationMenu.hide();
        }
        if (this.tagsMenuOpened.tagMenuOpened) {
          this.tagMenu.hide();
        }
        break;
      case "archiveMenuOpened":
        this.tagsMenuOpened.archiveMenuOpened = true;
        if (this.tagsMenuOpened.registerMenuOpened) {
          this.registrationMenu.hide();
          this.alternativeMenu.hide();
        }
        if (this.tagsMenuOpened.tagMenuOpened) {
          this.tagMenu.hide();
        }
        break;
      case "tagsMenuOpened":
        this.tagsMenuOpened.tagMenuOpened = true;
        if (this.tagsMenuOpened.registerMenuOpened) {
          this.registrationMenu.hide();
          this.alternativeMenu.hide();
        }
        if (this.tagsMenuOpened.archiveMenuOpened) {
          this.archiviationMenu.hide();
        }
        break;
    }
  }

  onFixMessageTagInRegistration(event: any, message: Message) {

    this.subscriptions.push({
                      id: message.id,
                      type: "null",
                      subscription: this.mailListService.fixMessageTagInRegistration(message.id).subscribe(res => {
        if (res && res.Response === "Tutto ok") {
          // console.log("onFixMessageTagInRegistration response: ", res);
          this.messagePrimeService.add(
            { severity: "success", summary: "Successo", detail: "Fix fatto correttamente" });
        }
        // fai reload message
        const messageIndex = this.mailListService.messages.findIndex(m => m.id === message.id);

        this.unsubscribeFromMessage(message.id); // disabilito le sottoscrizioni relative al messaggio da ricaricare
        // console.log("message found, refreshing...");
        // ricarico il messaggio tramite una chiamata al backend
        const filterDefinition = new FilterDefinition("id", FILTER_TYPES.not_string.equals, message.id);
        const filter: FiltersAndSorts = new FiltersAndSorts();
        filter.addFilter(filterDefinition);
        this.subscriptions.push({
                          id: message.id,
                          type: "AutoRefresh",
                          subscription: this.messageService.getData(this.mailListService.selectedProjection,
                                                            filter,
                                                            null,
                                                            null).subscribe((data: any) => {
          if (data && data.results) {
            const newMessage = data.results[0];
            // ricarico le icome relative ai tag
            this.mailListService.setMailTagVisibility([newMessage]);

            // aggiorno il messaggio nella lista inserendo quello ricaricato
            this.mailListService.messages[messageIndex] = newMessage;

            // se il messaggio è anche presente nei messaggi selezioni, lo sostituisco anche lì
            const smIndex = this.mailListService.selectedMessages.findIndex(sm => sm.id === newMessage.id);
            if (smIndex >= 0) {
              this.mailListService.selectedMessages[smIndex] = newMessage;
            }
          }
        },
        err => {
          // show error message
          this.messagePrimeService.add(
            { severity: "error", summary: "Errore", detail: "Errore durante il ricaricamento della mail"});
        }
        )});
      },
        err => {
          // show error message
          this.messagePrimeService.add(
            { severity: "error", summary: "Errore", detail: "Errore durante il fix del tag", life: 3500 });
        })
    });
  }



  /**
   * Gestione dei bottoni freccia su e giù.
   * Seleziono il messaggio e lo setto focused
   * @param direction 
   */
  public arrowPress(direction: string) {
    console.log("qua ci sono")
    if (this.mailListService.selectedMessages.length > 0) {
      const actualMessageIndex: number = this.mailListService.messages.findIndex(m => m.id === this.mailListService.selectedMessages[0].id);
      if (actualMessageIndex >= 0) {
        switch (direction) {
          case 'up':
            if (actualMessageIndex > 0) {
              setTimeout(() => {
              this.mailListService.selectedMessages = [this.mailListService.messages[actualMessageIndex - 1]];
              this.mailListService.selectedMessages = [...this.mailListService.selectedMessages];
              this.setRowFocused(this.mailListService.messages[actualMessageIndex - 1].id);
              this.manageMessageSelection( this.mailListService.selectedMessages[0]);
              }, 0);
            }
            break;
          case 'down': 
            if (actualMessageIndex < this.mailListService.messages.length - 1) {
              this.mailListService.selectedMessages = [this.mailListService.messages[actualMessageIndex + 1]];
              this.mailListService.selectedMessages = [...this.mailListService.selectedMessages];
              this.setRowFocused(this.mailListService.messages[actualMessageIndex + 1].id);
              this.manageMessageSelection( this.mailListService.selectedMessages[0]);
            }
            break;
        }
      }
    }
  }

  // Cerco la riga indicata dall'id -> la setto focused -> se necessario scrollo
  public setRowFocused(idRiga: number) {
    let rows = document.getElementsByClassName('riga-tabella') as any;
    for (const row of rows) {
      if (+row.attributes.name.value === idRiga) {
        if (row.rowIndex < 1) {
          this.dt.el.nativeElement.getElementsByClassName("p-datatable-virtual-scrollable-body")[0].scrollTop = 
                this.dt.el.nativeElement.getElementsByClassName("p-datatable-virtual-scrollable-body")[0].scrollTop - this.virtualRowHeight / 2;
        }
        row.focus();
        
      }
    }
  }

  /**
   * Gestione del focus sulle mail. Quando una mail riceve il focus:
   * - Gli do tabindex 0
   * - Tramite timeout setto il messaggio come letto
   * - Invio evento di selezione messaggio
   * @param event 
   * @param rowData 
   */
  public onRowFocus(event, rowData: Message) { //paroladacercare
    setTimeout(() => {
      this.setAccessibilityProperties(false);
      event.srcElement.setAttribute('tabindex', 0);
      event.srcElement.setAttribute("aria-selected", true)

      if (!this.mailListService.selectedMessages.some(m => m.id === rowData.id)) {
        this.manageMessageSelection(rowData);
      }
    }, 0);
  }

  private manageMessageSelection(rowData) {
    //debugger;
    clearTimeout(this.timeoutOnFocusEvent);
    this.contextMenu.hide();
    const emlSource: string = this.getEmlSource(rowData);
    this.messageService.manageMessageEvent(
      emlSource,
      rowData,
      this.mailListService.selectedMessages
    );
    if (!rowData.seen) {
      this.timeoutOnFocusEvent = setTimeout(() => {
        if (this.mailListService.selectedMessages.length === 1) { 
          this.mailListService.setSeen(true, true);
        }
      }, 350);
    }
  }

  /**
   * Questa funzione si occupa di settare le proprietà che servono
   * all'accessibilità della pagina.
   * @param firstTime 
   */
  private setAccessibilityProperties(firstTime: boolean): void {

    // Uso questo if per assicurarmi che la tabella sia caricata nel DOM
    if ((document.getElementsByClassName('cdk-virtual-scroll-content-wrapper') as any)[0]) {

      // NB Il ruolo della tabella è listbox perché quello table non funziona bene per il nostro caso.

      // Setto il numero totale di record ed il ruolo rowgrup al contenitore delle righe
      //(document.getElementsByClassName('ui-table-scrollable-body-table') as any)[0].setAttribute("aria-rowcount", this.mailListService.totalRecords);
      (document.getElementsByClassName('cdk-virtual-scroll-content-wrapper') as any)[0].setAttribute("aria-label", "Lista email");
      //(document.getElementsByClassName('ui-table-scrollable-body-table') as any)[0].setAttribute("role", "treegrid");
      //(document.getElementsByClassName('ui-table-tbody') as any)[1].setAttribute("role", "rowgroup");
      (document.getElementsByClassName('p-datatable-tbody') as any)[1].setAttribute("role", "listbox");

      // Setto le righe non raggiungibili col tab
      let rows = document.getElementsByClassName('riga-tabella') as any;
      for (const row of rows) {
        row.setAttribute('tabindex', -1);
        row.setAttribute("aria-selected", false)
        //row.setAttribute('aria-rowindex', +row.getAttribute("ng-reflect-index") + 1); 
        row.setAttribute('role', "option");
        row.setAttribute('aria-posinset', +row.getAttribute("ng-reflect-index") + 1);
        row.setAttribute('aria-level', null);
        row.setAttribute('aria-setsize', this.mailListService.totalRecords);
      }

      // Se il parametro firstTime è true setto la prima riga come tabbabile
      if (firstTime && rows && rows[0]) {
        rows[0].setAttribute('tabindex', 0);
      }

      // Ora mi occupo dei checkbox, non li voglio trovare col tab
      rows = document.getElementsByClassName('p-hidden-accessible') as any;
      for (const row of rows) {
        row.getElementsByTagName("input")[0].setAttribute('tabindex', -1); 
      }
    }

  }

  public stopPropagation(event) {
    console.log("Stop propagation")
    event.preventDefault();
    event.stopPropagation();
  }
}
