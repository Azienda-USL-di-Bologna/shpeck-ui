import { Component, OnInit, Input } from "@angular/core";
import { Message, RecepitType } from "@bds/ng-internauta-model";
import { Utils } from "src/app/utils/utils";
import { MessageService } from "src/app/services/message.service";

@Component({
  selector: "app-recepits",
  templateUrl: "./recepits.component.html",
  styleUrls: ["./recepits.component.scss"]
})
export class RecepitsComponent implements OnInit {

  public recepits: Message[];
  public cols: any;

  @Input("recepits")
  set setRecepits(recepits: Message[]) {
    console.log("recepit: ", recepits);
    this.recepits = recepits;
  }

  constructor(private messageService: MessageService) {
    this.dowloadRecepit = this.dowloadRecepit.bind(this);
  }

  ngOnInit() {
    this.cols = [
      {
        field: "id",
        header: "Id",
        fieldType: "number",
        style: {
          width: "50px",
          textAlign: "center"
        }
      },
      {
        field: "idRecepit.recepitType",
        fieldType: "object",
        header: "Tipo Ricevuta",
        style: {
          width: "130px",
          textAlign: "center"
        }
      },
      {
        field: "receiveTime",
        header: "Data",
        fieldType: "DateTime",
        style: {
          width: "140px",
          textAlign: "center"
        }
      },
      {
        field: "address",
        header: "Destinatario",
        fieldType: "string",
        style: {
          width: "280px"
        }
      },
      {
        field: "button",
        fieldType: "button",
        label: "",
        icon: "pi pi-download",
        onClick: this.dowloadRecepit,
        style: {
          width: "30px",
          textAlign: "center"
        }
      }
    ];
  }

  /**
   * Fa partire il download della ricevuta passata.
   * @param recepit
   */
  public dowloadRecepit(recepit: Message): void {
    this.messageService.downloadEml(recepit).subscribe(
      response => {
        const nomeRicevuta = "Ricevuta_" + recepit.idRecepit.recepitType + "_" + recepit.id;
        Utils.downLoadFile(response, "message/rfc822", nomeRicevuta, false);
      }
    );
  }

  /**
   * Dalla recepit viene tornato l'indirizzo FROM per le ricevute di consegna.
   * Viene tornato null per le ricevute di accettazione.
   * @param recepit
   */
  public calculateAddress(recepit: Message): string {
    if (recepit.idRecepit.recepitType === RecepitType.CONSEGNA) {
      return recepit.messageAddressList.find(m => m.addressRole === "FROM").idAddress.mailAddress;
    } else {
      return null;
    }
  }
}