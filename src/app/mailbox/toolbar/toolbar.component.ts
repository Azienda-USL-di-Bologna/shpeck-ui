import { Component, OnInit, OnDestroy} from "@angular/core";
import { DialogService, TreeNode } from "primeng/api";
import { NewMailComponent } from "../new-mail/new-mail.component";
import { ShpeckMessageService, MessageEvent } from "src/app/services/shpeck-message.service";
import { Subscription } from "rxjs";
import { TOOLBAR_ACTIONS } from "src/environments/app-constants";
import { Pec, Draft, Folder } from "@bds/ng-internauta-model";
import { PecService } from "src/app/services/pec.service";
import { DraftService } from "src/app/services/draft.service";
import { FilterDefinition, FILTER_TYPES } from "@nfa/next-sdr";
import { ToolBarService } from "./toolbar.service";
import { PecTreeNodeType, MailFoldersService } from "../mail-folders/mail-folders.service";

@Component({
  selector: "app-toolbar",
  templateUrl: "./toolbar.component.html",
  styleUrls: ["./toolbar.component.scss"]
})
export class ToolbarComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];
  private myPecs: Pec[];
  public messageEvent: MessageEvent;
  private _selectedPec: Pec;

  // @Output("filtersEmitter") private filtersEmitter: EventEmitter<FilterDefinition[]> = new EventEmitter();

  constructor(public dialogService: DialogService,
    private pecService: PecService,
    private messageService: ShpeckMessageService,
    private toolBarService: ToolBarService,
    private draftService: DraftService,
    private mailFoldersService: MailFoldersService
  ) { }

  ngOnInit() {
    this.subscriptions.push(this.messageService.messageEvent.subscribe((messageEvent: MessageEvent) => {
      if (messageEvent) {
        console.log("DATA = ", messageEvent);
        this.messageEvent = messageEvent;
      }
    }));
    this.subscriptions.push(this.mailFoldersService.pecTreeNodeSelected.subscribe((pecTreeNodeSelected: TreeNode) => {
      if (pecTreeNodeSelected && this.myPecs && this.myPecs.length > 0) {
        let idPec: number;
        if (pecTreeNodeSelected.type === PecTreeNodeType.FOLDER) {
          const selectedFolder: Folder = pecTreeNodeSelected.data;
          idPec = selectedFolder.fk_idPec.id;
        } else {
          idPec = ((pecTreeNodeSelected.data) as Pec).id;
        }
        this._selectedPec = this.myPecs.filter(p => p.id === idPec)[0];
      }
    }));
    this.subscriptions.push(this.pecService.myPecs.subscribe((pecs: Pec[]) => {
      if (pecs) {
        console.log("pecs = ", pecs);
        this.myPecs = pecs;
      }
    }));
  }

  // public onInput(event) {
  //   if (event && event.target) {
  //     this.filterString = event.target.value;
  //   }
    // if (this.searchTimeout) {
    //   clearTimeout(this.searchTimeout);
    // }
    // this.searchTimeout = setTimeout(() => {
    //   const filter = [];
    //   if (event && event.target && event.target.value && event.target.value !== "") {
    //     filter.push(new FilterDefinition("tscol", FILTER_TYPES.not_string.equals, event.target.value));
    //   }
    //   // this.filtersEmitter.emit(valueToEmit);
    //   this.toolBarService.setFilterTyped(filter);
    // }, 600);
  // }

  public onEnter(value) {
    if (value && value.length > 0) {
      const filter = [];
      filter.push(new FilterDefinition("tscol", FILTER_TYPES.not_string.equals, value));
      this.toolBarService.setFilterTyped(filter);
    }
  }

  handleEvent(event, action) {
    console.log("EVENTO = ", action);
    switch (action) {
      case TOOLBAR_ACTIONS.NEW:
        this.newMail(action);
        break;
      case TOOLBAR_ACTIONS.REPLY:
      case TOOLBAR_ACTIONS.REPLY_ALL:
      case TOOLBAR_ACTIONS.FORWARD:
        this.newMail(action, this.messageEvent);
        break;
      case TOOLBAR_ACTIONS.DELETE:
          console.log("delete: ", this.myPecs);
        break;
      case TOOLBAR_ACTIONS.MOVE:
        break;
      case TOOLBAR_ACTIONS.ARCHIVE:
        break;
    }
  }

  newMail(action, messageEvent?: MessageEvent) {

    const draftMessage = new Draft();
    // draftMessage.messageRelatedType = MessageRelatedType.FORWARDED;
    // draftMessage.idPec = this._selectedPec;
    const pec: Pec = new Pec();
    pec.id = this._selectedPec.id;
    draftMessage.idPec = pec;
    this.draftService.postHttpCall(draftMessage).subscribe((draft: Draft) => {
      const ref = this.dialogService.open(NewMailComponent, {
        data: {
          fullMessage: messageEvent ? messageEvent.downloadedMessage : undefined,
          idDraft: draft.id,
          pec: pec,
          action: action
        },
        header: "Nuova Mail",
        width: "auto",
        styleClass: "new-draft",
        contentStyle: { "overflow": "auto", "height": "85vh" },
        closable: false,
        closeOnEscape: false
      });
      ref.onClose.subscribe((el) => {
        if (el) {
          console.log("Ref: ", el);
        }
      });
    });
  }

  ngOnDestroy() {
    if (this.subscriptions && this.subscriptions.length > 0) {
      this.subscriptions.forEach((subscription: Subscription) => {
        subscription.unsubscribe();
      });
    }
  }

}
