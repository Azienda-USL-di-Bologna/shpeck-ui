import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { NtJwtLoginComponent, NoLoginGuard, RefreshLoggedUserGuard, LoginGuard } from "@bds/nt-jwt-login";
import { MailboxComponent } from "./mailbox/mailbox.component";

const routes: Routes = [
  {path: "", redirectTo: "mailbox", pathMatch: "full"},
  {path: "login", component: NtJwtLoginComponent, canActivate: [NoLoginGuard], data: {}},
  {path: "mailbox", component: MailboxComponent, canActivate: [RefreshLoggedUserGuard, LoginGuard]}
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: false })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
