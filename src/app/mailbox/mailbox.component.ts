import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, AfterViewChecked, OnChanges, HostListener } from "@angular/core";
import { Subscription } from "rxjs";
import { SettingsService } from "../services/settings.service";
import { AppCustomization } from "src/environments/app-customization";
import { Folder, Message, FolderType, Tag, Pec, Menu } from "@bds/ng-internauta-model";
import { FilterDefinition, SORT_MODES } from "@nfa/next-sdr";
import { MailFoldersService, PecFolder, PecFolderType } from "./mail-folders/mail-folders.service";
import { MenuItem } from "primeng-lts/api";
import { MailboxService, Sorting, TotalMessageNumberDescriptor } from "./mailbox.service";
import { FONTSIZE } from "src/environments/app-constants";

@Component({
  selector: "app-mailbox",
  templateUrl: "./mailbox.component.html",
  styleUrls: ["./mailbox.component.scss"],
})
export class MailboxComponent implements OnInit, AfterViewInit, AfterViewChecked, OnChanges {

  public pecFolderSelected: PecFolder;
  public _selectedPec: Pec;
  public _selectedTag: Tag;
  public _selectedFolder: Folder;
  public filtersSelected: FilterDefinition[];
  // @Output() message = new EventEmitter<any>();
  public message: Message;
  public _selectedPecId: number;
  // @ViewChild("leftSide") private leftSide: ElementRef;
  @ViewChild("mailFolder", null) private mailFolder: ElementRef;
  @ViewChild("rightSide", null) private rightSide: ElementRef;
  @ViewChild("mailContainer", null) private mailContainer: ElementRef;
  @ViewChild("mailList", null) private mailList: ElementRef;
  @ViewChild("mailDetail", null) private mailDetail: ElementRef;
  @ViewChild("rightSlider", null) private rightSlider: ElementRef;
  @ViewChild("leftSlider", null) private leftSlider: ElementRef;

  public rightSideVisible: boolean;
  public flexGridClass = "p-col-8";
  public sliding: boolean = false;
  public hideDetail = false;
  public fontSize = FONTSIZE.BIG;
  public componentToLoad: string = "mail-list";
  public totalMessageNumberDescriptor: TotalMessageNumberDescriptor;

  public tooltipSorting = "L'ordinamento è impostato su data discendente";
  public sortMenuItem: MenuItem[] = [
    {
      label: "Data",
      icon: "pi pi-chevron-down",
      id: "sortData",
      title: "data",
      disabled: false,
      queryParams: {
        sort: SORT_MODES.desc,
        field: "receiveTime"
      },
      command: event => this.changeSorting(event)
    },
    {
      label: "Mittente",
      icon: "",
      id: "sortMittente",
      title: "mittente",
      disabled: false,
      queryParams: {
        sort: null,
        field: "messageExtensionList.addressFrom"
      },
      command: event => this.changeSorting(event)
    },
    {
      label: "Da leggere",
      icon: "",
      id: "sortLetto",
      title: "letto",
      disabled: false,
      queryParams: {
        sort: null,
        field: "seen"
      },
      command: event => this.changeSorting(event)
    }
  ];

  private enableSetLookCall = false;
  private MIN_X_MAIL_FOLDER: number = 5;
  private MAX_X_MAIL_FOLDER: number = 50;
  private MIN_X_RIGHTSIDE: number = 10;
  private MAX_X_RIGHTSIDE: number = 70;
  private subscriptions: Subscription[] = [];

