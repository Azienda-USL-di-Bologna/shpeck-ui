import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ToolbarComponent } from "./toolbar.component";
import { PrimengModule } from "src/app/primeng.module";
import { ToolBarService } from "./toolbar.service";



@NgModule({
  declarations: [ToolbarComponent],
  imports: [
    CommonModule, PrimengModule
  ],
  providers: [ToolBarService],
  exports: [ToolbarComponent]
})
export class ShpeckToolbarModule { }
