import { Component, Input, ViewChild, ElementRef, OnInit, OnDestroy } from "@angular/core";
import { ShpeckMessageService, MessageEvent, FullMessage } from "src/app/services/shpeck-message.service";
import { Message, InOut, ENTITIES_STRUCTURE, MessageType, RecepitType, Draft } from "@bds/ng-internauta-model";
import { ContentTypeList } from "src/app/utils/styles-constants";
import { EmlData } from "src/app/classes/eml-data";
import { EmlAttachment } from "src/app/classes/eml-attachment";
import { HttpClient } from "@angular/common/http";
import { Subscription } from "rxjs";
import { FiltersAndSorts, FilterDefinition, FILTER_TYPES, SortDefinition, SORT_MODES, PagingConf } from "@nfa/next-sdr";
import { Utils } from "src/app/utils/utils";
import { DraftService, DraftEvent } from "src/app/services/draft.service";
import { EMLSOURCE } from "src/environments/app-constants";
import { OutboxService, OutboxEvent } from "src/app/services/outbox.service";


@Component({
  selector: "app-mail-detail",
  templateUrl: "./mail-detail.component.html",
  styleUrls: ["./mail-detail.component.scss"]
})
export class MailDetailComponent implements OnInit, OnDestroy {

  private subscription: Subscription[] = [];
  private pageConfNoLimit: PagingConf = {
    conf: {
      page: 0,
      size: 999999
    },
    mode: "PAGE"
  };

  @Input("message")
  set messageDetailed(message: Message) {
    if (message) {
      this.messageService.manageMessageEvent(null, message);
    }
  }

  public fullMessage: FullMessage;
  public message: Message;
  public numberOfMessageSelected = null;
  public messageTrueDraftFalse = null;
  public accordionAttachmentsSelected: boolean = false;
  public recepitsVisible: boolean = false;
  public getAllEmlAttachmentInProgress: boolean = false;
  get inOut() { return InOut; }

  @ViewChild("emliframe", null) private emliframe: ElementRef;

  constructor(private messageService: ShpeckMessageService,
    private draftService: DraftService,
    private http: HttpClient,
    private outboxService: OutboxService) { }

  public ngOnInit(): void {
    /* Mi sottoscrivo al messageEvent */
    this.subscription.push(this.messageService.messageEvent.subscribe(
      (messageEvent: MessageEvent) => {
        this.messageTrueDraftFalse = true;
        this.numberOfMessageSelected = null;
        if (messageEvent && messageEvent.downloadedMessage) {
          if (messageEvent.downloadedMessage.message) {
            try {
              this.message = messageEvent.downloadedMessage.message as Message;
            } catch (e) {
              // catcho l'errore perché voglio altirmenti il componente si desottoscrive
              console.log(e);
            }
          }
          this.manageDownloadedMessage(messageEvent.downloadedMessage);
        } else if (!messageEvent || !messageEvent.selectedMessages || !(messageEvent.selectedMessages.length > 1)) {
          this.fullMessage = null;
          this.setLook();
        } else if (messageEvent && messageEvent.selectedMessages && (messageEvent.selectedMessages.length > 1)) {
          this.numberOfMessageSelected = messageEvent.selectedMessages.length;
          this.fullMessage = null;
          this.setLook();
        }
      }
    ));
    this.subscription.push(this.draftService.draftEvent.subscribe(
      (draftEvent: DraftEvent) => {
        this.messageTrueDraftFalse = false;
        this.numberOfMessageSelected = null;
        if (draftEvent && draftEvent.fullDraft) {
          this.manageDownloadedMessage(draftEvent.fullDraft);
        } else if (!draftEvent || !draftEvent.selectedDrafts || !(draftEvent.selectedDrafts.length > 1)) {
          this.fullMessage = null;
          this.setLook();
        } else if (draftEvent && draftEvent.selectedDrafts && (draftEvent.selectedDrafts.length > 1)) {
          this.numberOfMessageSelected = draftEvent.selectedDrafts.length;
          this.fullMessage = null;
          this.setLook();
        }
      }
    ));
    this.subscription.push(this.outboxService.outboxEvent.subscribe(
      (outboxEvent: OutboxEvent) => {
        this.messageTrueDraftFalse = true;
        this.numberOfMessageSelected = null;
        if (outboxEvent && outboxEvent.fullOutboxMail) {
          this.manageDownloadedMessage(outboxEvent.fullOutboxMail);
        } else if (!outboxEvent || !outboxEvent.selectedOutboxMails || !(outboxEvent.selectedOutboxMails.length > 1)) {
          this.fullMessage = null;
          this.setLook();
        } else if (outboxEvent && outboxEvent.selectedOutboxMails && (outboxEvent.selectedOutboxMails.length > 1)) {
          this.numberOfMessageSelected = null;
          this.fullMessage = null;
          this.setLook();
        }
      }
    ));
  }

  public ngOnDestroy(): void {
    /* Mi desottoscrivo da tutto */
    this.subscription.forEach(s => s.unsubscribe());
  }

