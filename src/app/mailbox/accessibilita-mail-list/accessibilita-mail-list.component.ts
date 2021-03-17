import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from "@angular/core";
import { NtJwtLoginService, UtenteUtilities } from '@bds/nt-jwt-login';
import { Subscription } from 'rxjs';
import { SettingsService } from 'src/app/services/settings.service';
import { ShpeckMessageService, MessageEvent } from 'src/app/services/shpeck-message.service';
import { MailFoldersService, PecFolder, PecFolderType } from '../mail-folders/mail-folders.service';
import { MailListService } from '../mail-list/mail-list.service';
import { ToolBarService } from '../toolbar/toolbar.service';
import { AppCustomization } from "src/environments/app-customization";
import {BaseUrls, BaseUrlType, EMLSOURCE, FONTSIZE, TOOLBAR_ACTIONS} from "src/environments/app-constants";
import { MailboxService, Sorting } from '../mailbox.service';
import { Table } from 'primeng-lts/table';
import {IntimusClientService, IntimusCommand, IntimusCommands, RefreshMailsParams, RefreshMailsParamsEntities, RefreshMailsParamsOperations} from "@bds/nt-communicator";
import {ConfirmationService, FilterMetadata, LazyLoadEvent, MenuItem, MessageService} from "primeng-lts/api";
import { BatchOperation, BatchOperationTypes, FILTER_TYPES, FilterDefinition, FiltersAndSorts, PagingConf, SortDefinition } from "@nfa/next-sdr";
import { buildLazyEventFiltersAndSorts } from "@bds/primeng-plugin";
import { DatePipe } from "@angular/common";
import {Azienda, ENTITIES_STRUCTURE, Folder, FolderType, Menu, Message, MessageTag, MessageType, Note, Pec, Tag} from "@bds/ng-internauta-model";
import { ContextMenu } from "primeng-lts/contextmenu";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { Utils } from "src/app/utils/utils"; 
import { NoteService } from "src/app/services/note.service";
import { elementAt } from "rxjs/operators";

@Component({
  selector: 'accessibilita-mail-list',
  templateUrl: './accessibilita-mail-list.component.html',
  styleUrls: ['./accessibilita-mail-list.component.scss']
})
export class AccessibilitaMailListComponent implements OnInit, OnDestroy {

  public cmItems: MenuItem[] = [
    {
      label: "NOT_SET",
      id: "MessageSeen",
      disabled: false,
      queryParams: {}
    },
    {
      label: "Rispondi",
      id: "MessageReply",
      disabled: true,
      queryParams: {}
    },
    {
      label: "Rispondi a tutti",
      id: "MessageReplyAll",
      disabled: true,
      queryParams: {}
    },
    {
      label: "Inoltra",
      id: "MessageForward",
      disabled: true,
      queryParams: {}
    },
    {
      label: "Protocolla",
      id: "MessageRegistration",
      disabled: true,
      queryParams: {}
    },
    {
      label: "Sposta",
      id: "MessageMove",
      disabled: true,
      queryParams: {}
    },
    {
      label: "Etichette",
      id: "MessageLabels",
      disabled: true,
      items: [] as MenuItem[],
      queryParams: {}
    },
    {
      label: "Elimina",
      id: "MessageDelete",
      disabled: true,
      queryParams: {}
    },
    {
      label: "Segna come errore visto",
      id: "ToggleErrorFalse",
      disabled: true,
      queryParams: {}
    },
    {
      label: "Segna come errore non visto",
      id: "ToggleErrorTrue",
      disabled: true,
      queryParams: {}
    },
    {
      label: "Nota",
      id: "MessageNote",
      disabled: false,
      queryParams: {}
    },
    {
      label: "Scarica",
      id: "MessageDownload",
      disabled: true,
      queryParams: {}
    },
    {
      label: "Fascicola",
      id: "MessageArchive",
      disabled: true,
      queryParams: {}
    },
    {
      label: "Reindirizza",
      id: "MessageReaddress",
      disabled: true,
      queryParams: {}
    },
    {
      label: "Ripristina",
      id: "MessageUndelete",
      disabled: true,
      queryParams: {}
    }
  ];
  
  public cols = [
    {
      field: "subject",
      header: "Oggetto",
      filterMatchMode: FILTER_TYPES.string.containsIgnoreCase,
      width: "85px",
      minWidth: "85px"
    }
  ];

  private tagsMenuOpened = {
    registerMenuOpened : false,
    archiveMenuOpened : false,
    tagMenuOpened : false
  };

