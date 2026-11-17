import "server-only";
import { isIP } from "node:net";
import { setBounded } from "@/lib/bounded-cache";
import { ProxyError } from "./proxy-error";
const limits=new Map<string,{at:number;count:number}>();
export function guardSearch(request:Request,now=Date.now()) {
  const forwarded=process.env.LEAD_TRUST_PROXY==='true'?request.headers.get('x-forwarded-for')?.split(',')[0].trim():undefined;
  const key=forwarded&&isIP(forwarded)?forwarded:'shared';
  const hit=limits.get(key);const entry=hit&&now-hit.at<60000?hit:{at:now,count:0};
  if(entry.count>=120)throw new ProxyError('Too many searches. Please try again shortly.',429);
  setBounded(limits,key,{...entry,count:entry.count+1},2000,60000,now);
}
