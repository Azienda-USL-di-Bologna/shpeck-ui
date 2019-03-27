import { Component, OnInit } from "@angular/core";
import {VirtualScrollerModule} from "primeng/virtualscroller";
import { Message } from "@bds/ng-internauta-model";

@Component({
  selector: "app-mail-list",
  templateUrl: "./mail-list.component.html",
  styleUrls: ["./mail-list.component.scss"]
})
export class MailListComponent implements OnInit {

public sortOptions = {};
public sortKey = {};
public mails: Message[] = [];

  constructor() { }

  ngOnInit() {
  }

}
