import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ToolbarComponent } from "./toolbar.component";
import { PrimengModule } from "src/app/primeng.module";
import { ToolBarService } from "./toolbar.service";
import { CommonComponentsModule } from "@bds/common-components";
import { FormsModule } from "@angular/forms";

@NgModule({
  declarations: [ToolbarComponent],
  imports: [CommonModule, FormsModule, PrimengModule, CommonComponentsModule],
  providers: [ToolBarService],
  exports: [ToolbarComponent],
})
export class ShpeckToolbarModule {}
