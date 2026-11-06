import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CLASSES, RATIOS } from "@/lib/fhe/core";
import { REGISTRY } from "@/lib/fhe/registry";
import { answerHybridQuestion } from "./hybrid-qa.server";

const speciesId = z.number().int().min(1).max(REGISTRY.length);

const QaInput = z.object({
  request: z.object({
    parentA: speciesId,
    parentB: speciesId,
    ratioA: z.number().int().refine((r) => (RATIOS as readonly number[]).includes(r), "Invalid DNA split"),
    cls: z.number().int().refine((c) => c in CLASSES, "Invalid class"),
    config: z.enum(["STANDARD", "ENZYME"]),
    iteration: z.number().int().min(1).max(999999),
  }),
  names: z.object({ a: z.string().max(80).optional(), b: z.string().max(80).optional() }),
  question: z.string().trim().min(1).max(500),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(12),
});

export type AskHybridInput = z.infer<typeof QaInput>;

/** Public (no sign-in in this app): answers a question about one datasheet, rebuilt on the server. */
export const askHybrid = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => QaInput.parse(input))
  .handler(async ({ data }) => {
    const r = data.request;
    const names: Record<number, string> = {};
    if (data.names.a) names[r.parentA] = data.names.a;
    if (data.names.b) names[r.parentB] = data.names.b;
    return answerHybridQuestion(
      { ...r, cls: r.cls as keyof typeof CLASSES },
      names,
      data.question,
      data.history,
    );
  });
