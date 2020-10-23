import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { NtJwtLoginComponent, LoggedOutPageComponent, NoLoginGuard, RefreshLoggedUserGuard, LoginGuard } from "@bds/nt-jwt-login";
import { MailboxComponent } from "./mailbox/mailbox.component";
import { LOGGED_OUT_ROUTE, MAILBOX_ROUTE, LOGIN_ROUTE } from "src/environments/app-constants";
import { RubricaComponent, ContactDetailStart, ContactEditingComponent, GroupEditingComponent, ContactReadonlyComponent, PageNotFoundComponent } from "@bds/common-components";
import { DoNotShowRubricaPopupOnRefreshGuard} from "./rubrica/do-not-show-rubrica-popup-on-refresh.guard";

const routes: Routes = [
  { path: LOGIN_ROUTE, component: NtJwtLoginComponent, canActivate: [NoLoginGuard], data: {} },
  {
    path: MAILBOX_ROUTE,
    component: MailboxComponent,
    canActivate: [RefreshLoggedUserGuard, LoginGuard]
  },
  { path: LOGGED_OUT_ROUTE, component: LoggedOutPageComponent },
  {path: "", redirectTo: "mailbox", pathMatch: "full"},
  {
    path: "rubrica",
    component: RubricaComponent,
    canActivate: [DoNotShowRubricaPopupOnRefreshGuard , RefreshLoggedUserGuard, LoginGuard],
    data: {},
    outlet: "rubricaPopup",
    children: [
      { path: "", redirectTo: "list-start", pathMatch: "full" },
      { path: "list-start", component: ContactDetailStart },
      { path: "contact-editing", component: ContactEditingComponent },
      { path: "group-editing", component: GroupEditingComponent },
      { path: "detail", component: ContactReadonlyComponent }
      ]
  },
  {path: "**", component: PageNotFoundComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: false, enableTracing: false })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
