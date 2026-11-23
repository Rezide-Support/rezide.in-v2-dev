"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useLayoutEffect } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/brand/icon";
import { EmptyState, ErrorState } from "@/components/common/feedback";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { dq, type UploadFile, type UploadRecord } from "./api";
import { DashDialog, dialogBtn } from "./contact-dialogs";
import { downloadText } from "./contact-model";
import { inputCls } from "./form-bits";
import { Avatar, Card, DashSelect, HeaderButton, Loading, PageHeader, RowActions, TableFooter, THead, WhatsAppLink, notAvailable, shortDate, tdClass, thClass } from "./ui";

const recordsCsv = (records: UploadRecord[]) =>
  ["Name,Mobile,Contact status", ...records.map((r) => `"${r.name}","+91 ${r.mobile}","${r.contactId ? `In Contacts · ${r.contactType}` : "Not in Contacts"}"`)].join("\r\n");

function downloadSample(file: UploadFile, records?: UploadRecord[]) {
  downloadText(`${file.name.replace(/\.csv$/i, "")}-sample.csv`, recordsCsv(records ?? []));
  toast.success(`Downloaded the sample rows of ${file.name}.`, { description: "The prototype holds 10 sample rows per file, not the full upload." });
}

export function DatabasePage() {
  const router = useRouter();
  const q = useQuery(dq.uploads());
  const qc = useQueryClient();
  const [by, setBy] = useState("");
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const files = useMemo(() => q.data ?? [], [q.data]);
  const people = useMemo(() => Array.from(new Set(files.flatMap((f) => [f.uploadedBy, f.assignedTo]))), [files]);
  const rows = files.filter((f) => (!by || f.uploadedBy === by) && (!to || f.assignedTo === to) && (!from || f.date >= from) && (!until || f.date <= until));
  const pageCount = Math.max(1, Math.ceil(rows.length / perPage));
  const current = Math.min(page, pageCount);
  const shown = rows.slice((current - 1) * perPage, current * perPage);
  const reset = () => (setBy(""), setTo(""), setFrom(""), setUntil(""), setPage(1));

  return (
    <>
      <PageHeader
        title="Database"
        actions={
          <HeaderButton variant="default" icon="file-upload" onClick={() => notAvailable("File upload")}>
            Upload File
          </HeaderButton>
        }
      />
      <Card className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-[13px] font-semibold">
          Uploaded By
          <DashSelect value={by} onChange={(e) => (setBy(e.target.value), setPage(1))} className="font-normal">
            <option value="">All agents</option>
            {people.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </DashSelect>
        </label>
        <label className="flex flex-col gap-2 text-[13px] font-semibold">
          Assigned To
          <DashSelect value={to} onChange={(e) => (setTo(e.target.value), setPage(1))} className="font-normal">
            <option value="">All agents</option>
            {people.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </DashSelect>
        </label>
        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="mb-2 text-[13px] font-semibold">Date Range</legend>
          <div className="flex items-center gap-2">
            <input type="date" aria-label="Uploaded from" value={from} max={until || undefined} onChange={(e) => (setFrom(e.target.value), setPage(1))} className={cn(inputCls, "w-0 min-w-0 flex-1 px-2.5")} />
            <span className="text-sm text-rez-graphite">to</span>
            <input type="date" aria-label="Uploaded until" value={until} min={from || undefined} onChange={(e) => (setUntil(e.target.value), setPage(1))} className={cn(inputCls, "w-0 min-w-0 flex-1 px-2.5")} />
          </div>
        </fieldset>
        <div className="flex items-end justify-end">
          <Button variant="secondary" onClick={reset} className="h-[42px] rounded-[8px] px-5 text-[13px] font-bold tracking-[0.06em] uppercase">
            Reset Filters
          </Button>
        </div>
      </Card>
      {q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : q.isPending ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState icon="folder" title="No uploads match these filters." className="bg-white" action={<Button variant="secondary" onClick={reset}>Reset filters</Button>} />
      ) : (
        <Card className="overflow-hidden">
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[calc(1060px*var(--property-space-scale,1))] text-sm">
              <caption className="sr-only">Uploaded files</caption>
              <THead>
                <tr>
                  {["Actions", "File Name", "Uploaded By", "Upload Date", "Assigned To", "Records", "Errors", "Status", "Error Log"].map((h) => (
                    <th key={h} scope="col" className={thClass}>
                      {h}
                    </th>
                  ))}
                </tr>
              </THead>
              <tbody>
                {shown.map((f) => (
                  <tr key={f.id} className="border-t border-[#E8E8E8] first:border-t-0 hover:bg-[#FAFAFA]">
                    <td className={tdClass}>
                      <RowActions
                        label={`Actions for ${f.name}`}
                        items={[
                          { label: "View Records", icon: "file-text", onSelect: () => router.push(`/dashboard/database/${f.id}`) },
                          { label: "Download Sample Rows", icon: "file-download", onSelect: () => void downloadFile(f) },
                        ]}
                      />
                    </td>
                    <td className={tdClass}>
                      <Link href={`/dashboard/database/${f.id}`} className="font-semibold underline underline-offset-4 hover:text-rez-mocaccino-ink">
                        {f.name}
                      </Link>
                    </td>
                    <td className={tdClass}>
                      <span className="flex items-center gap-2.5 whitespace-nowrap">
                        <Avatar name={f.uploadedBy} dark size={30} className="text-[10px]" />
                        {f.uploadedBy}
                      </span>
                    </td>
                    <td className={tdClass}>
                      <span className="flex flex-col whitespace-nowrap">
                        {shortDate(f.date, true)}
                        <span className="text-xs text-rez-graphite">{f.time}</span>
                      </span>
                    </td>
                    <td className={tdClass}>
                      <span className="flex items-center gap-2.5 whitespace-nowrap">
                        <Avatar name={f.assignedTo} dark size={30} className="text-[10px]" />
                        {f.assignedTo}
                      </span>
                    </td>
                    <td className={tdClass}>{f.records}</td>
                    <td className={cn(tdClass, f.errors > 0 && "font-semibold text-rez-burgundy")}>{f.errors}</td>
                    <td className={tdClass}>
                      <span className="rounded-[6px] bg-black px-2.5 py-1 text-[11px] font-bold tracking-[0.04em] text-rez-full-white">COMPLETED</span>
                    </td>
                    <td className={tdClass}>
                      {f.errors > 0 ? (
                        <button type="button" onClick={() => notAvailable("Error-log download")} aria-label={`Error log for ${f.name}`} title="Download error log" className="flex size-8 items-center justify-center rounded-full hover:bg-[#F4F4F4]">
                          <Icon name="file-download" size={18} />
                        </button>
                      ) : (
                        <span className="text-xs text-rez-graphite">No errors</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TableFooter
            showing={`Showing ${shown.length} of ${rows.length} files`}
            perPage={perPage}
            onPerPage={(n) => (setPerPage(n), setPage(1))}
            page={current}
            pageCount={pageCount}
            onPage={setPage}
          />
        </Card>
      )}
    </>
  );

  async function downloadFile(f: UploadFile) {
    const res = await qc.fetchQuery(dq.upload(f.id)).catch(() => null);
    if (res) downloadSample(f, res.records);
    else toast.error("Couldn’t load this file’s rows.");
  }
}

const TYPES = [
  ["Customer", "Buyer, seller, tenant or landlord"],
  ["Broker", "Agent or channel partner"],
  ["Developer", "Person at a developer company"],
] as const;

function AddAsContactDialog({ record, fileId, onClose }: { record: UploadRecord; fileId: string; onClose: () => void }) {
  const router = useRouter();
  const [type, setType] = useState("");
  const [err, setErr] = useState(false);
  const go = () => {
    if (!type) return setErr(true);
    onClose();
    const [first, ...rest] = record.name.trim().split(/\s+/);
    const p = new URLSearchParams({ first, last: rest.join(" "), mobile: record.mobile, type, from: fileId });
    router.push(`/dashboard/contacts/new?${p}`);
  };
  return (
    <DashDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Add as Contact"
      description={`${record.name} · +91 ${record.mobile}`}
      footer={
        <>
          <Button variant="secondary" className={dialogBtn} onClick={onClose}>
            Cancel
          </Button>
          <Button className={dialogBtn} onClick={go}>
            Continue
          </Button>
        </>
      }
    >
      <fieldset>
        <legend className="mb-2.5 text-[13px] font-semibold">This contact is a *</legend>
        <div role="radiogroup" className="flex flex-col gap-2">
          {TYPES.map(([t, d]) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              onClick={() => (setType(t), setErr(false))}
              className={cn("flex flex-col items-start rounded-[12px] border px-4 py-3 text-left", type === t ? "border-black bg-black text-rez-full-white" : "border-rez-smoke hover:border-black")}
            >
              <b className="text-sm font-semibold">{t}</b>
              <span className={cn("text-xs", type === t ? "text-rez-full-white/80" : "text-rez-graphite")}>{d}</span>
            </button>
          ))}
        </div>
        {err && (
          <p role="alert" className="mt-2 text-xs font-medium text-destructive">
            Pick Customer, Broker or Developer.
          </p>
        )}
      </fieldset>
    </DashDialog>
  );
}

export function UploadFilePage({ id }: { id: string }) {
  const q = useQuery(dq.upload(id));
  const [adding, setAdding] = useState<UploadRecord | null>(null);
  useLayoutEffect(() => () => setAdding(null), []);
  if (q.isError) {
    return q.error instanceof ApiError && q.error.status === 404 ? (
      <EmptyState icon="folder" title="Upload not found." className="bg-white" action={<Link href="/dashboard/database" className="font-semibold underline">Back to Database</Link>} />
    ) : (
      <ErrorState onRetry={() => q.refetch()} />
    );
  }
  if (q.isPending) return <Loading />;
  const { file, records } = q.data;
  return (
    <>
      <PageHeader
        crumbs={["Database"]}
        title={file.name}
        subtitle={`List of ${file.records} records · uploaded ${shortDate(file.date, true)} by ${file.uploadedBy}`}
        actions={
          <HeaderButton variant="default" icon="file-text" onClick={() => downloadSample(file, records)}>
            Download
          </HeaderButton>
        }
      />
      <Link href="/dashboard/database" className="-mt-2 inline-flex w-fit items-center gap-1 text-[13px] font-semibold underline underline-offset-4">
        <Icon name="chevron-left" size={14} /> Back to Database
      </Link>
      <Card className="overflow-hidden">
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[calc(680px*var(--property-space-scale,1))] text-sm">
            <caption className="sr-only">Records in {file.name}</caption>
            <THead>
              <tr>
                {["Name", "Mobile No.", "Contact Status", "Action"].map((h) => (
                  <th key={h} scope="col" className={thClass}>
                    {h}
                  </th>
                ))}
              </tr>
            </THead>
            <tbody>
              {records.map((r) => (
                <tr key={r.mobile} className="border-t border-[#E8E8E8] first:border-t-0">
                  <td className={cn(tdClass, "font-semibold")}>{r.name}</td>
                  <td className={tdClass}>
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      +91 {r.mobile}
                      <WhatsAppLink mobile={r.mobile} name={r.name} />
                    </span>
                  </td>
                  <td className={tdClass}>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap", r.contactId ? "bg-[#E6EDEB] text-rez-timber" : "bg-[#F4F4F4] text-rez-graphite")}>
                      {r.contactId ? `In Contacts · ${r.contactType}` : "Not in Contacts"}
                    </span>
                  </td>
                  <td className={tdClass}>
                    {r.contactId ? (
                      <Button asChild variant="secondary" size="sm" className="h-8 rounded-[8px] px-3 text-xs">
                        <Link href={`/dashboard/contacts/${r.contactId}`}>
                          <Icon name="user" size={13} /> View Contact
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" className="h-8 rounded-[8px] px-3 text-xs" onClick={() => setAdding(r)}>
                        <Icon name="plus" size={13} /> Add as Contact
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TableFooter showing={`Showing 1–${records.length} of ${file.records} records (sample rows in this prototype)`} />
      </Card>
      {adding && <AddAsContactDialog record={adding} fileId={file.id} onClose={() => setAdding(null)} />}
    </>
  );
}
