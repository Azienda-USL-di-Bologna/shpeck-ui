import { Component, OnInit } from '@angular/core';
import { NtJwtLoginService, UtenteUtilities } from '@bds/nt-jwt-login';
import { Router } from '@angular/router';
import { ACCESSIBLE_MAILBOX_ROUTE, MAILBOX_ROUTE } from 'src/environments/app-constants';

@Component({
  selector: 'app-landing-routing',
  templateUrl: './landing-routing.component.html',
  styleUrls: ['./landing-routing.component.scss']
})
export class LandingRoutingComponent implements OnInit {

  constructor(private loginService: NtJwtLoginService, private router: Router) { }

  ngOnInit(): void {
    this.loginService.loggedUser$.subscribe(
      (loggedUser: UtenteUtilities) => {
        if (loggedUser && this.isUserEnabledForAccessibility(loggedUser)) {
          this.router.navigate([ACCESSIBLE_MAILBOX_ROUTE])
        }
        else
          this.router.navigate([MAILBOX_ROUTE])
      },
      (err) => {
        this.router.navigate([MAILBOX_ROUTE])
      }
    );
  }

  private isUserEnabledForAccessibility(user: UtenteUtilities): boolean{
    return user.getUtente() && user.getUtente().idPersona && user.getUtente().idPersona.accessibilita
  }

}
