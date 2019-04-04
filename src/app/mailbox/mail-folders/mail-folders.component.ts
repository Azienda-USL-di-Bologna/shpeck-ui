import { Component, OnInit, ViewEncapsulation, Output, EventEmitter } from "@angular/core";
import { FilterDefinition, FiltersAndSorts, SortDefinition, SORT_MODES, FILTER_TYPES } from "@nfa/next-sdr";
import { TagService } from "src/app/services/tag.service";
import { Tag, Pec, ENTITIES_STRUCTURE } from "@bds/ng-internauta-model";
import { PecService } from "src/app/services/pec.service";

@Component({
  selector: "app-mail-folders",
  templateUrl: "./mail-folders.component.html",
  styleUrls: ["./mail-folders.component.scss"],
  encapsulation: ViewEncapsulation.Emulated
})
export class MailFoldersComponent implements OnInit {
// export class MailFoldersComponent implements OnInit {

  public mailfolders  = [];

  @Output("tagEmitter") private tagEmitter: EventEmitter<number> = new EventEmitter();

  constructor(private tagService: TagService, private pecService: PecService) { }

  ngOnInit() {
    this.pecService.getData(ENTITIES_STRUCTURE.baborg.pec.standardProjections.PecWithTagList, this.buildTagInitialFilterAndSort(), null, null).subscribe(
      data => {
        if (data && data.results) {
          for (const pec of data.results) {
            if (pec) {
              this.mailfolders.push(this.buildNode(pec as Pec));
            }
          }
        }
      }
    );
  }

  private buildTagInitialFilterAndSort(): FiltersAndSorts {
    const filter = new FiltersAndSorts();
    filter.addSort(new SortDefinition("indirizzo", SORT_MODES.asc));
    return filter;
  }

  private buildNode(pec: Pec): any {
    const children = [];
    if (pec.tagList) {
      for (const tag of pec.tagList) {
        children.push({
          "label": tag.description,
          "data": tag.id,
          "nodeType": "tag",
          "expandedIcon": "pi pi-folder-open",
          "collapsedIcon": "pi pi-folder",
          "styleClass": "tree-node-style"
        });
      }
    }
    return {
      "label": pec.indirizzo,
      "data": pec.id,
      "nodeType": "pec",
      "expandedIcon": "pi pi-folder-open",
      "collapsedIcon": "pi pi-folder",
      "children": children
    };
  }

  public handleNodeSelect(event: any) {
    if (event.node.nodeType === "tag") {
      this.tagEmitter.emit(event.node.data);
    }
  }
}