  public archiviationDetail: any = {
    displayArchiviationDetail: false,
    buttonArchivable: false,
    message: null,
    additionalData: null
  };

  private subscriptions: { id: number, type: string, subscription: Subscription }[] = [];
  private pecFolderSelected: PecFolder;
  public _selectedPecId: number;
  public _selectedPec: Pec;
  public _selectedFolder: Folder;
  public _selectedTag: Tag;
  private primavolta = true;
  public mostratable = false;
  public _filters: FilterDefinition[];
  private foldersSubCmItems: MenuItem[] = [];
  public tagForm;
  public aziendeProtocollabiliSubCmItems: MenuItem[] = [];
  private loggedUser: UtenteUtilities;
  public loggedUserIsSuperD: boolean = false;
  public openDetailInPopup = false;
  public loading = false;
  public noteObject: Note = new Note();
  public displayNote: boolean = false;
  public displayNewTagPopup: boolean = false;
  public displayDetailPopup = false;
  private registerMessageEvent: any = null;
  public displayProtocollaDialog = false;
  private timeoutOnFocusEvent = null;
  public fontSize = FONTSIZE.BIG;
  private previousFilter: FilterDefinition[] = [];
  private VIRTUAL_ROW_HEIGHTS = {
    small: 79,
    medium: 84,
    big: 89
  };
  public virtualRowHeight: number = this.VIRTUAL_ROW_HEIGHTS[FONTSIZE.BIG];
  public first = 0;
  public rows = 10;
  public last = 0;
  public rowsNmber = 50;

  @ViewChild("dt", {}) private dt: Table;
  @ViewChild("cm", {}) private contextMenu: ContextMenu;
  @ViewChild("selRow", {}) private selRow: ElementRef;
  @ViewChild("noteArea", {}) private noteArea;
  @ViewChild("idtag", {}) private inputTextTag;
  @ViewChild("registrationMenu", {}) private registrationMenu: Menu;
  @ViewChild("archiviationMenu", {}) private archiviationMenu: Menu;
  @ViewChild("tagMenu", {}) private tagMenu: Menu;
  
  public folderTypeOutbox: String = FolderType.OUTBOX;
  public folderTypeSent: String = FolderType.SENT;
  public folderTypeInbox: String = FolderType.INBOX;

  constructor(
    public mailListService: MailListService,
    private mailFoldersService: MailFoldersService,
    private toolBarService: ToolBarService,
    private loginService: NtJwtLoginService,
    private mailboxService: MailboxService,
    private datepipe: DatePipe,
    private noteService: NoteService,
    private settingsService: SettingsService,
    private intimusClient: IntimusClientService,
    private messagePrimeService: MessageService,
    public confirmationService: ConfirmationService,
    private messageService: ShpeckMessageService
  ) {
    this.selectedContextMenuItem = this.selectedContextMenuItem.bind(this);
    this.showNewTagPopup = this.showNewTagPopup.bind(this);
  }
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.subscription.unsubscribe());
    this.subscriptions = [];
  }
  
  ngOnInit() {
    console.log("folderTypeSent", FolderType.SENT);
    console.log("folderTypeOutbox", FolderType.OUTBOX);
    this.subscriptions.push({id: null, type: "pecFolderSelected", subscription: this.mailFoldersService.pecFolderSelected.subscribe((pecFolderSelected: PecFolder) => {
      this.mailListService.selectedMessages=[];
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
    })
    });
    this.subscriptions.push({id: null, type: "messageEvent", subscription: this.messageService.messageEvent.subscribe(
      (messageEvent: MessageEvent) => {

      })
    });
    
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
    })});
    console.log("GUSGUSGUSGUSGUS");
    console.log(this.mailListService.messages);
    
  }

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
        if (this.primavolta) {
          this.primavolta = false;
          this.mostratable = true;
        } else {

        }
      }
    }, 0);
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

      }
    }, 0);
  }

next() {
    this.first = this.first + this.rows;
}

prev() {
    this.first = this.first - this.rows;
}

reset() {
    this.first = 0;
}

isLastPage(): boolean {
    return this.mailListService.messages ? this.first === (this.mailListService.messages.length - this.rows): true;
}

isFirstPage(): boolean {
    return this.mailListService.messages ? this.first === 0 : true;
}
  
private setFilters(filters: FilterDefinition[]) {
  this.mostratable = false;
  this._filters = null;
  this.mailListService.selectedMessages = [];
  this.mailListService.messages = [];
  setTimeout(() => {
    this._filters = filters;
    this.mostratable = true;
    if (filters) {

    }
  }, 0);
}
  
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
        this.pageConf.conf = {
          page: event.first / event.rows,
          size: event.rows
        };
        const filtersAndSorts: FiltersAndSorts = buildLazyEventFiltersAndSorts(
          event,
          this.cols,
          this.datepipe
        );

        this.loadData(this.pageConf, filtersAndSorts, this._selectedFolder, this._selectedTag, event);
        
    } else {
      event = {
        rows: this.rowsNmber,
        first: 0
      };
      if (eventFilters) {
        event["filters"] = eventFilters;
      }
      this.pageConf.conf = {
        page: 0,
        size: event.rows
      };
      const filtersAndSorts: FiltersAndSorts = buildLazyEventFiltersAndSorts(
        event,
        this.cols,
        this.datepipe
      );

      this.loadData(this.pageConf, filtersAndSorts, this._selectedFolder, this._selectedTag, event);
        
    }
    this.previousFilter = this._filters;
  }

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

  private manageIntimusInsertCommand(command: IntimusCommand, ignoreSameUserCheck: boolean = false, times: number = 1) {
    console.log("manageIntimusInsertCommand");
    const params: RefreshMailsParams = command.params as RefreshMailsParams;
    /*
     * se non sono io ad aver fatto l'azione o devo ignorare il controllo e
     * sul messaggio è cambiato il tag e io sto guardando quel tag, oppure
     * sul messaggio è cambiata la cartella e sto guardando quella cartella
    */
    if ((ignoreSameUserCheck || (params.newRow && params.newRow["id_utente"] !== this.loggedUser.getUtente().id)) &&
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
      this.subscriptions.push({
        id: idMessage, type: "AutoRefresh", subscription: this.messageService.getData(this.mailListService.selectedProjection, filter, null, null).subscribe((data: any) => {
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
    }
  }


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
      }
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
  
    private pageConf: PagingConf = {
      mode: "PAGE",
      conf: {
        page: 0,
        size: 0
      }
    };
  
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
            console.log("data", data);
            this.mailListService.totalRecords = data.page.totalElements;
            // mando l'evento con il numero di messaggi (serve a mailbox-component perché lo deve scrivere nella barra superiore)
            this.mailListService.refreshAndSendTotalMessagesNumber(0, folderSelected);
            this.mailListService.messages = data.results;
            // Array.prototype.splice.apply(this.mailListService.messages, [...[event.first, event.rows], ...data.results]);
            //trigger change detection
            // this.mailListService.messages = [...this.mailListService.messages];
            console.log("this.mailListService.messages", this.mailListService.messages);
            this.mailListService.setMailTagVisibility(this.mailListService.messages);
            this.mailFoldersService.doReloadTag(this.mailListService.tags.find(t => t.name === "in_error").id);

            
          }
          this.loading = false;
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
        const folderList = this._selectedPec.folderList;
  
        folderList.forEach(f => {
          if (f.type !== "TRASH") {
            filtersAndSorts.addFilter(
              new FilterDefinition("messageFolderList.idFolder.id", FILTER_TYPES.not_string.equals, f.id)
            );
          }
        });
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
  
    private setAccessibilityProperties(firstTime: boolean): void {

      // Uso questo if per assicurarmi che la tabella sia caricata nel DOM
      if ((document.getElementsByClassName('cdk-virtual-scroll-content-wrapper') as any)[0]) {
        (document.getElementsByClassName('cdk-virtual-scroll-content-wrapper') as any)[0].setAttribute("aria-label", "Lista email");
        (document.getElementsByClassName('p-datatable-tbody') as any)[1].setAttribute("role", "listbox");
  
        // Setto le righe non raggiungibili col tab
        let rows = document.getElementsByClassName('riga-tabella') as any;
        for (const row of rows) {
          row.setAttribute('tabindex', -1);
          row.setAttribute("aria-selected", false)
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
  
    private unsubscribeFromMessage(idMessage: number) {
      const subscriptionIndex: number = this.subscriptions.findIndex(s => s.id === idMessage);
      if (subscriptionIndex >= 0) {
        this.subscriptions[subscriptionIndex].subscription.unsubscribe();
        this.subscriptions.splice(subscriptionIndex, 1);
      }
    }
  
    public handleEvent(name: string, event: any) {
      console.log("handleEvent", name);
      switch (name) {
        case "onRowSelect":
          break;
        case "selectionChange":
          break;
        case "onRowUnselect":
          event.originalEvent.stopPropagation();
          this.contextMenu.hide();
          if (this.mailListService.selectedMessages.length === 1) {
              const selectedMessage: Message = this.mailListService.selectedMessages[0];
              const emlSource: string = this.getEmlSource(selectedMessage);
              this.messageService.manageMessageEvent(
                emlSource,
                selectedMessage,
                this.mailListService.selectedMessages
              );
            } else {
              this.messageService.manageMessageEvent(null, null, this.mailListService.selectedMessages);
            }
          break;
        case "onContextMenuSelect":
          const s: Message[] = [];
          Object.assign(s, this.mailListService.selectedMessages);
          this.setContextMenuItemLook();
          setTimeout(() => {this.mailListService.selectedMessages = s; }, 0);
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
  
    public deletingConfirmation(newMessage?: string) {
      const message: string = newMessage ? newMessage : "Sei sicuro di voler eliminare i messaggi selezionati?";
      this.confirmationService.confirm({
        message: message,
        header: "Conferma",
        icon: "pi pi-exclamation-triangle",
        accept: () => {
          this.mailListService.moveMessagesToTrash();
        },
        reject: () => { }
      });
    }
  
    private setAttribute(feild, attribute, value): void {
      const field = document.getElementById(feild);
      field.setAttribute(attribute, value);
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
  
    private dowloadMessage(selectedMessage: Message): void {
      this.messageService.downloadEml(selectedMessage.id, this.getEmlSource(selectedMessage)).subscribe(response => {
        const nomeEmail = "Email_" + selectedMessage.subject + "_" + selectedMessage.id + ".eml";
        Utils.downLoadFile(response, "message/rfc822", nomeEmail, false);
      });
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
      this.mailListService.checkCurrentStatusAndRegister(() => {
        const encodeParams = false;
        const addRichiestaParam = true;
        const addPassToken = true;
        this.loginService.buildInterAppUrl(decodedUrl, encodeParams, addRichiestaParam, addPassToken, true).subscribe((url: string) => {
          console.log("urlAperto:", url);
        });
        // window.open(decodedUrl);
      },
      event.item.queryParams.codiceAzienda);
    }
  
    private showNotePopup() {
      this.displayNote = true;
      setTimeout(() => {
        this.noteArea.nativeElement.focus();
      }, 50);
    }
    trackByFn(index, item) {
      if (item) {
        return item.id;
      }
    }
  
    public arrowPress(direction: string) {
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
                }, 0);
              }
              break;
            case 'down': 
              if (actualMessageIndex < this.mailListService.messages.length - 1) {
                this.mailListService.selectedMessages = [this.mailListService.messages[actualMessageIndex + 1]];
                this.mailListService.selectedMessages = [...this.mailListService.selectedMessages];
                this.setRowFocused(this.mailListService.messages[actualMessageIndex + 1].id);
              }
              break;
          }
        }
      }
    }
  
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
  
    public onRowFocus(event, rowData: Message) {
      setTimeout(() => {
        this.setAccessibilityProperties(false);
        event.srcElement.setAttribute('tabindex', 0);
        event.srcElement.setAttribute("aria-selected", true)
  
        if (!this.mailListService.selectedMessages.some(m => m.id === rowData.id)) {
          clearTimeout(this.timeoutOnFocusEvent);
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
      }, 0);
    }
    
    public openDetailPopup(event, row, message) {
      if (this.openDetailInPopup) {
        this.displayDetailPopup = true;
      }
    }
  
  public buildAddressColumn(message: Message, tags:boolean): string[] { 
    let addressColumn: string[] = [];
    let TO: string = "";
    let CC: string = "";
    let FROM: string = "";
    
    if (message.inOut === "IN") { 
      message.messageAddressList.forEach(ele => {
        if (ele.addressRole === "FROM") {
          FROM = FROM + ele.idAddress.mailAddress;
        }
      });
      if (tags) {
        FROM = "FROM: " + FROM; 
      }
      addressColumn.push(FROM);
    } else {
      message.messageAddressList.forEach(ele => {
        if (ele.addressRole === "TO") {
          if (TO === "") {
            TO = ele.idAddress.mailAddress;
          } else {
            TO = TO + "; " + ele.idAddress.mailAddress;
          }
        } else if (ele.addressRole === "CC") {
          if (CC === "") {
            CC = ele.idAddress.mailAddress;
          } else {
            CC = CC + "; " + ele.idAddress.mailAddress;
          }
          
        }
      });
      addressColumn.push("TO: " + TO);
      if (CC !== "") {
        addressColumn.push("CC: " + CC);
        
      }
    }

    return addressColumn;
  }
  
}
