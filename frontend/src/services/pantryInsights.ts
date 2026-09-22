import type { PantryRow } from "./pantry";

export type PantryInsight = {
  id: string;
  name: string;
  category: string;
  daysLeft: number | null;
  urgency: "expired" | "today" | "soon" | "fresh" | "no-expiry";
  score: number;
  message: string;
};

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

export function daysUntilExpiry(expiresOn: string | null): number | null {
  if (!expiresOn) return null;
  const expiry = new Date(expiresOn + "T00:00:00");
  if (Number.isNaN(expiry.getTime())) return null;
  return Math.ceil((expiry.getTime() - startOfToday()) / 86400000);
}

export function freshnessScore(daysLeft: number | null): number {
  if (daysLeft === null) return 5;
  if (daysLeft < 0) return 100;
  if (daysLeft === 0) return 95;
  if (daysLeft <= 2) return 80;
  if (daysLeft <= 5) return 55;
  if (daysLeft <= 10) return 30;
  return 10;
}

function urgencyFor(daysLeft: number | null): PantryInsight["urgency"] {
  if (daysLeft === null) return "no-expiry";
  if (daysLeft < 0) return "expired";
  if (daysLeft === 0) return "today";
  if (daysLeft <= 5) return "soon";
  return "fresh";
}

function messageFor(name: string, daysLeft: number | null): string {
  if (daysLeft === null) return `${name} has no expiry date yet.`;
  if (daysLeft < 0) return `${name} is past its recorded expiry date.`;
  if (daysLeft === 0) return `${name} is due today. Consider using it first.`;
  if (daysLeft === 1) return `${name} is best used within 1 day.`;
  if (daysLeft <= 5) return `${name} is best used within ${daysLeft} days.`;
  return `${name} has ${daysLeft} days before its recorded expiry.`;
}

export function buildPantryInsights(pantry: PantryRow[]): PantryInsight[] {
  return pantry
    .map((item) => {
      const daysLeft = daysUntilExpiry(item.expires_on);
      return {
        id: item.id,
        name: item.name,
        category: item.category ?? "Pantry",
        daysLeft,
        urgency: urgencyFor(daysLeft),
        score: freshnessScore(daysLeft),
        message: messageFor(item.name, daysLeft),
      };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export function summarizePantry(pantry: PantryRow[]) {
  const insights = buildPantryInsights(pantry);
  return {
    total: insights.length,
    expired: insights.filter((item) => item.urgency === "expired").length,
    dueToday: insights.filter((item) => item.urgency === "today").length,
    dueSoon: insights.filter((item) => item.urgency === "soon").length,
    dated: insights.filter((item) => item.daysLeft !== null).length,
    topPriority: insights[0] ?? null,
  };
}
