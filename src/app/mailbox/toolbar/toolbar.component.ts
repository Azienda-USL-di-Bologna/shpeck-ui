import { Component, OnInit, OnDestroy, ViewChild, ElementRef} from "@angular/core";
import { DialogService, ConfirmationService, MenuItem } from "primeng/api";
import { Subscription, Observable } from "rxjs";
import { TOOLBAR_ACTIONS } from "src/environments/app-constants";
import { Pec, Folder, FolderType } from "@bds/ng-internauta-model";
import { PecService } from "src/app/services/pec.service";
import { FilterDefinition, FILTER_TYPES } from "@nfa/next-sdr";
import { ToolBarService } from "./toolbar.service";
import { MailFoldersService, PecFolder, PecFolderType } from "../mail-folders/mail-folders.service";
import { MailListService } from "../mail-list/mail-list.service";
import { Menu } from "primeng/menu";

@Component({
  selector: "app-toolbar",
  templateUrl: "./toolbar.component.html",
  providers: [ConfirmationService],
  styleUrls: ["./toolbar.component.scss"]
})
export class ToolbarComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];
  private myPecs: Pec[];
  private folders: Folder[];
  private selectedFolder: Folder;
  private _selectedPec: Pec;
  public buttonObs: Map<string, Observable<boolean>>;
  public moveMenuItems: MenuItem[];
  // @Output("filtersEmitter") private filtersEmitter: EventEmitter<FilterDefinition[]> = new EventEmitter();
  @ViewChild("moveMenu") private moveMenu: Menu;

  public showErrorDialog: boolean = false;

  @ViewChild("closeDialog") closeField: ElementRef;
  @ViewChild("search") searchField: ElementRef;
  toggleDialogAndAddFocus() {
    this.showErrorDialog = !this.showErrorDialog;
    if (this.showErrorDialog === false) {
      // console.log("Focus search bar", this.searchField, " show Dialog ", this.showErrorDialog )
      this.searchField.nativeElement.focus();
      this.closeField.nativeElement.blur();
    }
  }

  constructor(public dialogService: DialogService,
    private pecService: PecService,
    public toolBarService: ToolBarService,
    private mailFoldersService: MailFoldersService,
    private mailListService: MailListService,
    private confirmationService: ConfirmationService
  ) { }

  ngOnInit() {

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
    } else {
      this.toggleDialogAndAddFocus();
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
          this.moveMenuItems = this.toolBarService.buildMoveMenuItems();
          this.moveMenu.toggle(event);
        break;
      case TOOLBAR_ACTIONS.ARCHIVE:
        break;
    }
  }

  confirm() {
    let message: string;
    if (this.toolBarService.selectedFolder.type === FolderType.DRAFT) {
      message = "Sei sicuro di voler eliminare la bozza selezionata?";
      const drafts = this.toolBarService.draftEvent.selectedDrafts;
      if (drafts && drafts.length > 1) {
        message = "Sei sicuro di voler eliminare le bozze selezionate?";
      }
    } else {
      message = "Sei sicuro di voler eliminare i messaggi selezionati?";
    }
    this.confirmationService.confirm({
      message: message,
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
