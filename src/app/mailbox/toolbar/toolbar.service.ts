import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, Subscription } from "rxjs";
import { FilterDefinition } from "@nfa/next-sdr";
import { Draft, Pec } from "@bds/ng-internauta-model";
import { NewMailComponent } from "../new-mail/new-mail.component";
import { DialogService, MessageService } from "primeng/api";
import { MessageEvent, ShpeckMessageService } from "src/app/services/shpeck-message.service";
import { DraftService } from "src/app/services/draft.service";
import { TOOLBAR_ACTIONS } from "src/environments/app-constants";

@Injectable({
  providedIn: "root"
})
export class ToolBarService {
  private subscriptions: Subscription[] = [];
  private _filter: BehaviorSubject<FilterDefinition[]> = new BehaviorSubject<FilterDefinition[]>(null);

  public buttonsActive: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public messageEvent: MessageEvent;

  constructor(
    private dialogService: DialogService,
    private draftService: DraftService,
    private messageService: ShpeckMessageService,
    private messagePrimeService: MessageService) {
    this.subscriptions.push(this.messageService.messageEvent.subscribe((messageEvent: MessageEvent) => {
      if (messageEvent) {
        console.log("DATA = ", messageEvent);
        this.messageEvent = messageEvent;
        messageEvent.downloadedMessage ? this.buttonsActive.next(true) : this.buttonsActive.next(false);
      }
    }));
  }

  public setFilterTyped(filter: FilterDefinition[]): void {
    this._filter.next(filter);
  }

  public get getFilterTyped(): Observable<FilterDefinition[]> {
    return this._filter.asObservable();
  }

  public newMail(pecId, action) {

    const draftMessage = new Draft();
    const pec: Pec = new Pec();
    pec.id = pecId;
    draftMessage.idPec = pec;
    if (action !== TOOLBAR_ACTIONS.NEW) {
      if (this.messageEvent && !this.messageEvent.downloadedMessage) {
        this.messagePrimeService.add(
          { severity: "error", summary: "Errore", detail: "Errore! Non è possibile agire sulla mail. Contattare BabelCare" });
        return;
      }
    }
    this.draftService.postHttpCall(draftMessage).subscribe((draft: Draft) => {
      const ref = this.dialogService.open(NewMailComponent, {
        data: {
          fullMessage: this.messageEvent ? this.messageEvent.downloadedMessage : undefined,
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
}
