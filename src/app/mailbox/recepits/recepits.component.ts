import { Component, OnInit, Input } from "@angular/core";
import { Message, RecepitType } from "@bds/ng-internauta-model";
import { Utils } from "src/app/utils/utils";
import { ShpeckMessageService } from "src/app/services/shpeck-message.service";
import { EMLSOURCE } from "src/environments/app-constants";

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
    // console.log("recepit: ", recepits);
    this.recepits = recepits;
  }

  constructor(private messageService: ShpeckMessageService) {
    this.dowloadRecepit = this.dowloadRecepit.bind(this);
  }

  ngOnInit() {
    this.cols = [
      /* {
        field: "id",
        header: "Id",
        fieldType: "number",
        style: {
          width: "50px",
          textAlign: "center"
        }
      }, */
      {
        field: "receiveTime",
        header: "Data",
        fieldType: "DateTime",
        style: {
          width: "115px",
          textAlign: "center"
        }
      },
      {
        field: "idRecepit.recepitType",
        fieldType: "object",
        header: "Tipo Ricevuta",
        style: {
          width: "120px",
          textAlign: "center"
        }
      },
      {
        field: "address",
        header: "Destinatario",
        fieldType: "string",
        style: {
          width: "270px"
        }
      },
      {
        field: "button",
        fieldType: "button",
        label: "",
        icon: "pi pi-download",
        onClick: this.dowloadRecepit,
        style: {
          width: "45px",
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
    this.messageService.downloadEml(recepit.id, EMLSOURCE.MESSAGE).subscribe(
      response => {
        const nomeRicevuta = "Ricevuta_" + recepit.idRecepit.recepitType + "_" + recepit.id + ".eml";
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
