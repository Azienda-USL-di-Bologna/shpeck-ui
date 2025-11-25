import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { JwtLoginComponent, LoggedOutPageComponent, NoLoginGuard, RefreshLoggedUserGuard, LoginGuard } from "@bds/jwt-login";
import {
  LOGGED_OUT_ROUTE,
  MAILBOX_ROUTE,
  LOGIN_ROUTE,
  ACCESSIBLE_MAILBOX_ROUTE,
  LANDING_ROUTE,
  MailboxComponent,
  LandingRoutingComponent,
  DoNotShowRubricaPopupOnRefreshGuard,
  ShpeckRoutingModule,
} from "@bds/shpeck";
import {
  RubricaComponent,
  ContactDetailStart,
  ContactEditingComponent,
  GroupEditingComponent,
  ContactReadonlyComponent,
  CanDeactivateContactEditingGuard,
  CanDeactivateGroupEditingGuard,
  GroupModifyContactsComponent,
  ContactImportedCsv,
} from "@bds/rubrint";
import { PageNotFoundComponent } from "@bds/common-components";

export const routes: Routes = [
  { path: LOGIN_ROUTE, component: JwtLoginComponent, canActivate: [NoLoginGuard], data: {} },
  { path: LANDING_ROUTE, component: LandingRoutingComponent, canActivate: [RefreshLoggedUserGuard, LoginGuard], data: {} },
  {
    path: MAILBOX_ROUTE,
    component: MailboxComponent,
    canActivate: [RefreshLoggedUserGuard, LoginGuard],
  },
  {
    path: ACCESSIBLE_MAILBOX_ROUTE,
    loadChildren: () =>
      import("@bds/shpeck").then((m) => m.AccessibilitaMailboxModule),
    canActivate: [RefreshLoggedUserGuard, LoginGuard],
  },
  { path: LOGGED_OUT_ROUTE, component: LoggedOutPageComponent },
  { path: "", redirectTo: LANDING_ROUTE, pathMatch: "full" },
  {
    path: "rubrica",
    component: RubricaComponent,
    canActivate: [DoNotShowRubricaPopupOnRefreshGuard, RefreshLoggedUserGuard, LoginGuard],
    data: {},
    outlet: "rubricaPopup",
    children: [
      { path: "", redirectTo: "list-start", pathMatch: "full" },
      { path: "list-start", component: ContactDetailStart },
      { path: "contact-editing", component: ContactEditingComponent, canDeactivate: [CanDeactivateContactEditingGuard] },
      { path: "group-editing", component: GroupEditingComponent, canDeactivate: [CanDeactivateGroupEditingGuard] },
      { path: "detail", component: ContactReadonlyComponent },
      { path: "import-csv", component: ContactImportedCsv },
      { path: "rubricaPopupGruppi", component: GroupModifyContactsComponent },
    ],
  },
  { path: "pagina-non-trovata", component: PageNotFoundComponent },
  { path: "**", redirectTo: "pagina-non-trovata", pathMatch: "full" },
];