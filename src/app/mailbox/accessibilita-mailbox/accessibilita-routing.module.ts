import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { AccessibilitaMailboxComponent } from "./accessibilita-mailbox.component";
import { AccessibilitaMailListComponent } from "../accessibilita-mail-list/accessibilita-mail-list.component";

const routes: Routes = [
  {
    path: "",
    component: AccessibilitaMailboxComponent
  },
  {
    path: "mail-list",
    component: AccessibilitaMailListComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AccessibilitaRoutingModule { }
