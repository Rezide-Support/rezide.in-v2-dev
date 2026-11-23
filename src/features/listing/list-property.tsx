"use client";
import { Icon } from "@/components/brand/icon";
import { SiteFooter } from "@/components/layout/site-footer";
import { OwnerEnquiryForm } from "./owner-enquiry-form";
export function ListProperty() {
 return <>
    <div className="property-page list-property-page min-w-0">
      <section className="bg-rez-forest px-4 py-12 text-rez-full-white md:px-8 md:py-[calc(72px*var(--property-space-scale,1))]">
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,.95fr)_minmax(0,1.05fr)] lg:gap-12">
          <div className="flex max-w-[640px] min-w-0 flex-col gap-7">
            <span className="eyebrow text-rez-mocaccino">List property</span>
            <h1 className="text-[clamp(32px,8vw,40px)] leading-[1.02] font-semibold tracking-[-0.025em] md:text-[clamp(calc(44px*var(--property-type-scale,1)),calc(5.5vw*var(--property-type-scale,1)),calc(76px*var(--property-type-scale,1)))]">
              Sell or rent faster. <span className="text-rez-mocaccino">100% free.</span>
            </h1>
            <p className="max-w-[560px] text-[max(15px,calc(17px*var(--property-type-scale,1)))] leading-normal text-rez-full-white/85 md:text-[max(15px,calc(19px*var(--property-type-scale,1)))]">
              List in minutes to connect with verified buyers and tenants.
              <br />
              <span className="text-rez-mocaccino">Want assistance? Top local realtors can assist, if you choose.</span>
            </p>
            <ul className="flex flex-col gap-3.5">
              {["Unlimited free listings, zero hidden fees", "Direct WhatsApp and call with buyers", "Price analysis from registered transactions"].map((p) => (
                <li key={p} className="flex items-center gap-3 text-base font-medium">
                  <Icon name="check-circle" size={22} className="text-rez-mocaccino" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="w-full min-w-0"><OwnerEnquiryForm /></div>
        </div>
      </section>
<div className="flex min-h-[calc(350px*var(--property-space-scale,1))] flex-col items-center justify-center bg-white px-4 text-center text-black">
  <h1 className="text-5xl font-bold uppercase tracking-tight sm:text-7xl md:text-[calc(96px*var(--property-type-scale,1))]">
    Coming
    <span className="block text-black/40">Soon.</span>
  </h1>

  <div className="mt-6 h-1 w-16 bg-black" />

  <p className="mt-6 text-sm font-medium uppercase tracking-[0.25em] text-black/60">
    Stay Tuned
  </p>
</div>



      {/* <section className="bg-white px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-9">
          <div className="flex flex-col gap-2.5">
            <h2 className="text-[30px] leading-[1.1] font-semibold tracking-[-0.02em] md:text-[40px]">List free in 5 simple steps.</h2>
            <p className="text-[17px] text-rez-graphite">Get verified buyers and tenants.</p>
          </div>
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            <ol className="flex flex-col gap-3">
              {[
                ["Profile", "Owner, contact person or POA. Verify with OTP."],
                ["Property type", "Home, office, retail, industrial or land."],
                ["Property", "Project, address, tower, unit and floor."],
                ["Commercials", "Sell or rent out, and your price."],
                ["Realtor assist", "Optional. Pick up to 3 realtors, or list it yourself."],
              ].map(([t, d], i) => (
                <li key={t} className="flex items-center gap-[18px] rounded-xl border border-rez-smoke bg-white px-[22px] py-[18px]">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-rez-cloud text-[15px] font-bold">{i + 1}</span>
                  <span className="flex flex-col gap-1">
                    <span className="text-[17px] font-semibold">{t}</span>
                    <span className="text-sm text-rez-graphite">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-5 rounded-xl border border-rez-smoke p-8">
                <h3 className="text-[28px] leading-tight font-semibold tracking-[-0.01em]">What you get. Free.</h3>
                <ul className="flex flex-col gap-3.5">
                  {["100% free listing", "Verified buyer and tenant leads", "Direct WhatsApp and call connect", "Price analysis on your listing", "Add or edit anytime", "Performance analytics"].map((f) => (
                    <li key={f} className="flex items-center gap-3 text-base font-medium">
                      <Icon name="check-circle" size={20} className="text-rez-mocaccino-ink" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button size="xl" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                  List property free
                </Button>
              </div>
              <div className="flex flex-col gap-[18px] rounded-xl bg-rez-mocaccino p-6 text-black sm:p-8">
                <div className="flex flex-col gap-2">
                  <span className="eyebrow opacity-80">Add-on · Valuation report</span>
                  <h3 className="text-[26px] leading-tight font-semibold tracking-[-0.01em]">Know your price before you list.</h3>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    ["Market valuation", "Fair value for your exact unit"],
                    ["Comparables", "Recent deals in your society and locality"],
                    ["Rental yield", "Expected monthly rent and yield"],
                    ["Govt. benchmark", "Ready reckoner cross-check"],
                  ].map(([t, d]) => (
                    <div key={t} className="flex flex-col gap-1 rounded-[14px] bg-white/35 px-4 py-3.5">
                      <span className="text-sm font-semibold">{t}</span>
                      <span className="text-xs leading-snug">{d}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button size="lg" disabled aria-label="Valuation report, coming soon">
                    Coming soon
                  </Button>
                  <span className="text-xs font-medium">Reports aren’t available in this prototype.</span>
                </div>
              </div>
              <div className="flex items-center gap-3.5 rounded-xl bg-rez-cloud px-[22px] py-[18px]">
                <Icon name="shield-check" size={26} />
                <span className="flex flex-col gap-0.5">
                  <b className="text-[15px] font-semibold">Verified by Rezide.</b>
                  <span className="text-[13px] text-rez-graphite">Your number is shared only when you accept an enquiry.</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section> */}
    </div>
</>;
}
