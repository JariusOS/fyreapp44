/**
 * FCBC Fyre Hybrid Engine (FHE) — core rules.
 * Engine ID: FCBC-FHE-1.0. Implements the rule-only parts of the Fyre Breeding
 * Engine specification: identity, DNA ledger, class profile, expression bands,
 * frame tendency, iconic-feature visibility, size and validation gates.
 * Phenotype, traits and performance need ACTIVE PTIS species pools and are
 * reported as pending; nothing is invented.
 */

export const ENGINE_ID = "FCBC-FHE-1.0";
export const SPECIES_INDEX_SIZE = 1234;
export const RATIOS = [10, 20, 30, 40, 50, 60, 70, 80, 90] as const;

export type ClassNo = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type Config = "STANDARD" | "ENZYME";
export type Band = "I" | "II" | "III" | "IV";
export type PoolStatus = "DRAFT" | "RESEARCHING" | "PARTIAL" | "REVIEW" | "VERIFIED" | "ACTIVE";

export interface ClassProfile {
  dna: number; size: number; potency: number; maxBonus: number;
}

/** Class calibration: DNA threshold, linear size, ability potency, max class bonus. */
export const CLASSES: Record<ClassNo, ClassProfile> = {
  1: { dna: 10_000, size: 1.0, potency: 1.0, maxBonus: 0 },
  2: { dna: 20_000, size: 1.06, potency: 1.08, maxBonus: 2 },
  3: { dna: 100_000, size: 1.13, potency: 1.18, maxBonus: 4 },
  4: { dna: 500_000, size: 1.21, potency: 1.3, maxBonus: 7 },
  5: { dna: 1_000_000, size: 1.3, potency: 1.44, maxBonus: 10 },
  6: { dna: 5_000_000, size: 1.4, potency: 1.6, maxBonus: 13 },
  7: { dna: 10_000_000, size: 1.51, potency: 1.78, maxBonus: 16 },
  8: { dna: 25_000_000, size: 1.63, potency: 1.98, maxBonus: 19 },
  9: { dna: 50_000_000, size: 1.76, potency: 2.2, maxBonus: 22 },
  10: { dna: 100_000_000, size: 1.9, potency: 2.45, maxBonus: 25 },
};

/** Disposition of gross DNA input in basis points (sums to 10,000). */
export interface SplitBp {
  burned: number; custodian: number; ecosystemFund: number; conservationFund: number; breederRefund: number;
}

export const SPLIT_BP: Record<Config, SplitBp> = {
  STANDARD: { burned: 5000, custodian: 200, ecosystemFund: 300, conservationFund: 500, breederRefund: 4000 },
  ENZYME: { burned: 0, custodian: 200, ecosystemFund: 300, conservationFund: 500, breederRefund: 9000 },
};

export const E3_PROBABILITY: Record<Config, number> = { STANDARD: 0.1, ENZYME: 0.5 };
export const CDIE_PROBABILITY = 0.2; // C2-C10
export const CUSTODIAN_FALLBACK = "0x57bcd9147d9d9507be65ccceabab6c47002a7dd0";
export const ENZYME_NFT = { chain: "Base", contract: "0x912dEBfeb44FcE13FC971CFcaa71D659a84Eab1a", maxSupply: 910 };
export const SPECIES_SUPPLY = 1_000_000_000; // nominal DNA units per species

