export const LOCALHOST_PORT = "10005";
export const INTIMUS_LOCALHOST_PORT = "1339";
export const LOCALHOST_PDD_PORT = "8080";
export const LOGIN_ROUTE = "/login";
// export const HOME_ROUTE = '/welcome';
export const MAILBOX_ROUTE = "/mailbox";
export const MAX_CHARS_100 = 100;
export const MAX_FILE_SIZE_UPLOAD = 52428800;
export const BABELMAN_URL = "https://babelman-auslbo.avec.emr.it/";
export const APPLICATION = "shpeck";

export const TOOLBAR_ACTIONS = {
    NEW: "new",
    EDIT: "edit",
    REPLY: "reply",
    REPLY_ALL: "reply_all",
    FORWARD: "forward",
    DELETE: "delete",
    MOVE: "move",
    ARCHIVE: "archive"
};

export enum BaseUrlType {
    Shpeck,
    ShpeckCommonParameters,
    Baborg,
    Configurazione,
    ConfigurazioneImpostazioniApplicazioni,
    Login,
    Intimus,
    Rubrica
}

export const BaseUrls: Map<BaseUrlType, string> = new Map<BaseUrlType, string>([
    [BaseUrlType.Shpeck,  "/internauta-api/resources/shpeck"],
    [BaseUrlType.ShpeckCommonParameters,  "/internauta-api/resources/shpeck/getShpeckCommonParameters"],
    [BaseUrlType.Baborg, "/internauta-api/resources/baborg"],
    [BaseUrlType.Configurazione, "/internauta-api/resources/configurazione"],
    [BaseUrlType.ConfigurazioneImpostazioniApplicazioni, "/internauta-api/resources/configurazione/custom/setImpostazioniApplicazioni"],
    [BaseUrlType.Login, "/internauta-api/login"],
    [BaseUrlType.Intimus, ""],
    [BaseUrlType.Rubrica,  "/internauta-api/resources/rubrica"]
]);

export const CUSTOM_SERVER_METHODS = {
    downloadEml: "downloadEml",
    extractEmlData: "extractEmlData",
    downloadEmlAttachment: "downloadEmlAttachment",
    downloadAllEmlAttachment: "downloadAllEmlAttachment",
    saveDraftMessage: "saveDraftMessage",
    sendMessage: "sendMessage",
    readdressMessage: "readdressMessage",
    countMessageInFolder: "countMessageInFolder",
    countMessageInTag: "countMessageInTag",
    searchEmailContact: "searchEmailContact",
    archiveMessage: "archiveMessage"
};

export const EMLSOURCE = {
    DRAFT: "DRAFT",
    OUTBOX: "OUTBOX",
    MESSAGE: "MESSAGE"
};

export function getInternautaUrl(type: BaseUrlType): string {
    if (!BaseUrls.has(type)) {
        throw new Error("Failed to obtain internauta url, type does not exists!");
    }

    let port;
    const wl = window.location;
    if (wl.hostname === "localhost" && type === BaseUrlType.Intimus) {
        return "placeholder";
    }
        // if (type === BaseUrlType.Intimus) {
        //     port = INTIMUS_LOCALHOST_PORT;
        // } else {
        //     port = LOCALHOST_PORT;
        // }
    if (wl.hostname === "localhost") {
        port = LOCALHOST_PORT;
    } else {
        port = wl.port;
    }

    const out: string = wl.protocol + "//" + wl.hostname + ":" + port + BaseUrls.get(type);

    console.log(out);

    return out;
}


