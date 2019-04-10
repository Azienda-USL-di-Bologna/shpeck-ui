import { Component, OnInit, Input } from "@angular/core";
import {VirtualScrollerModule} from "primeng/virtualscroller";
import { Message, ENTITIES_STRUCTURE, MessageAddress, AddresRoleType, Folder, FolderType } from "@bds/ng-internauta-model";
import { MessageService} from "src/app/services/message.service";
import { FiltersAndSorts, FilterDefinition, FILTER_TYPES } from "@nfa/next-sdr";

@Component({
  selector: "app-mail-list",
  templateUrl: "./mail-list.component.html",
  styleUrls: ["./mail-list.component.scss"]
})
export class MailListComponent implements OnInit {

  private addresRoleType = {
    FROM: "FROM",
    TO: "TO",
    CC: "CC"
  };

  private _folder: Folder;
  @Input("folder")
  set folder(folder: Folder) {
    this._folder = folder;
    if (folder) {
      this.loadData(folder);
    }
  }

  public sortOptions = {};
  public sortKey = {};
  public messages: Message[] = [];
  public fromOrTo: string;

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
    // this.idFolder = 6;
    // this.loadData(6);
  }

  private loadData(folder: Folder) {
    this.messageService.getData(ENTITIES_STRUCTURE.shpeck.message.customProjections.CustomMessageWithAddressList, this.buildInitialFilterAndSort(folder), null, null).subscribe(
      data => {
        if (data && data.results) {
          this.totalRecords = data.page.totalElements;
          this.messages = data.results;
          let addresRoleType;
          switch (this._folder.type) {
            case FolderType.INBOX:
              addresRoleType = AddresRoleType.FROM;
              break;
            case FolderType.OUTBOX:
              addresRoleType = AddresRoleType.TO;
              break;
            default:
              addresRoleType = AddresRoleType.FROM;
          }
          this.setFromOrTo(this.messages, addresRoleType);
          }
      }
    );
  }

  buildInitialFilterAndSort(folder: Folder): FiltersAndSorts {
    const filtersAndSorts: FiltersAndSorts = new FiltersAndSorts();
    filtersAndSorts.addFilter(new FilterDefinition("messageFolderList.idFolder.id", FILTER_TYPES.not_string.equals, folder.id));
    return filtersAndSorts;
  }

  private setFromOrTo(messages: Message[], addressRole: string) {
    messages.map((message: Message) => {
      const messageAddressList: MessageAddress[] = message.messageAddressList.filter((messageAddress: MessageAddress) => messageAddress.addressRole === addressRole);
      message["fromOrTo"] = "";
      messageAddressList.forEach((messageAddress: MessageAddress) => message["fromOrTo"] += ", " + messageAddress.idAddress.originalAddress);
      if ((message["fromOrTo"] as string).startsWith(",")) {
        message["fromOrTo"]  = (message["fromOrTo"] as string).substr(1, (message["fromOrTo"] as string).length - 2);
      }
    });
  }
}
