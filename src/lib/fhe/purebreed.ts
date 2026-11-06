/**
 * PureBreed custodians and Syndicates.
 * Each PureBreed (the species' DNA token) has a custodian: the holder who receives
 * the 2% custodian share of every hybrid that uses that species. Each PureBreed's
 * hybrid pool is a Syndicate. Addresses come from data/purebreed_custodians.csv;
 * blank cells mean "not yet assigned" and are never guessed.
 */
import csv from "../../../data/purebreed_custodians.csv?raw";
import { CUSTODIAN_FALLBACK } from "./core";
import type { SpeciesEntry } from "./registry";

export interface PureBreedRecord {
  custodian?: string | undefined;
  syndicate?: string | undefined;
}

export interface PureBreedView {
  custodian: string;          // address that receives the 2% custodian share
  custodianAssigned: boolean; // false = falls back to the ecosystem address
  syndicateName: string;
  syndicateAddress: string | null;
}

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export function parsePureBreedCsv(text: string): Record<string, PureBreedRecord> {
  const out: Record<string, PureBreedRecord> = {};
  const lines = text.split(/\r?\n/).slice(1);
  for (const line of lines) {
    if (!line.trim()) continue;
    const [ticker = "", custodian = "", syndicate = ""] = line.split(",").map((s) => s.trim());
    if (!ticker) continue;
    out[ticker] = {
      custodian: ADDRESS.test(custodian) ? custodian.toLowerCase() : undefined,
      syndicate: ADDRESS.test(syndicate) ? syndicate.toLowerCase() : undefined,
    };
  }
  return out;
}

export const PUREBREED: Record<string, PureBreedRecord> = parsePureBreedCsv(csv);

export function pureBreedOf(
  e: Pick<SpeciesEntry, "ticker">,
  records: Record<string, PureBreedRecord> = PUREBREED,
): PureBreedView {
  const r = records[e.ticker] ?? {};
  return {
    custodian: r.custodian ?? CUSTODIAN_FALLBACK,
    custodianAssigned: r.custodian !== undefined,
    syndicateName: `${e.ticker} Syndicate`,
    syndicateAddress: r.syndicate ?? null,
  };
}
