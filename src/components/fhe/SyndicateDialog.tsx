import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { roman, type ClassNo } from "@/lib/fhe/core";
import { REGISTRY, displayName } from "@/lib/fhe/registry";
import type { ParentView } from "@/lib/fhe/datasheet";
import { listSyndicate, type HybridRecord } from "@/lib/hybrids.functions";

const short = (a: string) => `${a.slice(0, 8)}…${a.slice(-6)}`;

export function SyndicateDialog({
  parent,
  names,
  currentName,
  onClose,
  onOpenHybrid,
}: {
  parent: ParentView | null;
  names: Record<number, string>;
  currentName: string;
  onClose: () => void;
  onOpenHybrid: (h: HybridRecord) => void;
}) {
  const fetchSyndicate = useServerFn(listSyndicate);
  const [page, setPage] = useState(0);
  const id = parent?.entry.id ?? 0;
  const q = useQuery({
    queryKey: ["syndicate", id, page],
    queryFn: () => fetchSyndicate({ data: { speciesId: id, page } }),
    enabled: parent !== null,
  });

  const nameOf = (sid: number) => names[sid] ?? (REGISTRY[sid - 1] ? displayName(REGISTRY[sid - 1]!) : `#${sid}`);
  const pb = parent?.purebreed;
  const res = q.data;

  return (
    <Dialog
      open={parent !== null}
      onOpenChange={(o) => {
        if (!o) {
          setPage(0);
          onClose();
        }
      }}
    >
      <DialogContent className="fhe-dialog">
        {parent && pb && (
          <>
            <div>
              <div className="fhe-eyebrow">Syndicate · {parent.entry.ticker}</div>
              <DialogTitle className="fhe-dialog-title">{pb.syndicateName}</DialogTitle>
              <DialogDescription className="fhe-note fhe-dialog-desc">
                Every hybrid with {parent.name} as a parent belongs to this Syndicate.
              </DialogDescription>
            </div>

            <dl className="fhe-dl fhe-syn-dl">
              <dt>PureBreed</dt>
              <dd>{parent.name}</dd>
              <dt>Profile</dt>
              <dd>{parent.profile}</dd>
              <dt>Custodian</dt>
              <dd>
                <span className="fhe-mono">{short(pb.custodian)}</span>
                {!pb.custodianAssigned && <span className="fhe-sub">Not assigned yet; ecosystem address</span>}
              </dd>
              <dt>Syndicate address</dt>
              <dd>{pb.syndicateAddress ? <span className="fhe-mono">{short(pb.syndicateAddress)}</span> : <span className="fhe-sub">Pending</span>}</dd>
            </dl>

            <div className="fhe-syn-head">
              <h3 className="fhe-h3">Hybrids</h3>
              {res?.ok && <span className="fhe-chip">{res.total.toLocaleString()} total</span>}
            </div>

            {q.isPending && <p className="fhe-note">Loading hybrids…</p>}
            {q.isError && <p className="fhe-error">Could not load this Syndicate right now.</p>}
            {res && !res.ok && <p className="fhe-error">{res.error}</p>}
            {res?.ok && res.hybrids.length === 0 && (
              <p className="fhe-note">No hybrids yet. Generate one with {parent.name} to start this Syndicate.</p>
            )}
            {res?.ok && res.hybrids.length > 0 && (
              <ul className="fhe-syn-list">
                {res.hybrids.map((h) => {
                  const other = h.parentA === id ? h.parentB : h.parentA;
                  const myShare = h.parentA === id ? h.ratioA : 100 - h.ratioA;
                  const isCurrent = h.name === currentName;
                  return (
                    <li key={h.name}>
                      <button
                        type="button"
                        className={`fhe-syn-item ${isCurrent ? "fhe-syn-current" : ""}`}
                        onClick={() => onOpenHybrid(h)}
                      >
                        <span className="fhe-syn-name">{h.name}</span>
                        <span className="fhe-syn-meta">
                          × {nameOf(other)} · {myShare}% {parent.name} · C{h.cls} ({roman(h.cls as ClassNo).toUpperCase()})
                          {h.config === "ENZYME" ? " · Enzyme" : ""}
                          {isCurrent ? " · this datasheet" : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {res?.ok && res.total > 100 && (
              <div className="fhe-syn-pager">
                <button type="button" className="fhe-chip fhe-qa-chip" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Newer
                </button>
                <span className="fhe-note">Page {page + 1} of {Math.ceil(res.total / 100)}</span>
                <button
                  type="button"
                  className="fhe-chip fhe-qa-chip"
                  disabled={(page + 1) * 100 >= res.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Older
                </button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
