import {
  AirVent,
  ArrowUpDown,
  Armchair,
  BedDouble,
  Bike,
  BrickWall,
  Briefcase,
  Building2,
  Car,
  Coffee,
  CookingPot,
  Droplets,
  Dumbbell,
  FileCheck,
  Flag,
  Flame,
  Flower2,
  Footprints,
  Gamepad2,
  Lightbulb,
  PlugZap,
  Route,
  School,
  ShieldCheck,
  ShowerHead,
  Signpost,
  Sofa,
  Sparkles,
  TreePine,
  Trees,
  Trophy,
  Truck,
  Users,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";

const RULES: [RegExp, LucideIcon][] = [
  [/pool|lake|promenade/i, Waves],
  [/gym/i, Dumbbell],
  [/garden|landscap/i, Trees],
  [/forest/i, TreePine],
  [/jogging|trail/i, Footprints],
  [/kids|play/i, Gamepad2],
  [/security|safety/i, ShieldCheck],
  [/fire/i, Flame],
  [/lift|elevator/i, ArrowUpDown],
  [/power/i, Zap],
  [/ev charging/i, PlugZap],
  [/parking/i, Car],
  [/cafeteria/i, Coffee],
  [/spa/i, Flower2],
  [/school/i, School],
  [/cricket|sports/i, Trophy],
  [/golf/i, Flag],
  [/lounge|office|business/i, Briefcase],
  [/air condition|^air conditioners$/i, AirVent],
  [/truck/i, Truck],
  [/road/i, Route],
  [/water/i, Droplets],
  [/wall/i, BrickWall],
  [/title/i, FileCheck],
  [/footfall/i, Users],
  [/signage/i, Signpost],
  [/club/i, Building2],
  [/cycl/i, Bike],
  [/wardrobe/i, Armchair],
  [/kitchen/i, CookingPot],
  [/geyser/i, ShowerHead],
  [/bed/i, BedDouble],
  [/sofa|dining/i, Sofa],
  [/light/i, Lightbulb],
];

/** Best-effort icon for an amenity or fitting name. */
export function amenityIcon(name: string): LucideIcon {
  return RULES.find(([re]) => re.test(name))?.[1] ?? Sparkles;
}

function amenityGlyph(name: string) {
  const IconCmp = amenityIcon(name);
  return <IconCmp className="size-7 text-black" strokeWidth={1.5} aria-hidden />;
}

/** Icon tile (v1 amenity grid). */
export function AmenityTile({ name, className }: { name: string; className?: string }) {
  return (
    <div
      className={`flex h-full min-h-[112px] flex-col items-center justify-center gap-3 rounded-lg border border-rez-smoke/70 bg-white px-3 py-4 text-center shadow-rez-sm ${className ?? ""}`}
    >
      {amenityGlyph(name)}
      <span className="text-[13px] leading-snug text-rez-arsenic sm:text-sm">{name}</span>
    </div>
  );
}
