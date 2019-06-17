import { Component, OnInit, Input, OnDestroy } from "@angular/core";
import { Draft, ENTITIES_STRUCTURE } from "@bds/ng-internauta-model";
import { FILTER_TYPES, FilterDefinition, PagingConf, FiltersAndSorts, SortDefinition, SORT_MODES } from "@nfa/next-sdr";
import { LazyLoadEvent, FilterMetadata } from "primeng/api";
import { DatePipe } from "@angular/common";
import { buildLazyEventFiltersAndSorts } from "@bds/primeng-plugin";
import { DraftService } from "src/app/services/draft.service";
import { Observable, Subscription } from "rxjs";
import { SettingsService } from "src/app/services/settings.service";
import { AppCustomization } from "src/environments/app-customization";

@Component({
  selector: "app-mail-drafts",
  templateUrl: "./mail-drafts.component.html",
  styleUrls: ["./mail-drafts.component.scss"]
})
export class MailDraftsComponent implements OnInit, OnDestroy {

  private _selectedPecId: number;
  @Input("pecId")
  set selectedPecId(pecId: number) {
    this._selectedPecId = pecId;
    this.loadData(null);
  }

  private previousFilter: FilterDefinition[] = [];
  private selectedProjection: string =
  ENTITIES_STRUCTURE.shpeck.draft.customProjections
    .CustomDraftWithPlainFields;

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

  constructor(private draftService: DraftService, private settingsService: SettingsService, private datepipe: DatePipe) { }

  ngOnInit() {
    this.subscriptions.push(this.draftService.reload.subscribe(idDraft => {
      if (idDraft) {
        this.loadData(null, null, idDraft);
      } else {
        this.loadData(null);
      }
    }));
    this.subscriptions.push(this.settingsService.settingsChangedNotifier$.subscribe(newSettings => {
      this.openDetailInPopup = newSettings[AppCustomization.shpeck.hideDetail] === "true";
    }));
    if (this.settingsService.getImpostazioniVisualizzazione()) {
      this.openDetailInPopup = this.settingsService.getHideDetail() === "true";
    }
  }

  public openDetailPopup(event, row, message) {
    if (this.openDetailInPopup) {
      this.displayDetailPopup = true;
    }
  }

  public handleEvent(name: string, event: any) {
    console.log("handleEvent", name, event);
    switch (name) {
      // non c'è nella documentazione, ma pare che scatti sempre una sola volta anche nelle selezioni multiple.
      // le righe selezionati sono in this.selectedMessages e anche in event
      case "selectionChange":
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
    this.loading = true;
    this.draftService.getData(this.selectedProjection, this.buildDraftInitialFilterAndSort(), lazyFilterAndSort, pageCong).subscribe(data => {
      if (data && data.results) {
        console.log("DATA = ", data);
        this.totalRecords = data.page.totalElements;
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
    });
  }

  private buildDraftInitialFilterAndSort() {
    const filtersAndSorts: FiltersAndSorts = new FiltersAndSorts();
    filtersAndSorts.addFilter(new FilterDefinition(
      "idPec.id",
      FILTER_TYPES.not_string.equals,
      this._selectedPecId
    ));
    filtersAndSorts.addSort(new SortDefinition("updateTime", SORT_MODES.desc));
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
