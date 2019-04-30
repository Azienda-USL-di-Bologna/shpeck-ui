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
  public lastDeliveryDate: Date;  // E' la data della più recente ricevuta di consegna ('Ricevuta il' su UI)
}
