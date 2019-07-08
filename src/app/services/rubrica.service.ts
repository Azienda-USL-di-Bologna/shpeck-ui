import { Injectable } from "@angular/core";
import { CUSTOM_SERVER_METHODS, BaseUrlType, getInternautaUrl } from "src/environments/app-constants";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root"
})
export class RubricaService {

  constructor(protected http: HttpClient) { }

  public searchEmailContact(toSearch: string): Observable<any> {
    const url = getInternautaUrl(BaseUrlType.Rubrica) + "/" + CUSTOM_SERVER_METHODS.searchEmailContact + "?toSearch=" + toSearch;
    return this.http.get(url) as Observable<any>;
  }
}
