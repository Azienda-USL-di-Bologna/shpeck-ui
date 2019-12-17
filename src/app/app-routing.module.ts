import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { NtJwtLoginComponent, LoggedOutPageComponent, NoLoginGuard, RefreshLoggedUserGuard, LoginGuard } from "@bds/nt-jwt-login";
import { MailboxComponent } from "./mailbox/mailbox.component";
import { LOGGED_OUT_ROUTE, MAILBOX_ROUTE, LOGIN_ROUTE } from "src/environments/app-constants";

const routes: Routes = [
  {path: "", redirectTo: "mailbox", pathMatch: "full"},
  {path: LOGIN_ROUTE, component: NtJwtLoginComponent, canActivate: [NoLoginGuard], data: {}},
  {path: MAILBOX_ROUTE, component: MailboxComponent, canActivate: [RefreshLoggedUserGuard, LoginGuard]},
  {path: LOGGED_OUT_ROUTE, component: LoggedOutPageComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: false })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
