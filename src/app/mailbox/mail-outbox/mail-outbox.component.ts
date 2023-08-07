import { Component, OnInit, Input, OnDestroy, ViewChild } from "@angular/core";
import { FilterDefinition, FILTER_TYPES, PagingConf, SORT_MODES, FiltersAndSorts, SortDefinition } from "@bds/next-sdr";
import { ENTITIES_STRUCTURE, Outbox } from "@bds/internauta-model";
import { Subscription } from "rxjs";
import { Sorting, MailboxService, TotalMessageNumberDescriptor } from "../mailbox.service";
import { Table } from "primeng/table";
import { OutboxLiteService } from "src/app/services/outbox-lite.service";
import { SettingsService } from "src/app/services/settings.service";
import { DatePipe } from "@angular/common";
import { OutboxService } from "src/app/services/outbox.service";
import { FilterMetadata, LazyLoadEvent } from "primeng/api";
import { buildLazyEventFiltersAndSorts } from "@bds/primeng-plugin";
import { AppCustomization } from "src/environments/app-customization";
import { PecFolder, MailFoldersService, PecFolderType } from "../mail-folders/mail-folders.service";
import { IntimusClientService, IntimusCommand, IntimusCommands, RefreshMailsParams, RefreshMailsParamsOperations, RefreshMailsParamsEntities } from '@bds/common-tools';

@Component({
  selector: "app-mail-outbox",
  templateUrl: "./mail-outbox.component.html",
  styleUrls: ["./mail-outbox.component.scss"]
})
export class MailOutboxComponent implements OnInit, OnDestroy {

  public _selectedPecId: number;
  @Input("pecId")
  set selectedPecId(pecId: number) {
    this._selectedPecId = null;
    setTimeout(() => {
      this._selectedPecId = pecId;
      this.loadData(null);
    });
  }

  public pecFolderSelected: PecFolder;

  @ViewChild("ot", {}) private ot: Table;
  private previousFilter: FilterDefinition[] = [];
  private selectedProjection: string =
    ENTITIES_STRUCTURE.shpeck.outboxLite.standardProjections.OutboxLiteWithIdPec;

  public _filters: FilterDefinition[];

  private subscriptions: {id: number, type: string, subscription: Subscription}[] = [];
  public loading = false;
  public virtualRowHeight: number = 70;
  public totalRecords: number;
  public rowsNmber = 10;
  public selectedOutboxMails: Outbox[];
  public outboxMails: Outbox[] = [];
  public cols = [
    {
      field: "subject",
      header: "Oggetto",
      filterMatchMode: FILTER_TYPES.string.containsIgnoreCase,
      width: "5.313rem",
      minWidth: "5.313rem"
    }
  ];
  public displayDetailPopup = false;
  public openDetailInPopup = false;
  private pageConf: PagingConf = {
    mode: "LIMIT_OFFSET",
    conf: {
      limit: 0,
      offset: 0
    }
  };
  private sorting: Sorting = {
    field: "receiveTime",
    sortMode: SORT_MODES.desc
  };

  constructor(private outboxLiteService: OutboxLiteService,
    private settingsService: SettingsService,
    private datepipe: DatePipe,
    private mailboxService: MailboxService,
    private outboxService: OutboxService,
    private mailFoldersService: MailFoldersService,
    private intimusClient: IntimusClientService
  ) { }

  ngOnInit() {
    this.selectedOutboxMails = [];

    this.subscriptions.push({id: null, type: "outboxServiceReload", subscription: this.outboxService.reload.subscribe(idOutboxMail => {
      this.selectedOutboxMails = [];
      idOutboxMail ? this.loadData(null, null, idOutboxMail) : this.loadData(null);
    })});
    this.subscriptions.push({id: null, type: "pecFolderSelected", subscription: this.mailFoldersService.pecFolderSelected.subscribe((pecFolderSelected: PecFolder) => {
      this.pecFolderSelected = pecFolderSelected;
    })});
    this.subscriptions.push({id: null, type: "settingsChangedNotifier", subscription: this.settingsService.settingsChangedNotifier$.subscribe(newSettings => {
      this.openDetailInPopup = newSettings[AppCustomization.shpeck.hideDetail] === "true";
    })});

    this.subscriptions.push({id: null, type: "sorting", subscription: this.mailboxService.sorting.subscribe((sorting: Sorting) => {
      if (sorting) {
        this.sorting = sorting;
        if (this.ot && this.ot.el && this.ot.el.nativeElement) {
          this.ot.el.nativeElement.getElementsByClassName("ui-table-scrollable-body")[0].scrollTop = 0;
        }
        this.lazyLoad(null);
      }
    })});
    this.subscriptions.push({id: null, type: "intimusClient.command", subscription: this.intimusClient.command$.subscribe((command: IntimusCommand) => {
      this.manageIntimusCommand(command);
    })});

    if (this.settingsService.getImpostazioniVisualizzazione()) {
      this.openDetailInPopup = this.settingsService.getHideDetail() === "true";
    }
  }

