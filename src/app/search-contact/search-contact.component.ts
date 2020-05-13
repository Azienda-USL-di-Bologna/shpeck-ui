import { Component, OnInit, ViewChild, ElementRef, Output, EventEmitter } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { RubricaService } from "../services/rubrica.service";
import { FormGroup, Validators, FormControl } from "@angular/forms";
import { AutoComplete, MessageService } from "primeng-lts/primeng";

@Component({
  selector: "app-search-contact",
  templateUrl: "./search-contact.component.html",
  styleUrls: ["./search-contact.component.scss"]
})
export class SearchContactComponent implements OnInit {
  public filteredContacts: any[];
  public contactForm: FormGroup;
  // public contact: any;

  @ViewChild("search", null) searchField: AutoComplete;

  @Output() addressChosedByBook = new EventEmitter<any>();
  @Output() closeRubricaPopup = new EventEmitter<any>();

  constructor(protected http: HttpClient, protected rubricaService: RubricaService, protected messageService: MessageService) { }

  ngOnInit() {
    this.contactForm = new FormGroup({
      contatto: new FormControl("", [Validators.required])
    });

    setTimeout(() => {
      this.searchField.focusInput();
    }, 0);

    /* Alla selezione di un contatto con Enter, questo metodo non scatta in automatico come avviene con il click
     * ma avviene con il focus out. Quando il metodo scatta, fa un controllo di validazione per via della proprietà
     * forceSelection. Il controllo consiste nel verificate che la voce nell'inputField è presente nell'array dei
     * suggestions. L'array dei suggestions in questo scenario è null o undefined. Per risolvere questo problema
     * l'unica soluzione che ho trovato è bindare il metodo al componente così che l'array venisse visto correttamente.
     */
    this.searchField.onInputChange = this.searchField.onInputChange.bind(this);
  }

  /* Brutto quanto vuoi. Ma funziona. Se trovi altro modo dimmelo grassie(gus) */
  public onBlur() {
    this.searchField.focusInput();
  }

  public getField() {
    return "emails[0]['email']";
  }

  public filterContacts(event) {
    console.log("event", event);
    if (event.query.length > 2) {
      this.rubricaService.searchEmailContact(event.query).subscribe(
        (data: any) => {
          console.log("data", data);
          this.filteredContacts = this.trasformValuesAfterSearch(data);
        },
        (err) => {
          console.log("orrore");
          this.messageService.add({severity: "error", summary: "Errore", detail: "Qualcosa è andato storto.\nContattattare Babelcare"});
        }
      );
    }
  }

  private trasformValuesAfterSearch(values: any[]): any[] {
    values.forEach(contact => {
      contact["descrizioneCustom"] = contact.contatto.cognomeRagione + " (" + contact.emails[0].email + ")";
    });
    return values;
  }

  public onSubmit() {
    if (this.contactForm.controls.contatto.value !== null) {
      this.addressChosedByBook.emit(this.contactForm.controls.contatto.value);
    }
  }

  public onClose() {
    this.closeRubricaPopup.emit({});
  }
}
