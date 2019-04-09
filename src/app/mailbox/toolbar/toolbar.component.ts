import { Component, OnInit } from "@angular/core";
import { DialogService } from "primeng/api";
import { NewMailComponent } from "../new-mail/new-mail.component";

@Component({
  selector: "app-toolbar",
  templateUrl: "./toolbar.component.html",
  styleUrls: ["./toolbar.component.scss"]
})
export class ToolbarComponent implements OnInit {

  constructor(public dialogService: DialogService) { }

  ngOnInit() {
  }

  handleEvent(event) {
    const ref = this.dialogService.open(NewMailComponent, {
      header: "Nuova Mail",
      width: "60%",
      styleClass: "ui-dialog-resizable ui-dialog-draggable",
      contentStyle: { "max-height": "800px", "min-height": "350px", "overflow": "auto", "height": "690px" }
    });
  }

}
