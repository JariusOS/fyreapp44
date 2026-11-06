import { forwardRef } from "react";
import type { LedgerRow } from "@/lib/fhe/core";
import type { Datasheet, ParentView } from "@/lib/fhe/datasheet";

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const short = (a: string) => `${a.slice(0, 8)}…${a.slice(-6)}`;
const pct = (n: number, d = 0) => `${(n * 100).toFixed(d)}%`;
const kg = (n: number) =>
  n < 1 ? `${(n * 1000).toFixed(n < 0.01 ? 1 : 0)} g` : `${n.toFixed(n < 10 ? 2 : 1)} kg`;

const LEDGER_ROWS: [string, keyof LedgerRow, string][] = [
  ["Gross input", "grossInput", ""],
  ["Burned", "burned", "Destroyed"],
  ["Custodian 2%", "custodian", "PureBreed holder of each species"],
  ["Ecosystem fund 3%", "ecosystemFund", "Ecosystem development fund"],
  ["Conservation fund 5%", "conservationFund", "Conservation fund"],
  ["Breeder refund", "breederRefund", "Breeder"],
  ["Net cost to breeder", "netCost", ""],
];

function ParentCard({ p, onOpenSyndicate }: { p: ParentView; onOpenSyndicate?: (p: ParentView) => void }) {
  const c = p.entry.contract;
  const pb = p.purebreed;
  return (
    <div className={`fhe-parent ${p.side === "A" ? "fhe-parent-a" : "fhe-parent-b"}`}>
      <div className="fhe-pid">
        {String(p.entry.id).padStart(4, "0")} · {p.entry.ticker}
      </div>
      <div className="fhe-pname">{p.name}</div>
      {p.entry.scientificName && <div className="fhe-sci">{p.entry.scientificName}</div>}
      <div className="fhe-pratio">{p.ratio}%</div>
      <p className="fhe-profile">{p.profile}</p>
      {onOpenSyndicate && (
        <button type="button" className="fhe-syn-open" onClick={() => onOpenSyndicate(p)}>
          View {pb.syndicateName} <span aria-hidden="true">→</span>
        </button>
      )}
      <dl className="fhe-dl">
        <dt>Role</dt>
        <dd>{p.role}</dd>
        <dt>Minimum visibility</dt>
        <dd>{p.iconic.visual}</dd>
        <dt>Iconic function</dt>
        <dd>{p.iconic.functional}</dd>
        {p.entry.iucn && (
          <>
            <dt>IUCN</dt>
            <dd>{p.entry.iucn}</dd>
          </>
        )}
        <dt>Species data</dt>
        <dd>{p.entry.pool}</dd>
        <dt>DNA contract</dt>
        <dd className="fhe-mono">
          <a href={`https://basescan.org/token/${c}`} target="_blank" rel="noopener noreferrer">
            {short(c)}
          </a>
        </dd>
        <dt>PureBreed custodian</dt>
        <dd>
          <span className="fhe-mono">
            <a href={`https://basescan.org/address/${pb.custodian}`} target="_blank" rel="noopener noreferrer">
              {short(pb.custodian)}
            </a>
          </span>
          {!pb.custodianAssigned && <span className="fhe-sub"> Not assigned yet; ecosystem address receives the 2%</span>}
        </dd>
        <dt>Hybrid pool</dt>
        <dd>
          {pb.syndicateName}
          {pb.syndicateAddress ? (
            <span className="fhe-mono">
              {" · "}
              <a href={`https://basescan.org/address/${pb.syndicateAddress}`} target="_blank" rel="noopener noreferrer">
                {short(pb.syndicateAddress)}
              </a>
            </span>
          ) : (
            <span className="fhe-sub"> Address pending</span>
          )}
        </dd>
      </dl>
    </div>
  );
}

export const DatasheetView = forwardRef<
  HTMLElement,
  { d: Datasheet; onOpenSyndicate?: (p: ParentView) => void }
