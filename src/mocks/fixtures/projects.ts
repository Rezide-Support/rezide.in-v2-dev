import type { Project, ProjectStatus } from "@/types/models";
import { PHOTO_IDS, unsplash } from "@/content/media";
import { projectDetailFields } from "./detail-extras";
import { LOCALITY_GEO } from "./properties";

/** SAMPLE PROJECTS. Fixed dataset; RERA numbers are placeholders. */

const CR = 1_00_00_000;
const L = 1_00_000;

type Row = {
  id: string;
  name: string;
  dev: string;
  city: string;
  loc: string;
  status: ProjectStatus;
  year?: number;
  poss: string;
  config: string;
  bhk: string[];
  from: number;
  to: number;
  rate: number;
  area: [number, number];
  acres: number;
  towers: number;
  units: number;
  amen: string[];
  views: string[];
};

const ROWS: Row[] = [
  { id: "lodha-park", name: "Lodha Park", dev: "Lodha Group", city: "Mumbai", loc: "Worli", status: "rtm", poss: "Completed Apr 2019", config: "2, 3 & 4 BHK", bhk: ["2 BHK", "3 BHK", "4 BHK"], from: 6.1 * CR, to: 14 * CR, rate: 52000, area: [1150, 2650], acres: 17, towers: 6, units: 1250, amen: ["Swimming pool", "Clubhouse", "Gymnasium", "Landscaped garden", "Jogging track"], views: ["Sea View", "City Skyline", "Racecourse"] },
  { id: "oberoi-esquire", name: "Oberoi Esquire", dev: "Oberoi Realty", city: "Mumbai", loc: "Goregaon East", status: "rtm", poss: "Completed Oct 2018", config: "3 & 4 BHK", bhk: ["3 BHK", "4 BHK"], from: 4.2 * CR, to: 9.8 * CR, rate: 41500, area: [1250, 2400], acres: 8.4, towers: 3, units: 560, amen: ["Clubhouse", "Swimming pool", "24×7 security", "Kids play area"], views: ["Greenery", "City Skyline"] },
  { id: "oberoi-elysian", name: "Oberoi Elysian", dev: "Oberoi Realty", city: "Mumbai", loc: "Goregaon East", status: "uc", year: 2028, poss: "Possession Jun 2028", config: "2, 3 & 4 BHK", bhk: ["2 BHK", "3 BHK", "4 BHK"], from: 3.4 * CR, to: 8.6 * CR, rate: 39800, area: [890, 2200], acres: 6.2, towers: 4, units: 820, amen: ["Swimming pool", "Gymnasium", "EV charging", "Clubhouse"], views: ["Greenery", "Hill Side"] },
  { id: "raheja-vivarea", name: "Raheja Vivarea", dev: "K Raheja Corp", city: "Mumbai", loc: "Mahalaxmi", status: "rtm", poss: "Completed Jan 2017", config: "3 & 4 BHK", bhk: ["3 BHK", "4 BHK"], from: 7.2 * CR, to: 16 * CR, rate: 58000, area: [1260, 2800], acres: 4.5, towers: 2, units: 240, amen: ["Clubhouse", "Swimming pool", "Spa"], views: ["Racecourse", "Sea View"] },
  { id: "lodha-bellevue", name: "Lodha Bellevue", dev: "Lodha Group", city: "Mumbai", loc: "Mahalaxmi", status: "rtm", poss: "Completed Jul 2022", config: "3 – 4 BHK", bhk: ["3 BHK", "4 BHK"], from: 6.9 * CR, to: 12.5 * CR, rate: 61000, area: [1180, 2050], acres: 3.2, towers: 2, units: 390, amen: ["Infinity pool", "Gymnasium", "Business lounge"], views: ["Racecourse", "City Skyline"] },
  { id: "godrej-vikhroli-sky", name: "Godrej Sky Terraces", dev: "Godrej Properties", city: "Mumbai", loc: "Powai", status: "uc", year: 2027, poss: "Possession Dec 2027", config: "2 & 3 BHK", bhk: ["2 BHK", "3 BHK"], from: 2.3 * CR, to: 4.4 * CR, rate: 32500, area: [720, 1350], acres: 12, towers: 5, units: 1100, amen: ["Clubhouse", "Jogging track", "Kids play area", "EV charging"], views: ["Lake View", "Greenery"] },
  { id: "piramal-vaikunth-thane", name: "Piramal Vaikunth Crest", dev: "Piramal Realty", city: "Mumbai", loc: "Thane West", status: "uc", year: 2026, poss: "Possession Dec 2026", config: "1 & 2 BHK", bhk: ["1 BHK", "2 BHK"], from: 92 * L, to: 1.9 * CR, rate: 18200, area: [460, 980], acres: 22, towers: 8, units: 1800, amen: ["Clubhouse", "Swimming pool", "Landscaped garden"], views: ["Hill Side", "Forest"] },
  { id: "tata-serein-chembur", name: "Tata Serein Bay", dev: "Tata Housing", city: "Mumbai", loc: "Chembur", status: "nl", poss: "Launch Dec 2026", config: "2 & 3 BHK", bhk: ["2 BHK", "3 BHK"], from: 1.8 * CR, to: 3.6 * CR, rate: 27500, area: [690, 1240], acres: 5.1, towers: 3, units: 540, amen: ["Clubhouse", "Gymnasium", "Kids play area"], views: ["City Skyline", "Park"] },
  { id: "mahindra-andheri-one", name: "Mahindra Andheri One", dev: "Mahindra Lifespaces", city: "Mumbai", loc: "Andheri West", status: "nl", poss: "Launch Nov 2026", config: "3 BHK", bhk: ["3 BHK"], from: 3.9 * CR, to: 5.2 * CR, rate: 38800, area: [1020, 1310], acres: 2.4, towers: 1, units: 180, amen: ["Rooftop pool", "Gymnasium"], views: ["Sea View", "Main Road"] },
  { id: "prestige-lakeside-blr", name: "Prestige Lakeside Habitat", dev: "Prestige Group", city: "Bengaluru", loc: "Whitefield", status: "rtm", poss: "Completed Mar 2020", config: "2, 3 & 4 BHK", bhk: ["2 BHK", "3 BHK", "4 BHK"], from: 1.2 * CR, to: 3.4 * CR, rate: 11200, area: [1100, 2900], acres: 102, towers: 30, units: 3400, amen: ["Swimming pool", "Clubhouse", "Lake promenade"], views: ["Lake View", "Greenery"] },
  { id: "sobha-hrc-hebbal", name: "Sobha HRC Pristine", dev: "Sobha Ltd", city: "Bengaluru", loc: "Hebbal", status: "uc", year: 2028, poss: "Possession Mar 2028", config: "3 & 4 BHK", bhk: ["3 BHK", "4 BHK"], from: 2.6 * CR, to: 5.1 * CR, rate: 14800, area: [1700, 3300], acres: 11, towers: 6, units: 820, amen: ["Swimming pool", "Clubhouse", "EV charging"], views: ["Lake View"] },
  { id: "brigade-eldorado", name: "Brigade El Dorado", dev: "Brigade Group", city: "Bengaluru", loc: "Devanahalli", status: "nl", poss: "Launch Nov 2026", config: "1, 2 & 3 BHK", bhk: ["1 BHK", "2 BHK", "3 BHK"], from: 62 * L, to: 1.5 * CR, rate: 7800, area: [640, 1520], acres: 50, towers: 18, units: 2600, amen: ["Clubhouse", "Sports arena", "Kids play area"], views: ["Landscape", "Panoramic"] },
  { id: "kolte-patil-life-republic", name: "Life Republic Sector R10", dev: "Kolte Patil", city: "Pune", loc: "Hinjewadi", status: "uc", year: 2027, poss: "Possession Sep 2027", config: "1, 2 & 3 BHK", bhk: ["1 BHK", "2 BHK", "3 BHK"], from: 55 * L, to: 1.3 * CR, rate: 7400, area: [520, 1210], acres: 390, towers: 14, units: 2100, amen: ["Township school", "Clubhouse", "Jogging track"], views: ["Hill Side", "Greenery"] },
  { id: "panchshil-yoo-kp", name: "Panchshil YOO Pune", dev: "Panchshil Realty", city: "Pune", loc: "Koregaon Park", status: "rtm", poss: "Completed Aug 2016", config: "4 BHK", bhk: ["4 BHK"], from: 9.5 * CR, to: 18 * CR, rate: 26000, area: [3600, 7000], acres: 4, towers: 2, units: 96, amen: ["Private elevators", "Spa", "Swimming pool"], views: ["City Skyline", "Panoramic"] },
  { id: "my-home-tridasa", name: "My Home Tridasa", dev: "My Home Group", city: "Hyderabad", loc: "Tellapur", status: "uc", year: 2029, poss: "Possession Mar 2029", config: "3 & 4 BHK", bhk: ["3 BHK", "4 BHK"], from: 1.6 * CR, to: 3.4 * CR, rate: 8900, area: [1800, 3800], acres: 26, towers: 9, units: 2600, amen: ["Clubhouse", "Swimming pool", "Cricket pitch"], views: ["Landscape", "Lake View"] },
  { id: "dlf-privana-ggn", name: "DLF Privana South", dev: "DLF", city: "Gurugram", loc: "Sector 65", status: "uc", year: 2029, poss: "Possession Jun 2029", config: "4 BHK", bhk: ["4 BHK"], from: 7.2 * CR, to: 11 * CR, rate: 19800, area: [3500, 5500], acres: 25, towers: 7, units: 1100, amen: ["Clubhouse", "Golf putting green", "Swimming pool"], views: ["Golf Course", "Panoramic"] },
  { id: "godrej-woods-noida", name: "Godrej Woods", dev: "Godrej Properties", city: "Noida", loc: "Sector 150", status: "nl", poss: "Launch Dec 2026", config: "3 & 4 BHK", bhk: ["3 BHK", "4 BHK"], from: 2.2 * CR, to: 4.6 * CR, rate: 12400, area: [1700, 3400], acres: 15, towers: 8, units: 1300, amen: ["Forest trail", "Clubhouse", "Swimming pool"], views: ["Forest", "Greenery"] },
];

