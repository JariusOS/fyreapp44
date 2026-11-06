/**
 * Builds a Fyre Hybrid datasheet from a breeding request using FHE core rules.
 * Pure function: no DOM, no network. The UI renders whatever this returns.
 */
import type { ClassNo, Config, LedgerRow } from "./core";
import {
  ENGINE_ID, CLASSES, BAND_INFO, CDIE_PROBABILITY, E3_PROBABILITY,
  SPECIES_SUPPLY, CUSTODIAN_FALLBACK, canonicalise, hybridName, recipeKey, roman, ledger, expressionBand,
  frameTendency, iconicRequirement, identitySentence, sizeMass, poolAllows, validateInputs,
} from "./core";
import { species, displayName, type SpeciesEntry } from "./registry";
import { pureBreedOf, type PureBreedView } from "./purebreed";

export interface BreedRequest {
  parentA: number;
  parentB: number;
  ratioA: number;      // 10-90, share of parentA as selected by the user
  cls: ClassNo;
  config: Config;
  iteration: number;
}

export interface ParentView {
  side: "A" | "B";
  entry: SpeciesEntry;
  name: string;
  ratio: number;
  role: string;
  iconic: { visual: string; functional: string };
  purebreed: PureBreedView;
}

export type ValidationStatus = "SIMULATION_READY" | "NEEDS_SPECIES_DATA";

export interface Datasheet {
  engine: string;
  name: string;
  recipe: string;
  classLabel: string;
  parents: [ParentView, ParentView];
  classProfile: {
    cls: ClassNo; roman: string; dna: number; linearSize: number; massMultiplier: number;
    potency: number; maxBonus: number; e3Chance: number; cdieChance: number;
  };
  ledger: { config: Config; A: LedgerRow; B: LedgerRow; total: LedgerRow; supplyShareA: number; supplyShareB: number };
  ledgerAlt: { config: Config; total: LedgerRow };
  expression: {
    minority: number; band: string; bandName: string; arbitration: string; result: string;
    frameTendency: string; identitySentence: string;
  };
  size: { status: "CALCULATED"; baselineKg: number; finalKg: number; notes: string[] } | { status: "PENDING"; reason: string };
  pending: string[];
  validation: { status: ValidationStatus; messages: string[] };
  custodian: string;
}

const FRAME_TEXT: Record<ReturnType<typeof frameTendency>, (a: string, b: string) => string> = {
  PARENT_A: (a) => `${a} frame tendency`,
  PARENT_B: (_a, b) => `${b} frame tendency`,
  NEUTRAL: () => "Neutral: neither parent dominates",
};

export function buildDatasheet(req: BreedRequest, names: Record<number, string> = {}): Datasheet {
  validateInputs(req.parentA, req.parentB, req.ratioA, req.cls);
  const c = canonicalise(req.parentA, req.parentB, req.ratioA);
  const ea = species(c.a), eb = species(c.b);
  const nameOf = (e: SpeciesEntry) => names[e.id] ?? displayName(e);
  const na = nameOf(ea), nb = nameOf(eb);
  const minority = Math.min(c.ratioA, c.ratioB);
  const band = expressionBand(minority);
  const ft = frameTendency(c.ratioA);
  const cp = CLASSES[req.cls];

  const role = (r: number) => (r > 50 ? "Majority: sets the primary frame" : r < 50 ? "Minority: integrated signature structures" : "Equal: competes for the frame");
  // The visibility rule applies to the minority (or equal) parent; the majority parent carries the frame.
  const iconic = (r: number) => r > 50
    ? { visual: "Full iconic anatomy on the primary frame", functional: "Full, subject to arbitration with the minority's structures" }
    : iconicRequirement(r);
  const parents: [ParentView, ParentView] = [
    { side: "A", entry: ea, name: na, ratio: c.ratioA, role: role(c.ratioA), iconic: iconic(c.ratioA), purebreed: pureBreedOf(ea) },
    { side: "B", entry: eb, name: nb, ratio: c.ratioB, role: role(c.ratioB), iconic: iconic(c.ratioB), purebreed: pureBreedOf(eb) },
  ];

  const L = ledger(req.cls, c.ratioA, req.config);
  const altConfig: Config = req.config === "STANDARD" ? "ENZYME" : "STANDARD";

  let size: Datasheet["size"];
  if (ea.massKg !== undefined && eb.massKg !== undefined) {
    const s = sizeMass(ea.massKg, eb.massKg, c.ratioA, req.cls);
    size = { status: "CALCULATED", baselineKg: s.baselineKg, finalKg: s.finalKg,
             notes: [ea, eb].map(e => `${nameOf(e)}: ${e.massKg} kg (${e.massNote})`) };
  } else {
    size = { status: "PENDING", reason: "Reference adult mass is not yet recorded for " +
      [ea, eb].filter(e => e.massKg === undefined).map(nameOf).join(" and ") };
  }

  const messages: string[] = [];
  const ready = poolAllows(ea.pool, "SIMULATE") && poolAllows(eb.pool, "SIMULATE");
  for (const e of [ea, eb]) {
    messages.push(`${nameOf(e)} species data: ${e.pool}${poolAllows(e.pool, "SIMULATE") ? " (simulation only)" : " (below PARTIAL)"}`);
  }
  messages.push("Settlement needs both species at ACTIVE.");

  return {
    engine: ENGINE_ID,
    name: hybridName(req.cls, req.parentA, req.parentB, req.ratioA, req.iteration),
    recipe: recipeKey(req.cls, req.parentA, req.parentB, req.ratioA),
    classLabel: `Class ${req.cls} (${roman(req.cls).toUpperCase()})`,
    parents,
    classProfile: {
      cls: req.cls, roman: roman(req.cls), dna: cp.dna, linearSize: cp.size, massMultiplier: cp.size ** 3,
      potency: cp.potency, maxBonus: cp.maxBonus, e3Chance: E3_PROBABILITY[req.config],
      cdieChance: req.cls >= 2 ? CDIE_PROBABILITY : 0,
    },
    ledger: { config: req.config, ...L, supplyShareA: L.A.grossInput / SPECIES_SUPPLY, supplyShareB: L.B.grossInput / SPECIES_SUPPLY },
    ledgerAlt: { config: altConfig, total: ledger(req.cls, c.ratioA, altConfig).total },
    expression: {
      minority, band, bandName: BAND_INFO[band].name, arbitration: BAND_INFO[band].arbitration,
      result: BAND_INFO[band].result, frameTendency: FRAME_TEXT[ft](na, nb),
      identitySentence: identitySentence(c.ratioA, na, nb),
    },
    size,
    pending: [
      "Trait transfer and inheritance decisions",
      "Morphology and phenotype blueprint",
      "Functional and aesthetic trait scores",
      "Capabilities and performance attributes",
      "Behaviour and habitat envelope",
      "Render prompt",
    ],
    validation: { status: ready ? "SIMULATION_READY" : "NEEDS_SPECIES_DATA", messages },
    custodian: `2% of each parent's input goes to that species' PureBreed custodian, or to ${CUSTODIAN_FALLBACK} if it has none yet.`,
  };
}
