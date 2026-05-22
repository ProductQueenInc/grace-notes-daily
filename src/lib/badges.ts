export type BadgeTier = "none" | "copper" | "silver" | "gold";

export function badgeForCount(n: number): BadgeTier {
  if (n >= 3) return "gold";
  if (n === 2) return "silver";
  if (n === 1) return "copper";
  return "none";
}

export function badgeLabel(tier: BadgeTier): string {
  return tier === "gold" ? "Gold coin" : tier === "silver" ? "Silver badge" : tier === "copper" ? "Copper badge" : "No badge yet";
}

/** Hex colors for the small circular calendar coin */
export function badgeColors(tier: BadgeTier): { bg: string; ring: string; fg: string } {
  if (tier === "gold") return { bg: "linear-gradient(135deg,#f4cf5a,#c98f1c)", ring: "#b07a10", fg: "#3a2a06" };
  if (tier === "silver") return { bg: "linear-gradient(135deg,#e7ecf2,#9aa6b3)", ring: "#76808b", fg: "#2a2f36" };
  if (tier === "copper") return { bg: "linear-gradient(135deg,#e6a37a,#a85a2c)", ring: "#7d3f1d", fg: "#2a1208" };
  return { bg: "transparent", ring: "transparent", fg: "inherit" };
}
