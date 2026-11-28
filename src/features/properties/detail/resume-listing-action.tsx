"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { setShortlisted } from "@/services/activity";
import { useSavedStore } from "@/stores/saved";
import { useSession } from "@/stores/session";
import type { Property } from "@/types/models";

/** Serializable URL intent survives the existing OTP sign-in flow. */
export function ResumeListingAction({ property }: { property: Property }) {
  const params = useSearchParams();
  const router = useRouter();
  const client = useQueryClient();
  const { session } = useSession();
  const attempted = useRef("");
  const action = params.get("save");
  const userId = session?.user.id;
  const { id, title, intent } = property;
  useEffect(() => {
    if (!userId || (action !== "shortlist" && action !== "compare")) return;
    const key = `${userId}:${id}:${action}`;
    if (attempted.current === key) return;
    attempted.current = key;
    const resume = async () => {
      if (action === "shortlist") {
        await setShortlisted(userId, id, intent, true);
        await client.invalidateQueries({ queryKey: ["account"] });
        toast.success("Property shortlisted.");
      } else {
        const store = useSavedStore.getState();
        if (!store.compare.some(item => item.kind === "property" && item.id === id)) {
          const result = store.toggle("compare", { kind: "property", id, title, intent });
          if (result === "limit") { toast.error("Compare is full. Remove a property first."); return; }
        }
        toast.success("Property added to Compare.");
      }
    };
    void resume().catch(() => toast.error("Your saved action couldn't be completed. Please try again.")).finally(() => {
      const query = new URLSearchParams(window.location.search);
      query.delete("save");
      router.replace(`${window.location.pathname}${query.size ? `?${query}` : ""}`, { scroll: false });
    });
  }, [action, userId, id, title, intent, client, router]);
  return null;
}