const ROMAN = ["", "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];

export function roman(c: ClassNo): string {
  return ROMAN[c] as string;
}

export function isClassNo(n: number): n is ClassNo {
  return Number.isInteger(n) && n >= 1 && n <= 10;
}

/** Order parents by species ID; each ratio moves with its parent. */
export function canonicalise(a: number, b: number, ratioA: number) {
  return a <= b ? { a, b, ratioA, ratioB: 100 - ratioA } : { a: b, b: a, ratioA: 100 - ratioA, ratioB: ratioA };
}

const pad = (n: number, w: number) => String(n).padStart(w, "0");

/**
 * Full hybrid name: {roman class}{ratioA}{ratioB}-{AAAA}:{BBBB}-{iteration}
 * e.g. iv7030-0007:0008-000236 = Class 4, 70% species 7, 30% species 8, 236th iteration.
 */
export function hybridName(cls: ClassNo, a: number, b: number, ratioA: number, iteration: number): string {
  validateInputs(a, b, ratioA, cls);
  if (!Number.isInteger(iteration) || iteration < 1 || iteration > 999_999) {
    throw new RangeError("iteration must be 1-999999");
  }
  const c = canonicalise(a, b, ratioA);
  return `${roman(cls)}${pad(c.ratioA, 2)}${pad(c.ratioB, 2)}-${pad(c.a, 4)}:${pad(c.b, 4)}-${pad(iteration, 6)}`;
}

/** Recipe key without iteration: identifies "the same breed" for iteration counting. */
export function recipeKey(cls: ClassNo, a: number, b: number, ratioA: number): string {
  return hybridName(cls, a, b, ratioA, 1).slice(0, -7);
}

/** Parse a full hybrid name back into its parts. */
export function parseHybridName(name: string) {
  const m = /^(x|ix|viii|vii|vi|v|iv|iii|ii|i)(\d{2})(\d{2})-(\d{4}):(\d{4})-(\d{6})$/.exec(name);
  if (!m) throw new SyntaxError(`not a valid hybrid name: ${name}`);
  const cls = ROMAN.indexOf(m[1] as string) as ClassNo;
  const [ratioA, ratioB, a, b, iteration] = m.slice(2).map(Number) as [number, number, number, number, number];
  if (ratioA + ratioB !== 100) throw new SyntaxError("ratios must sum to 100");
  return { cls, ratioA, ratioB, a, b, iteration };
}

export function validateInputs(a: number, b: number, ratioA: number, cls: number): void {
  for (const id of [a, b]) {
    if (!Number.isInteger(id) || id < 1 || id > SPECIES_INDEX_SIZE) throw new RangeError(`species ${id} is outside the index`);
  }
  if (a === b) throw new RangeError("parents must be different species");
  if (!(RATIOS as readonly number[]).includes(ratioA)) throw new RangeError("ratio must be 10-90 in steps of 10");
  if (!isClassNo(cls)) throw new RangeError("class must be 1-10");
}

export interface LedgerRow {
  grossInput: number; burned: number; custodian: number; ecosystemFund: number;
  conservationFund: number; breederRefund: number; netCost: number;
}

/** Exact integer ledger per parent; rejects anything not representable. */
export function ledger(cls: ClassNo, ratioA: number, config: Config = "STANDARD"): { A: LedgerRow; B: LedgerRow; total: LedgerRow } {
  const split = SPLIT_BP[config];
  const dna = CLASSES[cls].dna;
  const row = (r: number): LedgerRow => {
    if ((dna * r) % 100) throw new RangeError("allocation not representable in whole units");
    const g = (dna * r) / 100;
    const share = (bp: number) => {
      if ((g * bp) % 10_000) throw new RangeError("share not representable in whole units");
      return (g * bp) / 10_000;
    };
    const out = {
      grossInput: g, burned: share(split.burned), custodian: share(split.custodian),
      ecosystemFund: share(split.ecosystemFund), conservationFund: share(split.conservationFund),
      breederRefund: share(split.breederRefund), netCost: 0,
    };
    out.netCost = g - out.breederRefund;
    const sum = out.burned + out.custodian + out.ecosystemFund + out.conservationFund + out.breederRefund;
    if (sum !== g) throw new Error("ledger does not reconcile");
    return out;
  };
  const A = row(ratioA), B = row(100 - ratioA);
  const total = Object.fromEntries(Object.keys(A).map(k => [k, (A as any)[k] + (B as any)[k]])) as unknown as LedgerRow;
  return { A, B, total };
}

export function expressionBand(minority: number): Band {
  if (!(minority > 0 && minority <= 50)) throw new RangeError("minority must be in (0, 50]");
  if (minority < 10) return "I";
  if (minority < 30) return "II";
  if (minority < 40) return "III";
  return "IV";
}

export const BAND_INFO: Record<Band, { name: string; arbitration: string; result: string }> = {
  I: { name: "Sub-Expression", arbitration: "Low", result: "Traceable cues only" },
  II: { name: "Structural Integration", arbitration: "Moderate", result: "Secondary structures emerge; iconic features visibly grow" },
  III: { name: "Integrated Expression", arbitration: "Elevated", result: "Major secondary anatomy; behaviour and abilities integrate" },
  IV: { name: "Morphology Arbitration", arbitration: "High", result: "Both body plans compete; highest novelty" },
};

export function frameTendency(ratioA: number): "PARENT_A" | "PARENT_B" | "NEUTRAL" {
  return ratioA > 50 ? "PARENT_A" : ratioA < 50 ? "PARENT_B" : "NEUTRAL";
}

const ICONIC = [
  { min: 40, visual: "Prominent, competing with the other parent's iconic anatomy", fn: "Strong, with arbitration and trade-offs" },
  { min: 30, visual: "Major feature that visibly changes the silhouette", fn: "Functional, if prerequisites hold" },
  { min: 20, visual: "Noticeable secondary structure integrated into the body plan", fn: "Partial" },
  { min: 10, visual: "Clearly identifiable small iconic structure", fn: "Limited or partial" },
  { min: 0, visual: "Traceable marking, texture or tiny cue", fn: "Usually cosmetic or vestigial" },
];

export function iconicRequirement(share: number) {
  const r = ICONIC.find(x => share >= x.min)!;
  return { visual: r.visual, functional: r.fn };
}

/** Renderer identity sentence that follows the band (never a fixed "dominant parent"). */
export function identitySentence(ratioA: number, nameA: string, nameB: string): string {
  const ratioB = 100 - ratioA;
  const [maj, mnr] = ratioA >= ratioB ? [nameA, nameB] : [nameB, nameA];
  const m = Math.min(ratioA, ratioB);
  const band = expressionBand(m);
  if (band === "IV" && m === 50) return `Neither ${nameA} nor ${nameB} dominates; both body plans resolve into a new composite carrying both parents' iconic anatomy.`;
  if (band === "IV") return `The ${maj} has a slight frame tendency, but both body plans compete in a novel composite.`;
  if (band === "III") return `The ${maj} sets the primary frame; the ${mnr} contributes major structures that visibly change the silhouette.`;
  return `The ${maj} sets the body plan; the ${mnr} is clearly recognisable through integrated secondary structures.`;
}

/** Ratio-weighted geometric mean of parent masses, scaled by the cube of the linear class multiplier. */
export function sizeMass(massA: number, massB: number, ratioA: number, cls: ClassNo) {
  const base = Math.exp((ratioA / 100) * Math.log(massA) + ((100 - ratioA) / 100) * Math.log(massB));
  const s = CLASSES[cls].size;
  return { baselineKg: base, linear: s, massMultiplier: s ** 3, finalKg: base * s ** 3 };
}

export const POOL_ORDER: PoolStatus[] = ["DRAFT", "RESEARCHING", "PARTIAL", "REVIEW", "VERIFIED", "ACTIVE"];

export function poolAllows(status: PoolStatus, mode: "SIMULATE" | "COMMIT"): boolean {
  return POOL_ORDER.indexOf(status) >= POOL_ORDER.indexOf(mode === "COMMIT" ? "ACTIVE" : "PARTIAL");
}
