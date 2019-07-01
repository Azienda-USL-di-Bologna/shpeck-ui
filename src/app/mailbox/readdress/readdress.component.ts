import { Component, OnInit, OnDestroy } from "@angular/core";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { ShpeckMessageService } from "src/app/services/shpeck-message.service";
import { DynamicDialogRef, DynamicDialogConfig, DialogService } from "primeng/api";
import { Subscription } from "rxjs";
import { PecService } from "src/app/services/pec.service";
import { Pec, ENTITIES_STRUCTURE, Tag, Message, MessageTag } from "@bds/ng-internauta-model";
import { FiltersAndSorts, SortDefinition, SORT_MODES, FilterDefinition, FILTER_TYPES, PagingConf } from "@nfa/next-sdr";
import { NtJwtLoginService, UtenteUtilities } from "@bds/nt-jwt-login";
import { HttpClient } from "@angular/common/http";
import { CUSTOM_SERVER_METHODS, BaseUrlType, getInternautaUrl } from "src/environments/app-constants";


@Component({
  selector: "app-readdress",
  templateUrl: "./readdress.component.html",
  styleUrls: ["./readdress.component.scss"]
})
export class ReaddressComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];
  public myPecs: Pec[];
  public userPecs: any[];
  public filteredPecs: any[];
  public readdressForm: FormGroup;
  private utenteConnesso: UtenteUtilities;

  private pageConfNoLimit: PagingConf = {
    conf: {
      page: 0,
      size: 999999
    },
    mode: "PAGE"
  };

  constructor(
    protected http: HttpClient,
    private loginService: NtJwtLoginService,
    private messageService: ShpeckMessageService,
    private pecService: PecService,
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig,
    public dialogService: DialogService
  ) {}

  ngOnInit() {
    this.loginService.loggedUser$.subscribe((utente: UtenteUtilities) => {
      if (utente) {
        this.utenteConnesso = utente;
      }
    });
    this.readdressForm = new FormGroup({
      to: new FormControl("", [Validators.required])
    });
    this.subscriptions.push(
      this.pecService.myPecs.subscribe((pecs: Pec[]) => {
        const idAziendeList = pecs
          .filter(pec => pec.id === this.config.data.message.fk_idPec.id)
          .map(pec =>
            pec.pecAziendaList.map(pecAzienda => pecAzienda.fk_idAzienda.id)
          )[0];
        // console.log("Our data , PEC : ", pecs);
        // console.log("Aziende List; ", idAziendeList);
        this.pecService
          .getData(
            ENTITIES_STRUCTURE.baborg.pec.standardProjections
              .PecWithPlainFields,
            this.buildFolderInitialFilterAndSort(idAziendeList),
            null,
            this.pageConfNoLimit
          )
          .subscribe(data => {
            this.myPecs = data.results.filter(
              pec => pec.id !== this.config.data.message.fk_idPec.id
            );
            this.userPecs = this.myPecs.map(pec => pec.indirizzo);
            // console.log("User can readress to: ", this.userPecs);
          });
      })
    );
    console.log("Look for config: ", this.config);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  private buildFolderInitialFilterAndSort(
    idAziendeList: number[]
  ): FiltersAndSorts {
    const filter = new FiltersAndSorts();
    idAziendeList.forEach(idAzienda => {
      filter.addFilter(
        new FilterDefinition(
          "pecAziendaList.idAzienda.id",
          FILTER_TYPES.not_string.equals,
          idAzienda
        )
      );
    });
    filter.addFilter(
      new FilterDefinition("attiva", FILTER_TYPES.not_string.equals, true)
    );
    filter.addSort(new SortDefinition("indirizzo", SORT_MODES.asc));
    return filter;
  }

  public readdressMessage(form: FormData) {
    const apiUrl =
      getInternautaUrl(BaseUrlType.Shpeck) +
      "/" +
      CUSTOM_SERVER_METHODS.readdressMessage;
    console.warn("Endpoint: ", apiUrl);
    const message = this.config.data.message as Message;
    this.http.post(apiUrl, form).subscribe(
      res => {
        // console.log("res", res);
        message["iconsVisibility"]["readdressed_out"] = true;
        const newTag = new Tag();
        newTag.idPec = message.idPec;
        newTag.description = "Reindirizzato";
        newTag.name = "readdressed_out";
        newTag.type = "SYSTEM_NOT_INSERTABLE_NOT_DELETABLE";
        const newMessageTag = new MessageTag();
        newMessageTag.idMessage = message;
        newMessageTag.idTag = newTag;
        newMessageTag.additionalData = JSON.stringify(res);
        newMessageTag.inserted = new Date();
        if (!message.messageTagList) {
          message.messageTagList = [];
        }
        message.messageTagList.push(newMessageTag);
      },
      err => {
        console.log(err);
      }
    );
  }

  filterPecs(event) {
    // in a real application, make a request to a remote url with the query and return filtered results, for demo we filter at client side
    this.filteredPecs = [];
    for (let i = 0; i < this.myPecs.length; i++) {
      const pec = this.myPecs[i];
      if (pec.indirizzo.toLowerCase().indexOf(event.query.toLowerCase()) === 0) {
        this.filteredPecs.push(pec);
      }
    }
  }

  onClose() {
    // console.warn("Anulla button was clicked");
    // this.dialogService.dialogComponentRef.instance.close();
    this.ref.close();
  }

  onSubmit() {
    const idPec = this.readdressForm.value.to.id;
    const idMessage = this.config.data.message.id;
    const formToSend = new FormData();
    formToSend.append("idMessageSource", idMessage);
    formToSend.append("idPecDestination", idPec);
    // console.warn("form data, idMessage: ", idMessage, " idPec ", idPec);
    this.readdressMessage(formToSend);
    this.ref.close();
  }
}
