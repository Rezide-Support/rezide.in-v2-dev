import type { ContactDetailKey } from "@/types/dashboard";

export type DetailField = {
  key: ContactDetailKey;
  label: string;
  kind: "text" | "select" | "upload" | "check";
  options?: string[];
  placeholder?: string;
  full?: boolean;
};

export type DetailSection = { id: string; title: string; sub: string; fields: DetailField[] };

const T = (key: ContactDetailKey, label: string, placeholder?: string, full?: boolean): DetailField => ({ key, label, kind: "text", placeholder, full });
const S = (key: ContactDetailKey, label: string, options: string[]): DetailField => ({ key, label, kind: "select", options });
const U = (key: ContactDetailKey, label: string): DetailField => ({ key, label, kind: "upload" });

/** Optional detail sections, in the prototype's order. Family & Relatives sits between Personal and Statutory. */
export const DETAIL_SECTIONS: DetailSection[] = [
  {
    id: "occupation",
    title: "Occupation",
    sub: "Status, designation, organisation",
    fields: [
      S("occupation", "Occupation Status", ["Salaried", "Self Employed", "Business Owner", "Professional", "Retired", "Student"]),
      T("designation", "Designation", "e.g. CEO"),
      T("organisation", "Organisation Name", "Enter organisation", true),
    ],
  },
  {
    id: "personal",
    title: "Personal Details",
    sub: "Source, DOB, marital and resident status",
    fields: [
      S("source", "Source", ["Walk-in", "Referral", "Website", "Meta Ad", "99acres", "MagicBricks", "Housing.com", "Upload"]),
      T("dob", "DOB", "DD / MM / YYYY"),
      S("marital", "Marital Status", ["Single", "Married", "Divorced", "Widowed"]),
      S("residentStatus", "Resident Status", ["Resident Indian", "NRI", "OCI / PIO", "Foreign National"]),
    ],
  },
  {
    id: "statutory",
    title: "Statutory",
    sub: "PAN, Aadhaar, Passport, TAN, GST",
    fields: [
      T("pan", "PAN No.", "Enter PAN no."),
      U("panFile", "PAN Copy"),
      T("aadhaar", "Aadhaar No.", "Enter Aadhaar no."),
      U("aadhaarFile", "Aadhaar Copy"),
      T("passport", "Passport No.", "Enter passport no."),
      U("passportFile", "Passport Copy"),
      T("tan", "TAN No.", "Enter TAN no."),
      T("gst", "GST No.", "Enter GST no."),
    ],
  },
  {
    id: "social",
    title: "Social Media",
    sub: "LinkedIn, Facebook, Instagram, X",
    fields: [T("linkedin", "LinkedIn", "Enter URL"), T("facebook", "Facebook", "Enter URL"), T("instagram", "Instagram", "Enter URL"), T("x", "X", "Enter URL")],
  },
  {
    id: "address",
    title: "Address",
    sub: "Current and permanent address",
    fields: [
      T("line1", "Address Line 1", "Enter address line 1", true),
      T("line2", "Address Line 2", "Enter address line 2", true),
      S("country", "Country", ["India", "UAE", "USA", "UK", "Singapore"]),
      S("state", "State", ["Maharashtra", "Gujarat", "Karnataka", "Delhi", "Tamil Nadu", "Telangana"]),
      T("city", "City", "Enter city"),
      T("pin", "Pincode", "Enter pincode"),
    ],
  },
  {
    id: "financial",
    title: "Financial",
    sub: "Bank and UPI details for payouts and refunds",
    fields: [
      S("bank", "Bank Name", ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra Bank"]),
      S("accountType", "Account Type", ["Savings", "Current", "NRE", "NRO"]),
      T("nameAsPerBank", "Name as per Bank", "Enter name as per bank"),
      T("branch", "Branch Name", "Enter branch name"),
      T("accountNo", "Account No.", "Enter account no."),
      T("ifsc", "IFSC Code", "Enter IFSC code"),
      T("upi1", "UPI ID 1", "Enter UPI ID"),
      T("upi2", "UPI ID 2", "Enter UPI ID"),
    ],
  },
];

export const RELATIONS = ["Spouse", "Child", "Parent", "Sibling", "Grand Parent", "Driver", "Other"];
