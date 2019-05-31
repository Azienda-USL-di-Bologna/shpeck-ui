import { Injectable } from "@angular/core";
import { BehaviorSubject, Subject, Observable } from "rxjs";

@Injectable({
  providedIn: "root"
})
export class CommandManagerService {

private _command: Subject<ShpeckCommand> = new Subject<ShpeckCommand>();

  constructor() { }

  public sendCommand(command: ShpeckCommand) {
    this._command.next(command);
  }

  public get command(): Observable<ShpeckCommand> {
    return this._command.asObservable();
  }
}

export interface ShpeckCommand {
  command: string;
  data: any;
}
