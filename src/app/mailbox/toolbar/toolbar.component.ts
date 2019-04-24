import { Component, OnInit, OnDestroy } from "@angular/core";
import { DialogService } from "primeng/api";
import { NewMailComponent } from "../new-mail/new-mail.component";
import { MessageService, MessageTemplate } from "src/app/services/message.service";
import { Subscription } from "rxjs";
import { Message } from "@bds/ng-internauta-model";
import { TOOLBAR_ACTIONS } from "src/environments/app-constants";

@Component({
  selector: "app-toolbar",
  templateUrl: "./toolbar.component.html",
  styleUrls: ["./toolbar.component.scss"]
})
export class ToolbarComponent implements OnInit, OnDestroy {
  messagesSubscription: Subscription;
  messageSelected: MessageTemplate;
  constructor(public dialogService: DialogService, public messageService: MessageService) { }

  ngOnInit() {
    this.messagesSubscription = this.messageService.messagesSelected.subscribe(message => {
      console.log("DATA = ", message);
      this.messageSelected = message;
    });
  }

  handleEvent(event, action) {
    console.log("EVENTO = ", action);
    switch (action) {
      case TOOLBAR_ACTIONS.NEW:
        this.newMail(action);
        break;
      case TOOLBAR_ACTIONS.REPLY:
      case TOOLBAR_ACTIONS.REPLY_ALL:
        this.newMail(action, this.messageSelected);
        break;
      case TOOLBAR_ACTIONS.FORWARD:
        break;
      case TOOLBAR_ACTIONS.DELETE:
        break;
      case TOOLBAR_ACTIONS.MOVE:
        break;
      case TOOLBAR_ACTIONS.ARCHIVE:
        break;
    }
  }

  newMail(action, data?) {
    const ref = this.dialogService.open(NewMailComponent, {
      data: data ? {
        message: data.message,
        body: data.body,
        action: action
      } : {},
      header: "Nuova Mail",
      width: "auto",
      styleClass: "ui-dialog-resizable ui-dialog-draggable",  // actually doesn't work
      contentStyle: { "max-height": "800px", "min-height": "350px", "overflow": "auto", "height": "690px" }
    });
    ref.onClose.subscribe((el) => {
      if (el) {
        console.log("Ref: ", el);
      }
    });
  }

  ngOnDestroy() {
    this.messagesSubscription.unsubscribe();
  }

}
