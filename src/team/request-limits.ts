// Single-process backstop, not a substitute for limits at the hosting proxy.
import { TeamError } from './server';
export class RequestLimits {
  private windows = new Map<string,{count:number;until:number}>();
  check(key:string, maximum:number, now=Date.now()) {
    for(const [id,window] of this.windows)if(window.until<=now)this.windows.delete(id);
    let window=this.windows.get(key);
    if(!window) {
      if(this.windows.size>=4096)throw new TeamError(429,'Server busy. Try again in one minute.');
      window={count:0,until:now+60_000};this.windows.set(key,window);
    }
    if(window.count>=maximum)throw new TeamError(429,'Too many requests. Try again in one minute.');
    window.count++;
  }
}
export const requestLimits=new RequestLimits();
