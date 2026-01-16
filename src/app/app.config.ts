import { ApplicationConfig, provideZoneChangeDetection } from "@angular/core";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { providePrimeNG } from "primeng/config";
import { definePreset } from "@primeuix/themes";
import Aura from "@primeuix/themes/aura";
import Lara from "@primeuix/themes/lara";
import Nora from "@primeuix/themes/nora";
import Material from "@primeuix/themes/material";
import { BabelBlueDefault } from "@bds/bds-theme";

const BabelPreset2 = definePreset(Nora, BabelBlueDefault);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    //provideRouter(routes),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: BabelPreset2,
        options: {
          //darkModeSelector: false || "none",
          darkModeSelector: ".p-dark",
        },
      },
    }),
  ],
};
