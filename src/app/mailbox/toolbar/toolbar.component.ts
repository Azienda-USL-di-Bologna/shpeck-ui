import { Component, OnDestroy, ViewChild, ElementRef} from "@angular/core";
import { DialogService, ConfirmationService, MenuItem } from "primeng/api";
import { Subscription, Observable } from "rxjs";
import { TOOLBAR_ACTIONS } from "src/environments/app-constants";
import { Pec, Folder, FolderType } from "@bds/ng-internauta-model";
import { PecService } from "src/app/services/pec.service";
import { FilterDefinition, FILTER_TYPES } from "@nfa/next-sdr";
import { ToolBarService } from "./toolbar.service";
import { MailFoldersService } from "../mail-folders/mail-folders.service";
import { MailListService } from "../mail-list/mail-list.service";
import { Menu } from "primeng/menu";

@Component({
  selector: "app-toolbar",
  templateUrl: "./toolbar.component.html",
  providers: [ConfirmationService],
  styleUrls: ["./toolbar.component.scss"]
})
export class ToolbarComponent implements OnDestroy {
  private subscriptions: Subscription[] = [];
  private myPecs: Pec[];
  private folders: Folder[];
  private selectedFolder: Folder;
  private _selectedPec: Pec;

  public buttonObs: Map<string, Observable<boolean>>;
  public moveMenuItems: MenuItem[];
  public archiveMenuItems: MenuItem[];
  // @Output("filtersEmitter") private filtersEmitter: EventEmitter<FilterDefinition[]> = new EventEmitter();

  public showErrorDialog: boolean = false;

  @ViewChild("closeDialog", null) closeField: ElementRef;
  @ViewChild("search", null) searchField: ElementRef;
  @ViewChild("moveMenu", null) private moveMenu: Menu;
  @ViewChild("archiveMenu", null) private archiveMenu: Menu;

  constructor(public dialogService: DialogService,
    private pecService: PecService,
    public toolBarService: ToolBarService,
    private mailFoldersService: MailFoldersService,
    private mailListService: MailListService,
    private confirmationService: ConfirmationService
  ) {
    this.askConfirmationBeforeArchiviation = this.askConfirmationBeforeArchiviation.bind(this);
  }

  /**
   * Manager del menu.
   * @param event
   * @param action
   */
  handleEvent(event, action) {
    console.log("EVENTO = ", action);
    switch (action) {
      case TOOLBAR_ACTIONS.NEW:
        this.toolBarService.newMail(action);
        break;
      case TOOLBAR_ACTIONS.EDIT:
        this.toolBarService.editMail();
        break;
      case TOOLBAR_ACTIONS.REPLY:
      case TOOLBAR_ACTIONS.REPLY_ALL:
      case TOOLBAR_ACTIONS.FORWARD:
      this.toolBarService.newMail(action);
        break;
      case TOOLBAR_ACTIONS.DELETE:
        this.deletingConfirmation();
        break;
      case TOOLBAR_ACTIONS.MOVE:
          this.moveMenuItems = this.toolBarService.buildMoveMenuItems();
          this.moveMenu.toggle(event);
        break;
      case TOOLBAR_ACTIONS.ARCHIVE:
        this.archiveMenuItems = this.toolBarService.buildArchiveMenuItems(this.askConfirmationBeforeArchiviation);
        this.archiveMenu.toggle(event);
        break;
    }
  }

  private askConfirmationBeforeArchiviation(event) {
    if (this.mailListService.selectedMessages && this.mailListService.selectedMessages.length === 1 && event && event.item && event.item) {
      if (!event.item.queryParams.isPecDellAzienda) {
        this.confirmationService.confirm({
          header: "Conferma",
          message: "<b>Attenzione! Stai fascicolando su una azienda non associata alla casella selezionata su cui è arrivato il messaggio.</b><br/><br/>Sei sicuro?",
          icon: "pi pi-exclamation-triangle",
          accept: () => {
            this.mailListService.archiveMessage(event);
          }
        });
      } else {
        this.mailListService.archiveMessage(event);
      }
    }
  }

  // Gestore del focus sulla ricerca.
  public toggleDialogAndAddFocus() {
    this.showErrorDialog = !this.showErrorDialog;
    if (this.showErrorDialog === false) {
      this.searchField.nativeElement.focus();
      this.closeField.nativeElement.blur();
    }
  }


  // Scatta al keydown nella ricerca. Fa il controllo sui tre caratteri e la fa partire.
  public onEnter(value) {
    if (value && value.length >= 3) {
      const filter = [];
      filter.push(new FilterDefinition("tscol", FILTER_TYPES.not_string.equals, value));
      this.toolBarService.setFilterTyped(filter);
    } else {
      this.toggleDialogAndAddFocus();
    }
  }


  /**
   * Chiedo conferma sulla cancellazione dei messaggi selezioni.
   * In caso affermativo faccio partire la cancellazione spostamento nel cestino).
   */
  private deletingConfirmation() {
    let message: string;
    if (this.toolBarService.selectedFolder.type === FolderType.DRAFT) {
      message = "Vuoi eliminare definitivamente la bozza selezionata?";
      const drafts = this.toolBarService.draftEvent.selectedDrafts;
      if (drafts && drafts.length > 1) {
        message = "Vuoi eliminare definitivamente le bozze selezionate?";
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
