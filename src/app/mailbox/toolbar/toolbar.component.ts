import { Component, OnInit, OnDestroy} from "@angular/core";
import { DialogService, ConfirmationService } from "primeng/api";
import { ShpeckMessageService, MessageEvent } from "src/app/services/shpeck-message.service";
import { Subscription, Observable } from "rxjs";
import { TOOLBAR_ACTIONS } from "src/environments/app-constants";
import { Pec, Folder } from "@bds/ng-internauta-model";
import { PecService } from "src/app/services/pec.service";
import { FilterDefinition, FILTER_TYPES } from "@nfa/next-sdr";
import { ToolBarService } from "./toolbar.service";
import { MailFoldersService, PecFolder, PecFolderType } from "../mail-folders/mail-folders.service";

@Component({
  selector: "app-toolbar",
  templateUrl: "./toolbar.component.html",
  providers: [ConfirmationService],
  styleUrls: ["./toolbar.component.scss"]
})
export class ToolbarComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];
  private myPecs: Pec[];
  private _selectedPec: Pec;
  public messageEvent: MessageEvent;
  public buttonObs: Map<string, Observable<boolean>>;
  // @Output("filtersEmitter") private filtersEmitter: EventEmitter<FilterDefinition[]> = new EventEmitter();

  constructor(public dialogService: DialogService,
    private pecService: PecService,
    private toolBarService: ToolBarService,
    private mailFoldersService: MailFoldersService,
    private confirmationService: ConfirmationService
  ) { }

  ngOnInit() {
    this.subscriptions.push(this.mailFoldersService.pecFolderSelected.subscribe((pecFolderSelected: PecFolder) => {
      if (pecFolderSelected && this.myPecs && this.myPecs.length > 0) {
        let idPec: number;
        if (pecFolderSelected.type === PecFolderType.FOLDER) {
          const selectedFolder: Folder = pecFolderSelected.data as Folder;
          idPec = selectedFolder.fk_idPec.id;
          this.toolBarService.buttonsObservables.get("buttonsActive").next(false);
          this.toolBarService.buttonsObservables.get("editVisible").next(false);
          this.toolBarService.buttonsObservables.get("deleteActive").next(false);
        } else {
          idPec = ((pecFolderSelected.data) as Pec).id;
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
    this.buttonObs = new Map();
    this.toolBarService.buttonsObservables.forEach((value, key) => {
      this.buttonObs.set(key, value);
    });
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
    if (value && value.length >= 3) {
      const filter = [];
      filter.push(new FilterDefinition("tscol", FILTER_TYPES.not_string.equals, value));
      this.toolBarService.setFilterTyped(filter);
    }
  }

  handleEvent(event, action) {
    console.log("EVENTO = ", action);
    switch (action) {
      case TOOLBAR_ACTIONS.NEW:
        this.toolBarService.newMail(this._selectedPec, action);
        break;
      case TOOLBAR_ACTIONS.EDIT:
        this.toolBarService.editMail();
        break;
      case TOOLBAR_ACTIONS.REPLY:
      case TOOLBAR_ACTIONS.REPLY_ALL:
      case TOOLBAR_ACTIONS.FORWARD:
      this.toolBarService.newMail(this._selectedPec, action);
        break;
      case TOOLBAR_ACTIONS.DELETE:
        this.confirm();
        break;
      case TOOLBAR_ACTIONS.MOVE:
        break;
      case TOOLBAR_ACTIONS.ARCHIVE:
        break;
    }
  }

  confirm() {
    this.confirmationService.confirm({
      message: "Sei sicuro di voler eliminare la bozza?",
      header: "Conferma",
      icon: "pi pi-exclamation-triangle",
      accept: () => {
        this.toolBarService.handleDelete();
      },
      reject: () => {}
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
