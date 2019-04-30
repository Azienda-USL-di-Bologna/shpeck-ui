import { NgModule } from "@angular/core";
import { DynamicDialogModule } from "primeng/components/dynamicdialog/dynamicdialog";
import { ButtonModule } from "primeng/button";
import { TreeModule } from "primeng/tree";
import { DataScrollerModule } from "primeng/datascroller";
import { VirtualScrollerModule } from "primeng/virtualscroller";
import { DropdownModule, CalendarModule, TooltipModule } from "primeng/primeng";
import { TableModule } from "primeng/table";
import { AccordionModule } from "primeng/accordion";
import { ToolbarModule } from "primeng/toolbar";
import { SplitButtonModule } from "primeng/splitbutton";
import { DialogModule } from "primeng/dialog";
import { InputSwitchModule } from "primeng/inputswitch";
import { AutoCompleteModule } from "primeng/autocomplete";
import { CheckboxModule } from "primeng/checkbox";
import { InputTextModule } from "primeng/inputtext";
import { EditorModule } from "primeng/editor";
import { FileUploadModule } from "primeng/fileupload";
import { ChipsModule } from "primeng/chips";
import { LightboxModule } from "primeng/lightbox";
import { ContextMenuModule } from "primeng/contextmenu";
import { ToastModule } from "primeng/toast";


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
        DropdownModule,
        ToolbarModule,
        SplitButtonModule,
        DialogModule,
        InputSwitchModule,
        AutoCompleteModule,
        CheckboxModule,
        InputTextModule,
        EditorModule,
        FileUploadModule,
        ChipsModule,
        LightboxModule,
        ContextMenuModule,
        ToastModule
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
        DropdownModule,
        ToolbarModule,
        SplitButtonModule,
        DialogModule,
        InputSwitchModule,
        AutoCompleteModule,
        CheckboxModule,
        InputTextModule,
        EditorModule,
        FileUploadModule,
        ChipsModule,
        LightboxModule,
        ContextMenuModule,
        ToastModule
    ]
})
export class PrimengModule { }
