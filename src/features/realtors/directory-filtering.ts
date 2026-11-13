import type { DirectoryFirm, DirectoryPerson } from "./directory-model";

export type DirectoryGender = "Male" | "Female" | "Not specified";
const normalize = (value: string) => value.trim().toLocaleLowerCase("en");
export const languageLabel = (value: string) => normalize(value) === "gujrati" ? "Gujarati" : value.trim();

/** A temporary title-based classification, never a verified gender attribute. */
export function genderFromSalutation(salutation: string | undefined): DirectoryGender {
  switch ((salutation || "").trim().toLowerCase().replace(/[.\s]/g, "")) {
    case "mr": return "Male";
    case "ms":
    case "mrs":
    case "miss": return "Female";
    default: return "Not specified";
  }
}

function uniqueLabels(values: string[]) {
  const labels = new Map<string, string>();
  for (const value of values) if (value.trim() && !labels.has(normalize(value))) labels.set(normalize(value), value.trim());
  return [...labels.values()].sort((a, b) => a.localeCompare(b));
}

/** Options come from every directory page, independently of the current filters. */
export function directoryOptions(firms: DirectoryFirm[]) {
  const people = firms.flatMap(firm => firm.people);
  const presentGenders = new Set(people.map(person => genderFromSalutation(person.salutation)));
  return {
    locations: uniqueLabels(firms.flatMap(firm => firm.subRegions)),
    specializations: uniqueLabels(firms.flatMap(firm => [...firm.specializations, ...firm.people.flatMap(person => person.specializations)])),
    languages: uniqueLabels(people.flatMap(person => person.languages.map(languageLabel))),
    genders: (["Male", "Female", "Not specified"] as DirectoryGender[]).filter(value => presentGenders.has(value)),
  };
}

/** Apply person filters before counting and pagination; missing values never match known values. */
export function matchesDirectoryPerson(person: DirectoryPerson, filters: { specializations: string[]; language: string; gender: "" | DirectoryGender }) {
  if (filters.specializations.length && !filters.specializations.some(selected => person.specializations.some(value => normalize(value) === normalize(selected)))) return false;
  if (filters.language && !person.languages.some(value => normalize(languageLabel(value)) === normalize(languageLabel(filters.language)))) return false;
  return !filters.gender || genderFromSalutation(person.salutation) === filters.gender;
}
