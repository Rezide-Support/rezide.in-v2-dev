/** SAMPLE REALTOR-DASHBOARD DATA for the demo firm "Buildstone Realty LLP". Mirrors the prototype's dashboard data. */

import type {
  AssociableProject,
  Contact,
  ContactGroup,
  ContactProperty,
  MemberRole,
  CreditEntry,
  FirmProfile,
  MyProfile,
  Team,
  TeamMember,
  UploadFile,
  UploadRecord,
} from "@/types/dashboard";

export const GROUPS: ContactGroup[] = [
  { id: "g1", name: "NARVIGATE Delegates", description: "Event attendees · Mar 2026", created: "2026-03-18" },
  { id: "g2", name: "JVLR Investors", description: "Repeat buyers in JVLR projects", created: "2026-02-04" },
  { id: "g3", name: "Channel Partners · West", description: "Brokers the firm co-brokes with", created: "2026-01-12" },
  { id: "g4", name: "NRI Clients", description: "Buyers based outside India", created: "2025-12-20" },
];

const P = (id: string, unit: string, project: string, relation: string, locality: string): ContactProperty => ({
  id, unit, project, relation, locality, propertyType: "Residential", unitType: "Apartment", source: "Rezide",
});

const C = (c: Partial<Contact> & Pick<Contact, "id" | "firstName" | "lastName" | "mobile" | "addedOn" | "addedBy">): Contact => ({
  type: "Customer",
  subType: "Buyer",
  entity: "Individual",
  salutation: "Mr.",
  firmLevel: false,
  labels: [],
  groupIds: [],
  details: {},
  relatives: [],
  properties: [],
  leads: [],
  ...c,
});

