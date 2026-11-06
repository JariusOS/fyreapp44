import { describe, expect, it } from "vitest";
import { CUSTODIAN_FALLBACK } from "./core";
import { PUREBREED, parsePureBreedCsv, pureBreedOf } from "./purebreed";
import { REGISTRY } from "./registry";
import { buildDatasheet } from "./datasheet";

const CUST = "0x1111111111111111111111111111111111111111";
const SYND = "0x2222222222222222222222222222222222222222";

describe("PureBreed custodians and Syndicates", () => {
  it("has a row for every released species", () => {
    for (const e of REGISTRY) expect(PUREBREED[e.ticker]).toBeDefined();
  });

  it("an unassigned custodian falls back to the ecosystem address", () => {
    const v = pureBreedOf({ ticker: "FCBC7" }, parsePureBreedCsv("ticker,custodian,syndicate\nFCBC7,,\n"));
    expect(v.custodianAssigned).toBe(false);
    expect(v.custodian).toBe(CUSTODIAN_FALLBACK);
    expect(v.syndicateAddress).toBeNull();
  });

  it("a recorded custodian and Syndicate address are shown as recorded", () => {
    const v = pureBreedOf({ ticker: "FCBC7" }, parsePureBreedCsv(`ticker,custodian,syndicate\nFCBC7,${CUST},${SYND}\n`));
    expect(v.custodianAssigned).toBe(true);
    expect(v.custodian).toBe(CUST);
    expect(v.syndicateAddress).toBe(SYND);
  });

  it("an invalid address is ignored rather than shown", () => {
    const v = pureBreedOf({ ticker: "FCBC7" }, parsePureBreedCsv("ticker,custodian,syndicate\nFCBC7,0x123,nope\n"));
    expect(v.custodianAssigned).toBe(false);
    expect(v.syndicateAddress).toBeNull();
  });

  it("each PureBreed's hybrid pool is its own Syndicate", () => {
    expect(pureBreedOf({ ticker: "FCBC8" }).syndicateName).toBe("FCBC8 Syndicate");
    const d = buildDatasheet({ parentA: 7, parentB: 8, ratioA: 50, cls: 5, config: "STANDARD", iteration: 1 });
    expect(d.parents.map((p) => p.purebreed.syndicateName)).toEqual(["FCBC7 Syndicate", "FCBC8 Syndicate"]);
  });
});
