# OneChorus

An English product website and working dependency demo for an early-stage AI team workspace. The product direction is change-aware coordination: versioned context, agent contracts, attributable artifacts, and rework budgets.

## Run

Node.js 18+ is required. No dependencies are installed.

```sh
npm run dev
npm test
npm run build
```

Preview: http://127.0.0.1:4173. Use `ONECHORUS_PORT` for another port. `npm run preview` serves the built `dist` folder on the same default port; stop the dev server or choose a different port first.

## Working prototype

- Six sample agents connected by an explicit acyclic dependency graph.
- Three versioned brief inputs: target audience, delivery platform, and API contract.
- Transitive invalidation after an input or an agent instruction changes.
- Artifact inspection, role editing, per-agent and per-run sample budget checks.
- Dependency-ordered replay, with preserved revisions for unaffected artifacts.
- Unknown dependency simulation conservatively marks every task for replay.
- Cost ledger, complete reset, and JSON export.
- Responsive pages and keyboard-accessible tabs and modal editor.

No live Claude integration, model outputs, backend, authentication, or repository connection is implemented. Artifacts are dependency records. Cost values are synthetic micro-USD fixtures, not current provider prices or measured savings. Semantic correctness and dependency completeness are not established by this demo.

## Static build

`npm run build` copies the six public assets and hosting headers into `dist`. Deploy only `dist` to a static host. The build has no external package dependencies.

Local application preparation, research notes, and visual review screenshots are excluded from Git and the public build. The site includes no signup form, tracking scripts, or collection of user credentials.

## Claude integration roadmap

The first live workflow will use Claude for brief analysis, task and dependency proposals, role-specific contexts, and evidence review. Before claiming efficiency gains, compare total cost and accepted output quality against a full rerun and a simple dependency baseline. See the public product brief for the evaluation plan and current limitations.

References:
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs

## Positioning

Existing tools overlap: CrewAI, LangSmith, and Claude Managed Agents already cover aspects of orchestration, context, cost, and evaluation. Incremental dependency tracking is established. Our narrower product hypothesis is that small teams benefit from an accessible workspace for changing goals that ties source changes to preserved work and measured rework. It needs customer and live evaluation evidence.

## Files

- `index.html`: public landing page and demo shell.
- `styles.css`: ink-and-mint theme, responsive layouts, and accessible interaction states.
- `demo.js`: dependency engine and synthetic fixtures.
- `app.js`: UI, contract editing, tabs, budget controls, and exports.
- `product.html`: public product brief and honest implementation status.
- `scripts/`: static server and build script.
- `tests/`: meaningful graph, preservation, accounting, and budget checks.
