import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { CustomReuseStrategy } from 'src/app/custom-reuse-strategy';
import { ShpeckMessageService, MessageEvent, MessageAction } from 'src/app/services/shpeck-message.service';
import { Message } from "@bds/ng-internauta-model";

@Component({
  selector: 'app-accessibilita-mail-detail',
  templateUrl: './accessibilita-mail-detail.component.html',
  styleUrls: ['./accessibilita-mail-detail.component.scss']
})
export class AccessibilitaMailDetailComponent implements OnInit {
  subscription: any = [];
  public _action = MessageAction;

  constructor(private router: Router,
    private location: Location,
    private activatedRoute: ActivatedRoute,
    private messageService: ShpeckMessageService) { }

  ngOnInit(): void {
    this.subscription.push(this.messageService.messageEvent.subscribe(
      (messageEvent: MessageEvent) => {
        console.log("messageEvent", messageEvent)
        if (messageEvent && !(messageEvent.downloadedMessage)) {
          this.tornaIndietro();
        }
      }
    ));
  }

  tornaIndietro(){
    CustomReuseStrategy.componentsReuseList.push("*");
    this.router.navigate(['../mail-list'], { relativeTo: this.activatedRoute })
  }


  doAction(action : MessageAction){
    
  }
}