export const CONTACTS: Contact[] = [
  C({ id: "c1", subType: "Buyer", firstName: "A.", lastName: "S. Rana", mobile: "91041 03391", email: "contact.asrgroup@example.com", addedOn: "2026-03-22", addedBy: "Upload",
    details: { occupation: "Self Employed", designation: "CEO", organisation: "ASR Properties", source: "Upload" },
    relatives: [
      { id: "r1", firstName: "Meena", lastName: "Rana", relation: "Spouse", mobile: "98250 11223", email: "meena.rana@example.com", dob: "12 / 04 / 1979", status: "Active" },
      { id: "r2", firstName: "Arjun", lastName: "Rana", relation: "Child", mobile: "", email: "", dob: "03 / 09 / 2008", status: "Active" },
    ],
    labels: ["Gandhinagar", "GRWA", "NARVIGATE Delegates"], groupIds: ["g1", "g2"],
    properties: [P("p1", "D - 2401", "Oberoi Splendor", "Current Owner", "JVLR · Jogeshwari")],
    leads: [{ looking: "Buy", propertyType: "Home · Apartment", stage: "Site Visit · Scheduled", flag: "Hot", budget: "4.5 – 5.5 Cr", assignedTo: "Viraj Bhatia", created: "2026-03-24" }] }),
  C({ id: "c2", subType: "Investor", firstName: "Aahil", lastName: "Merchant", mobile: "90044 93906", email: "aahil.merchant@example.com", addedOn: "2026-03-22", addedBy: "Upload",
    details: { organisation: "Crescent Group", source: "Upload" }, labels: ["Investor", "NARVIGATE Delegates"], groupIds: ["g1"],
    leads: [{ looking: "Buy", propertyType: "Office · Commercial", stage: "New Lead · Uncontacted", flag: "Warm", budget: "2 – 3 Cr", assignedTo: "Priya Nair", created: "2026-03-23" }] }),
  C({ id: "c3", subType: "Tenant", firstName: "Aakaar", lastName: "Jain", mobile: "98200 87676", altMobile: "98200 77686", addedOn: "2025-12-29", addedBy: "Viraj Bhatia", labels: ["Tenant"],
    properties: [P("p2", "C - 2508", "Oberoi Splendor", "Current Tenant", "JVLR · Jogeshwari")],
    leads: [{ looking: "Rent-In", propertyType: "Home · Apartment", stage: "Closed · Won", flag: "Hot", budget: "1.2 L / mo", assignedTo: "Viraj Bhatia", created: "2026-01-02" }] }),
  C({ id: "c4", type: "Broker", subType: "Firm", entity: "Company", company: "Kanaiyalal H. Desai & Co", firstName: "Aakash", lastName: "D. Desai", mobile: "98705 83983", email: "aakash.desai@example.com", addedOn: "2026-02-05", addedBy: "Priya Nair",
    details: { city: "Mumbai", state: "Maharashtra", line1: "Shop 4, Juhu Tara Road", country: "India" }, labels: ["Co-broke"], groupIds: ["g3"] }),
  C({ id: "c5", type: "Broker", subType: "Firm", entity: "Company", company: "Urban Space Realty", firstName: "Aakash", lastName: "Shah", mobile: "97695 95081", email: "aakash@urbanspace.example", addedOn: "2026-02-05", addedBy: "Priya Nair",
    labels: ["Co-broke", "Oshiwara"], groupIds: ["g3"] }),
  C({ id: "c6", subType: "Seller", firstName: "Aakash", lastName: "Sharma", mobile: "98700 55896", email: "aakash.sharma@example.com", addedOn: "2026-03-22", addedBy: "Upload",
    details: { organisation: "Vaibhav Property Hub", source: "Upload" } }),
  C({ id: "c7", salutation: "Ms.", subType: "Landlord", firstName: "Bhavna", lastName: "Kapoor", mobile: "98191 22340", email: "bhavna.kapoor@example.com", addedOn: "2026-01-14", addedBy: "Meera Iyer",
    details: { source: "Referral", marital: "Married", residentStatus: "Resident Indian", pan: "ABCPK1234D", line1: "B-1203, Oberoi Splendor, JVLR", country: "India", city: "Mumbai", state: "Maharashtra", pin: "400060",
      bank: "HDFC Bank", accountType: "Savings", nameAsPerBank: "Bhavna Kapoor", ifsc: "HDFC0000512", accountNo: "50100223344556" },
    labels: ["Landlord", "JVLR"], groupIds: ["g2"],
    properties: [P("p3", "G - 101", "Oberoi Splendor Grande", "Current Owner", "JVLR · Jogeshwari"), P("p7", "C - 902", "Oberoi Splendor", "Previous Owner", "JVLR · Jogeshwari")] }),
  C({ id: "c8", type: "Developer", subType: "Builder", company: "Oberoi Realty Ltd", firstName: "Rahul", lastName: "Mehra", mobile: "98201 66554", email: "rahul.mehra@example.com", addedOn: "2026-01-02", addedBy: "Viraj Bhatia",
    details: { linkedin: "linkedin.com/in/example-rahul", occupation: "Salaried", designation: "Sales Head", organisation: "Oberoi Realty" } }),
  C({ id: "c9", subType: "Buyer", firstName: "Imran", lastName: "Shaikh", mobile: "99200 41188", email: "imran.s@example.com", addedOn: "2025-12-28", addedBy: "Karan Malhotra",
    details: { residentStatus: "NRI", source: "Website", country: "UAE", city: "Dubai" }, labels: ["NRI", "Dubai"], groupIds: ["g4"],
    leads: [{ looking: "Buy", propertyType: "Home · Apartment", stage: "Negotiation · Offer Made", flag: "Hot", budget: "2 – 2.5 Cr", assignedTo: "Karan Malhotra", created: "2025-12-30" }] }),
  C({ id: "c10", salutation: "Ms.", type: "Broker", subType: "Individual Agent", firstName: "Neha", lastName: "Bansal", mobile: "98330 12457", email: "neha@bansalhomes.example", addedOn: "2025-12-18", addedBy: "Aakash Shah",
    details: { organisation: "Bansal Homes" }, groupIds: ["g3"] }),
];

