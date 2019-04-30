
export class Utils {
  public static contentTypesEnabledForPreview = ["text/html", "application/pdf", "text/plain", "image/jpeg", "image/png"];
/**
   * Fa partire il download dell'allegato passato
   * @param data è il blob dell'allegato
   * @param type è il content-type dell'allegato
   * @param filename
   * @param preview dice se l'allegato deve essere scaricato o aperto in anteprima (laddove sia consentita l'anteprima)
   */
  public static downLoadFile(data: any, type: string, filename: string, preview: boolean = false) {
  const blob = new Blob([data], { type: type});
  const url = window.URL.createObjectURL(blob);
  if (preview && this.contentTypesEnabledForPreview.includes(type)) {
    const pwa = window.open(url);
    if (!pwa || pwa.closed || typeof pwa.closed === "undefined") {
        alert("L'apertura del pop-up è bloccata dal tuo browser. Per favore disabilita il blocco.");
    }
  } else {
    const anchor = document.createElement("a");
    anchor.setAttribute("type", "hidden");
    anchor.download = filename;
    anchor.href = url;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }
}
}
