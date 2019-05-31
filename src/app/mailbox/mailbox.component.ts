import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, AfterViewChecked, OnChanges, HostListener, Output, EventEmitter } from "@angular/core";
import { Subscription } from "rxjs";
import { SettingsService } from "../services/settings.service";
import { AppCustomization } from "src/environments/app-customization";
import { Folder, Message, FolderType } from "@bds/ng-internauta-model";
import { FilterDefinition } from "@nfa/next-sdr";
import { MailFoldersService, PecFolder, PecFolderType } from "./mail-folders/mail-folders.service";

@Component({
  selector: "app-mailbox",
  templateUrl: "./mailbox.component.html",
  styleUrls: ["./mailbox.component.scss"],
})
export class MailboxComponent implements OnInit, AfterViewInit, AfterViewChecked, OnChanges {

  public folderSelected: Folder;
  public filtersSelected: FilterDefinition[];
  // @Output() message = new EventEmitter<any>();
  public message: Message;
  public _selectedPecId: number;
  // @ViewChild("leftSide") private leftSide: ElementRef;
  @ViewChild("mailFolder") private mailFolder: ElementRef;
  @ViewChild("rightSide") private rightSide: ElementRef;
  @ViewChild("mailContainer") private mailContainer: ElementRef;
  @ViewChild("mailList") private mailList: ElementRef;
  @ViewChild("mailDetail") private mailDetail: ElementRef;
  @ViewChild("rightSlider") private rightSlider: ElementRef;
  @ViewChild("leftSlider") private leftSlider: ElementRef;
  public rightSideVisible: boolean;
  public flexGridClass = "p-col-8";
  public sliding: boolean = false;
  public hideDetail = false;
  public componentToLoad: string = "mail-list";

  private enableSetLookCall = false;
  private MIN_X_MAIL_FOLDER: number = 5;
  private MAX_X_MAIL_FOLDER: number = 50;
  private MIN_X_RIGHTSIDE: number = 10;
  private MAX_X_RIGHTSIDE: number = 70;
  private subscriptions: Subscription[] = [];

  constructor(private settingsService: SettingsService, private mailFoldersService: MailFoldersService) {

    this.rightSideVisible = true;
  }


  ngOnInit() {
    // this.setLook();
    this.subscriptions.push(this.settingsService.settingsChangedNotifier$.subscribe(newSettings => {
      this.hideDetail = newSettings[AppCustomization.shpeck.hideDetail] === "true";
      if (this.hideDetail) {
        this.mailList.nativeElement.style.flex = "1";
      }
    }));
    this.subscriptions.push(this.mailFoldersService.pecFolderSelected.subscribe((pecFolderSelected: PecFolder) => {
      if (pecFolderSelected) {
        if (pecFolderSelected.type === PecFolderType.FOLDER) {
          const selectedFolder: Folder = pecFolderSelected.data as Folder;
          this._selectedPecId = selectedFolder.fk_idPec.id;
          if (selectedFolder.type === FolderType.DRAFT) {
            this.componentToLoad = "mail-draft";
          } else {
            this.componentToLoad = "mail-list";
          }
        }
      }
    }));
  }

  /**
   * Rivevo il messaggio cliccato dalla mail-list e lo passo alla mail-detail per essere visualizzato
   */
  public messageClicked(messageClicked) {
    this.message = messageClicked;
  }

  public onFolderSelected(folder: Folder) {
    // faccio la copia per fare in modo che scatti sempre l'input di mail-list-component, altrimento se l'oggetto è lo stesso non scatterebbe
    if (folder) {
      this.folderSelected = new Folder();
      Object.assign(this.folderSelected , folder);
    } else {
      this.folderSelected = null;
    }
  }

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
}
