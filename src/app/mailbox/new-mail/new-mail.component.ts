import { Component, OnInit, ViewChild, AfterViewInit } from "@angular/core";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { DynamicDialogRef, DynamicDialogConfig, MessageService, DialogService } from "primeng/api";
import { Message, Pec, Draft, MessageRelatedType } from "@bds/ng-internauta-model";
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
  fromAddress: string = ""; // Indirizzo che ha inviato la mail in caso di Rispondi e Rispondi a tutti
  toAddressesForLabel: string[] = [];
  ccAddressesForLabel: string[] = [];
  toAddresses: any[] = [];
  ccAddresses: any[] = [];
  attachments: any[] = [];
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
  ccTooltip = "Non puoi inserire destinatari CC se è attiva la funzione Destinatari privati";
  hideRecipientsTooltip = "Non puoi utilizzare la funzione Destinatari privati con destinatari CC: cancellali o rendili destinatari A";
  constructor(public ref: DynamicDialogRef, public config: DynamicDialogConfig, public dialogService: DialogService,
    private messagePrimeService: MessageService, public draftService: DraftService) { }

  ngOnInit() {
    console.log("DATA PASSED = ", this.config.data);
    let subject: string = ""; // L'Oggetto della mail
    let messageRelatedType = "";
    // Variabile per il messaggio in caso di azioni reply e inoltra
    const message: Message = this.config.data.fullMessage ? this.config.data.fullMessage.message : null;
    const pec: Pec = this.config.data.pec;
    const action = this.config.data.action;
    /* Action è passata dal components toolbar. Se è diverso da NEW ci aspettiamo il FullMessage di MessageEvent */
    switch (action) {
      case TOOLBAR_ACTIONS.REPLY:   // REPLY
        subject = "Re: ".concat(message.subject);
        messageRelatedType = MessageRelatedType.REPLIED;
        this.fillAddressesArray(message, false, action);
        break;
      case TOOLBAR_ACTIONS.REPLY_ALL: // REPLY_ALL Prendiamo tutti gli indirizzi, to, cc
        subject = "Re: ".concat(message.subject);
        messageRelatedType = MessageRelatedType.REPLIED_ALL;
        this.fillAddressesArray(message, true, action);
        break;
      case TOOLBAR_ACTIONS.FORWARD:
        subject = "Fwd: ".concat(message.subject);
        messageRelatedType = MessageRelatedType.FORWARDED;
        this.fillAddressesArray(message, false, action);
        Object.assign(this.attachments, this.config.data.fullMessage.emlData.attachments);
        break;
    }
    /* Inizializzazione della form, funziona per tutte le actions ed é l'oggetto che contiene tutti i campi
     * che saranno inviati al server */
    this.mailForm = new FormGroup({
      idDraftMessage: new FormControl(this.config.data.idDraft),
      idPec: new FormControl(pec.id),
      to: new FormControl(this.toAddresses, Validators.email),
      cc: new FormControl({ value: this.ccAddresses, disabled: false}),
      hideRecipients: new FormControl({ value: false, disabled: false }),
      subject: new FormControl(subject),
      attachments: new FormControl(this.attachments),
      body: new FormControl(""),  // Il body viene inizializzato nell'afterViewInit perché l'editor non è ancora istanziato
      idMessageRelated: new FormControl(message ? message.id : ""),
      messageRelatedType: new FormControl(messageRelatedType),
      idMessageRelatedAttachments: new FormControl("")
    });
  }

  ngAfterViewInit() {
    /* Inizializzazione del body per le risposte e l'inoltra */
    if (this.config.data.action !== TOOLBAR_ACTIONS.NEW) {
      const message: Message = this.config.data.fullMessage.message;
      const body = this.config.data.fullMessage.emlData.displayBody;
      this.buildBody(message, body);
      this.mailForm.patchValue({
        body: this.editor.quill.root["innerHTML"]
      });
    }
  }

  /**
   * Popola gli array degli indirizzi che saranno usati per popolare i campi della form e le label per il body
   * @param message Il messaggio a cui si sta rispondendo o si sta inoltrando
   * @param allAddresses Se True viene popolato l'array dei CC con tutti gli indirizzi
   * @param action L'azione che è stata effettuata (REPLY, FORWARD, ETC)
  */
  fillAddressesArray(message: Message, allAddresses: boolean, action: string) {
    message.messageAddressList.forEach(obj => {
      switch (obj.addressRole) {
        case "FROM":
          this.fromAddress = obj.idAddress.originalAddress ? obj.idAddress.originalAddress : obj.idAddress.mailAddress;
          if (action !== TOOLBAR_ACTIONS.FORWARD) {
            this.toAddresses.push(this.fromAddress);
          }
          break;
        case "TO":
          this.toAddressesForLabel.push(obj.idAddress.originalAddress ? obj.idAddress.originalAddress : obj.idAddress.mailAddress);
          if (allAddresses && obj.idAddress.id !== message.fk_idPec.id) {
            this.ccAddresses.push(obj.idAddress.originalAddress ? obj.idAddress.originalAddress : obj.idAddress.mailAddress);
          }
          break;
        case "CC":
          this.ccAddressesForLabel.push(obj.idAddress.originalAddress ? obj.idAddress.originalAddress : obj.idAddress.mailAddress);
          if (allAddresses && obj.idAddress.id !== message.fk_idPec.id) {
            this.ccAddresses.push(obj.idAddress.originalAddress ? obj.idAddress.originalAddress : obj.idAddress.mailAddress);
          }
          break;
      }
    });
  }

  /**
   * Intercetta la pressione del tasto invio per inserire l'indirizzo nei destinatari
   * per far funzionare sia l'autocomplete che l'inserimento manuale
   * @param event L'evento del dom, contiene sia l'informazione sul tasto che il valore inserito
   * @param formField Il campo del form dove è stato inserito l'indirizzo, addresses o ccAddresses
  */
  onKeyUp(event: KeyboardEvent, formField: string) {
    if (event.key === "Enter" || event.type === "blur") {
      const tokenInput = event.target as any;
      if (tokenInput.value && tokenInput.validity.valid) {
        if (formField) {
          if (formField === "addresses") {
            const toForm = this.mailForm.get("to");
            if (!toForm.value.find((element) => element === tokenInput.value)) {
              toForm.value.push(tokenInput.value);
              toForm.updateValueAndValidity();
            }
          } else if (formField === "ccAddresses") {
            const ccForm = this.mailForm.get("cc");
            if (!ccForm.value.find((element) => element === tokenInput.value)) {
              ccForm.value.push(tokenInput.value);
              ccForm.updateValueAndValidity();
            }
            if (ccForm.value && ccForm.value.length > 0) {
              const hideRecipients = this.mailForm.get("hideRecipients");
              hideRecipients.disable();
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
    if (item) {
      if (formField === "addresses") {
        const toForm = this.mailForm.get("to");
        if (toForm.value.indexOf(item) === -1) {
          toForm.value.push(item);
        }
      } else if (formField === "ccAddresses") {
        const ccForm = this.mailForm.get("cc");
        if (ccForm.value.indexOf(item) === -1) {
          ccForm.value.push(item);
        }
        if (ccForm.value && ccForm.value.length > 0) {
          const hideRecipients = this.mailForm.get("hideRecipients");
          hideRecipients.disable();
        }
      }
    }
  }
  /**
   * Metodo chiamato quando viene eliminato un indirizzo dai CC address
   * Verifica se il campo è popolato per disattivare il check dei destinatari privati
   * @param item L'oggetto rimosso
  */
  onUnselect(item) {
    const ccForm = this.mailForm.get("cc");
    if (ccForm.value && ccForm.value.length === 0) {
      const hideRecipients = this.mailForm.get("hideRecipients");
      hideRecipients.enable();
    }
  }
  /**
   * Metodo chiamato quando cambia il valore della checkbox destinatari privati (HiddenRecipients)
   * Verifica se il valore è true ed in tal caso disabilita il campo CC
   * @param checkBoxValue Il valore della checkBox
  */
  onChange(checkBoxValue) {
    const ccForm = this.mailForm.get("cc");
    checkBoxValue ? ccForm.disable() : ccForm.enable();
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
    const to = this.toAddressesForLabel.join(", ");
    const cc = this.ccAddressesForLabel.length > 0 ? this.ccAddressesForLabel.join(", ") : "";
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

  buildFormToSend(): FormData {
    const formToSend = new FormData();
    Object.keys(this.mailForm.controls).forEach(key => {
      if (key === "attachments") {  // Gli allegati vanno aggiunti singolarmente
        const files = this.mailForm.get(key).value;
        files.forEach(file => {
          if (file.id) {
            /* Nel caso di Inoltra, gli allegati della mail inoltrata avranno un id
             * che servirà per scaricarli dall'eml e aggiungerli alla nuova mail */
            formToSend.append("idMessageRelatedAttachments", file.id);
          } else {
            formToSend.append(key, file);
          }
        });
      } else {
        formToSend.append(key.toString(), this.mailForm.get(key).value);
      }
    });
    return formToSend;
  }

  /* Invio mail */
  onSubmit() {
    console.log("FORM = ", this.mailForm.value);
    const formToSend: FormData = this.buildFormToSend();
    this.draftService.sendMessage(formToSend).subscribe(
      res => {
        console.log(res);
        this.messagePrimeService.add(
          { severity: "success", summary: "Successo", detail: "Email inviata!" });
        },
      err => {
        console.log("Error: ", err);
        if (err && err.error.code === "007") {
            this.messagePrimeService.add(
            { severity: "error", summary: "Errore", detail: err.error.message, life: 3200 });
        } else {
          this.messagePrimeService.add(
          { severity: "error", summary: "Errore", detail: "Errore durante l'invio della mail, contattare BabelCare" });
        }
      }
    );
    this.onClose();
  }

  /* Salvataggio della bozza */
  onSaveDraft() {
    console.log("FORM = ", this.mailForm.value);
    const formToSend: FormData = this.buildFormToSend();
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

  onDelete(showMessage: boolean) {
    this.draftService.deleteHttpCall(this.mailForm.get("idDraftMessage").value).subscribe(
      res => {
        if (showMessage) {
          this.messagePrimeService.add(
            { severity: "success", summary: "Successo", detail: "Bozza eliminata correttamente" });
        }
        this.onClose();
      },
      err => {
        if (showMessage) {
          this.messagePrimeService.add(
            { severity: "error", summary: "Errore", detail: "Errore durante l'eliminazione, contattare BabelCare" });
        }
      }
    );
  }

  onClose() {
    this.dialogService.dialogComponentRef.instance.close();
    // this.ref.close();
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

  /* Metodi per la ricerca nei campi indirizzi, saranno rivisti con l'introduzione della rubrica */
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
}
