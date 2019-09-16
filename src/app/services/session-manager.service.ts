// import {DEFAULT_INTERRUPTSOURCES, Idle} from "@ng-idle/core";
// import {Keepalive} from "@ng-idle/keepalive";
// import {Router} from "@angular/router";
// import {Injectable} from "@angular/core";

// @Injectable({
//   providedIn: "root"
// })
// export class SessionManager {
//     public idleState = "Not started.";
//     public timedOut = false;
//     public lastPing?: Date = null;
//     constructor(private idle: Idle, private keepalive: Keepalive, private router: Router) {
//     }

//     public setExpireTokenOnIdle(idleSeconds: number) {
//         // sets an idle timeout of 5 seconds, for testing purposes.
//         this.idle.setIdle(idleSeconds);
//         // sets a timeout period of 5 seconds. after 10 seconds of inactivity, the user will be considered timed out.
//         this.idle.setTimeout(5);
//         // sets the default interrupts, in this case, things like clicks, scrolls, touches to the document
//         this.idle.setInterrupts(DEFAULT_INTERRUPTSOURCES);

//         // idle.onIdleEnd.subscribe(() => this.idleState = 'No longer idle.');
//         this.idle.onIdleEnd.subscribe(() => console.log("No longer idle."));
//         this.idle.onTimeout.subscribe(() => {
//             sessionStorage.removeItem("token");
//             sessionStorage.removeItem("userinfo");
//             console.log("token expired!");
//             this.idleState = "Timed out!";
//             this.timedOut = true;

//             if (sessionStorage.getItem("loginMethod") !== "sso") {
//                 this.router.navigate(["/login"]);
//             } else {
//             }

//         });
//         // idle.onIdleStart.subscribe(() => this.idleState = 'You\'ve gone idle!');
//         this.idle.onIdleStart.subscribe(() => console.log("You've gone idle!"));
//         // idle.onTimeoutWarning.subscribe((countdown) => this.idleState = 'You will time out in ' + countdown + ' seconds!');
//         this.idle.onTimeoutWarning.subscribe((countdown: number) => console.log("You will time out in " + countdown + " seconds!") );

//         // sets the ping interval to 15 seconds
//         this.keepalive.interval(15);
//         //
//         this.keepalive.onPing.subscribe(() => this.lastPing = new Date());

//         this.reset();
//     }

//     public reset() {
//         this.idle.watch();
//         this.idleState = "Started.";
//         this.timedOut = false;
//     }
// }
