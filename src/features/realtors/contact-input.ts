import { BACKEND_ID_PATTERN } from "@/lib/ids";
import { z } from "zod";

export const realtorContactInput = z.object({
  firmId: z.string().regex(BACKEND_ID_PATTERN, "A valid firm is required."),
  source: z.literal("rezide"),
  name: z.string().trim().min(2, "Enter at least 2 characters.").max(100),
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number."),
  email: z.email("Enter a valid email.").max(254),
  looking: z.enum(["buy", "rent-in", "sell", "lease out"]),
  propertyType: z.enum(["home", "office", "industrial", "retail", "land"]),
  remark: z.string().trim().min(1, "Select how the realtor can help you.").max(1000),
});

export type RealtorContactInput = z.infer<typeof realtorContactInput>;
