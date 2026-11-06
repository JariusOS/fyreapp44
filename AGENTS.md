<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- FYRE Hybrid Engine rules live in `src/lib/fhe/` as pure, DOM-free modules (core, registry, datasheet); UI in `src/components/fhe/` only renders their output. Why: the engine must stay testable and identical to the original spec port.
- `src/lib/fhe/registry.ts` is generated from `data/species_contracts.csv`; edit the CSV source of truth, not the list by hand. Why: keeps tickers and contracts in sync.
- Species common names load in the browser from the FCBC species API with a ticker fallback. Why: the source app was a static site and names are owned by FCBC.
- Generated hybrids are saved to the `hybrids` table only through the `recordHybrid` server function (service role calling `record_hybrid`, which assigns the shared per-recipe iteration under a lock); visitors read Syndicate lists through `listSyndicate` with a public read-only policy. Why: the app has no sign-in, so the database never accepts direct visitor writes.
- PureBreed custodian and Syndicate addresses live in `data/purebreed_custodians.csv` (one row per ticker, blank = not assigned) and are read by `src/lib/fhe/purebreed.ts`. Why: real on-chain addresses are added as they become known, never guessed.
- "Ask about this hybrid" runs through the `askHybrid` server function, which rebuilds the datasheet on the server from the recipe and grounds the AI answer in it. Why: answers must reflect engine output, not client-supplied numbers.
- Analytics are `project.*` events fired with `window.__lovableEvents?.track?.` inside the existing handlers and registered in `.lovable/events.json`. Why: the built-in pipeline needs no SDK or keys.
