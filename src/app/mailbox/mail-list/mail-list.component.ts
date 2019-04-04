import { Component, OnInit, Input } from "@angular/core";
import {VirtualScrollerModule} from "primeng/virtualscroller";
import { Message } from "@bds/ng-internauta-model";
import { MessageService } from "src/app/services/message.service";
import { FiltersAndSorts, FilterDefinition, FILTER_TYPES } from "@nfa/next-sdr";

@Component({
  selector: "app-mail-list",
  templateUrl: "./mail-list.component.html",
  styleUrls: ["./mail-list.component.scss"]
})
export class MailListComponent implements OnInit {

  private _idTag: number = -1;
  @Input("idTag")
  set idTag(idTag: number) {
    this._idTag = idTag;
    this.loadData(idTag);
  }

  public sortOptions = {};
  public sortKey = {};
  public messages: Message[] = [];
  public totalRecords: number;
  public cols = [
      {
        field: "subject",
        header: "Oggetto",
        filterMatchMode: FILTER_TYPES.string.containsIgnoreCase,
        width: "85px",
        minWidth: "85px"
      },
      // {
      //   field: "idApplicazione.nome",
      //   header: "App",
      //   filterMatchMode: FILTER_TYPES.string.containsIgnoreCase,
      //   width: "80px",
      //   minWidth: "80px"
      // }
  ];

  constructor(private messageService: MessageService) { }

  ngOnInit() {
    // this.idTag = 6;
    // this.loadData(6);
  }

  private loadData(idTag: number) {
    this.messageService.getData(null, this.buildInitialFilterAndSort(idTag), null, null).subscribe(
      data => {
        if (data && data.results) {
          this.totalRecords = data.page.totalElements;
          this.messages = data.results;
          }
      }
    );
  }

  buildInitialFilterAndSort(idTag: number): FiltersAndSorts {
    const filtersAndSorts: FiltersAndSorts = new FiltersAndSorts();
    filtersAndSorts.addFilter(new FilterDefinition("messageTagList.idTag.id", FILTER_TYPES.not_string.equals, idTag));
    return filtersAndSorts;
  }

}
