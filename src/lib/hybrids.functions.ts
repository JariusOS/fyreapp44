import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { RATIOS, canonicalise, isClassNo, recipeKey, validateInputs } from "@/lib/fhe/core";
import { REGISTRY } from "@/lib/fhe/registry";

const speciesId = z.number().int().min(1).max(REGISTRY.length);

const RecordInput = z.object({
  parentA: speciesId,
  parentB: speciesId,
  ratioA: z.number().int().refine((r) => (RATIOS as readonly number[]).includes(r), "Invalid DNA split"),
  cls: z.number().int().refine(isClassNo, "Invalid class"),
  config: z.enum(["STANDARD", "ENZYME"]),
});

export type HybridRecord = {
  name: string;
  cls: number;
  parentA: number;
  parentB: number;
  ratioA: number;
  config: "STANDARD" | "ENZYME";
  iteration: number;
  createdAt: string;
};

/** Public: saves a generated hybrid so it joins both parents' Syndicates. Returns its shared iteration. */
export const recordHybrid = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RecordInput.parse(input))
  .handler(async ({ data }): Promise<{ ok: true; iteration: number } | { ok: false; error: string }> => {
    if (!isClassNo(data.cls)) return { ok: false, error: "Invalid class" };
    try {
      validateInputs(data.parentA, data.parentB, data.ratioA, data.cls);
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
    const c = canonicalise(data.parentA, data.parentB, data.ratioA);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: it, error } = await supabaseAdmin.rpc("record_hybrid", {
      _recipe: recipeKey(data.cls, data.parentA, data.parentB, data.ratioA),
      _cls: data.cls,
      _parent_a: c.a,
      _parent_b: c.b,
      _ratio_a: c.ratioA,
      _config: data.config,
    });
    if (error || typeof it !== "number") {
      console.error("record_hybrid failed", error);
      return { ok: false, error: "Could not save this hybrid." };
    }
    return { ok: true, iteration: it };
  });

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const SYNDICATE_PAGE = 100;

/** Public: every saved hybrid that has this species as a parent, newest first. */
export const listSyndicate = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ speciesId, page: z.number().int().min(0).max(1000) }).parse(input))
  .handler(async ({ data }): Promise<{ ok: true; total: number; hybrids: HybridRecord[] } | { ok: false; error: string }> => {
    const from = data.page * SYNDICATE_PAGE;
    const { data: rows, count, error } = await publicClient()
      .from("hybrids")
      .select("name, cls, parent_a, parent_b, ratio_a, config, iteration, created_at", { count: "exact" })
      .or(`parent_a.eq.${data.speciesId},parent_b.eq.${data.speciesId}`)
      .order("created_at", { ascending: false })
      .range(from, from + SYNDICATE_PAGE - 1);
    if (error) {
      console.error("listSyndicate failed", error);
      return { ok: false, error: "Could not load this Syndicate right now." };
    }
    return {
      ok: true,
      total: count ?? rows.length,
      hybrids: rows.map((r) => ({
        name: r.name, cls: r.cls, parentA: r.parent_a, parentB: r.parent_b, ratioA: r.ratio_a,
        config: r.config === "ENZYME" ? "ENZYME" : "STANDARD", iteration: r.iteration, createdAt: r.created_at,
      })),
    };
  });
