import { Component, OnInit } from "@angular/core";

@Component({
  selector: "app-new-mail",
  templateUrl: "./new-mail.component.html",
  styleUrls: ["./new-mail.component.scss"]
})
export class NewMailComponent implements OnInit {
  country: any;

  countries: any[];

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
  eml = {
    attachments: [
      { "name": "Wallis and Futuna", "code": "WF" },
      { "name": "Western Sahara", "code": "EH" },
      { "name": "Yemen", "code": "YE" },
      { "name": "Zambia", "code": "ZM" },
      { "name": "Zimbabwe", "code": "ZW" }
    ]
  };
  text1: string = "";

  constructor() { }

  ngOnInit() {
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
    //in a real application, make a request to a remote url with the query and return filtered results, for demo we filter at client side
    let filtered : any[] = [];
    for (let i = 0; i < countries.length; i++) {
        let country = countries[i];
        if (country.name.toLowerCase().indexOf(query.toLowerCase()) == 0) {
            filtered.push(country);
        }
    }
    return filtered;
}
}
