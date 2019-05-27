import { Injectable } from "@angular/core";
import { NextSDREntityProvider } from "@nfa/next-sdr";
import { DatePipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { ENTITIES_STRUCTURE, Draft } from "@bds/ng-internauta-model";
import { getInternautaUrl, BaseUrlType, CUSTOM_SERVER_METHODS, EMLSOURCE } from "src/environments/app-constants";
import { BehaviorSubject, Observable } from "rxjs";
import { EmlData } from "../classes/eml-data";
import { MessageService } from "primeng/api";

@Injectable({
  providedIn: "root"
})
export class DraftService extends NextSDREntityProvider {
  private _draftEvent = new BehaviorSubject<DraftEvent>(null);
  public reload: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(protected http: HttpClient, protected datepipe: DatePipe, private messagePrimeService: MessageService) {
    super(http, datepipe, ENTITIES_STRUCTURE.shpeck.draft, getInternautaUrl(BaseUrlType.Shpeck));
  }

  public get draftEvent(): Observable<DraftEvent> {
    return this._draftEvent.asObservable();
  }

  /**
   * Salva la bozza sul database e ritorna un observable
   * @param form La form contenente tutti i campi della mail da salvare
  */
  public saveDraftMessage(form: FormData) {
    const apiUrl = getInternautaUrl(BaseUrlType.Shpeck) + "/" + CUSTOM_SERVER_METHODS.saveDraftMessage;
    this.http.post(apiUrl, form).subscribe(
      res => {
        console.log(res);
        this.messagePrimeService.add(
          { severity: "success", summary: "Successo", detail: "Bozza salvata correttamente" });
        this.reload.next(true);
      },
      err => {
        console.log(err);
        this.messagePrimeService.add(
          { severity: "error", summary: "Errore", detail: "Errore durante il salvaggio, contattare BabelCare", life: 3500 });
      }
    );
    // return this.http.post(apiUrl, form);
  }

  /**
   * Elimina la bozza dal database
   * @param idDraft Id della bozza da eliminare
   * @param showMessage Mostrare/Non mostrare il messaggio di notifica eliminazione
  */
  public deleteDraftMessage(idDraft: number, showMessage: boolean) {
    this.deleteHttpCall(idDraft).subscribe(
      res => {
        if (showMessage) {
          this.messagePrimeService.add(
            { severity: "success", summary: "Successo", detail: "Bozza eliminata correttamente" });
        }
        this.reload.next(true);
      },
      err => {
        if (showMessage) {
          this.messagePrimeService.add(
            { severity: "error", summary: "Errore", detail: "Errore durante l'eliminazione, contattare BabelCare", life: 3500 });
        }
      }
    );
  }

  /**
   * Invia la mail al server e ritorna un observable
   * @param form La form contenente tutti i campi della mail da salvare
  */
  public submitMessage(form: FormData) {
    const apiUrl = getInternautaUrl(BaseUrlType.Shpeck) + "/" + CUSTOM_SERVER_METHODS.sendMessage;
    this.http.post(apiUrl, form).subscribe(
      res => {
        console.log(res);
        this.messagePrimeService.add(
          { severity: "success", summary: "Successo", detail: "Email inviata!" });
        },
      err => {
        console.log("Error: ", err);
        if (err && err.error.code === "007") {
            this.messagePrimeService.add(
            { severity: "error", summary: "Errore", detail: err.error.message, life: 3500 });
        } else {
          this.messagePrimeService.add(
          { severity: "error", summary: "Errore", detail: "Errore durante l'invio della mail, contattare BabelCare", life: 3500 });
        }
      }
    );
  }

  /**
   * Notifica un evento alla sottoscrizione di MessageEvent.
   * Almeno uno dei 2 parametri è obbligatorio
   * @param draft indica che deve essere scaricato il messaggio.
   *  Se passato scarica l'eml relativo e notifica l'evento inserendolo in downloadedMessage,
   *  in caso di errore nel download l'evento viene comunque notificato, ma senza downloadedMessage
   * @param selectedDrafts indica i messaggi seelzionati che si volgiono notificare con il MessageEvent. Se passato viene notificato in selectedMessages
   */
  public manageDraftEvent(draft?: Draft, selectedDrafts?: Draft[]) {
    if (!draft && !selectedDrafts) {
      throw new Error("missing parameters");
    }

    if (draft && draft.id) {
      this.extractEmlData(draft.id, EMLSOURCE.DRAFT).subscribe(
        (data: EmlData) => {
          this._draftEvent.next({
            fullDraft: {
              draft: draft,
              emlData: data
            },
            selectedDrafts
          });
        },
        (err) => {
          this._draftEvent.next({
            selectedDrafts
          });
        }
      );
    } else {
      this._draftEvent.next({
        selectedDrafts
      });
    }
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
}

/**
 * Descrive un messaggio comprensivo sia del draft(Draft) che del suo eml (EmlData)
 */
export interface FullDraft {
  draft: Draft;
  emlData: EmlData;
}

/**
 * Descrive l'evento che viene notificato dalla funzione manageDraftEvent
 * @param fullDraft contiene l'eventuale messaggio Draft completo scaricato
 * @param selectedDrafts contiene gli eventuali messaggi drafts selezionati
 */
export interface DraftEvent {
  fullDraft?: FullDraft;
  selectedDrafts?: Draft[];
}
