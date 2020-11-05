import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, CanActivate, Router, PRIMARY_OUTLET } from "@angular/router";

@Injectable({
  providedIn: "root"
})
export class DoNotShowRubricaPopupOnRefreshGuard implements CanActivate  {
  private router: Router;

  constructor(router: Router) {
    this.router = router;
  }

  // determine if the requested route can be activated (navigated to)
  public canActivate(
    activatedRouteSnapshot: ActivatedRouteSnapshot,
    routerStateSnapshot: RouterStateSnapshot): boolean {
    // we don't want to render this view on page-refresh
    if (this.isPageRefresh()) {
      console.warn("RubricaPopup not allowd on refresh");
      // console.log("activatedRouteSnapshot", activatedRouteSnapshot);
      // console.log("routerStateSnapshot", routerStateSnapshot);
      this.router.navigateByUrl(this.getUrlWithoutRubricaPopup(routerStateSnapshot));
      return (false);
    }
    return (true);
  }

  /**
   * return the requested URL without the auxilary route(rubricaPopup)
   * @param routerStateSnapshot
   */
  private getUrlWithoutRubricaPopup(routerStateSnapshot: RouterStateSnapshot): UrlTree {
    const urlTree = this.router.parseUrl(routerStateSnapshot.url);
    // console.log("url :", routerStateSnapshot.toString());
    let segment = urlTree.root;
    urlTree.queryParams = {};
    while (!!segment && segment.numberOfChildren > 0) {
      delete (segment.children.rubricaPopup);
      segment = segment.children[PRIMARY_OUTLET];
    }

    return (urlTree);
  }

  /**
   * I determine if the current route-request is part of page refresh
   */
  private isPageRefresh(): boolean {
    // if the router has yet to establish a single navigation, it means that this navigation is the first attempt to reconcile the application state with the URL state. Page refresh.
    return (!this.router.navigated);
  }

}
