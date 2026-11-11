// The five landing variants. Each design folder exports `meta` from meta.ts;
// this file only collects them so the gallery and the switcher stay in sync.

export interface DesignMeta {
  /** Short display name, e.g. "Полночь в Гаване". */
  name: string;
  /** One line about the mood. */
  tagline: string;
  /** Three or four hex colours that represent the design, darkest first. */
  palette: readonly string[];
}

export const DESIGN_IDS = ["d1", "d2", "d3", "d4", "d5"] as const;
export type DesignId = (typeof DESIGN_IDS)[number];

const modules = import.meta.glob<{ meta: DesignMeta }>("../designs/*/meta.ts", {
  eager: true,
});

export interface DesignEntry extends DesignMeta {
  id: DesignId;
  /** 1-based number; the page lives at /<number>/. */
  number: number;
}

export const designs: DesignEntry[] = DESIGN_IDS.map((id, index) => {
  const found = modules[`../designs/${id}/meta.ts`];
  if (!found) throw new Error(`Missing src/designs/${id}/meta.ts`);
  return { id, number: index + 1, ...found.meta };
});

/** Prefixes a site path with the deploy base ("/dima-karpo-lp"). */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/${path.replace(/^\//, "")}`;
}
