import { MenuItem } from "primeng-lts/api/menuitem";

export const COMMON_MENU_ITEMS: MenuItem[] = [
    {
      label: "NOT_SET",
      id: "MessageSeen",
      disabled: false,
      queryParams: {}
    },
    {
      label: "Rispondi",
      id: "MessageReply",
      disabled: true,
      queryParams: {}
    },
    {
      label: "Rispondi a tutti",
      id: "MessageReplyAll",
      disabled: true,
      queryParams: {}
    },
    {
      label: "Inoltra",
      id: "MessageForward",
      disabled: true,
      queryParams: {}
    },
    {
      label: "Protocolla",
      id: "MessageRegistration",
      disabled: true,
      queryParams: {}
    },
    {
      label: "Sposta",
      id: "MessageMove",
      disabled: true,
      queryParams: {}
    },
    {
      label: "Etichette",
      id: "MessageLabels",
      disabled: true,
      items: [] as MenuItem[],
      queryParams: {}
    },
    {
      label: "Elimina",
      id: "MessageDelete",
      disabled: true,
      queryParams: {}
    },
    {
      label: "Segna come errore visto",
      id: "ToggleErrorFalse",
      disabled: true,
      queryParams: {}
    },
    {
      label: "Segna come errore non visto",
      id: "ToggleErrorTrue",
      disabled: true,
      queryParams: {}
    },
    {
      label: "Nota",
      id: "MessageNote",
      disabled: false,
      queryParams: {}
    },
    {
      label: "Scarica",
      id: "MessageDownload",
      disabled: true,
      queryParams: {}
    },
    {
      label: "Fascicola",
      id: "MessageArchive",
      disabled: true,
      queryParams: {}
    },
    {
      label: "Reindirizza",
      id: "MessageReaddress",
      disabled: true,
      queryParams: {}
    },
    {
      label: "Ripristina",
      id: "MessageUndelete",
      disabled: true,
      queryParams: {}
    }
  ];