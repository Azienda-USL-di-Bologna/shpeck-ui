import { EmlAttachment } from "./eml-attachment";

export class EmlData {
  public plainText: string;
  public htmlText: string;
  public htmlTextImgEmbedded: string;
  public displayBody: string;
  public subject: string;
  public to: string[];
  public from: string;
  public cc: string[];
  public messageId: string;
  public sendDate: Date;
  public attachments: EmlAttachment[];
  public acceptanceDate: Date;  // E' la data della ricevuta di accettazione. ('Consegnata il' su UI)
  public deliveryDate: Date;    // E' la data della ricevuta di consegna se ce n'è solo una ('Ricevuta il' su UI)
  public deliveryInfo: string;  // Contiene 'Varie ricevute' se le ricevute di consegna sono più di una.
  public realAttachmentNumber: number; // contiene il numero di allegati veri (esclusi quelli immagini che si vedono solo nel corpo della mail)
}
