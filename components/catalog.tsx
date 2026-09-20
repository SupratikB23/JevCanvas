// Developer-defined component catalog: stable names, zod prop schemas,
// candidate descriptions, slots, events, allowed actions.
// This is the capability boundary: Jev selects, never invents.
import { z } from "zod";
import { CATALOG_COMPONENTS } from "../lib/constants";

export const PropSchemas = {
  PageShell: z.object({ title: z.string().default(""), sidebar: z.boolean().default(false) }),
  Section: z.object({ title: z.string().default("") }),
  Hero: z.object({
    title: z.string().default(""),
    subtitle: z.string().default(""),
    backgroundAssetId: z.string().optional(),
    assetUrl: z.string().optional(),
  }),
  Heading: z.object({ text: z.string().default(""), level: z.number().int().min(1).max(3).default(2) }),
  Paragraph: z.object({ text: z.string().default("") }),
  MetricCard: z.object({
    items: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
  }),
  Card: z.object({ title: z.string().default("") }),
  Button: z.object({ label: z.string().default("Action"), variant: z.string().default("primary") }),
  Badge: z.object({ text: z.string().default(""), tone: z.string().default("neutral") }),
  Tabs: z.object({ tabs: z.array(z.string()).default([]), active: z.string().default("") }),
  Chart: z.object({ title: z.string().default(""), series: z.array(z.unknown()).default([]) }),
  Table: z.object({
    columns: z.array(z.string()).default([]),
    rows: z.array(z.array(z.string())).default([]),
  }),
  Timeline: z.object({
    items: z.array(z.object({ title: z.string(), detail: z.string().optional() })).default([]),
  }),
  Image: z.object({ src: z.string().default(""), alt: z.string().default(""), assetUrl: z.string().optional() }),
  Grid: z.object({ columns: z.number().int().min(1).max(4).default(2) }),
  Stack: z.object({ gap: z.string().default("md") }),
  Divider: z.object({}),
} satisfies Record<(typeof CATALOG_COMPONENTS)[number], z.ZodType>;

export interface CatalogEntry {
  type: string;
  description: string;
  slots: string[];
  events: string[];
  allowedActions: string[];
}

export const CATALOG: CatalogEntry[] = [
  { type: "PageShell", description: "Root page shell with optional sidebar", slots: ["main"], events: [], allowedActions: [] },
  { type: "Section", description: "Titled content section", slots: ["body"], events: [], allowedActions: [] },
  { type: "Hero", description: "Large hero with headline and background visual", slots: [], events: [], allowedActions: [] },
  { type: "Heading", description: "Section heading text", slots: [], events: [], allowedActions: [] },
  { type: "Paragraph", description: "Body paragraph text", slots: [], events: [], allowedActions: [] },
  { type: "MetricCard", description: "Row of KPI metric cards", slots: [], events: [], allowedActions: [] },
  { type: "Card", description: "Generic content card", slots: ["body"], events: [], allowedActions: ["noop"] },
  { type: "Button", description: "Primary action button", slots: [], events: ["press"], allowedActions: ["navigate", "setState", "submit", "noop"] },
  { type: "Badge", description: "Small status badge", slots: [], events: [], allowedActions: [] },
  { type: "Tabs", description: "Tab switcher", slots: [], events: ["change"], allowedActions: ["selectTab", "setState"] },
  { type: "Chart", description: "Chart panel (bars rendered deterministically)", slots: [], events: [], allowedActions: [] },
  { type: "Table", description: "Simple data table", slots: [], events: [], allowedActions: [] },
  { type: "Timeline", description: "Vertical event timeline", slots: [], events: [], allowedActions: [] },
  { type: "Image", description: "Generated image slot with fallback", slots: [], events: [], allowedActions: [] },
  { type: "Grid", description: "Multi-column grid layout", slots: ["cells"], events: [], allowedActions: [] },
  { type: "Stack", description: "Vertical stack layout", slots: ["items"], events: [], allowedActions: [] },
  { type: "Divider", description: "Horizontal divider", slots: [], events: [], allowedActions: [] },
];

export function describeCatalogForJev(): string {
  return CATALOG.map((c) => `${c.type}: ${c.description}`).join("\n");
}
