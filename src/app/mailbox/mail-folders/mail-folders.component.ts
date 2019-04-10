import { Component, OnInit, ViewEncapsulation, Output, EventEmitter } from "@angular/core";
import { FiltersAndSorts, SortDefinition, SORT_MODES, AdditionalDataDefinition } from "@nfa/next-sdr";
import { Pec, ENTITIES_STRUCTURE } from "@bds/ng-internauta-model";
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

  @Output("folderEmitter") private folderEmitter: EventEmitter<number> = new EventEmitter();

  constructor(private pecService: PecService) { }

  ngOnInit() {
    this.pecService.getData(ENTITIES_STRUCTURE.baborg.pec.standardProjections.PecWithFolderList, this.buildFolderInitialFilterAndSort(), null, null).subscribe(
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

  private buildFolderInitialFilterAndSort(): FiltersAndSorts {
    const filter = new FiltersAndSorts();
    filter.addSort(new SortDefinition("indirizzo", SORT_MODES.asc));
    filter.addAdditionalData(new AdditionalDataDefinition("OperationRequested", "FilterPecPerStandardPermissions"));
    return filter;
  }

  private buildNode(pec: Pec): any {
    const children = [];
    if (pec.folderList) {
      for (const folder of pec.folderList) {
        children.push({
          "label": folder.description,
          "data": folder,
          "nodeType": "folder",
          "expandedIcon": "pi pi-folder-open",
          "collapsedIcon": "pi pi-folder",
          "styleClass": "tree-node-style"
        });
      }
    }
    return {
      "label": pec.indirizzo,
      "data": pec,
      "nodeType": "pec",
      "expandedIcon": "pi pi-folder-open",
      "collapsedIcon": "pi pi-folder",
      "children": children
    };
  }

  public handleNodeSelect(event: any) {
    if (event.node.nodeType === "folder") {
      this.folderEmitter.emit(event.node.data);
    }
  }
}
