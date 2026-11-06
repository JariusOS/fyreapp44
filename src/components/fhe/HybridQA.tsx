import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { BreedRequest, Datasheet } from "@/lib/fhe/datasheet";
import { askHybrid } from "@/lib/hybrid-qa.functions";
import { MessageCircleQuestion } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Why does this split land in its expression band?",
  "What does this class change about my hybrid?",
  "Where does my DNA go, and what would an Enzyme save?",
  "Who receives the custodian share for each parent?",
];

export function HybridQA({ request, d }: { request: BreedRequest; d: Datasheet }) {
  const ask = useServerFn(askHybrid);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const send = async (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    setError("");
    setBusy(true);
    const history = turns.slice(-12);
    setTurns((t) => [...t, { role: "user", content: text }]);
    setQuestion("");
    const [A, B] = d.parents;
    const nameFor = (id: number) => (A.entry.id === id ? A.name : B.entry.id === id ? B.name : undefined);
    try {
      const res = await ask({
        data: {
          request,
          names: { a: nameFor(request.parentA), b: nameFor(request.parentB) },
          question: text,
          history,
        },
      });
      if (res.ok) {
        setTurns((t) => [...t, { role: "assistant", content: res.answer }]);
      } else {
        setError(res.error);
        setTurns((t) => t.slice(0, -1));
        setQuestion(text);
      }
    } catch {
      setError("Could not reach the answer service. Check your connection and try again.");
      setTurns((t) => t.slice(0, -1));
      setQuestion(text);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(question);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        className="fhe-fab"
        aria-label="Ask about this hybrid"
        title="Ask about this hybrid"
        onClick={() => setOpen(true)}
      >
        <MessageCircleQuestion aria-hidden="true" />
        {turns.length > 0 && <span className="fhe-fab-dot" aria-hidden="true" />}
      </button>
      <DialogContent className="fhe-dialog fhe-qa">
      <DialogTitle className="fhe-dialog-title">Ask about this hybrid</DialogTitle>
      <DialogDescription className="fhe-note fhe-qa-intro">
        Answers come only from this datasheet: genetic expression, class profile and DNA spending. Pending
        sections stay pending.
      </DialogDescription>

      {turns.length === 0 && (
        <div className="fhe-qa-suggest">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="fhe-chip fhe-qa-chip" disabled={busy} onClick={() => void send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      {turns.length > 0 && (
        <ol className="fhe-qa-log" aria-live="polite">
          {turns.map((t, i) => (
            <li key={i} className={t.role === "user" ? "fhe-qa-q" : "fhe-qa-a"}>
              {t.content}
            </li>
          ))}
          {busy && <li className="fhe-qa-a fhe-qa-busy">Reading the datasheet…</li>}
        </ol>
      )}

      <form className="fhe-qa-form" onSubmit={onSubmit}>
        <input
          className="fhe-select fhe-qa-input"
          aria-label="Your question"
          placeholder="Ask about expression, class or DNA spending"
          maxLength={500}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={busy}
        />
        <button type="submit" className="fhe-go fhe-qa-send" disabled={busy || !question.trim()}>
          {busy ? "…" : "Ask"}
        </button>
      </form>
      <p className="fhe-error" role="alert">
        {error}
      </p>
      </DialogContent>
    </Dialog>
  );
}