  private regexFindP = new RegExp(/[)()]+/, "gm"); // find  symbols ) or ( 

  constructor(private settingsService: SettingsService,
    private mailFoldersService: MailFoldersService,
    private mailboxService: MailboxService) {

    this.rightSideVisible = true;
  }


  ngOnInit() {
    // this.setLook();
    this.subscriptions.push(this.settingsService.settingsChangedNotifier$.subscribe(newSettings => {
      this.hideDetail = newSettings[AppCustomization.shpeck.hideDetail] === "true";
      this.fontSize = newSettings[AppCustomization.shpeck.fontSize] ? newSettings[AppCustomization.shpeck.fontSize] : FONTSIZE.BIG;
      if (this.hideDetail) {
        this.mailList.nativeElement.style.flex = "1";
      }
    }));
    this.subscriptions.push(this.mailFoldersService.pecFolderSelected.subscribe((pecFolderSelected: PecFolder) => {
      // al cambio di cartella/tag setto a null il numero di messaggi in modo che sparisca e ricompaia poi dopo che i nuovi messaggi sono stati caricati
      this.totalMessageNumberDescriptor = null;
      this.pecFolderSelected = pecFolderSelected;
      if (pecFolderSelected) {
        if (pecFolderSelected.type === PecFolderType.FOLDER) {
          const selectedFolder: Folder = pecFolderSelected.data as Folder;
          this._selectedFolder = pecFolderSelected.data as Folder;
          this._selectedFolder.description  = this._selectedFolder.description.replace(this.regexFindP, "_");
          this._selectedPecId = selectedFolder.fk_idPec.id;
          if (selectedFolder.type === FolderType.DRAFT) {
            this.componentToLoad = "mail-draft";
          } else if (selectedFolder.type === FolderType.OUTBOX) {
            this.componentToLoad = "mail-outbox";
          } else {
            this.componentToLoad = "mail-list";
          }
          this._selectedTag = null;
        } else if (pecFolderSelected.type === PecFolderType.TAG) {
          this.componentToLoad = "mail-list";
          this._selectedFolder = null;
          this._selectedTag = pecFolderSelected.data as Tag;
          this._selectedTag.description = this._selectedTag.description.replace(this.regexFindP, "_");
          this._selectedPecId = this._selectedTag.fk_idPec.id;
          this._selectedPec = pecFolderSelected.pec;
        } else {
          this.componentToLoad = "mail-list";
          this._selectedPec = pecFolderSelected.data as Pec;
          this._selectedPecId = this._selectedPec.id;
          this._selectedFolder = null;
          this._selectedTag = null;
        }
      }
    }));
    this.subscriptions.push(this.mailboxService.totalMessageNumberDescriptor$.subscribe((totalMessageNumberDescriptor: TotalMessageNumberDescriptor) => {
      if (totalMessageNumberDescriptor) {
        if (this.pecFolderSelected.type === totalMessageNumberDescriptor.pecFolder.type) {
          switch (totalMessageNumberDescriptor.pecFolder.type) {
            case PecFolderType.FOLDER:
              const receivedSelectedFolder: Folder = totalMessageNumberDescriptor.pecFolder.data as Folder;
              const folderSelected: Folder = this.pecFolderSelected.data as Folder;
              if (receivedSelectedFolder.id === folderSelected.id) {
                this.totalMessageNumberDescriptor = totalMessageNumberDescriptor;
              }
            break;
            case PecFolderType.TAG:
              const tagSelected: Tag = this.pecFolderSelected.data as Tag;
              const receivedSelectedTag: Tag = totalMessageNumberDescriptor.pecFolder.data as Tag;
              if (receivedSelectedTag.id === tagSelected.id) {
                this.totalMessageNumberDescriptor = totalMessageNumberDescriptor;
              }
            break;
          }
        }
      }
    }));
  }

  /**
   * Gestisce la scelta del sorting da parte dell'utente
   */
  public changeSorting(event) {
    console.log(event);
    this.sortMenuItem.forEach(sortItem => {
      if (sortItem.id === event.item.id) {
        sortItem.queryParams.sort = sortItem.queryParams.sort === null || sortItem.queryParams.sort === SORT_MODES.desc ? SORT_MODES.asc :  SORT_MODES.desc;
        sortItem.icon = sortItem.queryParams.sort === SORT_MODES.desc ? "pi pi-chevron-down" : "pi pi-chevron-up";
        const sort: Sorting = {
          field: sortItem.queryParams.field,
          sortMode: sortItem.queryParams.sort
        };
        this.mailboxService.setSorting(sort);
        this.tooltipSorting = `L'ordinamento è impostato su ${sortItem.title} ${sortItem.queryParams.sort === SORT_MODES.desc ? "discendente" : "ascendente"}`;
      } else {
        sortItem.queryParams.sort = null;
        sortItem.icon = null;
      }
    });
  }

  /**
   * Rivevo il messaggio cliccato dalla mail-list e lo passo alla mail-detail per essere visualizzato
   */
  public messageClicked(messageClicked) {
    this.message = messageClicked;
  }

  // public onFolderSelected(folder: Folder) {
  //   // faccio la copia per fare in modo che scatti sempre l'input di mail-list-component, altrimento se l'oggetto è lo stesso non scatterebbe
  //   if (folder) {
  //     this.folderSelected = new Folder();
  //     Object.assign(this.folderSelected , folder);
  //   } else {
  //     this.folderSelected = null;
  //   }
  // }

  public onFilterSelection(filters: FilterDefinition[]) {
    this.filtersSelected = filters;
  }

  ngAfterViewInit() {
    this.setLook();
  }

  ngOnChanges() {
    // this.setLook();
  }

  ngAfterViewChecked() {
    if (this.enableSetLookCall) {
      this.setLook();
      this.enableSetLookCall = false;
    }
  }

  @HostListener("window:resize", ["$event"])
  onResize(event: any) {
    // this.setLook();
  }

  /* toggleRightSide() {
    if (!!this.rightSideVisible) {
      this.rightSideVisible = false;
      this.enableSetLookCall = false;
      this.flexGridClass = "p-col-12";
    } else {
      this.rightSideVisible = true;
      this.enableSetLookCall = true;
      this.flexGridClass = "p-col-8";
    }
  } */

  private setLook(): void {
    this.setResponsiveSliders();
    if (this.settingsService.getImpostazioniVisualizzazione()) {
      this.hideDetail = this.settingsService.getHideDetail() === "true";
      const fontSize = this.settingsService.getFontSize();
      this.fontSize = fontSize ? fontSize : FONTSIZE.BIG;
    }
  }

  private setResponsiveSliders(): void {
    const that = this;
    this.rightSlider.nativeElement.onmousedown = function (event: MouseEvent) {
      that.sliding = true;
      event.preventDefault();
      const totalX = that.rightSide.nativeElement.offsetWidth;
      const offsetLeftSide = event.clientX - that.mailList.nativeElement.offsetWidth;
      document.onmouseup = function() {
        that.sliding = false;
        document.onmousemove = null;
        document.onmouseup = null;
      };

      document.onmousemove = function(e: MouseEvent) {
        e.preventDefault();
        const xLeft = e.clientX - offsetLeftSide;
        const mailListWidth = xLeft * 100 / totalX;
        if (mailListWidth >= that.MIN_X_RIGHTSIDE && mailListWidth < that.MAX_X_RIGHTSIDE) {
          that.mailList.nativeElement.style.width =  mailListWidth + "%";
          that.mailList.nativeElement.style.flex = "none";
        }
      };
    };

    this.leftSlider.nativeElement.onmousedown = function (event: MouseEvent) {
      event.preventDefault();
      const totalX = that.mailContainer.nativeElement.offsetWidth;
      const offsetLeftSide = event.clientX - that.mailFolder.nativeElement.offsetWidth;
      document.onmouseup = function() {
        document.onmousemove = null;
        document.onmouseup = null;
      };
      document.onmousemove = function(e: MouseEvent) {
        e.preventDefault();
        const xLeft = e.clientX - offsetLeftSide;
        const mailFolderWidth = xLeft * 100 / totalX;
        if (mailFolderWidth >= that.MIN_X_MAIL_FOLDER && mailFolderWidth < that.MAX_X_MAIL_FOLDER) {
          that.mailFolder.nativeElement.style.width =  mailFolderWidth + "%";
        }
      };
    };
  }

  onKeyUpMoveFocus(event) {
    // console.log("mailbox onKeyUpMoveFocus", event);
    this.stopPropagation(event);

    const pecContainer: HTMLElement = document.querySelector(".content-left");
    const listContainer: HTMLElement = document.querySelector(".mail-list");
    const mailDetailContainer: HTMLElement = document.querySelector(".mail-detail");
    const searchBar: HTMLElement = document.querySelector(".input-find");
    
    if (pecContainer && document.activeElement === pecContainer) {
      if (!!listContainer) listContainer.focus();
    } else if (!!listContainer && document.activeElement === listContainer) {
      // if (!!pecContainer) pecContainer.focus();
      if (!!mailDetailContainer) {
        mailDetailContainer.focus();
      } else {
        if (!!searchBar) searchBar.focus();
      }
    } else if (!!mailDetailContainer && document.activeElement === mailDetailContainer) {
      if (!!searchBar) searchBar.focus();
    } else if (document.activeElement !== pecContainer && document.activeElement !== listContainer && document.activeElement !== searchBar) {
      if (!!searchBar) searchBar.focus();
    }
  }

  private stopPropagation(event) {
    event.preventDefault();
    event.stopPropagation();
  }
}
