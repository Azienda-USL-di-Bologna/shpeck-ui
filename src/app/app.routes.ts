import { Routes } from "@angular/router";
import { JwtLoginComponent, LoggedOutPageComponent, LoginGuard, NoLoginGuard, RefreshLoggedUserGuard } from "@bds/jwt-login";
import { LOGIN_ROUTE, LOGGED_OUT_ROUTE, LANDING_ROUTE } from "@bds/shpeck";
import { PageNotFoundComponent } from "@bds/common-components";

export const routes: Routes = [
  { path: LOGIN_ROUTE, component: JwtLoginComponent, canActivate: [NoLoginGuard], data: {} },
  { path: LOGGED_OUT_ROUTE, component: LoggedOutPageComponent, canActivate: [NoLoginGuard], },
  {
    path: "",
    loadChildren: () => import("./shpeck-wrapper.module").then((m) => m.ShpeckWrapperModule),
    canActivate: [RefreshLoggedUserGuard, LoginGuard],
  },
  // Le route di shpeck sono gestite da ShpeckRoutingModule importato in app.module.ts
  { path: "pagina-non-trovata", component: PageNotFoundComponent },
  { path: "**", redirectTo: "pagina-non-trovata", pathMatch: "full" },
];