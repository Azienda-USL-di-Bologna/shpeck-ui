import { Component, OnInit, Input, OnDestroy, ViewChild } from "@angular/core";
import { FilterDefinition, FILTER_TYPES, PagingConf, SORT_MODES, FiltersAndSorts, SortDefinition } from "@nfa/next-sdr";
import { ENTITIES_STRUCTURE, OutboxLite, Outbox } from "@bds/ng-internauta-model";
import { Subscription } from "rxjs";
import { Sorting, MailboxService } from "../mailbox.service";
import { Table } from "primeng/table";
import { OutboxLiteService } from "src/app/services/outbox-lite.service";
import { SettingsService } from "src/app/services/settings.service";
import { DatePipe } from "@angular/common";
import { OutboxService } from "src/app/services/outbox.service";
import { FilterMetadata, LazyLoadEvent } from "primeng/api";
import { buildLazyEventFiltersAndSorts } from "@bds/primeng-plugin";
import { AppCustomization } from 'src/environments/app-customization';

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

  @ViewChild("ot", null) private ot: Table;
  private previousFilter: FilterDefinition[] = [];
  private selectedProjection: string =
    ENTITIES_STRUCTURE.shpeck.outboxLite.standardProjections.OutboxLiteWithIdPec;

  public _filters: FilterDefinition[];

  private subscriptions: Subscription[] = [];
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

  constructor(private outboxLiteService: OutboxLiteService,
    private settingsService: SettingsService,
    private datepipe: DatePipe,
    private mailboxService: MailboxService,
    private outboxService: OutboxService
  ) { }

  ngOnInit() {
    this.selectedOutboxMails = [];

    this.subscriptions.push(this.outboxService.reload.subscribe(idOutboxMail => {
      this.selectedOutboxMails = [];
      idOutboxMail ? this.loadData(null, null, idOutboxMail) : this.loadData(null);
    }));

    this.subscriptions.push(this.settingsService.settingsChangedNotifier$.subscribe(newSettings => {
      this.openDetailInPopup = newSettings[AppCustomization.shpeck.hideDetail] === "true";
    }));

    this.subscriptions.push(this.mailboxService.sorting.subscribe((sorting: Sorting) => {
      if (sorting) {
        this.sorting = sorting;
        if (this.ot && this.ot.el && this.ot.el.nativeElement) {
          this.ot.el.nativeElement.getElementsByClassName("ui-table-scrollable-body")[0].scrollTop = 0;
        }
        this.lazyLoad(null);
      }
    }));

    if (this.settingsService.getImpostazioniVisualizzazione()) {
      this.openDetailInPopup = this.settingsService.getHideDetail() === "true";
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
      this.outboxLiteService.getData(this.selectedProjection,
        this.buildOutboxtInitialFilterAndSort(),
        lazyFilterAndSort,
        pageCong).subscribe(data => {
          if (data && data.results) {
            this.totalRecords = data.page.totalElements;
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
        });
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

  public openDetailPopup(event, row, message) {
    if (this.openDetailInPopup) {
      this.displayDetailPopup = true;
    }
  }

  trackByFn(index, item) {
    return item.id;
  }

  ngOnDestroy() {
    for (const s of this.subscriptions) {
      s.unsubscribe();
    }
    this.subscriptions = [];
  }
}
