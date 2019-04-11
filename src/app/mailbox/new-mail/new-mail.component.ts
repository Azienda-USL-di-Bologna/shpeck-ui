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
    { "name": "Finland", "code": "FI" },
    { "name": "France", "code": "FR" },
    { "name": "Gabon", "code": "GA" },
    { "name": "Gambia", "code": "GM" },
    { "name": "Georgia", "code": "GE" },
    { "name": "Germany", "code": "DE" },
    { "name": "Ghana", "code": "GH" },
    { "name": "Greece", "code": "GR" },
    { "name": "Hong Kong", "code": "HK" },
    { "name": "Hungary", "code": "HU" },
    { "name": "Iceland", "code": "IS" },
    { "name": "India", "code": "IN" },
    { "name": "Indonesia", "code": "ID" },
    { "name": "Ireland", "code": "IE" },
    { "name": "Isle of Man", "code": "IM" },
    { "name": "Israel", "code": "IL" },
    { "name": "Italy", "code": "IT" },
    { "name": "Jamaica", "code": "JM" },
    { "name": "Japan", "code": "JP" },
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
          if (country.name.toLowerCase().indexOf(query.toLowerCase()) == 0) {
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
          this.addresses.push({ id: "", name: tokenInput.value });
        } else {
          this.ccAddresses.push({ id: "", name: tokenInput.value });
        }
        tokenInput.value = "";
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