export const UPLOADS: UploadFile[] = [
  { id: "f1", name: "Test", uploadedBy: "Viraj Bhatia", date: "2026-08-17", time: "03:13 PM", assignedTo: "Viraj Bhatia", records: 17, errors: 0 },
  { id: "f2", name: "Test Data", uploadedBy: "Viraj Bhatia", date: "2025-12-12", time: "11:41 AM", assignedTo: "Priya Nair", records: 218, errors: 2 },
  { id: "f3", name: "Reek Estate Agent.csv", uploadedBy: "Viraj Bhatia", date: "2025-10-12", time: "03:20 PM", assignedTo: "Viraj Bhatia", records: 203, errors: 0 },
  { id: "f4", name: "Premium Clients", uploadedBy: "Priya Nair", date: "2025-10-06", time: "04:04 PM", assignedTo: "Rohan Mehta", records: 218, errors: 1 },
  { id: "f5", name: "Rezide", uploadedBy: "Viraj Bhatia", date: "2025-08-11", time: "06:34 PM", assignedTo: "Viraj Bhatia", records: 7, errors: 0 },
  { id: "f6", name: "Rezide Testing Team.csv", uploadedBy: "Rohan Mehta", date: "2025-05-21", time: "02:07 PM", assignedTo: "Viraj Bhatia", records: 26, errors: 0 },
];

/** Sample rows shown for every uploaded file (the prototype shows the same ten). Matched to contacts by mobile number. */
export const UPLOAD_RECORDS: Pick<UploadRecord, "name" | "mobile">[] = [
  { name: "UPEN Vora", mobile: "98691 07635" },
  { name: "JIGAR SHAH", mobile: "98217 22382" },
  { name: "MITESH SHAH", mobile: "98219 15956" },
  { name: "JAYESH BHATT", mobile: "98335 92876" },
  { name: "JAY Mehta", mobile: "96197 10399" },
  { name: "ANKIT DHOKAI", mobile: "93204 33794" },
  { name: "Dhaval Shah", mobile: "98191 28440" },
  { name: "A. S. Rana", mobile: "91041 03391" },
  { name: "Aahil Merchant", mobile: "90044 93906" },
  { name: "Nikhil Doshi", mobile: "98674 42210" },
];

export const TEAMS: Team[] = [
  { id: "ws", name: "Western Suburbs Sales", managerId: "m2", area: "Andheri · Bandra · Juhu" },
  { id: "sm", name: "South Mumbai Luxury", managerId: "m1", area: "Worli · Lower Parel" },
  { id: "th", name: "Thane Resale", managerId: "m4", area: "Thane West · Ghodbunder" },
];

const PHONES = ["+91 98200 87676", "+91 98701 22145", "+91 98190 44310", "+91 99300 51288", "+91 97690 59508", "+91 98205 11876", "+91 98923 40017", "+91 77380 21456", "+91 98674 30922", "+91 99877 61203", "+91 98331 77490", "+91 90040 28816"];

const M = (i: number, name: string, role: MemberRole, teamIds: string[], areas: string, email?: string): TeamMember => ({
  id: `m${i + 1}`,
  name,
  role,
  teamIds,
  areas,
  email: email ?? `${name.split(" ")[0].toLowerCase()}@buildstone.example`,
  phone: PHONES[i],
});

