import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CustomReuseStrategy } from 'src/app/custom-reuse-strategy';
import { ShpeckMessageService, MessageEvent, MessageCommand } from 'src/app/services/shpeck-message.service';
import { ItemMenu, Message, Pec } from "@bds/ng-internauta-model";
import { NtJwtLoginService } from '@bds/nt-jwt-login';
import { MailListService } from '../../mail-list/mail-list.service';
import { MailFoldersService, PecFolder, PecFolderType } from '../../mail-folders/mail-folders.service';
import { Menu } from 'primeng-lts/menu';
import { MenuItem } from 'primeng-lts/api';

@Component({
  selector: 'app-accessibilita-mail-detail',
  templateUrl: './accessibilita-mail-detail.component.html',
  styleUrls: ['./accessibilita-mail-detail.component.scss']
})
export class AccessibilitaMailDetailComponent implements OnInit {
  private subscriptions: any = [];
  public selectedMessages: Message[];
  public isRegistrationActive: boolean = false;
  public aziendeProtocollabiliMenuItems: ItemMenu[] = null;
  private _selectedPec: Pec;
  public infoNonProtocollabile: string;
  @ViewChild("protocollamenu", {}) private protocollamenu: Menu;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private messageService: ShpeckMessageService,
    private loginService: NtJwtLoginService,
    private mailFoldersService: MailFoldersService,
    public mailListService: MailListService) {
      this.doAction = this.doAction.bind(this);
    }

    
  ngOnInit(): void {
    this.subscriptions.push(this.messageService.messageEvent.subscribe(
      (messageEvent: MessageEvent) => {
        console.log("messageEvent", messageEvent)
        if (messageEvent){
          this.selectedMessages = messageEvent.selectedMessages;

          if (this.selectedMessages && this.selectedMessages.length === 1 && this.selectedMessages[0]) {
            this.aziendeProtocollabiliMenuItems = this.mailListService.buildRegistrationBdsMenuItems(this.selectedMessages[0], this._selectedPec, this.doAction, true);
            this.isRegistrationActive = this.mailListService.isRegisterActive(this.selectedMessages[0]);
            if (!this.isRegistrationActive) {
              this.infoNonProtocollabile = this.mailListService.getInfoPercheNonRegistrabile(this.selectedMessages[0]);
            }
          } else {
            this.isRegistrationActive = false;
          }
        }
        if (messageEvent && !(messageEvent.downloadedMessage)) {
          this.tornaIndietro();
        }
      }
    ));
    this.subscriptions.push({id: null, type: "pecFolderSelected", subscription: this.mailFoldersService.pecFolderSelected.subscribe((pecFolderSelected: PecFolder) => {
      if (pecFolderSelected) {
        if (pecFolderSelected.type === PecFolderType.TAG || pecFolderSelected.type === PecFolderType.FOLDER) {
          this._selectedPec = pecFolderSelected.pec;
        } else {
          this._selectedPec =  pecFolderSelected.data as Pec;
        }
      }
    })});
  }

  tornaIndietro() {
    CustomReuseStrategy.componentsReuseList.push("*");
    this.router.navigate(['../mail-list'], { relativeTo: this.activatedRoute })
  }

  public onDoProtocolla(event: any) {
    if (this.aziendeProtocollabiliMenuItems.length === 1) {
      this.doAction({
        item: this.aziendeProtocollabiliMenuItems[0]
      });
    } else {
      this.protocollamenu.toggle(event);
    }
  }

  /*  Gestisce le azioni (per il momento solo il 'MessageRegistration') 
  *   MessageRegistration: 
                - controlla che l'utente abbia il permesso di protocollare
                - crea l'url della pagina che vuole aprire di scripta, passando il comando NEW e l'idpec come parametro
                - apre la pagina di scripta 
  */
  public doAction(comando : any): void {
    console.log("comando", comando);
    console.log(this.selectedMessages);
    console.log(this.isRegistrationActive);
    switch (comando.item.id) {
      case MessageCommand.MessageRegistration:
        this.mailListService.checkCurrentStatusAndRegister(() => {
          let urlNewDoc = "";
          urlNewDoc = this.getFrontedAppUrl("scripta") + "/doc?command=NEW&idMessage=" + this.selectedMessages[0].id + "&azienda=" + comando.item.queryParams.codiceAzienda;
          const encodeParams = false;
          const addPassToken = true;
          const addRichiestaParam = false;
          this.loginService.buildInterAppUrl(urlNewDoc, encodeParams, addRichiestaParam, addPassToken, true).subscribe((url: string) => {
            console.log("urlAperto:", url);
          });
        },
        comando.item.queryParams.codiceAzienda);
        break;
    }
  }
  
  /**
   * Crea l'url di una app frontend 
   * */
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
