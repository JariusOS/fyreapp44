import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { CLASSES, ENGINE_ID, RATIOS, parseHybridName, type ClassNo, type Config } from "@/lib/fhe/core";
import { REGISTRY, SPECIES_API, displayName } from "@/lib/fhe/registry";
import { buildDatasheet, type BreedRequest, type Datasheet } from "@/lib/fhe/datasheet";
import { DatasheetView } from "./DatasheetView";

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const CLASS_LIST = Object.keys(CLASSES).map(Number) as ClassNo[];

/** Fetches live common names from the FCBC species API; falls back silently to tickers. */
function useSpeciesNames() {
  const [names, setNames] = useState<Record<number, string>>({});
  const [status, setStatus] = useState("Loading species names…");

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    (async () => {
      try {
        const res = await fetch(SPECIES_API, { signal: ctrl.signal });
        const json = await res.json();
        const found: Record<number, string> = {};
        let n = 0;
        for (const s of json?.data ?? []) {
          const m = String(s.id ?? s.symbol ?? "").match(/(\d+)/);
          const id = m ? Number(m[1]) : NaN;
          if (id >= 1 && id <= REGISTRY.length && s.name) {
            found[id] = String(s.name);
            n++;
          }
        }
        setNames(found);
        setStatus(n ? `Live names loaded for ${n} species.` : "Species API returned no names; showing tickers.");
      } catch {
        setStatus("Species API unreachable; showing tickers and confirmed names.");
      } finally {
        clearTimeout(t);
      }
    })();
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, []);

  return { names, status };
}

export function HybridEngine() {
  const { names, status } = useSpeciesNames();
  const [parentA, setParentA] = useState(7);
  const [parentB, setParentB] = useState(8);
  const [ratio, setRatio] = useState(50);
  const [cls, setCls] = useState<ClassNo>(5);
  const [useEnzyme, setUseEnzyme] = useState(false);
  const [error, setError] = useState("");
  const [request, setRequest] = useState<BreedRequest | null>(null);
  const iterations = useRef(new Map<string, number>()); // preview only; the ledger assigns real iterations
  const sheetRef = useRef<HTMLElement>(null);
  const scrollOnRender = useRef(false);

  const label = (id: number) => {
    const e = REGISTRY[id - 1]!;
    return `${String(id).padStart(4, "0")} · ${names[id] ?? displayName(e)}`;
  };

  // Re-derived whenever live names arrive, keeping the same request and iteration.
  const sheet = useMemo<{ d: Datasheet } | { error: string } | null>(() => {
    if (!request) return null;
    try {
      return { d: buildDatasheet(request, names) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [request, names]);

  const generate = (req: Omit<BreedRequest, "iteration">, iterationOverride?: number) => {
    setError("");
    if (req.parentA === req.parentB) {
      setError("Choose two different species.");
      return;
    }
    const { parentA: a, parentB: b, ratioA } = req;
    const key = `${req.cls}|${Math.min(a, b)}|${Math.max(a, b)}|${a < b ? ratioA : 100 - ratioA}`;
    const it = iterationOverride ?? (iterations.current.get(key) ?? 0) + 1;
    iterations.current.set(key, it);
    scrollOnRender.current = true;
    setRequest({ ...req, iteration: it });
  };

  // Shareable links: open #iv7030-0007:0008-000236 to regenerate that datasheet.
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (!hash) return;
    try {
      const p = parseHybridName(hash);
      setParentA(p.a);
      setParentB(p.b);
      setRatio(p.ratioA);
      setCls(p.cls);
      generate({ parentA: p.a, parentB: p.b, ratioA: p.ratioA, cls: p.cls, config: "STANDARD" }, p.iteration);
    } catch {
      /* ignore bad hash */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sheet) return;
    if ("error" in sheet) {
      setError(sheet.error);
      return;
    }
    window.history.replaceState(null, "", `#${sheet.d.name}`);
    if (scrollOnRender.current) {
      scrollOnRender.current = false;
      sheetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [sheet]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const config: Config = useEnzyme ? "ENZYME" : "STANDARD";
    generate({ parentA, parentB, ratioA: ratio, cls, config });
  };

  const swap = () => {
    setParentA(parentB);
    setParentB(parentA);
    setRatio(100 - ratio);
  };

  const options = REGISTRY.map((e) => (
    <option key={e.id} value={e.id}>
      {label(e.id)}
    </option>
  ));

  return (
    <main className="fhe-wrap">
      <header className="fhe-top">
        <div className="fhe-brand">
          FYRE <span>Hybrid Engine</span>
        </div>
        <div className="fhe-engine-id">{ENGINE_ID}</div>
      </header>

      <form className="fhe-panel" noValidate onSubmit={onSubmit}>
        <h1 className="fhe-title">Breed a Fyre Hybrid</h1>
        <p className="fhe-intro">
          Choose two species, set their DNA split and class, then generate the hybrid's datasheet.
        </p>

        <div className="fhe-parents-pick">
          <label className="fhe-field">
            <span>Parent A</span>
            <select
              className="fhe-select fhe-select-a"
              aria-label="Parent A species"
              value={parentA}
              onChange={(e) => setParentA(Number(e.target.value))}
            >
              {options}
            </select>
          </label>
          <button type="button" className="fhe-swap" aria-label="Swap parents" title="Swap parents" onClick={swap}>
            ⇄
          </button>
          <label className="fhe-field">
            <span>Parent B</span>
            <select
              className="fhe-select fhe-select-b"
              aria-label="Parent B species"
              value={parentB}
              onChange={(e) => setParentB(Number(e.target.value))}
            >
              {options}
            </select>
          </label>
        </div>

        <div className="fhe-field">
          <span>DNA split</span>
          <div className="fhe-ratio-row">
            <output className="fhe-ra">{ratio}%</output>
            <input
              type="range"
              className="fhe-range"
              min={RATIOS[0]}
              max={RATIOS[RATIOS.length - 1]}
              step={10}
              value={ratio}
              onChange={(e) => setRatio(Number(e.target.value))}
              aria-label="Parent A share of DNA"
              aria-valuetext={`${ratio}% parent A, ${100 - ratio}% parent B`}
              style={{ "--split": `${ratio}%` } as CSSProperties}
            />
            <output className="fhe-rb">{100 - ratio}%</output>
          </div>
        </div>

        <div className="fhe-row2">
          <label className="fhe-field">
            <span>Class</span>
            <select
              className="fhe-select"
              aria-label="Class"
              value={cls}
              onChange={(e) => setCls(Number(e.target.value) as ClassNo)}
            >
              {CLASS_LIST.map((c) => (
                <option key={c} value={c}>
                  C{c} · {fmt(CLASSES[c].dna)} DNA
                </option>
              ))}
            </select>
          </label>
          <label className="fhe-toggle">
            <input type="checkbox" checked={useEnzyme} onChange={(e) => setUseEnzyme(e.target.checked)} />
            <span>Use Enzyme</span>
          </label>
        </div>

        <p className="fhe-error" role="alert">
          {error}
        </p>
        <button type="submit" className="fhe-go">
          Generate datasheet
        </button>
        <p className="fhe-api">{status}</p>
      </form>

      {sheet && "d" in sheet && <DatasheetView ref={sheetRef} d={sheet.d} />}
    </main>
  );
}