  /**
   * gestisce un comando intimus
   * @param command il comando ricevuto
   */
  private manageIntimusCommand(command: IntimusCommand) {
    switch (command.command) {
      case IntimusCommands.RefreshMails: // comando di refresh delle mail
        const params: RefreshMailsParams = command.params as RefreshMailsParams;
        if (params.entity === RefreshMailsParamsEntities.OUTBOX) {
        switch (params.operation) {
          case RefreshMailsParamsOperations.INSERT:
            console.log("INSERT");
            this.manageIntimusInsertCommand(params);
            break;
          case RefreshMailsParamsOperations.UPDATE:
            console.log("UPDATE");
            this.manageIntimusUpdateCommand(params);
            break;
          case RefreshMailsParamsOperations.DELETE:
            console.log("DELETE");
            this.manageIntimusDeleteCommand(params);
            break;
        }
        // this.refreshOtherBadgeAndDoOtherOperation(params);
        break;
      }
    }
  }

  /**
   * gestisce l'inserimento di un messaggio nella lista dei messaggi che sto guardando
   * @param command i parametri del comando intimus arrivato
   * @param times uso interno, serve per dare un limite alle chiamate ricorsive del metodo nel caso il messaggio da inserire non c'è ancora sul database
   */
  private manageIntimusInsertCommand(params: RefreshMailsParams, times: number = 1) {
    console.log("manageIntimusInsertCommand");
    /*
     * se sto guardando l'outbox della pec interessata dal comando
    */
    if (params.newRow["id_pec"] && this.pecFolderSelected.type === PecFolderType.FOLDER && params.newRow["id_pec"] === this.pecFolderSelected.pec.id) {
      // chiedo il messaggio al backend
      const idOutbox: number = params.newRow["id"];
      const filterDefinition = new FilterDefinition("id", FILTER_TYPES.not_string.equals, idOutbox);
      const filter: FiltersAndSorts = new FiltersAndSorts();
      filter.addFilter(filterDefinition);
      this.subscriptions.push({id: idOutbox, type: "AutoRefresh", subscription: this.outboxLiteService.getData(this.selectedProjection, filter, null, null).subscribe((data: any) => {
        /*
         * può capitare che il comando arrivi prima che la transazione sia conclusa, per cui non troverei il messaggio sul database.
         * Se capita, riprovo dopo 30ms per un massimo di 10 volte
        */
        if (!data || !data.results || data.results.length === 0) {
          console.log("message not ready");
          if (times <= 10) {
            console.log(`rescheduling after ${30 * times}ms for the ${times} time...`);
            setTimeout(() => {
              this.manageIntimusInsertCommand(params, times + 1);
            }, 30 * times);
          } else {
            console.log("too many tries, stop!");
          }
          return;
        }
        console.log("message ready, proceed...");

        const newMessage = data.results[0];
        // TODO: probabilmente è da togliere questo caso, perché deriva dal copia-incolla della gestione in mail-list-component
        // cerco il messaggio perché potrebbe essere già nella cartella disabilitato (ad esempio se qualcuno l'ha spostato e poi rispostato in questa cartella mentre io la guardo)
        console.log("searching message in list...");
        const messageIndex = this.outboxMails.findIndex(m => m.id === idOutbox);
        if (messageIndex >= 0) { // se lo trovo lo riabilito
          console.log("message found, updating...");
          this.outboxMails.splice(messageIndex, 1, newMessage);
        } else { // se non lo trovo lo inserisco in testa
          console.log("message not found in list, pushing on top...");
          this.outboxMails.unshift(newMessage);

          this.totalRecords++; // ho aggiunto un messaggio per cui aumento di uno il numero dei messaggi visualizzati
          // mando l'evento con il numero di messaggi (serve a mailbox-component perché lo deve scrivere nella barra superiore)
          this.mailboxService.setTotalMessageNumberDescriptor({
            messageNumber: this.totalRecords,
            pecFolder: this.pecFolderSelected // folder/tag che era selezionato quando lo scaricamento dei messaggi è iniziato
          } as TotalMessageNumberDescriptor);
        }

        // se nuovo il messaggio ricaricato/inserito è tra i messaggi selezionati lo sostituisco
        const smIndex = this.selectedOutboxMails.findIndex(sm => sm.id === newMessage.id);
        if (smIndex >= 0) {
          this.selectedOutboxMails[smIndex] = newMessage;
        }
      })});
    }
  }

  /**
   * gestisce un comando di cancellazione, cioè quando un messaggio deve essere eliminato dalla lista dei messaggi che sto guardando
   * @param params i params del comando intimus arrivato
   */
  private manageIntimusDeleteCommand(params: RefreshMailsParams) {
    // se sto guardando la outbox della pec interessata dal comando
    if (params.oldRow["id_pec"] && this.pecFolderSelected.type === PecFolderType.FOLDER && params.oldRow["id_pec"] === this.pecFolderSelected.pec.id) {
      const idOutbox: number = params.oldRow["id"];
      const messageIndex: number = this.outboxMails.findIndex(m => m.id === idOutbox);
      if (messageIndex >= 0) {
        this.outboxMails.splice(messageIndex, 1);
        this.totalRecords--;
          // mando l'evento con il numero di messaggi (serve a mailbox-component perché lo deve scrivere nella barra superiore)
          this.mailboxService.setTotalMessageNumberDescriptor({
            messageNumber: this.totalRecords,
            pecFolder: this.pecFolderSelected // folder/tag che era selezionato quando lo scaricamento dei messaggi è iniziato
          } as TotalMessageNumberDescriptor);
      }
    }
  }

  /**
   * Gestisce il comando di update (quando il flag ignore passa da true a false e viceversa)
   * @param params i parametri del comando intimus arrivato
   */
  private manageIntimusUpdateCommand(params: RefreshMailsParams) {
    // se ignore è passato da true a false, allora è come se fosse stato inserito un messaggio e quindi faccio la insert (non dovrebbe capitare mail)
    if (params.oldRow && params.newRow && params.oldRow["ignore"] !== params.newRow["ignore"]) {
      if (params.oldRow["ignore"] === true && params.newRow["ignore"] === false) {
        this.manageIntimusInsertCommand(params);
        // se ignore è passato da false a true, allora è come se fosse stato cancellato un messaggio e quindi faccio la delete
      } else if (params.oldRow["ignore"] === false && params.newRow["ignore"] === true) {
        this.manageIntimusDeleteCommand(params);
      }
    }
  }

  private buildOutboxtInitialFilterAndSort() {
    const filtersAndSorts: FiltersAndSorts = new FiltersAndSorts();
    filtersAndSorts.addFilter(new FilterDefinition(
      "idPec.id",
      FILTER_TYPES.not_string.equals,
      this._selectedPecId
    ));

    filtersAndSorts.addFilter(new FilterDefinition(
      "ignore",
      FILTER_TYPES.not_string.equals,
      false
    ));

    // Me ne frego dell'ordinamento generale impostato. Mi limito ad usare l'ordinamento della data cambiando il nome del campo
    if (this.sorting.field === "receiveTime") {
      filtersAndSorts.addSort(new SortDefinition("updateTime", this.sorting.sortMode));
    }
    return filtersAndSorts;
  }

  private isOutboxMailInList(id: number, outboxMails: Outbox[]) {
    for (let i = 0; i < outboxMails.length; i++) {
      if (outboxMails[i].id === id) {
        return i;
      }
    }
    return -1;
  }

