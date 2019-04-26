import { Injectable } from "@angular/core";
import { NextSDREntityProvider } from "@nfa/next-sdr";
import { HttpClient } from "@angular/common/http";
import { DatePipe } from "@angular/common";
import { getInternautaUrl, BaseUrlType, CUSTOM_SERVER_METHODS } from "src/environments/app-constants";
import { ENTITIES_STRUCTURE, Message } from "@bds/ng-internauta-model";
import { Observable, Subject, BehaviorSubject, throwError } from "rxjs";
import { EmlAttachment } from "../classes/eml-attachment";
import { EmlData } from "../classes/eml-data";

@Injectable({
  providedIn: "root"
})
export class MessageService extends NextSDREntityProvider {
  private _messageEvent = new BehaviorSubject<MessageEvent>(null);

  constructor(protected http: HttpClient, protected datepipe: DatePipe) {
    super(http, datepipe, ENTITIES_STRUCTURE.shpeck.message, getInternautaUrl(BaseUrlType.Shpeck));
  }

  public get messageEvent(): Observable<MessageEvent> {
    return this._messageEvent.asObservable();
  }

  /**
   * Estrae i metadati dell'Eml di a cui si riferisce il message.
   * Ritorna un Observable il cui risultato sarà di tipo EmlData.
   * @param message Il Message di cui si vogliono i dati.
   */
  public manageMessageEvent(messageToDownload?: Message, selectedMessages?: Message[]) {
    if (!messageToDownload && !selectedMessages) {
      throw new Error("missing parameters");
    }
    if (messageToDownload && messageToDownload.id) {
      this.downloadEml(messageToDownload.id).subscribe(
        (data: EmlData) => {
          this._messageEvent.next({
            downloadedMessage: {
              message: messageToDownload,
              emlData: data
            },
            selectedMessages
          });
        },
        (err) => {
          this._messageEvent.next({
            selectedMessages
          });
        }
      );
    } else {
      this._messageEvent.next({
        selectedMessages
      });
    }
  }

  /**
   * Estrae i metadati dell'Eml a cui si riferisce il message.
   * Ritorna un Observable il cui risultato sarà di tipo EmlData.
   * @param messageId l'id del messaggio di cui si vogliono i dati.
   */
  public downloadEml(messageId: number): Observable<EmlData> {
    const url = getInternautaUrl(BaseUrlType.Shpeck) + "/" + CUSTOM_SERVER_METHODS.extractMessageData + "/" + messageId;
    return this.http.get(url) as Observable<EmlData>;
  }

  /**
   * Ritorna un Observable il cui risultato è il blob dell'allegato richiesto.
   * @param message Il Message che contiene l'allegato.
   * @param allegato L'allegato che si vuole.
   */
  public getEmlAttachment(message: Message, allegato: EmlAttachment): Observable<any> {
    const url = getInternautaUrl(BaseUrlType.Shpeck) + "/" + CUSTOM_SERVER_METHODS.getEmlAttachment + "/" + message.id + "/" + allegato.id;
     return this.http.get(url, {responseType: "blob"}/* {responseType: "arraybuffer"} */);
  }

  /**
   * Ritorna un Observable il cui risultato è il blob dello zip degli allegati del Message richiesto.
   * @param message Il Message del quale si vuole lo zip degli allegati
   */
  public getAllEmlAttachment(message: Message): Observable<any> {
    const url = getInternautaUrl(BaseUrlType.Shpeck) + "/" + CUSTOM_SERVER_METHODS.getAllEmlAttachment + "/" + message.id;
    return this.http.get(url, {responseType: "blob"});
  }

  /**
   * Salva la bozza sul database e ritorna un observable
   * @param form La form contenente tutti i campi della mail da salvare
   */
  public saveDraftMessage(form: FormData) {
    const apiUrl = getInternautaUrl(BaseUrlType.Shpeck) + "/" + CUSTOM_SERVER_METHODS.saveDraftMessage;
    return this.http.post(apiUrl, form);
  }
}

export interface FullMessage {
  message: Message;
  emlData: EmlData;
}

export interface MessageEvent {
  downloadedMessage?: FullMessage;
  selectedMessages?: Message[];
}
