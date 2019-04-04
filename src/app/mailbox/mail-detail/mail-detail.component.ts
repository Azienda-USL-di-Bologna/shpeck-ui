import { Component, OnInit } from "@angular/core";
import { MessageService } from "src/app/services/message.service";
import { HttpClient } from "@angular/common/http";
import { Message } from "@bds/ng-internauta-model";


@Component({
  selector: "app-mail-detail",
  templateUrl: "./mail-detail.component.html",
  styleUrls: ["./mail-detail.component.scss"]
})
export class MailDetailComponent implements OnInit {
  public eml: Eml;

  // variabile di input
  private message: Message = new Message();

  constructor(private messageService: MessageService, private http: HttpClient) {
    this.downLoadFile.bind(this);
   }

  ngOnInit() {
    this.messageService.extractMessageData(this.message).subscribe(
      data => {
        console.log("succhiamelo", data);
        this.eml = data;
        /* this.messageService.prova("1").subscribe(
          data => { console.log(data); }
        ); */
        /* this.messageService.getEmlAttachment("1").subscribe(
          data => { console.log(data); }
        ); */
        // this.getEmlAttachment(null);
        // this.getAllEmlAttachment(null);
      }
    );
  }

  private downLoadFile(data: any, type: string, filename: string) {
    const blob = new Blob([data], { type: type});
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.download = filename;
    anchor.href = url;
    anchor.click();
    /* const pwa = window.open(url);
    if (!pwa || pwa.closed || typeof pwa.closed === "undefined") {
        alert("Please disable your Pop-up blocker and try again.");
    } */
  }

  public getEmlAttachment(allegato: EmlAttachment) {
    this.http.get("http://localhost:10005/internauta-api/resources/shpeck/getEmlAttachment/1/" + allegato.id,
          {responseType: "arraybuffer"})
          .subscribe(
            response =>
            this.downLoadFile(response, allegato.mimeType.substr(0, allegato.mimeType.indexOf(";")), allegato.fileName));
  }

  public getAllEmlAttachment() {
    this.http.get("http://localhost:10005/internauta-api/resources/shpeck/get_all_eml_attachment/1",
          {responseType: "blob"})
          .subscribe(
            response =>
            this.downLoadFile(response, "application/zip", "allegati.zip"));
  }

  public calcolaStringaSize(totalsize: number) {
    totalsize = totalsize * 0.67;
    const totalSizeKB = totalsize / Math.pow(1000, 1);
    if (totalSizeKB < 1) { return totalsize.toFixed(1) + "B"; }
    const totalSizeMB = totalsize / Math.pow(1000, 2) ;
    if (totalSizeMB < 1) { return totalSizeKB.toFixed(1) + "KB"; }
    return totalSizeMB.toFixed(1) + "MB";
  }
}

export class Eml {
  private plainText: string;
  private htmlText: string;
  private subject: string;
  private to: string[];
  private from: string;
  private cc: string[];
  private messageId: string;
  private sendDate: Date;
  private attachments: EmlAttachment[];
}

export class EmlAttachment {
  public fileName: string;
  private filePath: string;
  public mimeType: string;
  private size: number;
  public; id: number;
}
