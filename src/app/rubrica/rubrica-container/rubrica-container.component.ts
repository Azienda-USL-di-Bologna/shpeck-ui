import { Component, OnInit, Output, EventEmitter, ViewChild } from "@angular/core";
import { Router, ActivatedRoute, RouterOutlet, ActivationStart } from "@angular/router";

@Component({
  selector: "app-rubrica-container",
  templateUrl: "./rubrica-container.component.html",
  styleUrls: ["./rubrica-container.component.scss"]
})
export class RubricaContainerComponent implements OnInit {

  @Output() closeRubricaPopup = new EventEmitter<any>();
  @ViewChild(RouterOutlet, {static: false}) outlet: RouterOutlet;

  constructor(private router: Router, private route: ActivatedRoute) { }

  ngOnInit() {
    this.router.events.subscribe(e => {
      if (e instanceof ActivationStart && e.snapshot.outlet === "rubricaPopup") this.outlet.deactivate();
    });

    // console.log("RubricaContainerComponent route url: ", this.route.url);
  }

  public onClose() {
    console.log("close popup");
    this.closeRubricaPopup.emit({});
  }

}
