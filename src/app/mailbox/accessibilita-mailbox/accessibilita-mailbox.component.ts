import { Component, OnInit, ViewChild } from "@angular/core";
import { FONTSIZE } from "src/environments/app-constants";
import { RouterOutlet, ActivationStart, Router } from "@angular/router";

@Component({
  selector: "app-accessibilita-mailbox",
  templateUrl: "./accessibilita-mailbox.component.html",
  styleUrls: ["./accessibilita-mailbox.component.scss"]
})
export class AccessibilitaMailboxComponent implements OnInit {
  public fontSize = FONTSIZE.BIG;

  @ViewChild(RouterOutlet, {static: false}) outlet: RouterOutlet;

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.router.events.subscribe(e => {
      // console.log("E!", e);

    });
  }

}
