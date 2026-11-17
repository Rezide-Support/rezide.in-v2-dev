import "server-only";
import { cache } from "react";
import { upstream } from "@/lib/api/rezide-upstream";
import { array, record } from "./directory-model";
import { publicFirm } from "./public-mapper";

/** Resolve old firm/person IDs using the same upstream and public mapping as the live directory. */
export const resolveLegacyProfile = cache(async (id: string, agent?: string): Promise<string | null> => {
  for (let page=1; page<=100; page++) {
    const raw=record(await upstream(`/brokers/filter/web?page=${page}&pageSize=100`,{status:"complete",active_status:"active",sortBy:[1]},60));
    const firms=array(raw.data).map(publicFirm);
    for(const firm of firms) {
      const person=firm.people.find(person=>person.id===(agent || id));
      if(firm.id===id || (!agent && person)) return `/realtors/${encodeURIComponent(firm.name)}${agent || person ? `/${encodeURIComponent(person?.id || agent!)}` : ""}`;
    }
    if(!firms.length || firms.length<100 || page*100>=Number(raw.broker_count))break;
  }
  return null;
});
