import { NTJWTModuleConfig } from "@bds/nt-jwt-login";
import { LOGIN_ROUTE, LOCALHOST_PORT, APPLICATION, MAILBOX_ROUTE } from "../../environments/app-constants";

export const loginModuleConfig: NTJWTModuleConfig = {
    loginURL: "" /*getInternautaUrl(BaseUrlType.Login)*/,
    loginComponentRoute: LOGIN_ROUTE,
    homeComponentRoute: MAILBOX_ROUTE,
    localhostPort: LOCALHOST_PORT,
    applicazione: APPLICATION,
    logoutRedirectRoute: MAILBOX_ROUTE,
    sessionExpireSeconds: 20
};
