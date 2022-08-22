import { Component, OnInit, Input, OnDestroy, ViewChild } from "@angular/core";
import { Draft, ENTITIES_STRUCTURE } from "@bds/internauta-model";
import { FILTER_TYPES, FilterDefinition, PagingConf, FiltersAndSorts, SortDefinition, SORT_MODES } from "@bds/next-sdr";
import { LazyLoadEvent, FilterMetadata, ConfirmationService } from "primeng/api";
import { DatePipe } from "@angular/common";
import { buildLazyEventFiltersAndSorts } from "@bds/primeng-plugin";
import { DraftService } from "src/app/services/draft.service";
import { Observable, Subscription } from "rxjs";
import { SettingsService } from "src/app/services/settings.service";
import { DraftLiteService } from "src/app/services/draft-lite.service";
import { AppCustomization } from "src/environments/app-customization";
import { MailboxService, Sorting, TotalMessageNumberDescriptor } from "../mailbox.service";
import { Table } from "primeng/table";
import { PecFolder, MailFoldersService, PecFolderType } from "../mail-folders/mail-folders.service";
import { IntimusClientService, IntimusCommand, IntimusCommands, RefreshMailsParams, RefreshMailsParamsEntities, RefreshMailsParamsOperations } from '@bds/common-tools';

@Component({
  selector: "app-mail-drafts",
  templateUrl: "./mail-drafts.component.html",
  styleUrls: ["./mail-drafts.component.scss"]
})
export class MailDraftsComponent implements OnInit, OnDestroy {

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

  @ViewChild("dt", {}) private dt: Table;
  private previousFilter: FilterDefinition[] = [];
  private selectedProjection: string =
    ENTITIES_STRUCTURE.shpeck.draftlite.standardProjections.DraftLiteWithIdPec;

  public _filters: FilterDefinition[];

  private subscriptions: Subscription[] = [];
  public loading = false;
  public virtualRowHeight: number = 70;
  public totalRecords: number;
  public rowsNmber = 10;
  public selectedDrafts: Draft[];
  public drafts: Draft[] = [];
  public cols = [
    {
      field: "subject",
      header: "Oggetto",
      filterMatchMode: FILTER_TYPES.string.containsIgnoreCase,
      width: "85px",
      minWidth: "85px"
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

  constructor(private draftService: DraftService,
    private settingsService: SettingsService,
    private draftLiteService: DraftLiteService,
    private datepipe: DatePipe,
    private mailboxService: MailboxService,
    private mailFoldersService: MailFoldersService,
    private confirmationService: ConfirmationService,
    private intimusClient: IntimusClientService
    ) { }

  ngOnInit() {
    this.selectedDrafts = [];
    this.subscriptions.push(this.draftService.reload.subscribe(idDraft => {
      this.selectedDrafts = [];
      if (idDraft) {
        this.loadData(null, null, idDraft);
      } else {
        this.loadData(null);
      }
    }));
    this.subscriptions.push(this.mailFoldersService.pecFolderSelected.subscribe((pecFolderSelected: PecFolder) => {
      this.pecFolderSelected = pecFolderSelected;
    }));
    this.subscriptions.push(this.settingsService.settingsChangedNotifier$.subscribe(newSettings => {
      this.openDetailInPopup = newSettings[AppCustomization.shpeck.hideDetail] === "true";
    }));
    this.subscriptions.push(this.mailboxService.sorting.subscribe((sorting: Sorting) => {
      if (sorting) {
        this.sorting = sorting;
        if (this.dt && this.dt.el && this.dt.el.nativeElement) {
          this.dt.el.nativeElement.getElementsByClassName("ui-table-scrollable-body")[0].scrollTop = 0;
        }
        this.lazyLoad(null);
      }
    }));
    // this.subscriptions.push(this.intimusClient.command$.subscribe((command: IntimusCommand) => {
    //   this.manageIntimusCommand(command);
    // }));
    if (this.settingsService.getImpostazioniVisualizzazione()) {
      this.openDetailInPopup = this.settingsService.getHideDetail() === "true";
    }
  }

  /**
   * gestisce un comando intimus
   * @param command il comando ricevuto
   */
  // private manageIntimusCommand(command: IntimusCommand) {
  //   switch (command.command) {
  //     case IntimusCommands.RefreshMails: // comando di refresh delle mail
  //       const params: RefreshMailsParams = command.params as RefreshMailsParams;
  //       if (params.entity === RefreshMailsParamsEntities.DRAFT) {
  //       switch (params.operation) {
  //         case RefreshMailsParamsOperations.INSERT:
  //           console.log("INSERT");
  //           this.manageIntimusInsertCommand(params);
  //           break;
  //         case RefreshMailsParamsOperations.UPDATE:
  //           console.log("UPDATE");
  //           this.manageIntimusUpdateCommand(params);
  //           break;
  //         case RefreshMailsParamsOperations.DELETE:
  //           console.log("DELETE");
  //           this.manageIntimusDeleteCommand(params);
  //           break;
  //       }
  //       break;
  //     }
  //   }
  // }

  public openDetailPopup() {
    if (this.openDetailInPopup) {
      this.displayDetailPopup = true;
    }
  }

  public handleEvent(name: string, event: any) {
    console.log("handleEvent", name, event);
    switch (name) {
      // non c'è nella documentazione, ma pare che scatti sempre una sola volta anche nelle selezioni multiple.
      // le righe selezionati sono in this.selectedMessages e anche in event
      case "onRowSelect":
      case "onRowUnselect":
      case "selectionChange":
        event.originalEvent.stopPropagation();
        // selezione di un singolo messaggio (o come click singolo oppure come click del primo messaggio con il ctrl)
        if (this.selectedDrafts.length === 1) {
          const selectedDraft: Draft = this.selectedDrafts[0];
          this.draftService.manageDraftEvent(
            selectedDraft,
            this.selectedDrafts
          );
        } else {
          this.draftService.manageDraftEvent(null, this.selectedDrafts);
        }
        break;
      case "onContextMenuSelect":
        break;
    }
  }

  public lazyLoad(event: LazyLoadEvent ) {
    console.log("lazyload", event);
    const eventFilters: {[s: string]: FilterMetadata} = this.buildTableEventFilters(this._filters);
    if (event) {
      if (eventFilters && Object.entries(eventFilters).length > 0) {
        event.filters = eventFilters;
      }
      // questo if è il modo più sicuro per fare "event.first === Nan"
      if (event.first !== event.first) {
        event.first = 0;
      }
      if (this.needLoading(event)) {
        this.pageConf.conf = {
          limit: event.rows,
          offset: event.first
        };
        const filtersAndSorts: FiltersAndSorts = buildLazyEventFiltersAndSorts(
          event,
          this.cols,
          this.datepipe
        );

        this.loadData(this.pageConf, filtersAndSorts);
      }
    } else {
      if (eventFilters) {
        event = {
          filters: eventFilters
        };
      }
      this.pageConf.conf = {
        limit: this.rowsNmber * 2,
        offset: 0
      };
      const filtersAndSorts: FiltersAndSorts = buildLazyEventFiltersAndSorts(
        event,
        this.cols,
        this.datepipe
      );

      this.loadData(this.pageConf, filtersAndSorts);
    }
    this.previousFilter = this._filters;
    // this.filtering = false;
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

  private loadData(pageCong: PagingConf, lazyFilterAndSort?: FiltersAndSorts, idDraft?: number) {
    if (this._selectedPecId) {
      this.loading = true;

      // mi devo salvare la folder/tag selezionata al momento del caricamento,
      // perché nella subscribe quando la invio al mailbox-component per scrivere il numero di messaggi
      // la selezione potrebbe essere cambiata e quindi manderei un dato errato
      const folderSelected = this.pecFolderSelected;
      this.draftLiteService.getData(this.selectedProjection, this.buildDraftInitialFilterAndSort(), lazyFilterAndSort, pageCong).subscribe(data => {
        if (data && data.results) {
          console.log("DATA = ", data);
          this.totalRecords = data.page.totalElements;
          // mando l'evento con il numero di messaggi (serve a mailbox-component perché lo deve scrivere nella barra superiore)
          this.mailboxService.setTotalMessageNumberDescriptor({
            messageNumber: this.totalRecords,
            pecFolder: folderSelected // folder/tag che era selezionato quando lo scaricamento dei messaggi è iniziato
          } as TotalMessageNumberDescriptor);

          this.drafts = data.results;
          if (idDraft) {
            const selectedDraft: Draft = this.drafts.find(value => value.id === idDraft);
            if (selectedDraft !== undefined) {
              this.draftService.manageDraftEvent(
                selectedDraft
              );
            }
          }
        }
        this.loading = false;
        // setTimeout(() => {
        //   console.log(this.selRow.nativeElement.offsetHeight);
        // });
        let index;
        for (let i = 0; i < this.selectedDrafts.length; i++) {
          index = this.isDraftinList(this.selectedDrafts[i].id, this.drafts);
          if (index !== -1) {
            this.selectedDrafts[i] = this.drafts[index];
          }
        }
      });
    }
  }

  private isDraftinList(id: number, drafts: Draft[]) {
    for (let i = 0; i < drafts.length; i++) {
      if (drafts[i].id === id) {
        return i;
      }
    }
    return -1;
  }

  private buildDraftInitialFilterAndSort() {
    const filtersAndSorts: FiltersAndSorts = new FiltersAndSorts();
    filtersAndSorts.addFilter(new FilterDefinition(
      "idPec.id",
      FILTER_TYPES.not_string.equals,
      this._selectedPecId
    ));

    // Me ne frego dell'ordinamento generale impostato. Mi limito ad usare l'ordinamento della data cambiando il nome del campo
    if (this.sorting.field === "receiveTime") {
      filtersAndSorts.addSort(new SortDefinition("updateTime", this.sorting.sortMode));
    }
    return filtersAndSorts;
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

  public trackByFn(index, item) {
    return item.id;
  }

  public deletingConfirmation() {
    this.confirmationService.confirm({
      message: "Vuoi eliminare definitivamente la bozza selezionata?",
      header: "Conferma",
      icon: "pi pi-exclamation-triangle",
      accept: () => {
        this.draftService.deleteDraftMessage(this.selectedDrafts[0].id, true, true);
      },
      reject: () => {}
    });
  }

  onKeyUpMoveFocus(event) {
    this.stopPropagation(event);
  
    const mailDetailContainer: HTMLElement = document.querySelector(".mail-detail");
    if (!!mailDetailContainer) mailDetailContainer.focus();
  }

  private stopPropagation(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  public ngOnDestroy() {
    for (const s of this.subscriptions) {
      s.unsubscribe();
    }
    this.subscriptions = [];
  }
}
