import { Component, OnInit } from "@angular/core";
import { FormGroup, FormControl, Validators, FormArray } from "@angular/forms";
import { DynamicDialogRef } from "primeng/api";
import { MessageService } from "src/app/services/message.service";

@Component({
  selector: "app-new-mail",
  templateUrl: "./new-mail.component.html",
  styleUrls: ["./new-mail.component.scss"]
})
export class NewMailComponent implements OnInit {

  mailForm: FormGroup;

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

  constructor(public ref: DynamicDialogRef, private messageService: MessageService) { }

  ngOnInit() {
    this.mailForm = new FormGroup({
      idPec: new FormControl("1456"),
      to: new FormControl([]),
      cc: new FormControl([]),
      hideRecipients: new FormControl(false),
      subject: new FormControl(""),
      attachments: new FormControl([]),
      body: new FormControl(""),
      from: new FormControl("anubi83@hotmail.com")
    });

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

            if (!toForm.value.find((element) => element.address === tokenInput.value)) {
              toForm.value.push(tokenInput.value);
            }
          } else {
            const ccForm = this.mailForm.get("cc");
            if (!ccForm.value.find((element) => element.address === tokenInput.value)) {
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
    fileinput.value = null;
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
