import { z } from "zod";
import { indianMobile, pincode } from "@/lib/validation";
import type { ListingCategory, ListingDraft } from "@/types/models";

/**
 * List Property wizard. The first five steps are always shown; the remaining
 * five appear when the owner lists without handing over to a realtor.
 */
export type StepId =
  | "profile"
  | "type"
  | "property"
  | "commercials"
  | "assist"
  | "unit"
  | "features"
  | "photos"
  | "video"
  | "furniture";

export const STEP_TITLES: Record<StepId, string> = {
  profile: "Profile",
  type: "Property Type",
  property: "Property",
  commercials: "Commercials",
  assist: "Realtor Assist",
  unit: "Unit Details",
  features: "Key Features",
  photos: "Photos",
  video: "Video",
  furniture: "Furniture & Fixtures",
};

const CORE: StepId[] = ["profile", "type", "property", "commercials", "assist"];
const FULL: StepId[] = [...CORE, "unit", "features", "photos", "video", "furniture"];

/** Visible steps for the current draft. Handing over to a realtor ends the flow after "assist". */
export function stepsFor(draft: ListingDraft): StepId[] {
  if (draft.assist === "yes" && draft.handover === "realtor") return CORE;
  if (draft.assist === "no" || (draft.assist === "yes" && draft.handover === "self")) return FULL;
  return CORE;
}

export const CATEGORY_UNITS: Record<ListingCategory, { label: string; units: string[] }> = {
  home: { label: "Home", units: ["Studio", "Apartment", "Duplex", "Penthouse", "Jodi", "Independent Floor", "Independent House", "Villa", "Holiday Home", "Row/Town House"] },
  office: { label: "Office", units: ["Office Space", "Co-working"] },
  industrial: { label: "Industrial", units: ["Warehouse", "Factory", "Industrial Shed", "Cold Storage", "Logistics Park"] },
  retail: { label: "Retail", units: ["Shop", "Showroom"] },
  land: { label: "Land", units: ["Residential Plot", "Commercial Plot", "Industrial Plot", "Agricultural Land", "Farmhouse Land"] },
};

export const LISTING_CITIES = ["Mumbai", "Pune", "Bengaluru", "Hyderabad", "Gurugram", "Noida", "Chennai", "Ahmedabad"];

const required = (msg: string) => z.string({ error: msg }).trim().min(1, msg);
const optionalText = z.string().trim().optional();

export const profileSchema = z
  .object({
    role: z.enum(["Property Owner", "Contact Person", "POA Holder"], { error: "Tell us how you're related to this property." }),
    ownerName: optionalText,
    ownerMobile: optionalText,
    city: required("Choose the city the property is in."),
  })
  .superRefine((v, ctx) => {
    if (v.role !== "Property Owner") {
      if (!v.ownerName) ctx.addIssue({ code: "custom", path: ["ownerName"], message: "Enter the registered owner's name." });
      if (v.ownerMobile && !indianMobile.safeParse(v.ownerMobile).success) {
        ctx.addIssue({ code: "custom", path: ["ownerMobile"], message: "Enter a valid 10-digit mobile number, or leave it blank." });
      }
    }
  });

export const typeSchema = z.object({
  category: z.enum(["home", "office", "industrial", "retail", "land"], { error: "Choose a property type." }),
  unitType: required("Choose a unit type."),
});

export const propertySchema = (category?: ListingCategory) =>
  z
    .object({
      projectName: optionalText,
      address: required("Enter the property address.").pipe(z.string().max(250, "Keep the address under 250 characters.")),
      locality: required("Choose or type the locality."),
      pincode: z.string().trim().optional(),
      tower: optionalText,
      totalFloors: optionalText,
      unitNo: optionalText,
      floor: optionalText,
      projectStatus: optionalText,
      buildingType: optionalText,
    })
    .superRefine((v, ctx) => {
      if (v.pincode && !pincode.safeParse(v.pincode).success) {
        ctx.addIssue({ code: "custom", path: ["pincode"], message: "Enter a 6-digit PIN code, or leave it blank." });
      }
      if (category !== "land") {
        if (!v.unitNo) ctx.addIssue({ code: "custom", path: ["unitNo"], message: "Enter the unit number." });
        if (!v.projectStatus) ctx.addIssue({ code: "custom", path: ["projectStatus"], message: "Choose the project status." });
        if (!v.buildingType) ctx.addIssue({ code: "custom", path: ["buildingType"], message: "Choose the building type." });
        if (v.totalFloors && !/^\d{1,3}$/.test(v.totalFloors)) ctx.addIssue({ code: "custom", path: ["totalFloors"], message: "Use a number, e.g. 32." });
        if (v.floor && !/^\d{1,3}$/.test(v.floor)) ctx.addIssue({ code: "custom", path: ["floor"], message: "Use a number, e.g. 17." });
        if (v.floor && v.totalFloors && Number(v.floor) > Number(v.totalFloors)) {
          ctx.addIssue({ code: "custom", path: ["floor"], message: "The unit's floor can't be above the total floors." });
        }
      }
    });

