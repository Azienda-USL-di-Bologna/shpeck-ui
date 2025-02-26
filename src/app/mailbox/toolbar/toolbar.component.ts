import { Component, OnDestroy, ViewChild, ElementRef, AfterViewInit, Input } from "@angular/core";
import { ConfirmationService, MenuItem } from "primeng/api";
import { Subscription, Observable } from "rxjs";
import { TOOLBAR_ACTIONS } from "src/environments/app-constants";
import { Pec, Folder, FolderType, Tag, ItemMenu } from "@bds/internauta-model";
import { PecService } from "src/app/services/pec.service";
import { FilterDefinition, FILTER_TYPES, SORT_MODES } from "@bds/next-sdr";
import { RicercaAvanzataFilters, ToolBarService, UserFilters } from "./toolbar.service";
import { MailFoldersService, PecFolderType } from "../mail-folders/mail-folders.service";
import { MailListService } from "../mail-list/mail-list.service";
import { Menu } from "primeng/menu";
import { DialogService } from "primeng/dynamicdialog";
import { MailboxService, Sorting } from "../mailbox.service";
import { DatePipe } from "@angular/common";
import { CustomCalendarComponent } from "@bds/common-components";
import { CustomReuseStrategy } from "@bds/common-tools";
import { ActivatedRoute, Router } from "@angular/router";
import { JwtLoginService } from "@bds/jwt-login";

@Component({
  selector: "app-toolbar",
  templateUrl: "./toolbar.component.html",
  providers: [ConfirmationService],
  styleUrls: ["./toolbar.component.scss"],
  standalone: false,
})
export class ToolbarComponent implements OnDestroy, AfterViewInit {
  private subscriptions: Subscription[] = [];
  private myPecs: Pec[];
  private folders: Folder[];
  private selectedFolder: Folder;
  private _selectedPec: Pec;
  private searchString: string;
  public numeroFiltriApplicati: string = "0";
  public stringaElencoFiltriApplicati: string = "";
  public ricercaAvanzataFilters: RicercaAvanzataFilters = {
    messageDate: null,
    soloReindirizzati: false,
  };
  public iconaRicercaAvanzata = "pi pi-filter";
  public startDateSelected: Date;
  public endDateSelected: Date;

  public buttonObs: Map<string, Observable<boolean>>;
  public moveMenuItems: MenuItem[];
  public archiveMenuItems: MenuItem[];
  // @Output("filtersEmitter") private filtersEmitter: EventEmitter<FilterDefinition[]> = new EventEmitter();

  public showErrorDialog: boolean = false;

  @Input("mode") mode: string = "standard"; // altri valori: intestazione-accessibilita (mostra solo Nuovo Messsaggio) dentro-messaggio-accessibilita (mostra i vari bottoni tranne Nuovo messaggio)

  @ViewChild("closeDialog", {}) closeField: ElementRef;
  @ViewChild("search", {}) searchField: ElementRef;
  @ViewChild("moveMenu", {}) private moveMenu: Menu;
  @ViewChild("archiveMenu", {}) private archiveMenu: Menu;
  @ViewChild("calendarRicercaAvanzata") public calendarRicercaAvanzata: CustomCalendarComponent;

  constructor(
    public dialogService: DialogService,
    private pecService: PecService,
    public toolBarService: ToolBarService,
    private mailFoldersService: MailFoldersService,
    private mailListService: MailListService,
    private confirmationService: ConfirmationService,
    private mailboxService: MailboxService,
    private datePipe: DatePipe,
    private router: Router,
    private loginService: JwtLoginService,
    private activatedRoute: ActivatedRoute
  ) {
    this.askConfirmationBeforeArchiviation = this.askConfirmationBeforeArchiviation.bind(this);
  }

  ngAfterViewInit() {}

