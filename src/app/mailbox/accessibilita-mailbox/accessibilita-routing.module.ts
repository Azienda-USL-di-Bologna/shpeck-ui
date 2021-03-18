import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { AccessibilitaMailboxComponent } from "./accessibilita-mailbox.component";
import { AccessibilitaMailListComponent } from "../accessibilita-mail-list/accessibilita-mail-list.component";
import { MailDetailComponent } from "../mail-detail/mail-detail.component";

const routes: Routes = [
  {
    path: "",
    component: AccessibilitaMailboxComponent,
    children: [
      {
        path: "mail-list",
        component: AccessibilitaMailListComponent
      },
      {
        path: "mail-detail",
        component: MailDetailComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AccessibilitaRoutingModule { }
