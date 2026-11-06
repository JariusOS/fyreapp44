import {
  GatewayError,
  PaymentRequiredError,
  RateLimitError,
  generateResponse,
} from "@lovable.dev/ai-gateway";
import { buildDatasheet, type BreedRequest, type Datasheet } from "@/lib/fhe/datasheet";

export interface QaTurn {
  role: "user" | "assistant";
  content: string;
}

export type QaResult = { ok: true; answer: string } | { ok: false; error: string };

const INSTRUCTIONS = `You answer questions from Fyre Hybrid breeders about ONE hybrid datasheet produced by the FYRE Hybrid Engine.
Rules:
- Ground every statement in the datasheet JSON provided. Do not use outside knowledge about the species.
- You may explain genetic expression (minority contribution, expression band, arbitration, frame tendency), the class profile (DNA input, size, mass, potency, trait bonus, E3 and class feature chances) and DNA spending (burned, custodian, ecosystem fund, conservation fund, breeder refund, net cost, Enzyme vs Standard).
- The custodian share of each parent goes to that PureBreed's custodian address; if the datasheet says it is not assigned, it goes to the ecosystem fallback address. Each PureBreed's hybrid pool is a Syndicate.
- Anything listed under "pending" (traits, morphology, scores, capabilities, behaviour, render prompt) is not calculated yet. Say so plainly and never estimate or invent it.
- If size status is PENDING, say size is not calculated yet. Never guess masses.
- If a question cannot be answered from the datasheet, say what is missing.
- This is a simulation, not a settled hybrid. Random events are rolled at settlement.
- Be concise and plain-spoken. Use the numbers as given, formatted with thousands separators.
- Reply in plain text only: no Markdown, no tables, no bold or code marks. Use short paragraphs, or simple lines starting with "- ".`;

function context(d: Datasheet): string {
  const compact = {
    ...d,
    parents: d.parents.map((p) => ({
      side: p.side, id: p.entry.id, ticker: p.entry.ticker, name: p.name, scientificName: p.entry.scientificName,
      iucn: p.entry.iucn, adultMassKg: p.entry.massKg, massNote: p.entry.massNote, speciesDataPool: p.entry.pool,
      dnaContract: p.entry.contract, ratio: p.ratio, role: p.role, iconic: p.iconic, purebreed: p.purebreed,
    })),
  };
  return JSON.stringify(compact);
}

export async function answerHybridQuestion(
  req: BreedRequest,
  names: Record<number, string>,
  question: string,
  history: QaTurn[],
): Promise<QaResult> {
  let d: Datasheet;
  try {
    d = buildDatasheet(req, names);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  try {
    const res = await generateResponse({
      model: "openai/gpt-6-astra",
      instructions: INSTRUCTIONS,
      reasoning: { effort: "low" },
      input: [
        { role: "user", content: `Datasheet JSON:\n${context(d)}` },
        ...history.map((t) => ({ role: t.role, content: t.content })),
        { role: "user", content: question },
      ],
    });
    const answer = (res.output ?? [])
      .flatMap((item) => (item.type === "message" ? item.content : []))
      .map((c) => (c.type === "output_text" ? c.text : ""))
      .join("")
      .trim();
    if (!answer) return { ok: false, error: "The model returned no answer. Try rephrasing your question." };
    return { ok: true, answer };
  } catch (e) {
    if (e instanceof PaymentRequiredError) {
      return { ok: false, error: "AI credits have run out for this app. Top up credits to keep answering questions." };
    }
    if (e instanceof RateLimitError) {
      return { ok: false, error: "Too many questions right now. Please wait a minute and try again." };
    }
    if (e instanceof GatewayError) {
      console.error("hybrid-qa gateway error", e.code, e.httpStatus, e.ids);
      return { ok: false, error: "The answer service is unavailable right now. Please try again shortly." };
    }
    console.error("hybrid-qa error", e);
    return { ok: false, error: "Something went wrong while answering." };
  }
}
