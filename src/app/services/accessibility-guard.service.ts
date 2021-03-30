import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { NtJwtLoginService, UtenteUtilities } from '@bds/nt-jwt-login';
import { MAILBOX_ROUTE, ACCESSIBLE_MAILBOX_ROUTE } from 'src/environments/app-constants';
import { Observable } from 'rxjs';

@Injectable()
export class AccessibilityGuardService implements CanActivate{
    constructor(private loginService: NtJwtLoginService, public router: Router){}

    canActivate(route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot): boolean  { 
        let accessibilita = false;
        this.loginService.loggedUser$.subscribe((utente: UtenteUtilities) => {
            accessibilita = utente.getUtente().idPersona.accessibilita;
            if(accessibilita){
                this.router.navigate([ACCESSIBLE_MAILBOX_ROUTE])
            }
          })
        return true;
        
    }
    
}