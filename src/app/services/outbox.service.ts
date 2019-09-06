import { NextSDREntityProvider } from "@nfa/next-sdr";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { FullMessage } from "./shpeck-message.service";
import { Outbox, ENTITIES_STRUCTURE } from "@bds/ng-internauta-model";
import { DatePipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { MessageService } from "primeng/api";
import { getInternautaUrl, BaseUrlType, CUSTOM_SERVER_METHODS, EMLSOURCE } from "src/environments/app-constants";
import { EmlData } from "../classes/eml-data";

/**
 * Descrive l'evento che viene notificato dalla funzione manageOutboxEvent
 * @param fullOutboxMail contiene l'eventuale FullMessage
 * @param selectedOutboxMails contiene gli eventuali messaggi in outbox selezionati
 */
export interface OutboxEvent {
    fullOutboxMail?: FullMessage;
    selectedOutboxMails?: Outbox[];
}

@Injectable({
    providedIn: "root"
})
export class OutboxService extends NextSDREntityProvider {

    private _outboxEvent = new BehaviorSubject<OutboxEvent>(null);
    public reload: BehaviorSubject<number> = new BehaviorSubject<number>(null);

    constructor(
        protected http: HttpClient,
        protected datepipe: DatePipe,
        public messagePrimeService: MessageService) {
        super(http,
            datepipe,
            ENTITIES_STRUCTURE.shpeck.outbox,
            getInternautaUrl(BaseUrlType.Shpeck));
    }

    public get outboxEvent(): Observable<OutboxEvent> {
        return this._outboxEvent.asObservable();
    }

    /**
   * Ritorna un Observable di tipo EmlData relativo al download dell'eml del messaggo passato.
   * @param messageId l'id del messaggio di cui si vogliono i dati.
   * @param emlSource Il tipo di EML che stiamo richiedendo (DRAFT|OUTBOX|MESSAGE)
   */
    public extractEmlData(messageId: number, emlSource: string): Observable<EmlData> {
        const url = getInternautaUrl(BaseUrlType.Shpeck) + "/" + CUSTOM_SERVER_METHODS.extractEmlData + "/" + messageId + "?emlSource=" + emlSource;
        return this.http.get(url) as Observable<EmlData>;
    }

    /**
   * Notifica un evento alla sottoscrizione di MessageEvent.
   * Almeno uno dei 2 parametri è obbligatorio
   * @param outboxMail indica che deve essere scaricato il messaggio.
   *  Se passato scarica l'eml relativo e notifica l'evento inserendolo in downloadedMessage,
   *  in caso di errore nel download l'evento viene comunque notificato, ma senza downloadedMessage
   * @param selectedOutboxMails indica i messaggi seelzionati che si volgiono notificare con il MessageEvent. Se passato viene notificato in selectedMessages
   */
    public manageOutboxEvent(outboxMail?: Outbox, selectedOutboxMails?: Outbox[]) {
        if (!outboxMail && !selectedOutboxMails) {
            throw new Error("missing parameters");
        }
        if (outboxMail && outboxMail.id) {
            this.extractEmlData(outboxMail.id, EMLSOURCE.OUTBOX).subscribe((data: EmlData) => {
                this._outboxEvent.next({
                    fullOutboxMail: {
                        message: outboxMail,
                        emlData: data,
                        emlSource: EMLSOURCE.OUTBOX
                    },
                    selectedOutboxMails
                });
            },
                (err) => {
                    this._outboxEvent.next({
                        fullOutboxMail: {
                            message: outboxMail,
                            emlData: null,
                            emlSource: EMLSOURCE.OUTBOX
                        },
                        selectedOutboxMails
                    });
                }
            );
        } else {
            this._outboxEvent.next({ selectedOutboxMails });
        }
    }
}
