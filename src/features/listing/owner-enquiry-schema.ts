import { z } from "zod";
const name = (label: string) => z.string().trim().min(2, label + " must have at least 2 characters.").max(50, label + " must have at most 50 characters.");
export const ownerEnquirySchema = z.object({
  first_name: name("First name"), last_name: name("Last name"),
  mobile: z.string().regex(/^[0-9]{10}$/, "Enter a 10-digit mobile number."),
  email: z.string().trim().email("Enter a valid email address."),
  locality: z.string().trim().min(2, "Enter a locality with at least 2 characters."),
  project_name: z.string().trim().min(2, "Enter a project name with at least 2 characters."),
  flat_no: z.string().trim().min(1, "Enter the flat number."),
  looking: z.enum(["sell", "rent"], { message: "Select sell or rent." }),
});
export type OwnerEnquiryValues = z.infer<typeof ownerEnquirySchema>;
export const ownerEnquiryPayload = (values: OwnerEnquiryValues) => ({
  type: "listProperty", fullName: (values.first_name + " " + values.last_name).trim(), mobile: values.mobile, email: values.email, locality: values.locality, projectName: values.project_name, flatNo: values.flat_no,
  lookingFor: values.looking === "sell" ? "List property for sale" : "List property for rent",
  source: "Rezide.in property listing form",
});
