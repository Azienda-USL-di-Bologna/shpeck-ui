// import { Injectable } from "@angular/core";
// import { NextSDREntityProvider, BatchOperation, BatchOperationTypes } from "@nfa/next-sdr";
// import { HttpClient } from "@angular/common/http";
// import { DatePipe } from "@angular/common";
// import { getInternautaUrl, BaseUrlType, CUSTOM_SERVER_METHODS, BaseUrls } from "src/environments/app-constants";
// import { ENTITIES_STRUCTURE, Message } from "@bds/ng-internauta-model";
// import { Observable, BehaviorSubject } from "rxjs";
// import { EmlAttachment } from "../classes/eml-attachment";
// import { EmlData } from "../classes/eml-data";

// @Injectable({
//   providedIn: "root"
// })
// export class MessageService extends NextSDREntityProvider {
//   private _messageEvent = new BehaviorSubject<MessageEvent>(null);

//   constructor(protected http: HttpClient, protected datepipe: DatePipe) {
//     super(http, datepipe, ENTITIES_STRUCTURE.shpeck.message, getInternautaUrl(BaseUrlType.Shpeck));
//   }

//   public get messageEvent(): Observable<MessageEvent> {
//     return this._messageEvent.asObservable();
//   }

//   /**
//    * Notifica un evento alla sottoscrizione di MessageEvent.
//    * Almeno uno dei 2 parametri è obbligatorio
//    * @param messageToDownload indica che deve essere scaricato il messaggio.
//    *  Se passato scarica l'eml relativo e notifica l'evento inserendolo in downloadedMessage,
//    *  in caso di errore nel download l'evento viene comunque notificato, ma senza downloadedMessage
//    * @param selectedMessages indica i messaggi seelzionati che si volgiono notificare con il MessageEvent. Se passato viene notificato in selectedMessages
//    */
//   public manageMessageEvent(messageToDownload?: Message, selectedMessages?: Message[]) {
//     if (!messageToDownload && !selectedMessages) {
//       throw new Error("missing parameters");
//     }
//     if (messageToDownload && messageToDownload.id) {
//       this.extractEmlData(messageToDownload.id).subscribe(
//         (data: EmlData) => {
//           this._messageEvent.next({
//             downloadedMessage: {
//               message: messageToDownload,
//               emlData: data
//             },
//             selectedMessages
//           });
//         },
//         (err) => {
//           this._messageEvent.next({
//             selectedMessages
//           });
//         }
//       );
//     } else {
//       this._messageEvent.next({
//         selectedMessages
//       });
//     }
//   }



//   /**
//    * Ritorna un Observable di tipo EmlData relativo al download dell'eml del messaggo passato.
//    * @param messageId l'id del messaggio di cui si vogliono i dati.
//    */
//   public extractEmlData(messageId: number): Observable<EmlData> {
//     const url = getInternautaUrl(BaseUrlType.Shpeck) + "/" + CUSTOM_SERVER_METHODS.extractEmlData + "/" + messageId;
//     return this.http.get(url) as Observable<EmlData>;
//   }

//   /**
//    * Ritorna un Observable il cui risultato è il blob dell'eml richiesto.
//    * @param messageId il messaggio di cui si vuole l'eml.
//    */
//   public downloadEml(messageId: number): Observable<any> {
//     const url = getInternautaUrl(BaseUrlType.Shpeck) + "/" + CUSTOM_SERVER_METHODS.downloadEml + "/" + messageId;
//     return this.http.get(url, {responseType: "blob"}/* {responseType: "arraybuffer"} */);
//   }

//   /**
//    * Ritorna un Observable il cui risultato è il blob dell'allegato richiesto.
//    * @param message Il Message che contiene l'allegato.
//    * @param allegato L'allegato che si vuole.
//    */
//   public downloadEmlAttachment(messageId: number, allegato: EmlAttachment): Observable<any> {
//     const url = getInternautaUrl(BaseUrlType.Shpeck) + "/" + CUSTOM_SERVER_METHODS.downloadEmlAttachment + "/" + messageId + "/" + allegato.id;
//      return this.http.get(url, {responseType: "blob"}/* {responseType: "arraybuffer"} */);
//   }

//   /**
//    * Ritorna un Observable il cui risultato è il blob dello zip degli allegati del Message richiesto.
//    * @param message Il Message del quale si vuole lo zip degli allegati
//    */
//   public downloadAllEmlAttachment(message: Message): Observable<any> {
//     const url = getInternautaUrl(BaseUrlType.Shpeck) + "/" + CUSTOM_SERVER_METHODS.downloadAllEmlAttachment + "/" + message.id;
//     return this.http.get(url, {responseType: "blob"});
//   }

//   /**
//    * Salva la bozza sul database e ritorna un observable
//    * @param form La form contenente tutti i campi della mail da salvare
//    */
//   public saveDraftMessage(form: FormData) {
//     const apiUrl = getInternautaUrl(BaseUrlType.Shpeck) + "/" + CUSTOM_SERVER_METHODS.saveDraftMessage;
//     return this.http.post(apiUrl, form);
//   }
// }

// /**
//  * Descrive un messaggio comprensivo sia dei metadati (Message) che del suo eml (EmlData)
//  */
// export interface FullMessage {
//   message: Message;
//   emlData: EmlData;
// }

// /**
//  * Descrive l'evento che viene notificato dalla funzione manageMessageEvent
//  * @param downloadedMessage contiene l'eventuale messaggio completo scaricato
//  * @param selectedMessages contiene gli eventuali messaggi selezionati
//  */
// export interface MessageEvent {
//   downloadedMessage?: FullMessage;
//   selectedMessages?: Message[];
// }
