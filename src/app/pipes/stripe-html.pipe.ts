import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "stripeHtml"
})
export class StripeHtmlPipe implements PipeTransform {

  transform(value: any, args?: any): any {
    if (value) {
      value = value.replace(/(<([^>]+)>)/ig, "");
    }

    return value;
  }

}
