import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { CustomReuseStrategy } from 'src/app/custom-reuse-strategy';
import { ShpeckMessageService } from 'src/app/services/shpeck-message.service';

@Component({
  selector: 'app-accessibilita-mail-detail',
  templateUrl: './accessibilita-mail-detail.component.html',
  styleUrls: ['./accessibilita-mail-detail.component.scss']
})
export class AccessibilitaMailDetailComponent implements OnInit {

  constructor(private router: Router,
    private location: Location,
    private activatedRoute: ActivatedRoute,
    private messageService: ShpeckMessageService) { }

  ngOnInit(): void {
    
  }

  tornaIndietro(){
    CustomReuseStrategy.componentsReuseList.push("*");
    this.router.navigate(['../mail-list'], { relativeTo: this.activatedRoute })
  }

}
