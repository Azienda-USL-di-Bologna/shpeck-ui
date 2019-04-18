import { Component, Input, ViewChild, ElementRef } from "@angular/core";
import { MessageService } from "src/app/services/message.service";
import { Message } from "@bds/ng-internauta-model";
import { ContentTypeList } from "src/app/utils/styles-constants";
import { EmlData } from "src/app/classes/eml-data";
import { EmlAttachment } from "src/app/classes/eml-attachment";
import { HttpClient } from "@angular/common/http";


@Component({
  selector: "app-mail-detail",
  templateUrl: "./mail-detail.component.html",
  styleUrls: ["./mail-detail.component.scss"]
})
export class MailDetailComponent {

  private contentTypesEnabledForPreview = ["text/html", "application/pdf", "text/plain", "image/jpeg", "image/png"];
  private message: Message = new Message();

  @Input("messageDetailed")
  set messageDetailed(messageDetailed: Message) {
    if (messageDetailed) {
      this.message = messageDetailed;
      this.getEmlData(this.message);
    }
  }

  public eml: EmlData;
  public accordionAttachmentsSelected: boolean = false;
  @ViewChild("emliframe") private emliframe: ElementRef;

  constructor(private messageService: MessageService, private http: HttpClient) { }

  /**
   * Chiedo al backend di darmi tutte le info contenute nell'eml che si riferisce al message.
   * @param message
   */
  private getEmlData(message: Message) {
    this.messageService.extractMessageData(this.message).subscribe(
      data => {
        if (data.attachments && data.attachments.length > 0) {
          data.attachments.forEach(a => {
            a.contentType = a.mimeType.substr(0, a.mimeType.indexOf(";"));
            a.simpleType = a.contentType.substr(0, a.contentType.indexOf("/"));
            if (a.fileName.length > 42) {
              a.displayName = a.fileName.substr(0, 34) + ".." + a.fileName.substr(a.fileName.length - 6, a.fileName.length) ;
            } else {
              a.displayName = a.fileName;
            }
          });
        }
        data.displayBody = data.htmlTextImgEmbedded != null ? data.htmlTextImgEmbedded : (
          data.htmlText != null ? data.htmlText : data.plainText.replace(/\n/g, "<br/>")
        );
        this.eml = data;
        this.setLook();
      },
      err => {
        this.eml = null;
      }
    );
  }

  /**
   * Funzione da chiamare ogni qualvolta si voglia risettare il look generale
   * del dettaglio mail.
   */
  private setLook() {
    if (this.eml.attachments == null) {
      this.accordionAttachmentsSelected = false;
    }
  }

  /**
   * Agisco sulla proprietà contentDocument del mio iframe per andare a fare dei ritocchi
   */
  public customizeIframeContent() {
    const iframeContent = this.emliframe.nativeElement.contentDocument || this.emliframe.nativeElement.contentWindow;
    /* Aggiungo target="_blank" ai vari a in modo che i link si aprano in un altro tab */
    const elements = iframeContent.getElementsByTagName("a");
    let len = elements.length;
    while (len--) {
      elements[len].target = "_blank";
    }
    /* Setto lo stile della scrollbar */
    this.http.get("app/mailbox/mail-detail/mail-detail-iframe-custom-style.scss", { responseType: "text"}).subscribe(data => {
      const head = iframeContent.head || iframeContent.getElementsByTagName("head")[0];
      const style = iframeContent.createElement("style");
      head.appendChild(style);
      style.type = "text/css";
      if (style.styleSheet) {
        // This is required for IE8 and below.
        style.styleSheet.cssText = data;
      } else {
        style.appendChild(document.createTextNode(data));
      }
    });
  }

  /**
   * Vado a chiedere al backend l'allegato richiesto.
   * Ne faccio partire poi il download.
   * @param attachment
   * @param preview indica se voglio l'anteprima dell'allegato qualora sia possibile.
   */
  public getEmlAttachment(attachment: EmlAttachment, preview: boolean = false) {
    this.messageService.getEmlAttachment(this.message, attachment).subscribe(
      response =>
        this.downLoadFile(response, attachment.contentType, attachment.fileName, preview));
  }

  /**
   * Vado a chidedere al backend uno zip contente tutti gli allegati della mail.
   * Ne faccio partire poi il download.
   */
  public getAllEmlAttachment() {
    this.messageService.getAllEmlAttachment(this.message).subscribe(
      response =>
        this.downLoadFile(response, "application/zip", "allegati.zip"));
  }

  /**
   * Fa partire il download dell'allegato passato
   * @param data è il blob dell'allegato
   * @param type è il content-type dell'allegato
   * @param filename
   * @param preview dice se l'allegato deve essere scaricato o aperto in anteprima (laddove sia consentita l'anteprima)
   */
  private downLoadFile(data: any, type: string, filename: string, preview: boolean = false) {
    const blob = new Blob([data], { type: type});
    const url = window.URL.createObjectURL(blob);
    if (preview && this.contentTypesEnabledForPreview.includes(type)) {
      const pwa = window.open(url);
      if (!pwa || pwa.closed || typeof pwa.closed === "undefined") {
          alert("L'apertura del pop-up è bloccata dal tuo browser. Per favore disabilita il blocco.");
      }
    } else {
      const anchor = document.createElement("a");
      anchor.setAttribute("type", "hidden");
      anchor.download = filename;
      anchor.href = url;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    }
  }

  /**
   * Trasforma e approssima il numero, rappresentente i Byte,
   * in Byte, KiloBye, MegaByte
   * @param totalsize
   */
  public getSizeString(totalsize: number) {
    const originalTotalSize = totalsize;
    totalsize = totalsize * 0.71;
    const totalSizeKB = totalsize / Math.pow(1000, 1);
    if (totalSizeKB < 1) {
      const byte = (originalTotalSize * 0.72).toFixed(0);
      if (+byte < 1) {
        return "1B";
      } else {
        return (originalTotalSize * 0.72).toFixed(0) + "B";
      }
    }
    const totalSizeMB = totalsize / Math.pow(1000, 2) ;
    if (totalSizeMB < 1) {
      return totalSizeKB.toFixed(1) + "KB";
    }
    return totalSizeMB.toFixed(1) + "MB";
  }

  /**
   * Formatta la data passata nello standard di es.
   * "Martedì 26 marzo 2019, 03:01"
   * @param date
   */
  public getDateDisplay(date: string) {
    if (date) {
      date = (new Date(date)).toLocaleDateString("it-IT", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric"
      });
      return date.charAt(0).toUpperCase() + date.slice(1);
    }
  }

  /**
   * Riconosco la classe css Font Awesome da dare all'icona
   * dell'allegato cercando prima il suo content-type (es. text/plain) e nel
   * caso non abbia trovato nulla nel suo simple-type (es. text)
   * @param allegato
   */
  public getFaClass(attachment: EmlAttachment) {
    for (const field of Object.keys(ContentTypeList)) {
      if (ContentTypeList[field].contentType.includes(attachment.contentType)) {
        return field;
      }
    }
    for (const field of Object.keys(ContentTypeList)) {
      if (ContentTypeList[field].simpleType.includes(attachment.simpleType)) {
        return field;
      }
    }
    return "fa-file-o"; // Classe FA di default
  }
}
