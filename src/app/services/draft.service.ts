import { Injectable } from "@angular/core";
import { NextSDREntityProvider, BatchOperation, BatchOperationTypes } from "@nfa/next-sdr";
import { DatePipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { ENTITIES_STRUCTURE, Draft } from "@bds/ng-internauta-model";
import { getInternautaUrl, BaseUrlType, CUSTOM_SERVER_METHODS, EMLSOURCE, BaseUrls } from "src/environments/app-constants";
import { BehaviorSubject, Observable } from "rxjs";
import { EmlData } from "../classes/eml-data";
import { MessageService } from "primeng/api";
import { FullMessage } from "./shpeck-message.service";

@Injectable({
  providedIn: "root"
})
export class DraftService extends NextSDREntityProvider {
  private _draftEvent = new BehaviorSubject<DraftEvent>(null);
  public reload: BehaviorSubject<number> = new BehaviorSubject<number>(null);

  constructor(protected http: HttpClient, protected datepipe: DatePipe, public messagePrimeService: MessageService) {
    super(http, datepipe, ENTITIES_STRUCTURE.shpeck.draft, getInternautaUrl(BaseUrlType.Shpeck));
  }

  public get draftEvent(): Observable<DraftEvent> {
    return this._draftEvent.asObservable();
  }

  /**
   * Salva la bozza sul database e ritorna un observable
   * @param form La form contenente tutti i campi della mail da salvare
  */
  public saveDraftMessage(form: FormData, idDraft?: number) {
    const apiUrl = getInternautaUrl(BaseUrlType.Shpeck) + "/" + CUSTOM_SERVER_METHODS.saveDraftMessage;
    this.http.post(apiUrl, form).subscribe(
      res => {
        console.log(res);
        this.messagePrimeService.add(
          { severity: "success", summary: "Successo", detail: "Bozza salvata correttamente" });
        if (idDraft) {
          this.reload.next(idDraft);
        }
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
  public deleteDraftMessage(idDraft: number, showMessage: boolean, reload?: boolean) {
    this.deleteHttpCall(idDraft).subscribe(
      res => {
        if (showMessage) {
          this.messagePrimeService.add(
            { severity: "success", summary: "Successo", detail: "Bozza eliminata correttamente" });
        }
        if (reload) { // Il reload è true soltanto se siamo in EDIT
          this.reload.next(null);
          this._draftEvent.next(null);
        }
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
   * Elimina le bozze selezionate dal database
   * @param drafts Array delle bozze da eliminare
   * @param showMessage Mostrare/Non mostrare il messaggio di notifica eliminazione
  */
  public deleteDrafts(drafts: Draft[], showMessage: boolean) {
    const draftsToDelete: BatchOperation[] = [];
    for (const draft of drafts) {
      if (draft.id) {
        draftsToDelete.push({
          id: draft.id,
          operation: BatchOperationTypes.DELETE,
          entityPath: BaseUrls.get(BaseUrlType.Shpeck) + "/" + ENTITIES_STRUCTURE.shpeck.draft.path,
          entityBody: null,
          additionalData: null,
          returnProjection: null
        });
      }
    }
    if (draftsToDelete.length > 0) {
      return super.batchHttpCall(draftsToDelete).subscribe(
        res => {
          if (showMessage) {
            this.messagePrimeService.add(
              { severity: "success", summary: "Successo", detail: "Bozze eliminate correttamente" });
          }
          this.reload.next(null);
          this._draftEvent.next(null);
        },
        err => {
          if (showMessage) {
            this.messagePrimeService.add(
              { severity: "error", summary: "Errore", detail: "Errore durante l'eliminazione, contattare BabelCare", life: 3500 });
          }
        }
      );
    } else {
      throw new Error("nessun messaggio passato");
    }
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
        this.reload.next(null);
        this._draftEvent.next(null);
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
              message: draft,
              emlData: data,
              emlSource: EMLSOURCE.DRAFT
            },
            selectedDrafts
          });
        },
        (err) => {
          this._draftEvent.next({
            fullDraft: {
              message: draft,
              emlData: null,
              emlSource: EMLSOURCE.DRAFT
            },
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
 * Descrive l'evento che viene notificato dalla funzione manageDraftEvent
 * @param fullDraft contiene l'eventuale FullMessage
 * @param selectedDrafts contiene gli eventuali messaggi drafts selezionati
 */
export interface DraftEvent {
  fullDraft?: FullMessage;
  selectedDrafts?: Draft[];
}