>(function DatasheetView({ d, onOpenSyndicate }, ref) {
  const [A, B] = d.parents;
  const cp = d.classProfile;
  const ready = d.validation.status === "SIMULATION_READY";

  return (
    <article ref={ref} className="fhe-panel fhe-sheet" aria-live="polite">
      <header className="fhe-sheet-head">
        <div className="fhe-eyebrow">Fyre Hybrid datasheet · {d.classLabel}</div>
        <h2 className="fhe-hname">{d.name}</h2>
        <p className="fhe-hsub">
          {A.name} {A.ratio}% × {B.name} {B.ratio}%
        </p>
        <div className="fhe-chips">
          <span className="fhe-chip">
            Band {d.expression.band} · {d.expression.bandName}
          </span>
          <span className="fhe-chip">{d.expression.frameTendency}</span>
          <span className={`fhe-chip ${ready ? "fhe-chip-ok" : "fhe-chip-warn"}`}>
            {ready ? "Simulation ready" : "Needs species data"}
          </span>
        </div>
        <p className="fhe-iter">
          Iteration {d.name.slice(-6)} counts this recipe among hybrids generated so far; the ledger
          assigns the real iteration at settlement.
        </p>
      </header>

      <section className="fhe-section">
        <h3 className="fhe-h3">Parents</h3>
        <p className="fhe-note fhe-parents-note">
          Each parent is a Syndicate. This hybrid joins both. Tap a parent's Syndicate to see every hybrid under it.
        </p>
        <div className="fhe-parents">
          <ParentCard p={A} {...(onOpenSyndicate ? { onOpenSyndicate } : {})} />
          <ParentCard p={B} {...(onOpenSyndicate ? { onOpenSyndicate } : {})} />
        </div>
      </section>

      <section className="fhe-section">
        <h3 className="fhe-h3">Genetic expression</h3>
        <p className="fhe-lead">{d.expression.identitySentence}</p>
        <table className="fhe-table">
          <tbody>
            <tr><td>Minority contribution</td><td>{d.expression.minority}%</td></tr>
            <tr><td>Expression band</td><td>{d.expression.band} · {d.expression.bandName}</td></tr>
            <tr><td>Arbitration intensity</td><td>{d.expression.arbitration}</td></tr>
            <tr><td>What this band produces</td><td>{d.expression.result}</td></tr>
            <tr><td>Frame tendency</td><td>{d.expression.frameTendency}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="fhe-section">
        <h3 className="fhe-h3">Class {cp.roman.toUpperCase()} profile</h3>
        <div className="fhe-stats">
          <div><strong>{fmt(cp.dna)}</strong><small>DNA input</small></div>
          <div><strong>{cp.linearSize.toFixed(2)}×</strong><small>Linear size</small></div>
          <div><strong>{cp.massMultiplier.toFixed(2)}×</strong><small>Mass</small></div>
          <div><strong>{cp.potency.toFixed(2)}×</strong><small>Ability potency</small></div>
          <div><strong>+{cp.maxBonus}</strong><small>Max trait bonus</small></div>
          <div><strong>{pct(cp.e3Chance)}</strong><small>E3 adaptation chance</small></div>
          <div><strong>{pct(cp.cdieChance)}</strong><small>Class feature chance</small></div>
        </div>
        <p className="fhe-note">
          Class sets scale and development, never attractiveness or quality. Random events are rolled at
          settlement from a seed nobody can see in advance.
        </p>
      </section>

      <section className="fhe-section">
        <h3 className="fhe-h3">DNA expenditure · {d.ledger.config === "ENZYME" ? "Enzyme" : "Standard"}</h3>
        <table className="fhe-table">
          <thead>
            <tr>
              <th>Share</th>
              <th className="fhe-num">{A.name}</th>
              <th className="fhe-num">{B.name}</th>
              <th className="fhe-num">Total</th>
              <th>To</th>
            </tr>
          </thead>
          <tbody>
            {LEDGER_ROWS.map(([label, k, to]) => (
              <tr key={k} className={k === "netCost" ? "fhe-total" : undefined}>
                <td>{label}</td>
                <td className="fhe-num">{fmt(d.ledger.A[k])}</td>
                <td className="fhe-num">{fmt(d.ledger.B[k])}</td>
                <td className="fhe-num">{fmt(d.ledger.total[k])}</td>
                <td>{to}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="fhe-note">
          Uses {pct(d.ledger.supplyShareA, 4)} of {A.name} supply and {pct(d.ledger.supplyShareB, 4)} of{" "}
          {B.name} supply.{" "}
          {d.ledgerAlt.config === "ENZYME"
            ? `With an Enzyme: 0 burned, ${fmt(d.ledgerAlt.total.breederRefund)} refunded, net cost ${fmt(d.ledgerAlt.total.netCost)} plus the Enzyme NFT.`
            : `Without an Enzyme: ${fmt(d.ledgerAlt.total.burned)} burned, net cost ${fmt(d.ledgerAlt.total.netCost)}.`}
        </p>
      </section>

      <section className="fhe-section">
        <h3 className="fhe-h3">Size</h3>
        {d.size.status === "CALCULATED" ? (
          <>
            <p className="fhe-lead">
              Adult mass about <strong>{kg(d.size.finalKg)}</strong>: a parent-weighted baseline of{" "}
              {kg(d.size.baselineKg)} scaled by {cp.massMultiplier.toFixed(2)}× for C{cp.cls}.
            </p>
            <ul className="fhe-list">
              {d.size.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="fhe-pending">
            {d.size.reason}. Size is calculated once both parents have a recorded adult mass.
          </p>
        )}
      </section>

      <section className="fhe-section">
        <h3 className="fhe-h3">Awaiting species data</h3>
        <p className="fhe-pending">
          These sections are calculated by the engine once both parents' species data is complete. Nothing
          here is estimated or invented.
        </p>
        <ul className="fhe-list">
          {d.pending.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      <section className="fhe-section">
        <h3 className="fhe-h3">Validation</h3>
        <ul className="fhe-list">
          {d.validation.messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <p className="fhe-note">{d.custodian}</p>
      </section>

      <footer className="fhe-sheet-foot">
        {d.engine} · recipe {d.recipe} · simulation, not settled
      </footer>
    </article>
  );
});
