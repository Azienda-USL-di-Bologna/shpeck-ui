import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, AfterViewChecked, OnChanges, HostListener, Output, EventEmitter } from "@angular/core";
import { Subscription } from "rxjs";
import { SettingsService } from "../services/settings.service";
import { AppCustomization } from "src/environments/app-customization";
import { Folder, Message } from "@bds/ng-internauta-model";

@Component({
  selector: "app-mailbox",
  templateUrl: "./mailbox.component.html",
  styleUrls: ["./mailbox.component.scss"],

})
export class MailboxComponent implements OnInit, AfterViewInit, AfterViewChecked, OnChanges {

  public folderSelected: Folder;
  // @Output() message = new EventEmitter<any>();
  public message: Message;
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

  private enableSetLookCall = false;
  private MIN_X_MAIL_FOLDER: number = 5;
  private MAX_X_MAIL_FOLDER: number = 50;
  private MIN_X_RIGHTSIDE: number = 10;
  private MAX_X_RIGHTSIDE: number = 70;
  private CR7 = 103;
  private subscriptions: Subscription[] = [];

  constructor(private settingsService: SettingsService) {

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
  }

  /**
   * Rivevo il messaggio cliccato dalla mail-list e lo passo alla mail-detail per essere visualizzato
   */
  public messageClicked(messageClicked) {
    this.message = messageClicked;
  }

  public onFolderSelected(folder: Folder) {
    this.folderSelected = folder;
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