  /**
   * Manager del menu.
   * @param event
   * @param action
   */
  handleEvent(event: any, action: any) {
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
      case "mouseout":
        this.moveMenu.hide();
        this.archiveMenu.hide();
        break;
    }
  }

  tornaIndietro() {
    CustomReuseStrategy.componentsReuseList.push("*");
    this.router.navigate(["../mail-list"], { relativeTo: this.activatedRoute });
  }

  private askConfirmationBeforeArchiviation(event: any) {
    if (
      this.mailListService.selectedMessages &&
      this.mailListService.selectedMessages.length === 1 &&
      event &&
      event.item &&
      event.item
    ) {
      if (!event.item.queryParams.isPecDellAzienda) {
        this.confirmationService.confirm({
          header: "Conferma",
          message:
            "<b>Attenzione! Stai fascicolando su una azienda non associata alla casella selezionata su cui è arrivato il messaggio.</b><br/><br/>Sei sicuro?",
          icon: "pi pi-exclamation-triangle",
          accept: () => {
            this.mailListService.archiveMessage(event);
          },
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

  /**
   * Chiedo conferma sulla cancellazione dei messaggi selezioni.
   * In caso affermativo faccio partire la cancellazione spostamento nel cestino).
   */
  private deletingConfirmation() {
    setTimeout(() => {
      let message: string;
      const almenoUnoConTag = this.mailListService.selectedMessages.some((m) => m.messageTagList);
      if (almenoUnoConTag) {
        var almenoUnoInErrore = this.mailListService.selectedMessages.some((m) =>
          m.messageTagList?.some((mt) => mt.idTag.name === "in_error")
        );
      } else {
        almenoUnoInErrore = false;
      }
      const defaultMessage = almenoUnoInErrore
        ? "Almeno uno dei messaggi selezionati è <b>in errore</b>, sei sicuro di volerli eliminare? Se eliminato verrà segnato come errore visto"
        : "Sei sicuro di voler eliminare i messaggi selezionati?";
      if (this.toolBarService.selectedFolder.type === FolderType.TRASH) {
        //this.mailListService.deleteSelectedMessageFromTrash();
        this.mailboxService.setDeleteSelectedMessageFromTrash();
      } else {
        if (this.toolBarService.selectedFolder.type === FolderType.DRAFT) {
          message = "Vuoi eliminare definitivamente la bozza selezionata?";
          const drafts = this.toolBarService.draftEvent.selectedDrafts;
          if (drafts && drafts.length > 1) {
            message = "Vuoi eliminare definitivamente le bozze selezionate?";
          }
        } else {
          if (almenoUnoInErrore) {
            message = defaultMessage;
          } else {
            message = "Sei sicuro di voler eliminare i messaggi selezionati?";
          }
        }

        this.confirmationService.confirm({
          message: message,
          header: "Conferma",
          icon: "pi pi-exclamation-triangle",
          accept: () => {
            this.toolBarService.handleDelete();
          },
          reject: () => {},
        });
      }
    }, 0);
  }

  onKeyUpMoveFocus(event: any) {
    // console.log("mailbox onKeyUpMoveFocus", event);
    const pecContainer: HTMLElement = document.querySelector(".content-left");
    const searchBar: HTMLElement = document.querySelector(".input-field");
    if (!!searchBar && document.activeElement === searchBar) {
      if (!!pecContainer) pecContainer.focus();
    } else if (document.activeElement !== pecContainer) {
      if (!!searchBar) searchBar.focus();
    }
  }

  /**
   * Questa funzione si occupa di costruire la frase che sarà letta tramite screenreader
   * quando ci si posiziona sulla ricerca
   */
  public getDescrizioneCerca(): string {
    if (this.toolBarService.actualPecFolderTagSelected === null) {
      return "";
    }
    if (
      this.toolBarService.actualPecFolderTagSelected.type === PecFolderType.TAG_CONTAINER ||
      this.toolBarService.actualPecFolderTagSelected.type === PecFolderType.PEC
    ) {
      if (this.toolBarService.actualPecFolderTagSelected.type === "pec") {
        return "Cerca nella casella pec " + (this.toolBarService.actualPecFolderTagSelected.data as Pec).indirizzo;
      } else {
        return "Cerca nella casella pec " + this.toolBarService.actualPecFolderTagSelected.pec.indirizzo;
      }
    }
    if (this.toolBarService.actualPecFolderTagSelected.type === PecFolderType.FOLDER) {
      return (
        "Cerca nella cartella " +
        (this.toolBarService.actualPecFolderTagSelected.data as Folder).description +
        " della casella pec " +
        this.toolBarService.actualPecFolderTagSelected.pec.indirizzo
      );
    }
    if (this.toolBarService.actualPecFolderTagSelected.type === PecFolderType.TAG) {
      return (
        "Cerca nell'etichetta " +
        (this.toolBarService.actualPecFolderTagSelected.data as Tag).description +
        " della casella pec " +
        this.toolBarService.actualPecFolderTagSelected.pec.indirizzo
      );
    }
    return "";
  }

  /**
   * Scatta al keydown dell'invio nella ricerca.
   * Fa il controllo sui tre caratteri e la fa partire.
   * @param value
   */
  public onSearch(value: string, enter: boolean) {
    if ((value == null || value === "") && this.searchString != null && this.searchString !== "") {
      // Quindi ora la ricerca è vuota ma prima non lo era, allora resetto la ricerca
      this.clearInput();
    }

    this.searchString = value;

    if (enter) {
      if (value && value.length >= 3) {
        this.applyFilters();
      } else {
        this.toggleDialogAndAddFocus();
      }
    }
  }

  private applyFilters() {
    const userFilters: UserFilters = {
      searchString: this.searchString,
      ricercaAvanzataFilters: Object.assign({}, this.ricercaAvanzataFilters),
    };

    this.toolBarService.setUserFilters(userFilters);
    let sort: Sorting;
    if (this.searchString && this.searchString != "") {
      sort = {
        field: "ranking",
        sortMode: SORT_MODES.desc,
      };
    } else {
      sort = {
        field: "receiveTime",
        sortMode: SORT_MODES.desc,
        reset: false,
      };
    }

    this.mailboxService.setSorting(sort);
  }

  /**
   * Metodo che si occupa di resettare la ricerca contatti quando si preme la x
   */
  public clearInput(clearRicercaAvanzata = false): void {
    this.searchField.nativeElement.value = "";
    this.searchString = null;
    if (clearRicercaAvanzata) {
      this.ricercaAvanzataFilters = {
        messageDate: null,
        soloReindirizzati: false,
      };
      this.clearCalendar(this.calendarRicercaAvanzata);
    }

    this.updateInfoFiltriApplicati();
    this.applyFilters();
  }

  private clearCalendar(calendar: CustomCalendarComponent) {
    if (calendar) {
      calendar.startDateSelected = null;
      calendar.endDateSelected = null;
      calendar.calendarStartDate.writeValue(null);
      calendar.calendarEndDate.writeValue(null);
    }
  }

  /**
   * Metodo usato dal template, quando l'utente sceglie la data sulla ricerca avanzata questa viene
   * scritta dentro this.ricercaAvanzataFilters
   */
  public intervalDateSelected(event: { startDate: Date; endDate: Date }): void {
    console.log("ricercaAvanzataFilters", this.ricercaAvanzataFilters);
    if (event.startDate != null && event.endDate != null) {
      this.ricercaAvanzataFilters.messageDate = {
        startDate: this.datePipe.transform(event.startDate, "yyyy-MM-dd'T'HH:mm:ss.SSSSSSZZZZZ"),
        endDate: this.datePipe.transform(event.endDate, "yyyy-MM-dd'T'HH:mm:ss.SSSSSSZZZZZ"),
      };
    } else {
      this.ricercaAvanzataFilters.messageDate = null;
    }
  }

  /**
   *
   */
  public avviaRicercaAvanzata(): void {
    this.updateInfoFiltriApplicati();
    this.applyFilters();
  }

  public onDoProtocolla(event: ItemMenu) {
    this.mailListService.checkCurrentStatusAndRegister(() => {
      let urlNewDoc = "";
      urlNewDoc =
        this.getFrontedAppUrl("scripta") +
        "/doc?from=internauta&command=NEW&idMessage=" +
        this.toolBarService.selectedMessages[0].id +
        "&azienda=" +
        event.openCommand;
      const encodeParams = false;
      const addPassToken = true;
      const addRichiestaParam = false;
      this.loginService
        .buildInterAppUrl(urlNewDoc, encodeParams, addRichiestaParam, addPassToken, true)
        .subscribe((url: string) => {
          console.log("urlAperto:", url);
        });
    }, event.openCommand);

    /* if (this.aziendeProtocollabiliMenuItems.length === 1) {
      this.doAction({
        item: this.aziendeProtocollabiliMenuItems[0]
      });
    } else {
      this.protocollamenu.toggle(event);
    } */
  }

  /**
   * Crea l'url di una app frontend
   * */
  public getFrontedAppUrl(app: string): string {
    const wl = window.location;
    let port = wl.port;
    app = "/" + app;
    //port = wl.port;
    if (wl.hostname === "localhost") {
      //return "https://gdml.internal.ausl.bologna.it/" + app;
      port = "4200";
      app = "";
    }

    const out: string = wl.protocol + "//" + wl.hostname + (port ? ":" + port : "") + app;
    return out;
  }

  /**
   * Updates the number of applied filters based on the values in the `ricercaAvanzataFilters` object.
   * The `numeroFiltriApplicati` property is set to a string representation of the number of applied filters.
   */
  private updateInfoFiltriApplicati(): void {
    let n = 0;
    this.stringaElencoFiltriApplicati = "";
    if (this.ricercaAvanzataFilters.messageDate) {
      n++;
      //this.stringaElencoFiltriApplicati += "Data messaggio: " + this.ricercaAvanzataFilters.messageDate.startDate + " - " + this.ricercaAvanzataFilters.messageDate.endDate + "\n";
      this.stringaElencoFiltriApplicati += "- data messaggio,\n";
    }
    if (this.ricercaAvanzataFilters.soloReindirizzati) {
      n++;
      this.stringaElencoFiltriApplicati += "- solo reindirizzati,\n";
    }
    this.stringaElencoFiltriApplicati = this.stringaElencoFiltriApplicati.substring(
      0,
      this.stringaElencoFiltriApplicati.length - 2
    );
    this.numeroFiltriApplicati = n.toString();

    if (this.numeroFiltriApplicati === "0") {
      this.iconaRicercaAvanzata = "pi pi-filter";
    } else {
      this.iconaRicercaAvanzata = "pi pi-filter-fill";
    }
  }

  ngOnDestroy() {
    if (this.subscriptions && this.subscriptions.length > 0) {
      this.subscriptions.forEach((subscription: Subscription) => {
        subscription.unsubscribe();
      });
    }
  }
}
