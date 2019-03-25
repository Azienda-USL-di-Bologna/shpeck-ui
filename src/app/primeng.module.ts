import { NgModule } from "@angular/core";
import { DynamicDialogModule } from "primeng/components/dynamicdialog/dynamicdialog";
import { ButtonModule } from "primeng/button";
import {TreeModule} from "primeng/tree";
import {DataScrollerModule} from "primeng/datascroller";
import { VirtualScrollerModule } from "primeng/virtualscroller";
import { DropdownModule } from "primeng/primeng";

@NgModule({
    declarations: [],
    imports: [
        DynamicDialogModule,
        ButtonModule,
        TreeModule,
        DataScrollerModule,
        VirtualScrollerModule,
        DropdownModule
    ],
    exports: [
        DynamicDialogModule,
        ButtonModule,
        TreeModule,
        DataScrollerModule,
        VirtualScrollerModule,
        DropdownModule
    ]
})
export class PrimengModule { }
