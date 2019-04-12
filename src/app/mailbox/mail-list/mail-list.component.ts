import { Component, OnInit, Input } from "@angular/core";
import {VirtualScrollerModule} from "primeng/virtualscroller";
import { Message, ENTITIES_STRUCTURE, MessageAddress, AddresRoleType, Folder, FolderType, TagType } from "@bds/ng-internauta-model";
import { MessageService} from "src/app/services/message.service";
import { FiltersAndSorts, FilterDefinition, FILTER_TYPES } from "@nfa/next-sdr";

@Component({
  selector: "app-mail-list",
  templateUrl: "./mail-list.component.html",
  styleUrls: ["./mail-list.component.scss"]
})
export class MailListComponent implements OnInit {

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
  public iconsVisibility = [];
  private selectedProjection: string = ENTITIES_STRUCTURE.shpeck.message.customProjections.CustomMessageWithAddressList;

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
    this.messageService.getData(this.selectedProjection, this.buildInitialFilterAndSort(folder), null, null).subscribe(
      data => {
        if (data && data.results) {
          this.totalRecords = data.page.totalElements;
          this.messages = data.results;
          this.setFromOrTo(this.messages, this._folder.type);
          this.setIconsVisibility(this.messages, this._folder.type);
        }
      }
    );
  }

  buildInitialFilterAndSort(folder: Folder): FiltersAndSorts {
    const filtersAndSorts: FiltersAndSorts = new FiltersAndSorts();
    filtersAndSorts.addFilter(new FilterDefinition("messageFolderList.idFolder.id", FILTER_TYPES.not_string.equals, folder.id));
    return filtersAndSorts;
  }

  private setIconsVisibility(messages: Message[], folderType: string) {
    this.iconsVisibility["REPLIED"] = true;
    this.iconsVisibility["ASSIGNED"] = true;
    this.iconsVisibility["FORWARDED"] = true;
  }

  private setFromOrTo(messages: Message[], folderType: string) {
    let addresRoleType: string;
    switch (folderType) {
      case FolderType.INBOX:
        addresRoleType = AddresRoleType.FROM;
        break;
      case FolderType.OUTBOX:
        addresRoleType = AddresRoleType.TO;
        break;
      default:
        addresRoleType = AddresRoleType.FROM;
    }
    messages.map((message: Message) => {
      const messageAddressList: MessageAddress[] = message.messageAddressList.filter((messageAddress: MessageAddress) => messageAddress.addressRole === addresRoleType);
      message["fromOrTo"] = "";
      messageAddressList.forEach((messageAddress: MessageAddress) => message["fromOrTo"] += ", " + messageAddress.idAddress.originalAddress);
      if ((message["fromOrTo"] as string).startsWith(",")) {
        message["fromOrTo"]  = (message["fromOrTo"] as string).substr(1, (message["fromOrTo"] as string).length - 1);
      }
    });
  }

  public handleEvent(name: string, event: any) {
    console.log("handleEvent", name, event);
    switch (name) {
      case "onRowSelect":
        this.messages[event.index].seen = true;
        this.saveMessage(event.index);
      break;
    }
  }

  private saveMessage(index: number) {
    this.messageService.patchHttpCall(this.messages[index], this.messages[index].id, this.selectedProjection, null)
    .subscribe((message: Message) => {});
  }
}
