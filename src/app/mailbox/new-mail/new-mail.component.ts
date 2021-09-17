import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from "@angular/core";
import { FormGroup, FormControl, Validators, FormArray } from "@angular/forms";
import { ConfirmationService, MessageService } from "primeng/api";
import { Message, Pec, Draft, MessageRelatedType, InOut, ENTITIES_STRUCTURE, DettaglioContattoService, Utente, BaseUrls, BaseUrlType, Contatto } from "@bds/ng-internauta-model";
import { Editor } from "primeng/editor";
import { TOOLBAR_ACTIONS, MAX_FILE_SIZE_UPLOAD } from "src/environments/app-constants";
import { DraftService } from "src/app/services/draft.service";
import { FiltersAndSorts, FilterDefinition, FILTER_TYPES, BatchOperation, BatchOperationTypes, NextSdrEntity, AdditionalDataDefinition } from "@nfa/next-sdr";
import { Router } from "@angular/router";
import { UtenteUtilities, NtJwtLoginService } from "@bds/nt-jwt-login";
import { Subscription } from "rxjs";
import { CustomContactService, SelectedContact } from "@bds/common-components";
import { AutoComplete } from "primeng/autocomplete";
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from "primeng/dynamicdialog";

@Component({
  selector: "app-new-mail",
  templateUrl: "./new-mail.component.html",
  styleUrls: ["./new-mail.component.scss"]
})
export class NewMailComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild("toAutoComplete", {static: true}) toAutoComplete: AutoComplete;
  @ViewChild("ccAutoComplete", {static: true}) ccAutoComplete: AutoComplete;
  @ViewChild("editor", {}) editor: Editor;
  private fromAddress: string = ""; // Indirizzo che ha inviato la mail in caso di Rispondi e Rispondi a tutti
  private replyAddress: string = ""; // Indirizzo che ha inviato la mail in caso di Rispondi e Rispondi a tutti
  private toAddressesForLabel: string[] = [];
  private ccAddressesForLabel: string[] = [];
  private toAddresses: any[] = [];
  private ccAddresses: any[] = [];
  private toFormControl: FormControl[] = [];
  private ccFormControl: FormControl[] = [];

  public suggestion: number = 688300;
  public attachments: any[] = [];
  public mailForm: FormGroup;
  public selectedPec: Pec;
  public display = false;
  // emailRegex = new RegExp(/^([\w])+([\w-_\.]+)+([\w])@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/);
  emailRegex = new RegExp(/^(([^&#!?'òùàèéì%+*§$£<>()\[\]\.,;:\s@\"]+(\.[^<>&#!?'òùàèéì%+*§$£()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()&#!?'%òùàèéì+*§$£[\]\.,;:'\s@\"]+\.)+[^<>&#!?%'òùàèéì+*§$£()[\]\.,;:'\s@\"]{2,})$/);
  /* Questi andranno rinominati */
  public filteredAddressSingle: any[];
  public filteredAddressMultiple: string[];
  public lastAddressBookUsed = "";

  public displayRubricaPopup = false;
  public utenteConnesso: Utente;
  private subscriptions: Subscription[] = [];
  public disableButtonsConfermaDestinatariSelezionati: boolean = false;
  public isMailValid: boolean = true;
  public isMailValidCC: boolean = true;

  public indirizziTest = [
    "l.salomone@nsi.it"
  ];
  public ccTooltip = "Non puoi inserire destinatari CC se è attiva la funzione Destinatari privati";
  public hideRecipientsTooltip = "Non puoi utilizzare la funzione Destinatari privati con destinatari CC: cancellali o rendili destinatari A";

  get addressesTO() {
    return this.mailForm.get("to");
  }

  get addressesCC() {
    return this.mailForm.get("cc");
  }

  constructor(
    public config: DynamicDialogConfig,
    public dialogService: DialogService,
    public draftService: DraftService,
    private confirmationService: ConfirmationService,
    private dynamicDialogRef: DynamicDialogRef,
    private dettaglioContattoService: DettaglioContattoService,
    private messageService: MessageService,
    private router: Router,
    private loginService: NtJwtLoginService,
    private customContactService: CustomContactService) { }

  ngOnInit() {
    this.subscriptions.push(
      this.loginService.loggedUser$.subscribe((utente: UtenteUtilities) => {
        if (utente) {
          this.utenteConnesso = utente.getUtente();
          // console.log("loggedUser", this.utenteConnesso);
        }
      })
    );

    this.prepareMessageOrDraft();

    if (this.checkIfRubricaInternautaShouldBeEnabled()) {
      const fakeDestinatariforAppPEC = "{\"mode\":\"DESTINATARI\",\"app\":\"pec\",\"codiceAzienda\":\"\",\"guid\":\"\"}";
      this.customContactService._callerData = JSON.parse(fakeDestinatariforAppPEC);
      this.customContactService._callerData.selectedContactsLists = {
        "A": [],
        "CC": [],
        "MITTENTE": []
      };
      this.customContactService.manageCallerApp(Apps.PEC);
    }


  }


  private prepareMessageOrDraft() {
    // console.log("DATA PASSED = ", this.config.data);
    let subject: string = ""; // L'Oggetto della mail
    let messageRelatedType = "";
    const hideRecipients = { value: false, disabled: false };
    // Variabile per il messaggio in caso di azioni reply e inoltra
    let message: Message | Draft = this.config.data.fullMessage ? this.config.data.fullMessage.message as Message : null;
    this.selectedPec = this.config.data.pec;
    const action = this.config.data.action;

    /* Action è passata dal components toolbar. Se è diverso da NEW ci aspettiamo il FullMessage di MessageEvent */
    switch (action) {
      case TOOLBAR_ACTIONS.NEW:
        message = null; // Nel caso di NEW_MAIL non ho bisogno del message che resta comunque nel messageEvent
        break;
      case TOOLBAR_ACTIONS.EDIT:   // EDIT
        message = this.config.data.fullMessage.message as Draft;
        subject = message.subject ? message.subject : "";
        this.fillAddressesArray(null, message, null, null);
        hideRecipients.value = message.hiddenRecipients;
        hideRecipients.disabled = this.ccAddresses && this.ccAddresses.length > 0;
        /* Può esserci l'emlData null nel caso di una draft creata e non salvata correttamente */
        if (this.config.data.fullMessage.emlData) {
          Object.assign(this.attachments, this.config.data.fullMessage.emlData.attachments);
        }
        break;
      case TOOLBAR_ACTIONS.REPLY:   // REPLY
        subject = "Re: ".concat(message.subject);
        messageRelatedType = MessageRelatedType.REPLIED;
        this.fillAddressesArray(message, null, false, action);
        break;
      case TOOLBAR_ACTIONS.REPLY_ALL: // REPLY_ALL Prendiamo tutti gli indirizzi, to, cc
        subject = "Re: ".concat(message.subject);
        messageRelatedType = MessageRelatedType.REPLIED_ALL;
        this.fillAddressesArray(message, null, true, action);
        break;
      case TOOLBAR_ACTIONS.FORWARD:
        subject = "Fwd: ".concat(message.subject);
        messageRelatedType = MessageRelatedType.FORWARDED;
        this.fillAddressesArray(message, null, false, action);
        Object.assign(this.attachments, this.config.data.fullMessage.emlData.attachments);
        break;
    }
    /* Inizializzazione della form, funziona per tutte le actions ed é l'oggetto che contiene tutti i campi
     * che saranno inviati al server */
    this.mailFormInit(hideRecipients, subject, message, action, messageRelatedType);
  }



  /**
   * Inizializzazione della form, funziona per tutte le actions ed é l'oggetto che contiene tutti i campi
   * @param hideRecipients
   * @param subject
   * @param message
   * @param action
   * @param messageRelatedType
   */
  private mailFormInit(hideRecipients: { value: boolean; disabled: boolean; }, subject: string, message: Message | Draft, action: any, messageRelatedType: string) {
    if (this.toAddresses && this.toAddresses.length > 0) {
      console.log("qui ci entro", this.toAddresses);
      this.toAddresses.forEach(el => this.toFormControl.push(new FormControl(el, Validators.pattern(this.emailRegex))));
      this.toFormControl = [...this.toFormControl];
      // this.mailForm.get("to").setValue([...this.toFormControl]);
      this.toAutoComplete.writeValue(this.toAddresses);
    }

    if (this.ccAddresses && this.ccAddresses.length > 0) {
      this.ccAddresses.forEach(el => this.ccFormControl.push(new FormControl(el, Validators.pattern(this.emailRegex))));
      this.ccFormControl = [...this.ccFormControl];
      // this.mailForm.get("cc").setValue([...this.ccFormControl]);
      this.ccAutoComplete.writeValue(this.ccAddresses);
    }

    this.mailForm = new FormGroup({
      idDraftMessage: new FormControl(this.config.data.idDraft),
      idPec: new FormControl(this.selectedPec.id),
      to: new FormArray(this.toFormControl, Validators.required),
      cc: new FormArray(this.ccFormControl),
      hideRecipients: new FormControl(hideRecipients),
      subject: new FormControl(subject),
      attachments: new FormControl(this.attachments),
      body: new FormControl(""),  // Il body viene inizializzato nell'afterViewInit perché l'editor non è ancora istanziato
      idMessageRelated: new FormControl(message && action !== TOOLBAR_ACTIONS.EDIT ? message.id : ""),
      messageRelatedType: new FormControl(messageRelatedType)
      // idMessageRelatedAttachments: new FormControl(this.attachments)
    });
    // if it is a draft update input state
    if (this.toAddresses && this.toAddresses.length > 0) {
      this.addressesTO.markAsDirty();
      this.addressesTO.updateValueAndValidity();
    }
    if (this.ccAddresses && this.ccAddresses.length > 0) {
      this.addressesCC.markAsDirty();
      this.addressesCC.updateValueAndValidity();
    }

  }

  ngAfterViewInit() {


  /* Inizializzazione del body per le risposte e l'inoltra */

    if (this.config.data.action !== TOOLBAR_ACTIONS.NEW) {
      let body = "";
      if (this.config.data.fullMessage.emlData) {
        body = this.config.data.fullMessage.emlData.displayBody;
      } else if (this.config.data.fullMessage.body) {
        body = this.config.data.fullMessage.body;
      }
      if (this.config.data.action === TOOLBAR_ACTIONS.EDIT) {
        this.editor.quill.clipboard.dangerouslyPasteHTML(body);
      } else {
        const message: Message = this.config.data.fullMessage.message;
        this.buildBody(message, body);
      }
      this.mailForm.patchValue({
        body: this.editor.quill.root["innerHTML"]
      });
    }
    /* Disabilito la compilazione automatica degli indirizzi */
    this.setAttribute("toInputId", "autocomplete", "false");
    this.setAttribute("ccInputId", "autocomplete", "false");
    this.toAutoComplete.focusInput();
  }

  /**
   * Popola gli array degli indirizzi che saranno usati per popolare i campi della form e le label per il body
   * @param message Il messaggio a cui si sta rispondendo o si sta inoltrando
   * @param draft Il draft che si sta modificando
   * @param allAddresses Se True viene popolato l'array dei CC con tutti gli indirizzi
   * @param action L'azione che è stata effettuata (REPLY, FORWARD, ETC)
  */
  fillAddressesArray(message?: Message, draft?: Draft, allAddresses?: boolean, action?: string) {
    if (message && message.messageAddressList && message.messageAddressList.length > 0) {
      message.messageAddressList.forEach(
        obj => {
        switch (obj.addressRole) {
          case "REPLY_TO":
            this.replyAddress = obj.idAddress.mailAddress;
            break;
          case "FROM":
            this.fromAddress = obj.idAddress.mailAddress;
            /* if (action !== TOOLBAR_ACTIONS.FORWARD) {
              if (message.inOut === InOut.IN) {
                this.toAddresses.push(obj.idAddress.mailAddress);
              }
            } */
            break;
          case "TO":
            this.toAddressesForLabel.push(obj.idAddress.mailAddress);
            if (action !== TOOLBAR_ACTIONS.FORWARD) {
              if (message.inOut === InOut.OUT) {
                this.toAddresses.push(obj.idAddress.mailAddress);
              }
            } else if (allAddresses && obj.idAddress.mailAddress !== this.selectedPec.indirizzo) {
              this.ccAddresses.push(obj.idAddress.mailAddress);
            }
            break;
          case "CC":
            this.ccAddressesForLabel.push(obj.idAddress.mailAddress);
            if (allAddresses && obj.idAddress.mailAddress !== this.selectedPec.indirizzo) {
              this.ccAddresses.push(obj.idAddress.mailAddress);
            }
            break;
        }
      });
      if (action !== TOOLBAR_ACTIONS.FORWARD) {
        if (message.inOut === InOut.IN) {
          const toWhom = this.replyAddress ? this.replyAddress : this.fromAddress;
          this.toAddresses.push(toWhom);
        }
      }
    } else if (draft) {
      this.toAddresses = draft.toAddresses;
      this.ccAddresses = draft.ccAddresses;
    }
  }

  /**
   * Intercetta la pressione del tasto invio per inserire l'indirizzo nei destinatari
   * per far funzionare sia l'autocomplete che l'inserimento manuale
   * @param event L'evento del dom, contiene sia l'informazione sul tasto che il valore inserito
   * @param formField Il campo del form dove è stato inserito l'indirizzo, addresses o ccAddresses
  */
  onKeyUp(e: Event, formField: string) {
    const event = e as KeyboardEvent;
    console.log("messageService onKeyUp");
    if (event.key === "Enter" || event.type === "blur") {
      const tokenInput = event.target as any;
      tokenInput.value = tokenInput.value.trim();
      if (tokenInput.value && tokenInput.validity.valid) {
        if (formField) {
          if (formField === "to") {
            const toForm = this.mailForm.get("to") as FormArray;
            if (!toForm.value.find((element) => element === tokenInput.value)) {
              toForm.push(new FormControl(tokenInput.value, Validators.pattern(this.emailRegex)));
              this.toAutoComplete.writeValue(toForm.value);
              if (this.mailForm.pristine || this.addressesTO.pristine) {
                this.mailForm.markAsDirty();
                this.addressesTO.markAsDirty();
              }
              this.isMailValid = true;
            } else {
              this.messageService.add({severity: "warn", summary: "Attenzione", detail: "La mail è stata già inserita."});
            }
          } else if (formField === "cc") {
            const ccForm = this.mailForm.get("cc") as FormArray;
            if (!ccForm.value.find((element) => element === tokenInput.value)) {
              ccForm.push(new FormControl(tokenInput.value, Validators.pattern(this.emailRegex)));
              this.ccAutoComplete.writeValue(ccForm.value);
              if (ccForm.value && ccForm.value.length > 0) {
                const hideRecipients = this.mailForm.get("hideRecipients");
                hideRecipients.disable();
              }
              if (this.mailForm.pristine || this.addressesCC.pristine) {
                this.mailForm.markAsDirty();
                this.addressesCC.markAsDirty();
              }
              this.isMailValidCC = true;
            } else {
              this.messageService.add({severity: "warn", summary: "Attenzione", detail: "La mail è stata già inserita."});
            }
          }
        }
        tokenInput.value = "";
        
      }
      else if(event.type === "blur" && tokenInput.value && !tokenInput.validity.valid){
        if(formField){
          if(formField === "to"){
            this.isMailValid = false;
          }
          else if(formField === "cc") {
            this.isMailValidCC = false;
          }
        }
      }
      else{
        if(formField){
          if(formField === "to"){
            this.isMailValid = true;
          }
          else if(formField === "cc") {
            this.isMailValidCC = true;
          }
        }
      }
    }
  }

  /**
   * Intercetta la selezione dell'elemento nell'autocomplete e aggiorna
   * sia gli array degli indirizzi che la form
   * @param item L'oggetto selezionato nell'autocomplete
   * @param formField Il campo del form dove è stato selezionato l'indirizzo, addresses o ccAddresses
  */
  onSelect(item: any, formField: string) {
    if (item) {
      // console.log("item: ", item);
      if (item.descrizione && this.checkIfRubricaInternautaShouldBeEnabled()) {
        item = item.descrizione.trim();
      } else {
        item = item.trim();
      }
      if (formField === "to") {
        const toForm = this.mailForm.get("to") as FormArray;
        if (toForm.value.indexOf(item) === -1) {
          toForm.push(new FormControl(item, {validators: Validators.pattern(this.emailRegex), updateOn: 'blur'}));
          if (this.mailForm.pristine) {
            this.mailForm.markAsDirty();
          }
        } else {
          this.messageService.add({severity: "warn", summary: "Attenzione", detail: "La mail è stata già inserita."});
        }
        this.toAutoComplete.writeValue(toForm.value);
        this.isMailValid= true;
      } else if (formField === "cc") {
        const ccForm = this.mailForm.get("cc") as FormArray;
        if (ccForm.value.indexOf(item) === -1) {
          ccForm.push(new FormControl(item, {validators: Validators.pattern(this.emailRegex), updateOn: 'blur'}));
          if (ccForm.value && ccForm.value.length > 0) {
            const hideRecipients = this.mailForm.get("hideRecipients");
            hideRecipients.disable();
          }
          if (this.mailForm.pristine) {
            this.mailForm.markAsDirty();
          }
        } else {
          this.messageService.add({severity: "warn", summary: "Attenzione", detail: "La mail è stata già inserita."});
        }
        this.ccAutoComplete.writeValue(ccForm.value);
        this.isMailValidCC= true;
      }
    }
  }
  /**
   * Metodo chiamato quando viene eliminato un indirizzo da to o cc
   * Aggiorna i campi della form e verifica se il campo cc è popolato per disattivare
   * il check dei destinatari privati
   * @param item L'oggetto rimosso
  */
  onUnselect(item, formField) {
    if (item && formField === "to") {
      const toForm = this.mailForm.get("to") as FormArray;
      toForm.removeAt(toForm.value.indexOf(item));
    } else if (item && formField === "cc") {
      const ccForm = this.mailForm.get("cc") as FormArray;
      ccForm.removeAt(ccForm.value.indexOf(item));
      if (ccForm.value && ccForm.value.length === 0) {
        const hideRecipients = this.mailForm.get("hideRecipients");
        hideRecipients.enable();
      }
    }
    if (this.mailForm.pristine) {
      this.mailForm.markAsDirty();
    }
  }
  /* *
   * Metodo chiamato quando cambia il valore della checkbox destinatari privati (HiddenRecipients)
   * Verifica se il valore è true ed in tal caso disabilita il campo CC
   * @param checkBoxValue Il valore della checkBox
  */
  /* Con il FormArray non serve più, l'abilitazione è gestita sulla proprietà disabled e non dal formcontrol
  onChange(checkBoxValue) {
    const ccForm = this.mailForm.get("cc") as FormArray;
    checkBoxValue ? ccForm.disable() : ccForm.enable();
  } */

  /* Gestione allegati */
  onFileChange(event, fileinput) {
    const fileForm = this.mailForm.get("attachments");
    for (const file of event.target.files) {
      if (!fileForm.value.find((element) => element.name === file.name)) {
        const maxFilesSize = fileForm.value.reduce((tot, element) =>
          element.id ? tot + element.size * 0.71 : tot + element.size, 0);
        if (file.size && (maxFilesSize + file.size) <= MAX_FILE_SIZE_UPLOAD) {
          fileForm.value.push(file);
          fileForm.setValue([...fileForm.value]);
          if (this.mailForm.pristine) {
            this.mailForm.markAsDirty();
          }
        } else {
          this.draftService.messagePrimeService.add(
            { severity: "warn", summary: "Attenzione", detail: "Il file " + file.name + " non è stato caricato. La "
              + "dimensione massima degli allegati supera quella consentita (50 Mb).", life: 10000 });
        }
      }
    }
    fileinput.value = null; // Reset dell'input
  }

  clearAttachmentsField() {
    const fileForm = this.mailForm.get("attachments");
    if (fileForm.value && fileForm.value.length > 0) {
      this.confirmationService.confirm({
        message: "Vuoi rimuovere tutti gli allegati?",
        header: "Conferma",
        icon: "pi pi-exclamation-triangle",
        accept: () => {
          this.mailForm.get("attachments").setValue([]);
          if (this.mailForm.pristine) {
            this.mailForm.markAsDirty();
          }
        },
        reject: () => { }
      });
    }
  }

  /**
   * In caso di Replies, costruisce il template parziale della mail con i dati della mail originale
   * @param message Il messaggio originale
   * @param body Il body del messaggio estratto dall'eml
   */
  buildBody(message: Message, body: string) {
    // console.log("EDITOR = ", this.editor);
    const to = this.toAddressesForLabel.length > 0 ? this.toAddressesForLabel.join(", ") : "";
    const cc = this.ccAddressesForLabel.length > 0 ? this.ccAddressesForLabel.join(", ") : "";
    const inviato = new Date(message.receiveTime).toLocaleDateString("it-IT", {
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
          if (file.id || file.id === 0) { // I file che hanno l'id sono presi dall'eml già salvato sul DB
          formToSend.append("idMessageRelatedAttachments", file.id);
        } else {
          formToSend.append(key, file);
          }
        });
      } else {
        formToSend.append(key.toString(), this.mailForm.get(key).value);
      }
    });
    if (!formToSend.get("idMessageRelatedAttachments")) {
      formToSend.append("idMessageRelatedAttachments", [].toString());
    }
    return formToSend;
  }

  checkMaxPostSize() {
    const fileForm = this.mailForm.get("attachments");
    const maxFilesSize = fileForm.value.reduce((tot, element) =>
      element.id ? tot +  element.size * 0.71 : tot + element.size, 0);
    const bodyForm = this.mailForm.get("body");
    return maxFilesSize + bodyForm.value.length <= MAX_FILE_SIZE_UPLOAD;
  }

  checkAndClose() {
    if (!this.mailForm.pristine) {
      this.display = true;
    } else if (this.config.data.action !== "edit") { // In caso di mail futile elimina la bozza
      this.onDelete(false);
    } else {
      this.onClose();
    }
  }

  /* Invio mail */
  onSubmit() {
    // console.log("FORM = ", this.mailForm.value);
    const formToSend: FormData = this.buildFormToSend();
    this.draftService.setIsMailFormSubmitted = true;
    this.draftService.submitMessage(formToSend);
    this.onClose();
  }

  /* Salvataggio della bozza */
  onSaveDraft() {
    // console.log("FORM = ", this.mailForm.value);
    if (this.checkMaxPostSize()) {
      const formToSend: FormData = this.buildFormToSend();
      this.draftService.saveDraftMessage(formToSend, this.mailForm.get("idDraftMessage").value);
      this.onClose();
    } else {
      this.draftService.messagePrimeService.add(
        { severity: "warn", summary: "Attenzione", detail: "La mail supera la dimensione massima consentita (50 Mb). "
          + "Rimuovere degli allegati per continuare.", life: 4000 });
    }
  }

  onDelete(showMessage: boolean) {
    const reload: boolean = this.config.data.reloadOnDelete;
    this.draftService.deleteDraftMessage(this.mailForm.get("idDraftMessage").value, showMessage, reload);
    this.onClose();
  }

  onClose() {
    this.dynamicDialogRef.close();
  }

  formatSize(bytes, originalBytes?) {
    const originalTotalSize = bytes;
    if (!originalBytes) {
      bytes = bytes * 0.71;
    }
    const totalSizeKB = bytes / Math.pow(1000, 1);
    if (totalSizeKB < 1) {
      const byte = originalBytes ? originalTotalSize : (originalTotalSize * 0.72).toFixed(0);
      if (+byte < 1) {
        return "1B";
      } else {
        return (originalBytes ? originalTotalSize : (originalTotalSize * 0.72).toFixed(0)) + "B";
      }
    }
    const totalSizeMB = bytes / Math.pow(1000, 2) ;
    if (totalSizeMB < 1) {
      return totalSizeKB.toFixed(1) + "KB";
    }
    return totalSizeMB.toFixed(1) + "MB";
  }

  /* Metodi per la ricerca nei campi indirizzi, saranno rivisti con l'introduzione della rubrica */
  // filterAddressSingle(event) {
  //   const query = event.query;
  //   this.filteredAddressSingle = this.filterAddress(query, this.indirizziTest);
  // }

  filterAddressMultiple(event) {
    console.log("sadhjashdhsakdhkasdasjhkd");
    console.log(this.filteredAddressMultiple);
    const query = event.query;
    if (this.checkIfRubricaInternautaShouldBeEnabled()) {
      this.loadEmailsFromDettaglioContatto(query);
    } else {
      this.filteredAddressMultiple = this.filterAddress(query, this.indirizziTest);
    }
  }

  /**
   * HTTP call
   * @param query
   */
  private loadEmailsFromDettaglioContatto(query: any) {
    const projection = ENTITIES_STRUCTURE.rubrica.dettagliocontatto.standardProjections.DettaglioContattoWithIdContatto;
    const filtersAndSorts: FiltersAndSorts = new FiltersAndSorts();
    filtersAndSorts.addAdditionalData(new AdditionalDataDefinition("CercaAncheInContattoNoTScol", query));
    filtersAndSorts.addAdditionalData(new AdditionalDataDefinition("OperationRequested", "CercaAncheInContattoNoTScol"));
    filtersAndSorts.addFilter(new FilterDefinition("idContatto.eliminato", FILTER_TYPES.not_string.equals, false));
    filtersAndSorts.addFilter(new FilterDefinition("idContatto.protocontatto", FILTER_TYPES.not_string.equals, false));
    filtersAndSorts.addFilter(new FilterDefinition("eliminato", FILTER_TYPES.not_string.equals, false));
    filtersAndSorts.addFilter(new FilterDefinition("tipo", FILTER_TYPES.not_string.equals, "EMAIL"));

    // filtersAndSorts.addFilter(new FilterDefinition("tscol", FILTER_TYPES.not_string.equals, query));
    this.subscriptions.push(
      this.dettaglioContattoService.getData(projection, filtersAndSorts).subscribe(res => {
        res.results.forEach(dettaglioContatto => {
          dettaglioContatto["descrizioneCustom"] = dettaglioContatto.descrizione + " [ " + dettaglioContatto.idContatto.descrizione + " ]";
        });
        this.filteredAddressMultiple = res.results;
        // console.log("filteredAddressMultiple: ", this.filteredAddressMultiple);
      }, err => {
        console.log("error");
        this.messageService.add({
          severity: "error",
          summary: "Errore nel backend",
          detail: "Non è stato possibile fare la ricerca."
        });
      })
    );
  }

  filterAddress(query, addresses: any[]): any[] {
      const filtered: any[] = [];
      for (let i = 0; i < addresses.length; i++) {
          const address = addresses[i];
          if (address.toLowerCase().indexOf(query.toLowerCase()) === 0) {
              filtered.push(address);
          }
      }
      return filtered;
  }

  private setAttribute(feild, attribute, value): void {
    const field = document.getElementById(feild);
    field.setAttribute(attribute, value);
  }



  public onAddressChosedByBook(event: any): void {
    // console.log(event, event);
    this.onSelect(event.emails[0].email, this.lastAddressBookUsed);
    this.displayRubricaPopup = false;
  }

  editorInit(event) {
    // console.log("inside Quill", event);
    const quill = event.editor;
    const toolbar = quill.getModule("toolbar");
    /* toolbar.addHandler("link", (value) => {
      if (value) {
        const range = quill.getSelection();
        let preview = quill.getText(range);
        if (/^\S+@\S+\.\S+$/.test(preview) && preview.indexOf("mailto:") !== 0) {
          preview = "mailto:" + preview;
        }
        const tooltip = quill.theme.tooltip;
        tooltip.edit("link", "ciao");
      } else {
        quill.format("link", false);
      }
    }); */
    /* const quill = event.editor;
    const toolbar = quill.getModule("toolbar"); */
    /* getQuill;
    const Link = Quill.import("formats/link");
    Link.sanitize = function(url) { // modify url if desired return url; } */
    /* toolbar.addHandler("link", () => {
      const range = quill.getSelection();
      if (range.length > 0) {
        const href = prompt("Inserire l'URL: ");
        const regex = RegExp("^https?://");
        const whiteSpaceRegex = RegExp("\\s", "g");
        let hrefWithNoSpace = href.replace(whiteSpaceRegex, "");
        if (
          hrefWithNoSpace !== "" &&
          /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,10}\b([-a-zA-Z0-9@:%_\+.~#?*&//=]*)/.test(
            hrefWithNoSpace
          )
        ) {
          if (regex.test(hrefWithNoSpace)) {
            quill.format("link", hrefWithNoSpace);
          } else {
            const formatHttp = "https://";
            hrefWithNoSpace = formatHttp + hrefWithNoSpace;
            quill.format("link", hrefWithNoSpace);
          }
        } else {
          quill.format("link", false);
        }
      } else {
        quill.format("link", false);
      }
    }); */
    const tooltips = {
      bold: "Grassetto (CTRL+B)",
      italic: "Corsivo (CTRL+I)",
      underline: "Sottolineato (CTRL+U)",
      link: "Inserisci collegamento ipertestuale (CTRL+K)",
      image: "Inserisci immagini incorporate",
      "code-block": "Blocco di codice",
      clean : "Rimuovi formattazione"
    };

    const showTooltip = (el) => {
      const tool = el.className.replace("ql-", "");
      if (tooltips[tool]) {
        el.setAttribute("title", tooltips[tool]);
      } else if (el && el.value && el.value === "ordered") {
        el.setAttribute("title", "Elenco numerato");
      } else if (el && el.value && el.value === "bullet") {
        el.setAttribute("title", "Elenco puntato");
      }
    };

    const toolbarElement = document.querySelector(".ql-toolbar");
    if (toolbarElement) {
      const matches = toolbarElement.querySelectorAll("button");
      const arrays = Array.prototype.slice.call(matches); // Array.from(matches);
      for (let i = 0; i < matches.length; i++) {
        showTooltip(matches[i]);
      }
      const header = document.querySelector(".ql-header");
      if (header) {
        header.setAttribute("title", "Dimensione carattere");
      }
      const font = document.querySelector(".ql-font");
      if (font) {
        font.setAttribute("title", "Tipo di carattere");
      }
      const color = document.querySelector(".ql-color");
      if (color) {
        color.setAttribute("title", "Colore carattere");
      }
      const background = document.querySelector(".ql-background");
      if (background) {
        background.setAttribute("title", "Colore sfondo");
      }
      const align = document.querySelector(".ql-align");
      if (align) {
        align.setAttribute("title", "Allinea testo");
      }
    }
  }

  handleOnHideRubricaPopup(event) {
    // console.log("handleOnHideRubricaPopup", event);
    this.onCloseRubricaPopup();
  }

  /**
   *
   */
  onCloseRubricaPopup() {
    console.log("onCloseRubricaPopup");
    this.displayRubricaPopup = false;
    if (this.checkIfRubricaInternautaShouldBeEnabled()) {
      this.router.navigate(["", { outlets: { rubricaPopup: null } }]);

      this.customContactService._callerData.selectedContactsLists.A = [];
      this.customContactService._callerData.selectedContactsLists.CC = [];
      this.customContactService.allSelectedContact = [];
    }
  }

  private checkIfRubricaInternautaShouldBeEnabled() {
    return this.utenteConnesso.aziendaLogin.parametriAzienda && this.utenteConnesso.aziendaLogin.parametriAzienda.rubricaInternauta;
  }

  /**
   * Apre popup
   */
  onOpenRubricaPopup() {
    console.log("onOpenRubricaPopup");
    this.displayRubricaPopup = true;
    if (this.checkIfRubricaInternautaShouldBeEnabled()) {
      this.router.navigate(["", { outlets: { rubricaPopup: "rubrica" }}], {
        queryParams: {
          mode: "selection",
          from: "pec"
        }
      });
      this.customContactService._callerData.selectedContactsLists.A = this.createSelectedContactEstemporaneo(this.toAutoComplete.value);
      this.customContactService._callerData.selectedContactsLists.CC = this.createSelectedContactEstemporaneo(this.ccAutoComplete.value);
    }
  }

  createSelectedContactEstemporaneo(emails: string[]): SelectedContact[] {
    let selectedContacts: SelectedContact[] = [];
    if (!!emails && emails.length > 0) {
      selectedContacts = emails.filter(emailAsString => this.emailRegex.test(emailAsString)).map(emailAsString => this.customContactService.createSelectedContactFromEmail(emailAsString));
    }
    return selectedContacts;
  }

  /**
   * non usato
   * @param event
   */
  // handleOnShowRubricaPopup(event) {
  //   console.log("handleOnShowRubricaPopup", event);
  // }

  /**
   *  on click button Conferma Destinatari Selezionati
   */
  onConfermaDestinatari() {
    // console.log("onConfermaDestinatari");
    this.disableButtonsConfermaDestinatariSelezionati = true;
    const url = this.router.url;
    if (url.includes("editing") && url.includes("selection")) {
      // console.log("Can not send selected contacts");
      this.messageService.add({severity: "warn", summary: "Attenzione", detail: "Stai ancora facendo delle modifiche. Annulla o Salva/Conferma per poter proseguire."});
    } else {

      const estemporaneiToAddToRubricaAsContatto: Contatto[] = this.customContactService.createEstemporaneiContactsList(this.customContactService.allSelectedContact);

      // save estemporanei as Protocontatti sul DB.
      if (estemporaneiToAddToRubricaAsContatto.length > 0) {
        const batchOperation: BatchOperation[] = [];

        estemporaneiToAddToRubricaAsContatto.forEach((contact: Contatto) => {
          batchOperation.push({
            operation: BatchOperationTypes.INSERT,
            entityPath: BaseUrls.get(BaseUrlType.Rubrica) + "/" + ENTITIES_STRUCTURE.rubrica.contatto.path,
            entityBody: contact as NextSdrEntity
          } as BatchOperation);
        });

        this.protocontattiBatchSaveAndHandleConferma(batchOperation);
      } else {
        this.handleConfermaAddToAddressTO();
        this.handleConfermaAddToAddressCC();
        this.onCloseRubricaPopup();
        this.disableButtonsConfermaDestinatariSelezionati = false;
      }

    }

  }

  private protocontattiBatchSaveAndHandleConferma(batchOperation: BatchOperation[]) {
    this.subscriptions.push(this.customContactService.batchHttpCall(batchOperation).subscribe((res: BatchOperation[]) => {
      this.messageService.add({ severity: "success", summary: "Successo", detail: `Salvataggio avvenuto con successo.` });
      this.handleConfermaAddToAddressTO();
      this.handleConfermaAddToAddressCC();
      this.onCloseRubricaPopup();
      this.disableButtonsConfermaDestinatariSelezionati = false;
    }, err => {
      this.messageService.add({ severity: "error", summary: "Errore nel backend", detail: `Non è stato possibile fare il salvataggio dei protocontatti.` });
      this.disableButtonsConfermaDestinatariSelezionati = false;
    }));
  }

  private handleConfermaAddToAddressTO() {
    if (this.toAutoComplete.value && this.toAutoComplete.value.length > 0) {
      this.toAutoComplete.value.forEach(email => this.onUnselect(email, "to"));
    }
    this.toAutoComplete.value = [];
    if (this.customContactService._callerData.selectedContactsLists.A && this.customContactService._callerData.selectedContactsLists.A.length > 0) {
      this.customContactService._callerData.selectedContactsLists.A.forEach((selectedContact: SelectedContact) => {
        // console.log("selectedContact: ", selectedContact);
        this.onSelect(selectedContact.address.descrizione, "to");
      });
    }
  }

  private handleConfermaAddToAddressCC() {
    if (this.ccAutoComplete.value && this.ccAutoComplete.value.length > 0) {
      this.ccAutoComplete.value.forEach(email => this.onUnselect(email, "cc"));
    }
    this.ccAutoComplete.value = [];
    if (this.customContactService._callerData.selectedContactsLists.CC && this.customContactService._callerData.selectedContactsLists.CC.length > 0) {
      this.customContactService._callerData.selectedContactsLists.CC.forEach((selectedContact: SelectedContact) => {
        // console.log("selectedContact: ", selectedContact);
        this.onSelect(selectedContact.address.descrizione, "cc");
      });
    }
  }

/* Nasceva dalla necessità di non far più digitare agli utenti i caratteri speciali per il momento lo rimuoviamo, anche (input)="inputValidator($event)" 
  public inputValidator(event: any) {
    const pattern = this.emailRegex;
    if (!pattern.test(event.target.value)) {
      event.target.value = event.target.value.replace(/[^\w-_@'\.]/g, "");
    }
  }
*/

  public ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.subscriptions = [];
  }

}



enum Apps {
  PEC = "pec",
}
