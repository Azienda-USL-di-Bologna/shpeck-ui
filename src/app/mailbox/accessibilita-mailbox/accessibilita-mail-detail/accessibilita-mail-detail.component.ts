import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { CustomReuseStrategy } from 'src/app/custom-reuse-strategy';
import { ShpeckMessageService, MessageEvent, MessageAction } from 'src/app/services/shpeck-message.service';
import { Applicazione, BaseUrls, BaseUrlType, getInternautaUrl, Message } from "@bds/ng-internauta-model";
import { NtJwtLoginService } from '@bds/nt-jwt-login';
import { stringify } from '@angular/compiler/src/util';
import { MailListService } from '../../mail-list/mail-list.service';

@Component({
  selector: 'app-accessibilita-mail-detail',
  templateUrl: './accessibilita-mail-detail.component.html',
  styleUrls: ['./accessibilita-mail-detail.component.scss']
})
export class AccessibilitaMailDetailComponent implements OnInit {
  subscription: any = [];
  public _action = MessageAction;
  public selectedMessages: Message[];
  public isRegistrationActive: boolean = false;

  constructor(private router: Router,
    private location: Location,
    private activatedRoute: ActivatedRoute,
    private messageService: ShpeckMessageService,
    private loginService: NtJwtLoginService,
    public mailListService: MailListService) { }
    
  ngOnInit(): void {
    this.subscription.push(this.messageService.messageEvent.subscribe(
      (messageEvent: MessageEvent) => {
        console.log("messageEvent", messageEvent)
        if (messageEvent){
          this.selectedMessages = messageEvent.selectedMessages;
          if(this.selectedMessages && this.selectedMessages.length === 1 && this.selectedMessages[0]){
            this.isRegistrationActive = this.mailListService.isRegisterActive(this.selectedMessages[0])
          }else {
            this.isRegistrationActive = false;
          }
        }
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
    console.log(this.selectedMessages)
    console.log(this.isRegistrationActive) 
    if(this.isRegistrationActive){
      let urlNewDoc =""
      urlNewDoc = this.getFrontedAppUrl("scripta") + "/doc?command=NEW&pec=" + this.selectedMessages[0].id
      const encodeParams = false;
      const addPassToken = true;
      const addRichiestaParam = false;
      //in qualche modo ci devo mettere l'id pec (?)
      this.loginService.buildInterAppUrl(urlNewDoc, encodeParams, addRichiestaParam, addPassToken, true).subscribe((url: string) => {
        console.log("urlAperto:", url);
      });
    }
    
  }

  public getFrontedAppUrl(app: string): string {
    const wl = window.location;
    let port = wl.port;
    app = "/" + app;
    //port = wl.port;
    if (wl.hostname === "localhost") {
        //return "https://gdml.internal.ausl.bologna.it/" + app;
        port = "4200";
        app = "";
    }

    const out: string = wl.protocol + "//" + wl.hostname + (port? ":" + port: "") + app;
    return out;
  }
}