export const MEMBERS: TeamMember[] = [
  M(0, "Viraj Bhatia", "admin", ["sm"], "All coverage", "viraj@buildstone.example"),
  M(1, "Priya Nair", "manager", ["ws"], "Andheri West, Juhu"),
  M(2, "Rohan Mehta", "manager", ["sm", "th"], "Worli, Lower Parel"),
  M(3, "Sneha Kulkarni", "manager", ["th"], "Thane West"),
  M(4, "Aakash Shah", "agent", ["ws"], "Lokhandwala, Seven Bungalows"),
  M(5, "Meera Iyer", "agent", ["ws", "sm"], "Bandra West"),
  M(6, "Karan Malhotra", "agent", ["ws"], "JVLR, Powai"),
  M(7, "Sahil Merchant", "agent", ["ws"], "Goregaon East"),
  M(8, "Farhan Qureshi", "agent", ["sm"], "Worli Sea Face"),
  M(9, "Ananya Rao", "agent", ["sm"], "Lower Parel, Prabhadevi"),
  M(10, "Devansh Joshi", "agent", ["th", "ws"], "Ghodbunder Road"),
  M(11, "Ritika Patil", "agent", ["th"], "Majiwada"),
];

export const SEATS_TOTAL = 15;
export const LICENCE_RENEWAL = "2027-01-14";
/** The sample statement is dated to this day so its periods always contain rows. */
export const STATEMENT_DATE = "2026-10-14";

export const CREDITS: CreditEntry[] = [
  { id: "cr1", date: "2026-10-08", activity: "WhatsApp broadcast · JVLR Investors", by: "Viraj Bhatia", amount: -32, balance: 2450 },
  { id: "cr2", date: "2026-10-06", activity: "Contact export · 120 rows", by: "Priya Nair", amount: -1, balance: 2482 },
  { id: "cr3", date: "2026-10-03", activity: "WhatsApp broadcast · NRI Clients", by: "Karan Malhotra", amount: -6, balance: 2483 },
  { id: "cr4", date: "2026-10-01", activity: "Credits purchased", by: "Viraj Bhatia", amount: 2000, balance: 2489 },
  { id: "cr5", date: "2026-09-22", activity: "Lead export · Oshiwara", by: "Aakash Shah", amount: -6, balance: 489 },
  { id: "cr6", date: "2026-08-28", activity: "WhatsApp broadcast · Channel Partners · West", by: "Priya Nair", amount: -18, balance: 495 },
  { id: "cr7", date: "2026-08-12", activity: "Credits purchased", by: "Viraj Bhatia", amount: 500, balance: 513 },
  { id: "cr8", date: "2026-07-20", activity: "WhatsApp broadcast · NARVIGATE Delegates", by: "Viraj Bhatia", amount: -42, balance: 13 },
  { id: "cr9", date: "2026-06-02", activity: "Contact export · 340 rows", by: "Karan Malhotra", amount: -3, balance: 55 },
  { id: "cr10", date: "2026-04-15", activity: "Credits purchased", by: "Viraj Bhatia", amount: 1000, balance: 58 },
];

export const FIRM_PROFILE: FirmProfile = {
  name: "Buildstone Realty LLP",
  type: "LLP",
  since: "2010",
  website: "www.buildstone.example",
  logo: "",
  cover: "",
  tagline: "Homes in the Western Suburbs, since 2010.",
  brandColour: "#15302B",
  primaryContact: "Viraj Bhatia",
  primaryDesignation: "Founder & Managing Partner",
  primaryMobile: "98200 87676",
  primaryEmail: "viraj@buildstone.example",
  secondaryContact: "Priya Nair",
  secondaryDesignation: "Sales Manager",
  secondaryMobile: "98701 22145",
  secondaryEmail: "priya@buildstone.example",
  address: "Office 704, Lotus Corporate Park, Off Western Express Highway",
  locality: "Goregaon East",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400063",
  branchAddress: "",
  branchCity: "",
  branchPincode: "",
  about:
    "Buildstone Realty is a Mumbai brokerage focused on residential resale and new launches across the Western Suburbs. Since 2010 the firm has closed over 1,200 transactions and manages nearly 1,000 rental units for owners in India and abroad.",
  instagram: "instagram.com/buildstone.example",
  linkedin: "linkedin.com/company/buildstone-example",
  facebook: "",
  youtube: "youtube.com/@buildstone-example",
  x: "",
  propertyTypes: ["Home", "Office"],
  specializations: ["Residential Resale", "Residential Rental", "New Projects", "Luxury Homes"],
  cities: ["Mumbai"],
  regions: ["Western Suburbs", "South Mumbai"],
  subRegions: ["Andheri West", "Bandra West", "Juhu", "Goregaon East", "Worli"],
  localities: ["JVLR", "Yashodham", "Aarey Colony", "Lokhandwala"],
  projects: ["Oberoi Splendor", "Oberoi Sky City", "Raheja Exotica"],
  reraState: "MahaRERA · Maharashtra",
  reraId: "A51900034821",
  gstin: "27AAKFB4417M1ZS",
};