  private loadData(pageCong: PagingConf, lazyFilterAndSort?: FiltersAndSorts, idOutboxMail?: number) {
    if (this._selectedPecId) {
      this.loading = true;

      // mi devo salvare la folder/tag selezionata al momento del caricamento,
      // perché nella subscribe quando la invio al mailbox-component per scrivere il numero di messaggi
      // la selezione potrebbe essere cambiata e quindi manderei un dato errato
      const folderSelected = this.pecFolderSelected;
      this.subscriptions.push({id: folderSelected.data.id, type: "folder_message", subscription:
        this.outboxLiteService.getData(this.selectedProjection,
          this.buildOutboxtInitialFilterAndSort(),
          lazyFilterAndSort,
          pageCong).subscribe(data => {
            if (data && data.results) {
              this.totalRecords = data.page.totalElements;
              // mando l'evento con il numero di messaggi (serve a mailbox-component perché lo deve scrivere nella barra superiore)
              this.mailboxService.setTotalMessageNumberDescriptor({
                messageNumber: this.totalRecords,
                pecFolder: folderSelected // folder/tag che era selezionato quando lo scaricamento dei messaggi è iniziato
              } as TotalMessageNumberDescriptor);
              this.outboxMails = data.results;
              if (idOutboxMail) {
                const selectedOutboxMail: Outbox = this.selectedOutboxMails.find(value => value.id === idOutboxMail);
                if (selectedOutboxMail !== undefined) {
                  this.outboxService.manageOutboxEvent(selectedOutboxMail);
                }
              }
            }
            this.loading = false;

            let index;
            for (let i = 0; i < this.selectedOutboxMails.length; i++) {
              index = this.isOutboxMailInList(this.selectedOutboxMails[i].id, this.outboxMails);
              if (index !== -1) {
                this.selectedOutboxMails[i] = this.outboxMails[index];
              }
            }
      })});
    }
  }

  public buildTableEventFilters(filtersDefinition: FilterDefinition[] ): {[s: string]: FilterMetadata} {
    if (filtersDefinition && filtersDefinition.length > 0) {
      const eventFilters: {[s: string]: FilterMetadata} = {};
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

  private needLoading(event: LazyLoadEvent): boolean {
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
  }

  public handleEvent(name: string, event: any) {
    switch (name) {
      case "onRowSelect":
      case "onRowUnselect":
      case "selectionChange":
        event.originalEvent.stopPropagation();
        if (this.selectedOutboxMails.length === 1) {
          const selectedMail: Outbox = this.selectedOutboxMails[0];
          this.outboxService.manageOutboxEvent(selectedMail, this.selectedOutboxMails);
        } else {
          this.outboxService.manageOutboxEvent(null, this.selectedOutboxMails);
        }
        break;
      case "onContextMenuSelect":
        break;
    }
  }

  public lazyLoad(event: LazyLoadEvent) {
    const eventFilters: { [s: string]: FilterMetadata } = this.buildTableEventFilters(this._filters);

    if (event) {
      if (eventFilters && Object.entries(eventFilters).length > 0) {
        event.filters = eventFilters;
      }
      if (event.first !== event.first) {
        event.first = 0;
      }

      if (this.needLoading(event)) {
        this.pageConf.conf = { limit: event.rows, offset: event.first };

        const filtersAndSorts: FiltersAndSorts = buildLazyEventFiltersAndSorts(event, this.cols, this.datepipe);

        this.loadData(this.pageConf, filtersAndSorts);
      }
    } else {
      if (eventFilters) {
        event = { filters: eventFilters };
      }

      this.pageConf.conf = { limit: this.rowsNmber * 2, offset: 0 };

      const filtersAndSorts: FiltersAndSorts = buildLazyEventFiltersAndSorts(event, this.cols, this.datepipe);

      this.loadData(this.pageConf, filtersAndSorts);
    }
  }

  public openDetailPopup() {
    if (this.openDetailInPopup) {
      this.displayDetailPopup = true;
    }
  }

  trackByFn(index, item) {
    return item.id;
  }

  ngOnDestroy() {
    for (const s of this.subscriptions) {
      s.subscription.unsubscribe();
    }
    this.subscriptions = [];
  }
}
