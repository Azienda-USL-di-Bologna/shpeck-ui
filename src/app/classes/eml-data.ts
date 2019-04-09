import { EmlAttachment } from "./eml-attachment";

export class EmlData {
  public plainText: string;
  public htmlText: string;
  public subject: string;
  public to: string[];
  public from: string;
  public cc: string[];
  public messageId: string;
  public sendDate: Date;
  public attachments: EmlAttachment[];
}