export const MY_PROFILE: MyProfile = {
  photo: "viraj-bhatia.jpg",
  salutation: "Mr.",
  firstName: "Viraj",
  lastName: "Bhatia",
  mobile: "98200 87676",
  email: "viraj@buildstone.example",
  since: "2010",
  languages: ["Hindi", "English"],
  about:
    "Founder, driving innovation and product strategy. 25 years building and scaling businesses in real estate and stockbroking. Started as an independent agent and grew a property management firm handling nearly 1,000 units.",
  aadhaar: "XXXX XXXX 4417",
  aadhaarFile: "Viraj_Aadhaar.pdf",
  reraId: "A51900034821",
  specializations: ["Residential Resale", "Luxury Homes"],
  cities: ["Mumbai"],
  regions: ["Western Suburbs"],
  subRegions: ["Andheri West", "Goregaon East", "Juhu"],
  localities: ["JVLR", "Yashodham", "Aarey Colony"],
  projects: ["Oberoi Splendor", "Oberoi Sky City"],
};


/** Projects offered by "Associate Property" (Rezide source), from the prototype. */
export const ASSOCIATE_PROJECTS: AssociableProject[] = [
  { id: "os", name: "Oberoi Splendor", developer: "Oberoi Realty", locality: "JVLR · Jogeshwari East", propertyType: "Residential", unitTypes: ["Apartment"], towers: ["A", "B", "C", "D"] },
  { id: "osg", name: "Oberoi Splendor Grande", developer: "Oberoi Realty", locality: "JVLR · Jogeshwari East", propertyType: "Residential", unitTypes: ["Apartment", "Penthouse"], towers: ["G", "H"] },
  { id: "oe", name: "Oberoi Exquisite", developer: "Oberoi Realty", locality: "Yashodham · Goregaon East", propertyType: "Residential", unitTypes: ["Apartment", "Penthouse"], towers: ["A", "B", "C"] },
  { id: "sca", name: "Sunteck City Avenue", developer: "Sunteck Realty", locality: "Oshiwara · Goregaon West", propertyType: "Residential", unitTypes: ["Apartment"], towers: ["1A", "1B", "1C"] },
  { id: "rv", name: "Raheja Vistas", developer: "K Raheja Corp", locality: "Chandivali · Powai", propertyType: "Residential", unitTypes: ["Apartment", "Villa", "Row House"], towers: ["Phase 1", "Phase 2"] },
  { id: "oc", name: "Oberoi Commerz II", developer: "Oberoi Realty", locality: "Goregaon East", propertyType: "Commercial", unitTypes: ["Office"], towers: ["Tower 1", "Tower 2"] },
  { id: "ip", name: "Infinity IT Park", developer: "Infinity Group", locality: "Malad East", propertyType: "Commercial", unitTypes: ["Office", "Shop", "Showroom"], towers: ["Building 1", "Building 2", "Building 3"] },
  { id: "nl", name: "Nisarg Plots", developer: "Nisarg Developers", locality: "Karjat", propertyType: "Land", unitTypes: ["Plot", "Agricultural Land"], towers: ["Sector A", "Sector B"] },
];
/** Sample unit numbers offered for every tower. */
export const ASSOCIATE_UNITS = ["0402", "0903", "1201", "1804", "2401", "2508"];
