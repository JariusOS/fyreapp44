import {
  hybridName, parseHybridName, recipeKey, canonicalise, ledger, expressionBand, frameTendency,
  iconicRequirement, identitySentence, sizeMass, poolAllows, CLASSES, RATIOS, 
} from "./core";
import type { ClassNo, Config } from "./core";
import { REGISTRY, species } from "./registry";
import { buildDatasheet } from "./datasheet";
import { describe, expect, it } from "vitest";

describe("FYRE Hybrid Engine rules (ported from tests/core.test.ts)", () => {
it("passes every engine check", () => {

let passed = 0;
function ok(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  passed++;
}
function throws(fn: () => unknown, msg: string) {
  try { fn(); } catch { passed++; return; }
  throw new Error(`FAIL (no throw): ${msg}`);
}

// Full naming structure: iv7030-0007:0008-000236
ok(hybridName(4, 7, 8, 70, 236) === "iv7030-0007:0008-000236", "Captain's example name");
ok(hybridName(4, 8, 7, 30, 236) === "iv7030-0007:0008-000236", "parent order is canonical");
ok(hybridName(10, 1, 1234, 50, 1) === "x5050-0001:1234-000001", "class X and 4-digit IDs");
ok(hybridName(5, 7, 8, 50, 1) === "v5050-0007:0008-000001", "the cavefish x rhino cross");
ok(recipeKey(4, 7, 8, 70) === "iv7030-0007:0008", "recipe key drops the iteration");
const p = parseHybridName("iv7030-0007:0008-000236");
ok(p.cls === 4 && p.ratioA === 70 && p.ratioB === 30 && p.a === 7 && p.b === 8 && p.iteration === 236, "parse round trip");
for (const c of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as ClassNo[]) {
  for (const r of RATIOS) {
    const n = hybridName(c, 12, 200, r, 42);
    const q = parseHybridName(n);
    ok(q.cls === c && q.ratioA === r && q.a === 12 && q.b === 200, `round trip C${c} ${r}`);
  }
}
throws(() => hybridName(4, 7, 7, 50, 1), "same species");
throws(() => hybridName(4, 7, 8, 55, 1), "ratio not on grid");
throws(() => hybridName(4, 0, 8, 50, 1), "species 0");
throws(() => hybridName(4, 7, 1235, 50, 1), "species beyond index");
throws(() => hybridName(4, 7, 8, 50, 0), "iteration 0");
throws(() => parseHybridName("iv7040-0007:0008-000001"), "ratios not summing to 100");
throws(() => parseHybridName("HYB-i7030-0007:0008-000001"), "old format rejected");
ok(JSON.stringify(canonicalise(8, 7, 30)) === JSON.stringify({ a: 7, b: 8, ratioA: 70, ratioB: 30 }), "canonicalise swaps ratio");

// Ledger reconciles exactly for every class, ratio and configuration
for (const cfg of ["STANDARD", "ENZYME"] as Config[]) {
  for (const c of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as ClassNo[]) {
    for (const r of RATIOS) {
      const L = ledger(c, r, cfg);
      const dna = CLASSES[c].dna;
      ok(L.total.grossInput === dna, "gross");
      ok(L.total.burned === (cfg === "STANDARD" ? dna / 2 : 0), "burn");
      ok(L.total.breederRefund === dna * (cfg === "STANDARD" ? 0.4 : 0.9), "refund");
      ok(L.total.custodian + L.total.ecosystemFund + L.total.conservationFund === dna / 10, "funds");
    }
  }
}
const L4 = ledger(4, 70);
ok(L4.A.grossInput === 350_000 && L4.B.grossInput === 150_000 && L4.total.netCost === 300_000, "C4 70:30 ledger");

// Bands, frame, iconic visibility
ok(["I", "II", "II", "III", "III", "IV", "IV"].join() === [9, 10, 29, 30, 39, 40, 50].map(expressionBand).join(), "band boundaries");
for (const r of RATIOS) ok(expressionBand(Math.min(r, 100 - r)) === expressionBand(Math.min(100 - r, r)), "band symmetry");
ok(frameTendency(70) === "PARENT_A" && frameTendency(30) === "PARENT_B" && frameTendency(50) === "NEUTRAL", "frame");
ok(iconicRequirement(10).visual.startsWith("Clearly identifiable"), "10% visible");
ok(iconicRequirement(30).visual.startsWith("Major feature"), "30% major");
ok(!/sets the/.test(identitySentence(50, "X", "Y")) && /Neither/.test(identitySentence(50, "X", "Y")), "50:50 wording");

// Size: geometric mean x class cube
const s = sizeMass(0.004, 1600, 50, 5);
ok(Math.abs(s.baselineKg - Math.sqrt(0.004 * 1600)) < 1e-9 && Math.abs(s.finalKg - s.baselineKg * 1.3 ** 3) < 1e-9, "size");

// Registry
ok(REGISTRY.length === 234 && REGISTRY.every((e, i) => e.id === i + 1 && e.ticker === `FCBC${i + 1}`), "234 tickers in order");
ok(new Set(REGISTRY.map(e => e.contract)).size === 234 && REGISTRY.every(e => /^0x[0-9a-f]{40}$/.test(e.contract)), "contracts unique and valid");
ok(species(7).name === "Alabama Cavefish" && species(8).name === "Javan Rhinoceros", "confirmed names");
ok(poolAllows("PARTIAL", "SIMULATE") && !poolAllows("PARTIAL", "COMMIT") && !poolAllows("DRAFT", "SIMULATE"), "pool gates");

// Datasheet
const d = buildDatasheet({ parentA: 7, parentB: 8, ratioA: 70, cls: 4, config: "STANDARD", iteration: 236 });
ok(d.name === "iv7030-0007:0008-000236", "datasheet name");
ok(d.expression.band === "III" && d.validation.status === "SIMULATION_READY", "datasheet band and status");
ok(d.size.status === "CALCULATED", "size for known masses");
const d2 = buildDatasheet({ parentA: 1, parentB: 2, ratioA: 50, cls: 1, config: "ENZYME", iteration: 1 });
ok(d2.size.status === "PENDING" && d2.validation.status === "NEEDS_SPECIES_DATA", "unknown species are pending, not invented");
ok(d2.ledger.total.burned === 0 && d2.ledgerAlt.total.burned === 5000, "enzyme and alternative ledger");

expect(passed).toBeGreaterThan(400);
});
});
