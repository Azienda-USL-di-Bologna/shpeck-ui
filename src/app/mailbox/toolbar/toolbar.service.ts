import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, Subscription } from "rxjs";
import { FilterDefinition } from "@nfa/next-sdr";
import { Draft, Pec, Folder, Message, FolderType } from "@bds/ng-internauta-model";
import { NewMailComponent } from "../new-mail/new-mail.component";
import { DialogService, MessageService, MenuItem } from "primeng/api";
import { MessageEvent, ShpeckMessageService } from "src/app/services/shpeck-message.service";
import { DraftService, DraftEvent } from "src/app/services/draft.service";
import { TOOLBAR_ACTIONS } from "src/environments/app-constants";
import { PecFolderType, MailFoldersService, PecFolder } from "../mail-folders/mail-folders.service";
import { PecService } from "src/app/services/pec.service";
import { MailListService } from "../mail-list/mail-list.service";

@Injectable({
  providedIn: "root"
})
export class ToolBarService {
  private subscriptions: Subscription[] = [];
  private _filter: BehaviorSubject<FilterDefinition[]> = new BehaviorSubject<FilterDefinition[]>(null);

  public messageEvent: MessageEvent;
  public selectedMessages: Message[];
  public draftEvent: DraftEvent;
  private myPecs: Pec[];
  public folders: Folder[];
  public selectedFolder: Folder;
  public _selectedPec: Pec;
  public buttonObs: Map<string, Observable<boolean>>;
  public moveMenuItems: MenuItem[];

  public buttonsObservables = new Map([
    ["editActive", new BehaviorSubject<boolean>(false)],
    ["editVisible", new BehaviorSubject<boolean>(false)],
    ["buttonsActive", new BehaviorSubject<boolean>(false)],
    ["deleteActive", new BehaviorSubject<boolean>(false)],
    ["moveActive", new BehaviorSubject<boolean>(false)]
  ]);

  constructor(
    private dialogService: DialogService,
    private draftService: DraftService,
    private messageService: ShpeckMessageService,
    private messagePrimeService: MessageService,
    private mailFoldersService: MailFoldersService,
    private pecService: PecService,
    private mailListService: MailListService
    ) {
      this.move = this.move.bind(this);

      this.subscriptions.push(this.mailFoldersService.pecFolderSelected.subscribe((pecFolderSelected: PecFolder) => {
        if (pecFolderSelected && this.myPecs && this.myPecs.length > 0) {
          let idPec: number;
          if (pecFolderSelected.type === PecFolderType.FOLDER) {
            this.selectedFolder = pecFolderSelected.data as Folder;
            idPec = this.selectedFolder.fk_idPec.id;
            this.buttonsObservables.get("buttonsActive").next(false);
            this.buttonsObservables.get("editVisible").next(false);
            this.buttonsObservables.get("deleteActive").next(false);
          } else {
            idPec = ((pecFolderSelected.data) as Pec).id;
          }
          this.buttonsObservables.get("moveActive").next(false);
          this._selectedPec = this.myPecs.filter(p => p.id === idPec)[0];
        }
      }));
      this.subscriptions.push(this.pecService.myPecs.subscribe((pecs: Pec[]) => {
        if (pecs) {
          console.log("pecs = ", pecs);
          this.myPecs = pecs;
        }
      }));
      this.subscriptions.push(this.mailFoldersService.pecFolders.subscribe((folders: Folder[]) => {
        this.folders = folders;
      }));
      this.buttonObs = new Map();
      this.buttonsObservables.forEach((value, key) => {
        this.buttonObs.set(key, value);
      });

    this.subscriptions.push(this.messageService.messageEvent.subscribe((messageEvent: MessageEvent) => {
      if (messageEvent) {
        console.log("DATA = ", messageEvent);
        this.messageEvent = messageEvent;
        this.selectedMessages = this.messageEvent.selectedMessages;
        if (messageEvent.downloadedMessage) {
          this.buttonsObservables.get("buttonsActive").next(true);
        } else  {
          this.buttonsObservables.get("buttonsActive").next(false);
        }
        this.buttonsObservables.get("editVisible").next(false);
        const isMoveActive = this.mailListService.isMoveActive();
        this.buttonsObservables.get("moveActive").next(isMoveActive);

        const isDeleteActive = this.mailListService.isDeleteActive();
        this.buttonsObservables.get("deleteActive").next(isDeleteActive);
      }
    }));
    this.subscriptions.push(this.draftService.draftEvent.subscribe(
      (draftEvent: DraftEvent) => {
        if (draftEvent) {
          this.draftEvent = draftEvent;
          if (draftEvent) {
            this.buttonsObservables.get("editVisible").next(true);
            this.buttonsObservables.get("editActive").next(true);
            this.buttonsObservables.get("deleteActive").next(true);
          }
        } else {
          this.buttonsObservables.get("editVisible").next(false);
          this.buttonsObservables.get("editActive").next(false);
          this.buttonsObservables.get("deleteActive").next(false);
        }
      }
    ));
  }

  public buildMoveMenuItems() {
    return this.mailListService.buildMoveMenuItems(this.folders, this.selectedFolder, this.move);
  }

  private move(event) {
    if (event.item.queryParams.folder) {
      this.mailListService.moveMessages(event.item.queryParams.folder);
    }
  }

  public setFilterTyped(filter: FilterDefinition[]): void {
    this._filter.next(filter);
  }

  public get getFilterTyped(): Observable<FilterDefinition[]> {
    return this._filter.asObservable();
  }

  public handleDelete() {
    if (this.selectedFolder.type === FolderType.DRAFT) {
      if (this.draftEvent.fullDraft) {
        this.draftService.deleteDraftMessage(this.draftEvent.fullDraft.message.id, true);
      } else if (this.draftEvent.selectedDrafts && this.draftEvent.selectedDrafts.length > 0) {
        this.draftService.deleteDrafts(this.draftEvent.selectedDrafts, true);
      }
    } else {
      this.mailListService.moveMessagesToTrash();
    }
  }

  public newMail(pec: Pec, action) {

    const draftMessage = new Draft();
    /* const pec: Pec = new Pec();
    pec.id = pecId; */
    draftMessage.idPec = pec;
    if (action !== TOOLBAR_ACTIONS.NEW) {
      if (!this.messageEvent || !this.messageEvent.downloadedMessage) {
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
          action: action,
          reloadOnDelete: false
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

  public editMail() {
    if (this.draftEvent) {
      const ref = this.dialogService.open(NewMailComponent, {
        data: {
          fullMessage: this.draftEvent.fullDraft,
          idDraft: this.draftEvent.fullDraft.message.id,
          pec: this.draftEvent.fullDraft.message.idPec,
          action: "edit",
          reloadOnDelete: true
        },
        header: "Modifica bozza",
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
    }
  }

}
