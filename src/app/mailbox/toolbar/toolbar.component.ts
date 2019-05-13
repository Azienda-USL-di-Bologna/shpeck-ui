import { Component, OnInit, OnDestroy, EventEmitter, Output } from "@angular/core";
import { DialogService } from "primeng/api";
import { NewMailComponent } from "../new-mail/new-mail.component";
import { ShpeckMessageService, FullMessage, MessageEvent } from "src/app/services/shpeck-message.service";
import { Subscription, Observable } from "rxjs";
import { TOOLBAR_ACTIONS } from "src/environments/app-constants";
import { Pec, Draft, MessageRelatedType } from "@bds/ng-internauta-model";
import { PecService } from "src/app/services/pec.service";
import { DraftService } from "src/app/services/draft.service";
import { FilterDefinition, FILTER_TYPES } from "@nfa/next-sdr";
import { ToolBarService } from "./toolbar.service";

@Component({
  selector: "app-toolbar",
  templateUrl: "./toolbar.component.html",
  styleUrls: ["./toolbar.component.scss"]
})
export class ToolbarComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];
  private myPecs: Pec[];
  private searchTimeout: any;
  private filterString: string;
  public messageEvent: MessageEvent;

  // @Output("filtersEmitter") private filtersEmitter: EventEmitter<FilterDefinition[]> = new EventEmitter();

  constructor(public dialogService: DialogService,
    private pecService: PecService,
    private messageService: ShpeckMessageService,
    private toolBarService: ToolBarService,
    private draftService: DraftService) { }

  ngOnInit() {
    this.subscriptions.push(this.messageService.messageEvent.subscribe((messageEvent: MessageEvent) => {
      if (messageEvent) {
        console.log("DATA = ", messageEvent);
        this.messageEvent = messageEvent;
      }
    }));
    this.subscriptions.push(this.pecService.myPecs.subscribe((pecs: Pec[]) => {
      if (pecs) {
        console.log("pecs = ", pecs);
        this.myPecs = pecs;
      }
    }));
  }

  public onInput(event) {
    if (event && event.target) {
      this.filterString = event.target.value;
    }
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
  }
  public onKey(event) {
    if (event && event.key === "Enter") {
      const filter = [];
      if (this.filterString && this.filterString.length > 0) {
        filter.push(new FilterDefinition("tscol", FILTER_TYPES.not_string.equals, event.target.value));
        this.toolBarService.setFilterTyped(filter);
      }
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
    draftMessage.idPec = this.myPecs[0];
    this.draftService.postHttpCall(draftMessage).subscribe((draft: Draft) => {
      const ref = this.dialogService.open(NewMailComponent, {
        data: {
          fullMessage: messageEvent ? messageEvent.downloadedMessage : undefined,
          idDraft: draft.id,
          pec: this.myPecs[0],
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
