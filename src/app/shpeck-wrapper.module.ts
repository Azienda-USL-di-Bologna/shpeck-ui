import { NgModule } from "@angular/core";
import { ShpeckModule, ShpeckRoutingModule } from "@bds/shpeck";

/**
 * Lazy wrapper that exposes the Shpeck library module + routing.
 * All routing logic lives inside the library.
 */
@NgModule({
  imports: [ShpeckModule, ShpeckRoutingModule],
  exports: [ShpeckModule, ShpeckRoutingModule],
})
export class ShpeckWrapperModule {}

