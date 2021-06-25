import { Injectable } from "@angular/core";
import { NextSDREntityProvider, BatchOperation, BatchOperationTypes } from "@nfa/next-sdr";
import { DatePipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { ENTITIES_STRUCTURE, Message, MessageFolder } from "@bds/ng-internauta-model";
import { getInternautaUrl, BaseUrlType, BaseUrls } from "src/environments/app-constants";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root"
})
export class MessageFolderService extends NextSDREntityProvider {

  constructor(protected http: HttpClient, protected datepipe: DatePipe) {
    super(http, datepipe, ENTITIES_STRUCTURE.shpeck.messagefolder, getInternautaUrl(BaseUrlType.Shpeck));
  }

  /**
   * Sposta i messaggi passati in un altra folder tramite una richiesta batch
   * @param messages i messaggi da spostare
   * @param newFolderId l'id della folder in cui spostare i messaggi
   */
  public moveMessagesToFolder(messagesFolder: MessageFolder[], newFolderId: number, idUtente?: number): Observable<any> {
    const messagesToDelete: BatchOperation[] = [];
    messagesFolder.forEach((messageFolder: MessageFolder) => {
      if (messageFolder.id) {
        messagesToDelete.push({
          id: messageFolder.id,
          operation: BatchOperationTypes.UPDATE,
          entityPath: BaseUrls.get(BaseUrlType.Shpeck) + "/" + ENTITIES_STRUCTURE.shpeck.messagefolder.path,
          entityBody: {
            idFolder: {
              id: newFolderId
            },
            idUtente: {
              id: idUtente
            },
            version: messageFolder.version
          },
          additionalData: null,
          returnProjection: null
        });
      }
    });
    if (messagesToDelete.length > 0) {
      return super.batchHttpCall(messagesToDelete);
      // console.log(messagesToDelete);
    } else {
      throw new Error("nessun messaggio passato");
    }
  }
}
