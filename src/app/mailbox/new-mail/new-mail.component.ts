import { Component, OnInit, ViewChild, AfterViewInit } from "@angular/core";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { DynamicDialogRef, DynamicDialogConfig, MessageService } from "primeng/api";
import { Message, Pec } from "@bds/ng-internauta-model";
import { Editor } from "primeng/editor";
import { TOOLBAR_ACTIONS } from "src/environments/app-constants";
import { DraftService } from "src/app/services/draft.service";

@Component({
  selector: "app-new-mail",
  templateUrl: "./new-mail.component.html",
  styleUrls: ["./new-mail.component.scss"]
})
export class NewMailComponent implements OnInit, AfterViewInit {

  @ViewChild("editor") editor: Editor;
  mailForm: FormGroup;
  fromAddress: string = "";
  toAddresses: any[] = [];
  ccAddresses: any[] = [];
  country: any;

  filteredCountriesSingle: any[];

  filteredCountriesMultiple: any[];

  indirizziTest = [
    "g.russo@nsi.it",
    "opsouperen@cryptontrade.ga",
    "heckerman@att.net",
    "jespley@sbcglobal.net",
    "kannan@msn.com",
    "boftx@outlook.com",
    "sacraver@optonline.net",
    "north@yahoo.ca",
    "dhwon@yahoo.ca",
    "jamuir@att.net",
    "kobayasi@msn.com",
    "syrinx@optonline.net",
    "bcevc@live.com",
    "syrinx@outlook.com",
    "lpalmer@aol.com",
    "crimsane@aol.com",
    "geoffr@sbcglobal.net",
    "dcoppit@live.com",
    "schumer@outlook.com"
  ];

  constructor(public ref: DynamicDialogRef, public config: DynamicDialogConfig,
    private messagePrimeService: MessageService, public draftService: DraftService) { }

  ngOnInit() {
    console.log("DATA PASSED = ", this.config.data);
    let message: Message;
    const pec: Pec = this.config.data.pec;
    const action = this.config.data.action;
    /* Action è passata dal components toolbar. Se è diverso da NEW ci aspettiamo il messaggio e il body della mail */
    if (action !== TOOLBAR_ACTIONS.NEW) {
      message = this.config.data.message;
      message.messageAddressList.forEach(obj => {
        if (obj.addressRole === "FROM") {
          this.fromAddress = obj.idAddress.originalAddress ? obj.idAddress.originalAddress : obj.idAddress.mailAddress;
          this.toAddresses.push(this.fromAddress);
        }
        switch (action) {
          case TOOLBAR_ACTIONS.REPLY:   // REPLY
            break;
          case TOOLBAR_ACTIONS.REPLY_ALL: // REPLY_ALL Prendiamo tutti gli indirizzi, to, cc
            if (obj.addressRole === "CC" || (obj.addressRole === "TO" && obj.idAddress.id !== message.fk_idPec.id)) {
              this.ccAddresses.push(obj.idAddress.originalAddress ? obj.idAddress.originalAddress : obj.idAddress.mailAddress);
            }
            break;
        }
      });
    }
    /* Inizializzazione della form, funziona per tutte le actions */
    this.mailForm = new FormGroup({
      idDraftMessage: new FormControl(this.config.data.idDraft),
      idPec: new FormControl(pec.id),
      to: new FormControl(this.toAddresses),
      cc: new FormControl(this.ccAddresses),
      hideRecipients: new FormControl(false),
      subject: new FormControl(message ? "Re: ".concat(message.subject) : ""),
      attachments: new FormControl([]),
      body: new FormControl(""),  // Il body viene inizializzato nell'afterViewInit perché l'editor non è ancora istanziato
      from: new FormControl(pec.indirizzo),
      idMessageReplied: new FormControl(message ? message.id : "")
    });
  }

  ngAfterViewInit() {
    /* Inizializzazione del body per le risposte */
    if (this.config.data.action !== TOOLBAR_ACTIONS.NEW) {
      const message: Message = this.config.data.message;
      const body = this.config.data.body;
      this.buildBody(message, body);
      this.mailForm.patchValue({
        body: this.editor.quill.root["innerHTML"]
      });
    }
  }

  filterCountrySingle(event) {
    let query = event.query;
    this.filteredCountriesSingle = this.filterCountry(query, this.indirizziTest);
  }

  filterCountryMultiple(event) {
      let query = event.query;
      this.filteredCountriesMultiple = this.filterCountry(query, this.indirizziTest);
  }