export const commercialsSchema = z.object({
  intent: z.enum(["sell", "rent"], { error: "Choose sell or rent out." }),
  price: required("Enter the price.").refine((v) => /^\d+$/.test(v) && Number(v) >= 1000, "Enter an amount of at least ₹1,000, digits only."),
  visitDays: optionalText,
  visitFrom: optionalText,
  visitTo: optionalText,
  keys: optionalText,
});

export const assistSchema = z
  .object({
    assist: z.enum(["yes", "no"], { error: "Choose whether you'd like a realtor's help." }),
    realtorIds: z.array(z.string()).optional(),
    handover: z.enum(["self", "realtor"]).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.assist === "yes") {
      const n = v.realtorIds?.length ?? 0;
      if (n === 0) ctx.addIssue({ code: "custom", path: ["realtorIds"], message: "Pick at least one realtor, up to three." });
      if (n > 3) ctx.addIssue({ code: "custom", path: ["realtorIds"], message: "You can connect with up to three realtors." });
      if (!v.handover) ctx.addIssue({ code: "custom", path: ["handover"], message: "Choose how you'd like to continue." });
    }
  });

export const unitSchema = (category?: ListingCategory) =>
  z
    .object({
      configuration: optionalText,
      area: required("Enter the area.").refine((v) => /^\d+(\.\d+)?$/.test(v) && Number(v) > 0, "Enter the area as a number."),
      areaType: optionalText,
      plotType: optionalText,
      bathrooms: optionalText,
      balconies: optionalText,
      furnishing: optionalText,
      facing: optionalText,
      parking: optionalText,
    })
    .superRefine((v, ctx) => {
      if (category === "land") {
        if (!v.plotType) ctx.addIssue({ code: "custom", path: ["plotType"], message: "Choose the plot type." });
      } else if (!v.areaType) {
        ctx.addIssue({ code: "custom", path: ["areaType"], message: "Choose how the area is measured." });
      }
      if (category === "home") {
        if (!v.configuration) ctx.addIssue({ code: "custom", path: ["configuration"], message: "Choose the configuration." });
        if (!v.bathrooms) ctx.addIssue({ code: "custom", path: ["bathrooms"], message: "Choose the number of bathrooms." });
        if (!v.furnishing) ctx.addIssue({ code: "custom", path: ["furnishing"], message: "Choose the furnishing." });
      }
    });

export const featuresSchema = z.object({
  features: z.array(z.string()).optional(),
  amenities: z.array(z.string()).optional(),
  highlights: z.string().trim().max(500, "Keep this under 500 characters.").optional(),
});

export const videoSchema = z.object({
  videoUrl: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^https:\/\/(www\.)?(youtube\.com|youtu\.be|drive\.google\.com)\//.test(v), "Paste a YouTube or Google Drive link starting with https://, or leave it blank."),
});

export const furnitureSchema = z.object({
  furniture: z.array(z.string()).optional(),
  appliances: z.array(z.string()).optional(),
  fixtures: z.array(z.string()).optional(),
});

/** Validates one step against the current draft. Returns field errors, or null when valid. */
export function validateStep(step: StepId, draft: ListingDraft): Record<string, string> | null {
  const schema =
    step === "profile"
      ? profileSchema
      : step === "type"
        ? typeSchema
        : step === "property"
          ? propertySchema(draft.category)
          : step === "commercials"
            ? commercialsSchema
            : step === "assist"
              ? assistSchema
              : step === "unit"
                ? unitSchema(draft.category)
                : step === "features"
                  ? featuresSchema
                  : step === "video"
                    ? videoSchema
                    : step === "furniture"
                      ? furnitureSchema
                      : null;
  if (!schema) return null;
  const result = schema.safeParse(draft);
  if (result.success) return null;
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "_");
    errors[key] ??= issue.message;
  }
  return errors;
}

/** Indian words for an amount: 1,25,00,000 → "1.25 Cr". */
export function amountInWords(digits: string | undefined): string {
  const n = Number(digits || 0);
  if (!n) return "";
  const trim = (s: string) => s.replace(/\.?0+$/, "");
  if (n >= 1e7) return `${trim((n / 1e7).toFixed(2))} Cr`;
  if (n >= 1e5) return `${trim((n / 1e5).toFixed(2))} L`;
  return `${trim((n / 1e3).toFixed(1))}k`;
}
