import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { CustomReuseStrategy } from 'src/app/custom-reuse-strategy';
import { MailDetailComponent } from '../../mail-detail/mail-detail.component';

@Component({
  selector: 'app-accessibilita-mail-detail',
  templateUrl: './accessibilita-mail-detail.component.html',
  styleUrls: ['./accessibilita-mail-detail.component.scss']
})
export class AccessibilitaMailDetailComponent extends MailDetailComponent {

  ngOnInit(): void {
  }

  tornaIndietro(){
    CustomReuseStrategy.componentsReuseList.push("*");
    this.router.navigate(['../mail-list'], { relativeTo: this.activatedRoute })
  }

}
