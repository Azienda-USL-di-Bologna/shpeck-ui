import { Component, OnInit, Input } from "@angular/core";
import { Message } from "@bds/ng-internauta-model";

@Component({
  selector: "app-recepits",
  templateUrl: "./recepits.component.html",
  styleUrls: ["./recepits.component.scss"]
})
export class RecepitsComponent implements OnInit {

  private message: Message;

  @Input("messageDetailed")
  set messageDetailed(messageR: Message) {
    if (messageR) {
      this.message = messageR;
      console.log("message: ", this.message);
    }
  }

  constructor() { }

  ngOnInit() {
  }

}