const LOCALITY_FALLBACK: Record<string, [number, number]> = {
  Tellapur: [17.47, 78.285],
  Devanahalli: [13.2437, 77.7135],
};

export const PROJECTS: Project[] = ROWS.map((r, i) => {
  const geo = LOCALITY_GEO[r.loc] ?? LOCALITY_FALLBACK[r.loc] ?? [19.07, 72.88];
  const pool = PHOTO_IDS.projects;
  const coords: [number, number] = [geo[0] + 0.004 * ((i % 3) - 1), geo[1] + 0.004 * ((i % 2) - 0.5)];
  return {
    id: r.id,
    name: r.name,
    developer: r.dev,
    city: r.city,
    locality: r.loc,
    status: r.status,
    possessionYear: r.year,
    possessionLabel: r.poss,
    configurations: r.config,
    bhkOptions: r.bhk,
    priceFrom: Math.round(r.from),
    priceTo: Math.round(r.to),
    ratePerSqft: r.rate,
    areaMin: r.area[0],
    areaMax: r.area[1],
    acres: r.acres,
    towers: r.towers,
    units: r.units,
    amenities: r.amen,
    views: r.views,
    reraId: `P51900${String(30000 + i * 1373).padStart(6, "0")}`,
    images: [0, 1, 2, 3].map((k) => unsplash(pool[(i + k) % pool.length], 1400, r.id)),
    coords,
    description: `${r.name} by ${r.dev} in ${r.loc}, ${r.city}: ${r.towers} towers and ${r.units.toLocaleString("en-IN")} homes across ${r.acres} acres. This is sample project content for the prototype.`,
    // Detail-page fields (v1 project page): deterministic sample values.
    ...projectDetailFields(r, i, coords),
  };
});