  /**
   * Gestisco il fullMessage da visualizzare:
   * - Sistemo gli allegati e mi salvo il loro contentType.
   * - Sostituisco le newline con dei <br/>
   * - Se è un messaggio inviato carico le ricevute.
   * - Setto look generico dell'interfaccia.
   */
  private manageDownloadedMessage(fullMessage: FullMessage): void {
    if (fullMessage.emlData) {
      const data: EmlData = fullMessage.emlData;
      /* Setto il conentType degli allegati e setto il nome a max 42 caratteri */
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
      /* Sostituisco le newline con dei <br/> */
      data.displayBody = data.htmlTextImgEmbedded != null ? data.htmlTextImgEmbedded : (
        data.htmlText != null ? data.htmlText : data.plainText != null ? data.plainText.replace(/\n/g, "<br/>") : null
      );
    }

    /* Per la posta inviata carico le ricevute */
    /* TODO: La chiamata deve essere senza paginazione senza limite */ /* <============================================================== */
    if (fullMessage.message && (fullMessage.message as Message).inOut === InOut.OUT) {
      this.messageService.getData(
        ENTITIES_STRUCTURE.shpeck.message.customProjections.CustomRecepitWithAddressList,
        this.buildFilterAndSortRecepits(fullMessage), null, this.pageConfNoLimit).subscribe(
          res => {
            if (res && res.results && res.results.length > 0) {
              (fullMessage.message as Message).idRelatedList = res.results;
              // Prendo la data di accetazione. La ricevuta di accetazione è al massimo una
              fullMessage.emlData.acceptanceDate = (fullMessage.message as Message).idRelatedList.find(
                r =>
                  r.idRecepit.recepitType === RecepitType.ACCETTAZIONE
              ).receiveTime;
              // Prendo le ricevute di consegna.
              const deliveryRecepits = (fullMessage.message as Message).idRelatedList.filter(
                r =>
                  r.idRecepit.recepitType === RecepitType.CONSEGNA
              );
              // Se ho alemno una ricevuta di consegna prendo la data della più recente
              if (deliveryRecepits.length > 0) {
                if (deliveryRecepits.length === 1) {
                  fullMessage.emlData.deliveryDate = deliveryRecepits[0].receiveTime;
                  /* Questo pezzo di codice serve a tirare fuori la data più ricente tra le ricevute.
                    fullMessage.emlData.lastDeliveryDate = deliveryRecepits.reduce(
                    (max, p) => p.receiveTime > max ? p.receiveTime : max, deliveryRecepits[0].receiveTime); */
                } else {
                  fullMessage.emlData.deliveryInfo = "Varie. Guardare il dettaglio per maggiori informazioni.";
                }
              }
            }
            this.fullMessage = fullMessage;
            this.setLook();
        }
      );
    } else {
      this.fullMessage = fullMessage;
      this.setLook();
    }
  }

  /**
   * Filtro per cercare le ricevute del Message
   * @param fullMessage
   */
  private buildFilterAndSortRecepits(fullMessage: FullMessage): FiltersAndSorts {
    const filtersAndSorts: FiltersAndSorts = new FiltersAndSorts();
    filtersAndSorts.addFilter(new FilterDefinition("idRelated", FILTER_TYPES.not_string.equals, fullMessage.message.id));
    filtersAndSorts.addFilter(new FilterDefinition("messageType", FILTER_TYPES.not_string.equals, MessageType.RECEPIT));
    filtersAndSorts.addSort(new SortDefinition("receiveTime", SORT_MODES.desc));
    return filtersAndSorts;
  }

  /**
   * Funzione da chiamare ogni qualvolta si voglia risettare il look generale
   * del dettaglio mail.
   */
  private setLook(): void {
    if (this.fullMessage == null || this.fullMessage.emlData == null || this.fullMessage.emlData.attachments == null) {
      this.accordionAttachmentsSelected = false;
    }
  }

  /**
   * Agisco sulla proprietà contentDocument del mio iframe per andare a fare dei ritocchi
   */
  public customizeIframeContent(): void {
    if (this.emliframe) {
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
  }

  /**
   * Vado a chiedere al backend l'allegato richiesto.
   * Ne faccio partire poi il download.
   * @param attachment
   * @param preview indica se voglio l'anteprima dell'allegato qualora sia possibile.
   */
  public getEmlAttachment(attachment: EmlAttachment, preview: boolean = false): void {
    this.messageService.downloadEmlAttachment(this.fullMessage.message.id, attachment, this.fullMessage.emlSource).subscribe(
      response =>
        Utils.downLoadFile(response, attachment.contentType !== "" ? attachment.contentType : attachment.mimeType, attachment.fileName, preview)
    );
  }

  /**
   * Vado a chidedere al backend uno zip contente tutti gli allegati della mail.
   * Ne faccio partire poi il download.
   */
  public getAllEmlAttachment(): void {
    this.getAllEmlAttachmentInProgress = true;
    this.messageService.downloadAllEmlAttachment(this.fullMessage.message as Message, this.fullMessage.emlSource).subscribe(
      response => {
        Utils.downLoadFile(response, "application/zip", "allegati.zip");
        this.getAllEmlAttachmentInProgress = false;
      },
      err =>
        this.getAllEmlAttachmentInProgress = false
    );
  }

  /**
   * Trasforma e approssima il numero, rappresentente i Byte,
   * in Byte, KiloBye, MegaByte
   * @param bytes
   */
  public getSizeString(bytes: number): string {
    const originalTotalSize = bytes;
    bytes = bytes * 0.71;
    const totalSizeKB = bytes / Math.pow(1000, 1);
    if (totalSizeKB < 1) {
      const byte = (originalTotalSize * 0.72).toFixed(0);
      if (+byte < 1) {
        return "1B";
      } else {
        return (originalTotalSize * 0.72).toFixed(0) + "B";
      }
    }
    const totalSizeMB = bytes / Math.pow(1000, 2) ;
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
  public getDateDisplay(date: string): string {
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
  public getFaClass(attachment: EmlAttachment): string {
    for (const field of Object.keys(ContentTypeList)) {
      if (ContentTypeList[field].contentType.indexOf(attachment.contentType) > -1) {
        return field;
      }
    }
    for (const field of Object.keys(ContentTypeList)) {
      if (ContentTypeList[field].simpleType.indexOf(attachment.simpleType) > -1) {
        return field;
      }
    }
    return "fa-file-o"; // Classe FA di default
  }
}
