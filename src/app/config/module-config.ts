import { NTJWTModuleConfig, LogoutType } from "@bds/nt-jwt-login";
import { LOGIN_ROUTE, LOCALHOST_PORT, APPLICATION, MAILBOX_ROUTE, LOGGED_OUT_ROUTE } from "../../environments/app-constants";

export const loginModuleConfig: NTJWTModuleConfig = {
    loginURL: "" /*getInternautaUrl(BaseUrlType.Login)*/,
    passTokenGeneratorURL: "",
    loginComponentRoute: "/" + LOGIN_ROUTE,
    homeComponentRoute: "/" + MAILBOX_ROUTE,
    localhostPort: LOCALHOST_PORT,
    applicazione: APPLICATION,
    logoutRedirectRoute: "/" + MAILBOX_ROUTE,
    loggedOutComponentRoute: "/" + LOGGED_OUT_ROUTE,
    // sessionExpireSeconds: 1800, // 0 = distattivato
    pingInterval: 10, //  0 disattivato, 900 parametro deciso per prod
    // logout type SSO sync oppure local
    logoutType: LogoutType.SSO_SYNC
};
