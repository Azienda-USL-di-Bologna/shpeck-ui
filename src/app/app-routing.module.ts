import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { NtJwtLoginComponent, LoggedOutPageComponent, NoLoginGuard, RefreshLoggedUserGuard, LoginGuard } from "@bds/nt-jwt-login";
import { MailboxComponent } from "./mailbox/mailbox.component";
import { LOGGED_OUT_ROUTE, MAILBOX_ROUTE, LOGIN_ROUTE } from "src/environments/app-constants";
import { RubricaComponent, ContactDetailStart, ContactEditingComponent, GroupEditingComponent, ContactReadonlyComponent, PageNotFoundComponent, CanDeactivateContactEditingGuard, CanDeactivateGroupEditingGuard } from "@bds/common-components";
import { DoNotShowRubricaPopupOnRefreshGuard} from "./rubrica/do-not-show-rubrica-popup-on-refresh.guard";

const routes: Routes = [
  { path: LOGIN_ROUTE, component: NtJwtLoginComponent, canActivate: [NoLoginGuard], data: {} },
  {
    path: MAILBOX_ROUTE,
    component: MailboxComponent,
    canActivate: [RefreshLoggedUserGuard, LoginGuard]
  },
  { path: LOGGED_OUT_ROUTE, component: LoggedOutPageComponent },
  {path: "", redirectTo:  MAILBOX_ROUTE, pathMatch: "full"},
  {
    path: "rubrica",
    component: RubricaComponent,
    canActivate: [DoNotShowRubricaPopupOnRefreshGuard , RefreshLoggedUserGuard, LoginGuard],
    data: {},
    outlet: "rubricaPopup",
    children: [
      { path: "", redirectTo: "list-start", pathMatch: "full" },
      { path: "list-start", component: ContactDetailStart },
      { path: "contact-editing", component: ContactEditingComponent , canDeactivate: [CanDeactivateContactEditingGuard]},
      { path: "group-editing", component: GroupEditingComponent, canDeactivate: [CanDeactivateGroupEditingGuard] },
      { path: "detail", component: ContactReadonlyComponent }
      ]
  },
  {path: "pagina-non-trovata", component: PageNotFoundComponent },
  {path: "**", redirectTo: "pagina-non-trovata", pathMatch: "full" },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: false, enableTracing: false })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
