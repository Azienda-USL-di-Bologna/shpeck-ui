import { NgModule } from "@angular/core";
import { DynamicDialogModule } from "primeng/components/dynamicdialog/dynamicdialog";
import { ButtonModule } from "primeng/button";
import {TreeModule} from "primeng/tree";
import {DataScrollerModule} from "primeng/datascroller";
import { VirtualScrollerModule } from "primeng/virtualscroller";
import { DropdownModule, CalendarModule, TooltipModule } from "primeng/primeng";
import { TableModule } from "primeng/table";
import { AccordionModule } from "primeng/accordion";

@NgModule({
    declarations: [],
    imports: [
        DynamicDialogModule,
        ButtonModule,
        TreeModule,
        DataScrollerModule,
        VirtualScrollerModule,
        AccordionModule,
        TableModule,
        CalendarModule,
        TooltipModule,
        DropdownModule
    ],
    exports: [
        DynamicDialogModule,
        ButtonModule,
        TreeModule,
        DataScrollerModule,
        VirtualScrollerModule,
        AccordionModule,
        TableModule,
        CalendarModule,
        TooltipModule,
        DropdownModule
    ]
})
export class PrimengModule { }
