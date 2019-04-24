import { Component, OnInit, ViewChild, AfterViewInit } from "@angular/core";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { DynamicDialogRef, DynamicDialogConfig } from "primeng/api";
import { MessageService } from "src/app/services/message.service";
import { Message } from "@bds/ng-internauta-model";
import { Editor } from "primeng/editor";
import { TOOLBAR_ACTIONS } from "src/environments/app-constants";

@Component({
  selector: "app-new-mail",
  templateUrl: "./new-mail.component.html",
  styleUrls: ["./new-mail.component.scss"]
})
export class NewMailComponent implements OnInit, AfterViewInit {

  @ViewChild("editor") editor: Editor;
  mailForm: FormGroup;
  addresses: any[] = [];
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

  constructor(public ref: DynamicDialogRef, private messageService: MessageService, public config: DynamicDialogConfig) { }

  ngOnInit() {
    let message: Message;
    const action = this.config.data.action;
    /* Action è passata dal components toolbar. Se è diverso da NEW ci aspettiamo il messaggio e il body della mail */
    if (action !== TOOLBAR_ACTIONS.NEW) {
      message = this.config.data.message;
      message.messageAddressList.forEach(obj => {
        switch (action) {
          case TOOLBAR_ACTIONS.REPLY:   // REPLY Prendiamo solo l'indirizzo FROM
          if (obj.addressRole === "FROM") {
            this.addresses.push(obj.idAddress.originalAddress ? obj.idAddress.originalAddress : obj.idAddress.mailAddress);
          }
            break;
          case TOOLBAR_ACTIONS.REPLY_ALL: // REPLY_ALL Prendiamo tutti gli indirizzi, from, to, cc
            this.addresses.push(obj.idAddress.originalAddress ? obj.idAddress.originalAddress : obj.idAddress.mailAddress);
            break;
        }
      });
      console.log("MESSAGE = ", message);
      console.log("ADDRESS = ", this.addresses);
    }
    /* Inizializzazione della form, funziona per tutte le actions */
    this.mailForm = new FormGroup({
      idPec: new FormControl(message ? message.fk_idPec.id : ""),
      to: new FormControl(this.addresses),
      cc: new FormControl([]),
      hideRecipients: new FormControl(false),
      subject: new FormControl(message ? "Re: ".concat(message.subject) : ""),
      attachments: new FormControl([]),
      body: new FormControl(""),  // Il body viene inizializzato nell'afterViewInit perché l'editor non è ancora istanziato
      from: new FormControl("anubi83@hotmail.com")
    });
  }

  ngAfterViewInit() {
    /* Inizializzazione del body per le risposte */
    if (this.config.data.action !== TOOLBAR_ACTIONS.NEW) {
      const message: Message = this.config.data.message;
      const body = this.config.data.body;
      this.buildBody(message, body);
      this.mailForm.patchValue({
        body: "<br/><br/><hr>" + this.editor.quill.root["innerHTML"]
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
    const da = this.addresses.join(", ");
    const inviato = message.receiveTime.toLocaleDateString("it-IT", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric"
    }).replace(",", " ");
    this.editor.quill.setContents([
      // { insert: "\n\n" },
      { insert: "Da: ", attributes: { bold: true } },
      { insert: da },
      { insert: "\n" },
      { insert: "Inviato: ", attributes: { bold: true } },
      { insert: inviato },
      { insert: "\n" },
      { insert: "Oggetto: ", attributes: { bold: true } },
      { insert: message.subject },
      { insert: "\n\n" },
    ]);
    this.editor.quill.clipboard.dangerouslyPasteHTML(this.editor.quill.getLength(), body);
    const divPosition = this.editor.quill.root["outerHTML"].indexOf(">") + 1;
    this.editor.quill.root["outerHTML"] = this.editor.quill.root["outerHTML"].slice(0, divPosition) +
      "<br/><br/><hr>" + this.editor.quill.root["innerHTML"];
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
    this.messageService.saveDraftMessage(formToSend).subscribe(
      res => console.log(res),
      err => console.log(err)
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
