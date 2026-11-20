import { act, fireEvent } from "@testing-library/react";
import { OwnerEnquiryForm } from "@/features/listing/owner-enquiry-form";
import { ownerEnquirySchema, ownerEnquiryPayload } from "@/features/listing/owner-enquiry-schema";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { LeadForm } from "./lead-form";

vi.mock("@/stores/session", () => ({
  useSession: () => ({ session: null, status: "anonymous" }),
}));

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
});

describe("LeadForm intent select", () => {
  it("shows a custom option panel and stores the selected intent", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <LeadForm mode="contact" target={{ propertyId: "listing-1" }} recipient="the realtor" />
      </QueryClientProvider>,
    );

    const select = screen.getByRole("combobox", { name: "What would you like?" });
    expect(select).toHaveTextContent("Select");
    await user.click(select);

    expect(await screen.findByText("Select option")).toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "I'm interested" }));
    expect(select).toHaveTextContent("I'm interested");
  });
});

describe("Owner list-property enquiries", () => {
 const values = {first_name:"Apurva",last_name:"Mankas",mobile:"8169684577",email:"owner@example.com",locality:"Lalbaug",project_name:"Crescent Bay",flat_no:"1201",looking:"sell" as const};
 it("validates all required inputs and maps the exact sale/rent lead contract", () => {
  expect(ownerEnquirySchema.safeParse({}).success).toBe(false);
  expect(ownerEnquirySchema.safeParse({...values,mobile:"+918169684577"}).success).toBe(false);
  expect(ownerEnquirySchema.safeParse({...values,first_name:"A"}).success).toBe(false);
  expect(ownerEnquirySchema.safeParse({...values,last_name:"a".repeat(51)}).success).toBe(false);
  expect(ownerEnquirySchema.safeParse({...values,email:"invalid"}).success).toBe(false);
  expect(ownerEnquirySchema.safeParse({...values,looking:""}).success).toBe(false);
  expect(ownerEnquiryPayload(ownerEnquirySchema.parse({...values,first_name:" Apurva "}))).toEqual({type:"listProperty",fullName:"Apurva Mankas",mobile:values.mobile,email:values.email,locality:values.locality,projectName:values.project_name,flatNo:values.flat_no,lookingFor:"List property for sale",source:"Rezide.in property listing form"});
  expect(ownerEnquiryPayload({...values,looking:"rent"}).lookingFor).toBe("List property for rent");
 });
 it("submits without login, shows success, and restores an empty form after 30 seconds", async () => {
  const request = vi.spyOn(globalThis,"fetch").mockResolvedValue({ok:true,json:async()=>({success:true})} as Response);
  const client = new QueryClient({defaultOptions:{mutations:{retry:false}}});
  const view=render(<QueryClientProvider client={client}><OwnerEnquiryForm/></QueryClientProvider>);
  try {
   for(const [name,value] of Object.entries(values)) {
    if(name==="looking") fireEvent.change(screen.getByLabelText(/Purpose/),{target:{value}});
    else { const labels:Record<string,string>={first_name:"First Name",last_name:"Last Name",mobile:"Mobile Number",email:"Email Address",locality:"Locality",project_name:"Project Name",flat_no:"Flat no."}; fireEvent.change(screen.getByPlaceholderText(labels[name]),{target:{value}}); }
   }
   vi.useFakeTimers();
   await act(async()=>{fireEvent.submit(screen.getByRole("button",{name:"Submit"}).closest("form")!);});
   await act(async()=>{await vi.advanceTimersByTimeAsync(10);});
   expect(request).toHaveBeenCalledWith("/api/list-property/enquiry",expect.objectContaining({method:"POST",body:JSON.stringify(values)}));
   expect(screen.getByText("Your request has been successfully submitted")).toBeInTheDocument();
   expect(screen.queryByRole("button",{name:"Submit"})).not.toBeInTheDocument();
   expect(screen.getByText(/By submitting this form/)).toBeInTheDocument();
   await act(async()=>{await vi.advanceTimersByTimeAsync(30000);});
   expect(screen.getByPlaceholderText("First Name")).toHaveValue("");
   expect(screen.getByLabelText(/Purpose/)).toHaveValue("");
  } finally {view.unmount();client.clear();vi.useRealTimers();request.mockRestore();}
 });
});

it("blocks invalid owner enquiries and retains values after a failed submission", async () => {
 let complete!: (value: Response) => void;
 const request=vi.spyOn(globalThis,"fetch").mockImplementation(()=>new Promise(resolve=>{complete=resolve;}));
 const client=new QueryClient({defaultOptions:{mutations:{retry:false}}});
 const view=render(<QueryClientProvider client={client}><OwnerEnquiryForm/></QueryClientProvider>);
 try {
  await act(async()=>{fireEvent.submit(screen.getByRole("button",{name:"Submit"}).closest("form")!);});
  expect(request).not.toHaveBeenCalled();
  expect(screen.getByText("Enter a 10-digit mobile number.")).toBeInTheDocument();
  for(const [label,value] of [["First Name","Owner"],["Last Name","Test"],["Mobile Number","1234567890"],["Email Address","owner@example.com"],["Locality","Parel"],["Project Name","Crescent Bay"],["Flat no.","123"]]) fireEvent.change(screen.getByPlaceholderText(label),{target:{value}});
  fireEvent.change(screen.getByLabelText(/Purpose/),{target:{value:"rent"}});
  await act(async()=>{fireEvent.submit(screen.getByRole("button",{name:"Submit"}).closest("form")!);});
  expect(await screen.findByRole("button",{name:"Submitting..."})).toBeDisabled();
  await act(async()=>{complete({ok:false,json:async()=>({})} as Response);});
  expect(await screen.findByText("Unexpected error. Please try again.")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("First Name")).toHaveValue("Owner");
  expect(screen.getByRole("button",{name:"Submit"})).toBeEnabled();
 } finally {view.unmount();client.clear();request.mockRestore();}
});
