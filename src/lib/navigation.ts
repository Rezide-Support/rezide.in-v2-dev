/**
 * Primary navigation. Desktop and mobile menus both render from this list,
 * so they always open the same routes.
 */
export type NavItem = {
  id: "properties" | "projects" | "list" | "realtor" | "corner";
  label: string;
  href: string;
  /** Path prefixes that mark this item as current. */
  match: string[];
  separatorBefore?: boolean;
};


export const NAV_ITEMS: NavItem[] = [
  {
    id: "properties",
    label: "Properties",
    href: "/",
    match: ["/", "/properties", "/homes", "/offices", "/retail", "/industrial", "/land"],
  },
  { id: "projects", label: "Projects", href: "/projects", match: ["/projects"] },
  { id: "list", label: "List Property", href: "/list-property", match: ["/list-property"] },
  { id: "realtor", label: "Find Realtor", href: "/realtors", match: ["/realtors"] },
  { id: "corner", label: "Realtor Corner", href: "/realtor-corner", match: ["/realtor-corner"], separatorBefore: true },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return item.match.some((prefix) =>
    prefix === "/" ? pathname === "/" : pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Footer links. Only destinations that exist in this build are linked;
 * the rest are listed as pending content (see README → Pending content).
 */
export const FOOTER_COLUMNS: { label: string; href?: string }[][] = [
  [
    { label: "Explore", href: "/properties" },
    { label: "Features" },
    { label: "Newsletter" },
  ],
  [{ label: "Company" }, { label: "Careers" }, { label: "Blog" }, { label: "Learning center" }],
  // Phones lay this group out in two columns, row by row: Support | Privacy Policy, Terms of use | Cookies Policy.
  [{ label: "Support" }, { label: "Privacy Policy" }, { label: "Terms of use" }, { label: "Cookies Policy" }],
];
