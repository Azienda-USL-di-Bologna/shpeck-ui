import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, AfterViewChecked } from "@angular/core";

@Component({
  selector: "app-mailbox",
  templateUrl: "./mailbox.component.html",
  styleUrls: ["./mailbox.component.scss"],

})
export class MailboxComponent implements OnInit, AfterViewInit, AfterViewChecked {

  @ViewChild("leftSide") private leftSide: ElementRef;
  @ViewChild("rightSide") private rightSide: ElementRef;
  @ViewChild("slider") private slider: ElementRef;

  public rightSideVisible: boolean;
  public flexGridClass = "p-col-8";

  private enableSetLookCall = false;
  private MIN_X_LEFT_SIDE: number = 570;
  private MIN_X_RIGHT_SIDE: number = 225;
  private CR7 = 7;

  constructor() {

    this.rightSideVisible = true;
  }


  ngOnInit() {
  }

  ngAfterViewInit() {
    this.setLook();
  }

  ngAfterViewChecked() {
    if (this.enableSetLookCall) {
      this.setLook();
      this.enableSetLookCall = false;
    }
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
    this.rightSide.nativeElement.style.width = "30%";
    this.slider.nativeElement.style.marginLeft = "70%";
  }

  private setResponsiveSlider(): void {
    const that = this;
    this.slider.nativeElement.onmousedown = function (event: MouseEvent) {
      event.preventDefault();
      const totalX = that.rightSide.nativeElement.offsetWidth + that.leftSide.nativeElement.offsetWidth;
      document.onmouseup = function() {
        document.onmousemove = null;
        console.log("that.slider.nativeElement.onmouseup");
       /*  that.impostazioniService.setRightSideOffsetWidth(parseInt(that.rightSide.nativeElement.style.width, 10));
        that.loggedUser.setImpostazioniApplicazione(that.loginService, that.impostazioniService.getImpostazioniVisualizzazione()); */
        document.onmouseup = null;
      };

      document.onmousemove = function(e: MouseEvent) {
        e.preventDefault();
        const rx = totalX - e.clientX + that.CR7; // e.clientX non comincia dall'estremo della pagina ma lascia 32px che sfasano il conteggio
        if (!(e.clientX <= that.MIN_X_LEFT_SIDE)) {
          if (!(totalX - e.clientX <= that.MIN_X_RIGHT_SIDE)) {
            const rxPercent = rx * 100 / totalX;
            that.rightSide.nativeElement.style.width = rxPercent + "%";
            that.slider.nativeElement.style.marginLeft = 100 - rxPercent + "%";
          }
        }
      };
    };
  }


}
