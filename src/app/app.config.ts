import { ApplicationConfig, provideZoneChangeDetection } from "@angular/core";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { providePrimeNG } from "primeng/config";
import { definePreset } from "@primeng/themes";
import Aura from "@primeng/themes/aura";
import Lara from "@primeng/themes/lara";
import Nora from "@primeng/themes/nora";
import Material from "@primeng/themes/material";
import { BabelBlueDefault } from "@bds/common-components";

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
          darkModeSelector: ".my-app-dark",
        },
      },
    }),
  ],
};