  filterCountry(query, countries: any[]): any[] {
      let filtered : any[] = [];
      for (let i = 0; i < countries.length; i++) {
          let country = countries[i];
          if (country.toLowerCase().indexOf(query.toLowerCase()) == 0) {
              filtered.push(country);
          }
      }
      return filtered;
  }
  /**
   * Intercetta la pressione del tasto invio per inserire l'indirizzo nei destinatari
   * per far funzionare sia l'autocomplete che l'inserimento manuale
   * @param event L'evento del dom, contiene sia l'informazione sul tasto che il valore inserito
   * @param formField Il campo del form dove è stato inserito l'indirizzo, addresses o ccAddresses
  */
  onKeyUp(event: KeyboardEvent, formField: string) {
    if (event.key === "Enter") {
      const tokenInput = event.target as any;
      if (tokenInput.value) {
        if (formField) {
          if (formField === "addresses") {
            const toForm = this.mailForm.get("to");

            if (!toForm.value.find((element) => element === tokenInput.value)) {
              toForm.value.push(tokenInput.value);
            }
          } else {
            const ccForm = this.mailForm.get("cc");
            if (!ccForm.value.find((element) => element === tokenInput.value)) {
              ccForm.value.push(tokenInput.value);
            }
          }
        }
        tokenInput.value = "";
      }
    }
  }
  /**
   * Intercetta la selezione dell'elemento nell'autocomplete e aggiorna
   * sia gli array degli indirizzi che la form
   * @param item L'oggetto selezionato nell'autocomplete
   * @param formField Il campo del form dove è stato selezionato l'indirizzo, addresses o ccAddresses
  */
  onSelect(item, formField) {
    const tokenInput = item;
    if (tokenInput) {
      if (formField === "addresses") {
        const toForm = this.mailForm.get("to");
        if (toForm.value.indexOf(item) === -1) {
          toForm.value.push(item);
        }
      } else {
        const ccForm = this.mailForm.get("cc");
        if (ccForm.value.indexOf(item) === -1) {
          ccForm.value.push(item);
        }
      }
    }
  }

  /* Gestione allegati */
  onFileChange(event, fileinput) {
    const fileForm = this.mailForm.get("attachments");
    for (const file of event.target.files) {
      if (!fileForm.value.find((element) => element.name === file.name)) {
        fileForm.value.push(file);
      }
    }
    fileinput.value = null; // Reset dell'input
  }

  /**
   * In caso di Replies, costruisce il template parziale della mail con i dati della mail originale
   * @param message Il messaggio originale
   * @param body Il body del messaggio estratto dall'eml
   */
  buildBody(message: Message, body: string) {
    console.log("EDITOR = ", this.editor);
    const to = this.toAddresses.join(", ");
    const cc = this.ccAddresses.length > 0 ? this.ccAddresses.join(", ") : "";
    const inviato = message.receiveTime.toLocaleDateString("it-IT", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric"
    }).replace(",", " ");

    const editorContent = [
      { insert: "\n\n" },
      { insert: "-------- Messaggio originale --------" },
      { insert: "\n" },
      { insert: "Da: ", attributes: { bold: true } },
      { insert: this.fromAddress },
      { insert: "\n" },
      { insert: "A: ", attributes: { bold: true } },
      { insert: to },
      { insert: "\n" }];
    if (cc !== "") {
      editorContent.push({ insert: "Cc: ", attributes: { bold: true } },
        { insert: cc },
        { insert: "\n" });
    }
    editorContent.push({ insert: "Inviato: ", attributes: { bold: true } },
      { insert: inviato },
      { insert: "\n" },
      { insert: "Oggetto: ", attributes: { bold: true } },
      { insert: message.subject },
      { insert: "\n\n" });
    this.editor.quill.setContents(editorContent);
    /* Mi vergogno di questa cosa ma per adesso devo fare per forza così
     * in attesa del supporto alle table dell'editor Quill nella versione 2.0 */
    const bodyTableClean = body.replace(/<table.[^]*?<tbody>/, "").replace(/<\/tbody.[^]*?<\/table>/, "").replace(/<tr>/g, "<br>");
    this.editor.quill.clipboard.dangerouslyPasteHTML(this.editor.quill.getLength(), bodyTableClean);
  }

  onSubmit() {
    console.log("FORM = ", this.mailForm.value);
  }

  /* Salvataggio della bozza */
  onSaveDraft() {
    console.log("FORM = ", this.mailForm.value);
    const formToSend = new FormData();
    Object.keys(this.mailForm.controls).forEach(key => {
      if (key === "attachments") {  // Gli allegati vanno aggiunti singolarmente
        const files = this.mailForm.get(key).value;
        files.forEach(file => {
          formToSend.append(key, file);
        });
      } else {
        formToSend.append(key.toString(), this.mailForm.get(key).value);
      }
    });
    this.draftService.saveDraftMessage(formToSend).subscribe(
      res => {
        console.log(res);
        this.messagePrimeService.add(
          { severity: "success", summary: "Successo", detail: "Bozza salvata correttamente" });
        this.onClose();
      },
      err => {
        console.log(err);
        this.messagePrimeService.add(
          { severity: "error", summary: "Errore", detail: "Errore durante il salvaggio, contattare BabelCare" });
      }
    );
  }

  onDelete() {
    this.draftService.deleteHttpCall(this.mailForm.get("idDraftMessage").value).subscribe(
      res => {
        this.messagePrimeService.add(
          { severity: "success", summary: "Successo", detail: "Bozza eliminata correttamente" });
        this.onClose();
      },
      err => this.messagePrimeService.add(
        { severity: "error", summary: "Errore", detail: "Errore durante l'eliminazione, contattare BabelCare" })
    );
  }

  onClose() {
    this.ref.close(null);
  }

  formatSize(bytes) {
    if (bytes == 0) {
        return "0 B";
    }
    const k = 1000,
    dm = 3,
    sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
    i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }
}
