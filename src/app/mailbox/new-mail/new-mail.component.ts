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

  countiess = [
    { "address": "g.russo@nsi.it", "code": "FI" },
    { "address": "opsouperen@cryptontrade.ga", "code": "FR" },
    { "address": "heckerman@att.net", "code": "GA" },
    { "address": "jespley@sbcglobal.net", "code": "GM" },
    { "address": "kannan@msn.com", "code": "GE" },
    { "address": "boftx@outlook.com", "code": "DE" },
    { "address": "sacraver@optonline.net", "code": "GH" },
    { "address": "north@yahoo.ca", "code": "GR" },
    { "address": "dhwon@yahoo.ca", "code": "HK" },
    { "address": "jamuir@att.net", "code": "HU" },
    { "address": "kobayasi@msn.com", "code": "IS" },
    { "address": "syrinx@optonline.net", "code": "IN" },
    { "address": "bcevc@live.com", "code": "ID" },
    { "address": "syrinx@outlook.com", "code": "IE" },
    { "address": "lpalmer@aol.com", "code": "IM" },
    { "address": "crimsane@aol.com", "code": "IL" },
    { "address": "geoffr@sbcglobal.net", "code": "IT" },
    { "address": "dcoppit@live.com", "code": "JM" },
    { "address": "schumer@outlook.com", "code": "JP" },
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
    this.filteredCountriesSingle = this.filterCountry(query, this.countiess);
  }

  filterCountryMultiple(event) {
      let query = event.query;
      this.filteredCountriesMultiple = this.filterCountry(query, this.countiess);
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

  onKeyUp(event: KeyboardEvent, formField: string) {
    if (event.key === "Enter") {
      const tokenInput = event.target as any;
      if (tokenInput.value) {
        if (formField && formField === "addresses") {
          this.addresses.push({ id: "", address: tokenInput.value });
          tokenInput.value = "";
        } else {
          this.ccAddresses.push({ id: "", address: tokenInput.value });
        }
      }
    }
  }

  onFileChange(event, fileinput) {
    console.log("allegati = ", event);
    for (const file of event.target.files) {
      if (this.attachments.find((element) => {
        return element.name === file.name;
      })) {
        continue;
      } else {
        this.attachments.push(file);
      }
    }
    fileinput.value = null;
    console.log("allegati = ", this.attachments);
  }

  onRemove(event) {
    console.log("REMOVE = ", event);
    console.log("allegati = ", this.attachments);
    this.attachments.splice(this.attachments.indexOf(event.value), 1);
    this.mailForm.patchValue({
      attachments: this.attachments
    });
    console.log("allegati = ", this.attachments);
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
