import { NgModule } from "@angular/core";
import { DynamicDialogModule } from "primeng/components/dynamicdialog/dynamicdialog";
import { ButtonModule } from "primeng/button";


@NgModule({
    declarations: [],
    imports: [
        DynamicDialogModule,
        ButtonModule
    ],
    exports: [
        DynamicDialogModule,
        ButtonModule
    ]
})
export class PrimengModule { }
