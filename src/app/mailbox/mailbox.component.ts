import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, AfterViewChecked, OnChanges, HostListener } from "@angular/core";

@Component({
  selector: "app-mailbox",
  templateUrl: "./mailbox.component.html",
  styleUrls: ["./mailbox.component.scss"],

})
export class MailboxComponent implements OnInit, AfterViewInit, AfterViewChecked, OnChanges {

  // @ViewChild("leftSide") private leftSide: ElementRef;
  @ViewChild("mailFolder") private mailFolder: ElementRef;
  @ViewChild("rightSide") private rightSide: ElementRef;
  @ViewChild("mailContainer") private mailContainer: ElementRef;
  @ViewChild("mailList") private mailList: ElementRef;
  @ViewChild("mailDetail") private mailDetail: ElementRef;
  @ViewChild("rightSlider") private rightSlider: ElementRef;
  public rightSideVisible: boolean;
  public flexGridClass = "p-col-8";

  private enableSetLookCall = false;
  private MIN_X_LEFT_SIDE: number = 570;
  private MIN_X_RIGHT_SIDE: number = 225;
  private CR7 = 103;

  constructor() {

    this.rightSideVisible = true;
  }


  ngOnInit() {
    // this.setLook();
  }

  ngAfterViewInit() {
    this.setLook();
  }

  ngOnChanges() {
    //this.setLook();
  }

  ngAfterViewChecked() {
    if (this.enableSetLookCall) {
      this.setLook();
      this.enableSetLookCall = false;
    }
  }

  @HostListener("window:resize", ["$event"])
  onResize(event: any) {
    //this.setLook();
  }

  toggleRightSide() {
    if (!!this.rightSideVisible) {
      this.rightSideVisible = false;
      this.enableSetLookCall = false;
      this.flexGridClass = "p-col-12";
    } else {
      this.rightSideVisible = true;
      this.enableSetLookCall = true;
      this.flexGridClass = "p-col-8";
    }
  }

  private setLook(): void {
    this.setResponsiveSlider();
    // this.rightSide.nativeElement.style.width = "30%";
    //this.rightSlider.nativeElement.style.marginLeft = this.mailFolder.nativeElement.clientWidth + this.mailList.nativeElement.clientWidth + "px" ;
    //this.rightSlider.nativeElement.style.left =  "0px" ;
    // this.rightSlider.nativeElement.style.marginLeft = "200px" ;
  }

  private setResponsiveSlider(): void {
    const that = this;
    this.rightSlider.nativeElement.onmousedown = function (event: MouseEvent) {
      event.preventDefault();
      const totalX = that.rightSide.nativeElement.offsetWidth;
      const offsetLeftSide = event.clientX - that.mailList.nativeElement.offsetWidth;
      document.onmouseup = function() {
        document.onmousemove = null;
        document.onmouseup = null;
      };

      document.onmousemove = function(e: MouseEvent) {
        e.preventDefault();
        const xLeft = e.clientX - offsetLeftSide;
        that.mailList.nativeElement.style.width =  xLeft * 100 / totalX + "%";
        that.mailList.nativeElement.style.flex = "none";
      };
    };
  }


}
