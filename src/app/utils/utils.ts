
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
    const blob = new Blob([data], { type: type });
    const url = window.URL.createObjectURL(blob, );
    if (preview && (this.contentTypesEnabledForPreview.indexOf(type) > -1)) {
      const pwa = window.open(url);
      if (!pwa || pwa.closed || typeof pwa.closed === "undefined") {
        alert("L'apertura del pop-up è bloccata dal tuo browser. Per favore disabilita il blocco.");
      } else {
        setTimeout(() => {
          // console.log("FILE = ", filename, type);
          if (type && type === "application/pdf") {
            pwa.document.getElementsByTagName("html")[0]
            .appendChild(document.createElement("head"))
            .appendChild(document.createElement("title"))
            .appendChild(document.createTextNode(filename));
          } else {
            pwa.document.title = filename;
          }
        }, 0);
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

  public static arrayDiff(a: any[], b: any[]) {
    return a.filter(i => b.indexOf(i) < 0);
  }

  public static genereateGuid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + "-" + s4() + "-" + s4() + "-" +
      s4() + "-" + s4() + s4() + s4();
  }
}
