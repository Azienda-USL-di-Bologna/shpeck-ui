import { Component, OnInit } from "@angular/core";
import { FormGroup, FormControl, Validators } from "@angular/forms";

@Component({
  selector: "app-new-mail",
  templateUrl: "./new-mail.component.html",
  styleUrls: ["./new-mail.component.scss"]
})
export class NewMailComponent implements OnInit {

  mailForm: FormGroup;

  country: any;

  addresses: any[] = [];
  ccAddresses: any[] = [];
  attachments: any[] = [];

  filteredCountriesSingle: any[];

  filteredCountriesMultiple: any[];

  indirizziTest = [
    { "address": "g.russo@nsi.it", "id": "FI" },
    { "address": "opsouperen@cryptontrade.ga", "id": "FR" },
    { "address": "heckerman@att.net", "id": "GA" },
    { "address": "jespley@sbcglobal.net", "id": "GM" },
    { "address": "kannan@msn.com", "id": "GE" },
    { "address": "boftx@outlook.com", "id": "DE" },
    { "address": "sacraver@optonline.net", "id": "GH" },
    { "address": "north@yahoo.ca", "id": "GR" },
    { "address": "dhwon@yahoo.ca", "id": "HK" },
    { "address": "jamuir@att.net", "id": "HU" },
    { "address": "kobayasi@msn.com", "id": "IS" },
    { "address": "syrinx@optonline.net", "id": "IN" },
    { "address": "bcevc@live.com", "id": "ID" },
    { "address": "syrinx@outlook.com", "id": "IE" },
    { "address": "lpalmer@aol.com", "id": "IM" },
    { "address": "crimsane@aol.com", "id": "IL" },
    { "address": "geoffr@sbcglobal.net", "id": "IT" },
    { "address": "dcoppit@live.com", "id": "JM" },
    { "address": "schumer@outlook.com", "id": "JP" },
  ];

  constructor() { }

  ngOnInit() {
    this.mailForm = new FormGroup({
      addresses: new FormControl(this.addresses),
      ccAddresses: new FormControl(this.ccAddresses),
      hideRecipients: new FormControl(false),
      mailObject: new FormControl(""),
      attachments: new FormControl(this.attachments),
      mailText: new FormControl("")
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
          if (country.address.toLowerCase().indexOf(query.toLowerCase()) == 0) {
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
            if (!this.addresses.find((element) => {
              return element.address === tokenInput.value;
            })) {
              this.addresses.push({ address: tokenInput.value, id: "" });
            }
          } else if (!this.ccAddresses.find((element) => {
              return element.address === tokenInput.value;
            })) {
            this.ccAddresses.push({ address: tokenInput.value, id: "" });
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
        if (this.addresses.indexOf(item) ===  -1) {
          this.addresses.push(item);
          this.mailForm.patchValue({
            addresses: this.addresses
          });
        }
      } else if (this.ccAddresses.indexOf(item) ===  -1) {
        this.ccAddresses.push(item);
        this.mailForm.patchValue({
          ccAddresses: this.ccAddresses
        });
      }
    }
  }

  onRemove(event, formField) {
    switch (formField) {
      case "addresses":
      this.addresses.splice(this.addresses.indexOf(event), 1);
        break;
      case "ccAddresses":
        this.ccAddresses.splice(this.ccAddresses.indexOf(event), 1);
        break;
      case "attachments":
        this.attachments.splice(this.attachments.indexOf(event.value), 1);
        break;
    }
    this.mailForm.patchValue({
      addresses: this.addresses,
      ccAddresses: this.ccAddresses,
      attachments: this.attachments
    });
  }
  /* Gestione array allegati */
  onFileChange(event, fileinput) {
    for (const file of event.target.files) {
      if (!this.attachments.find((element) => {
        return element.name === file.name;
      })) {
        this.attachments.push(file);
      }
    }
    fileinput.value = null;
  }

  onSubmit() {
      console.log("FORM = ", this.mailForm.value);
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
