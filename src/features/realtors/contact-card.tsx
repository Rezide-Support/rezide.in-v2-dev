"use client";

import { DirectoryLeadForm } from "./directory-forms";

/** Legacy profile routes share the same contact fields, validation and endpoint. */
export function ContactCard({ firmId, recipient }: { firmId: string; recipient: string }) {
  return <DirectoryLeadForm firmId={firmId} recipient={recipient} stacked />;
}