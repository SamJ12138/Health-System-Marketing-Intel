# Competitive Intelligence Dashboard — health-system digital marketing

![Demo: landing page, competitor grid, one competitor with its facts and source links, an analysis item and the facts it rests on, trends, a saved opportunity, the generated report](docs/demo.gif)

*Rendered by `npm run demo:video` (`scripts/make-demo-video.mjs`) from the shipped build and the verified snapshot of 2026-11-10. No hand recording. Full quality: [docs/demo.mp4](docs/demo.mp4).*

A personal project that tracks how nine US health systems market themselves online, seen from the point of view of a marketer at UPMC. It is a React single-page app with a Competitors tab, a Trends tab, a list of saved opportunities and a Markdown report export.

**Independent student project by Sam Jia. Not affiliated with, endorsed by, or built for UPMC or any organization named here. Every fact links to a public source; analysis is labelled and points at the facts it rests on.**

## Quickstart

Needs Node `^22.22.2 || ^24.15.0 || >=26.0.0` (22.22.2 or newer in the 22 line, 24.15 or newer in the 24 line, or 26 and up). The limit comes from the test tooling. The commands are the same in PowerShell and bash.

```
git clone https://github.com/SamJ12138/health-system-marketing-intel.git
cd health-system-marketing-intel
npm ci
npm run dev
```

Open the address Vite prints (http://localhost:5173 by default). No account, no API key and no network access are needed to browse the snapshot. Fonts are bundled.

Other commands:

| Command | What it does |
|---|---|
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run lint` | ESLint |
| `npm test` | Unit and component tests (Vitest, jsdom) |
| `npm run e2e` | End-to-end tests in Chromium (run `npx playwright install chromium` once first) |
| `npm run validate:data` | Check every snapshot file against the schema and print the result per file |
| `npm run audit:totals` | Add up the audit tables in `docs/audit/` |
| `npm run dev:fixture` | Run the app on fictional test data, with a "Fixture data" banner |
| `npm run demo:video` | Re-render `docs/demo.mp4` and `docs/demo.gif` (needs ffmpeg) |

## Where the data comes from

The app shows a research snapshot stored in `src/data/snapshot/`: one JSON file per system and one for trends. The format is in [docs/data-schema.md](docs/data-schema.md).

The snapshot is dated 2026-11-10. It covers 9 competitor systems and UPMC: 100 facts, 98 channel entries and 5 trends, backed by 199 distinct source addresses.

UPMC is the baseline system: the one the analysis is written for. It has its own panel, apart from the competitors.

The rules:

- **Every fact has an opened URL.** A fact, a positioning line, a channel or a trend example is only in the snapshot if a public page that was opened on the snapshot date states it. The page's address, title, publisher and date sit next to the statement as a link.
- **Facts and analysis are kept apart.** Strengths, gaps, opportunities, relevance, effort, recommendations and the author's reading of how strong the evidence is are judgment. They carry the label "Analysis". For a system, each analysis point lists the ids of the facts it rests on, and selecting it highlights those facts. Analysis has no source link of its own.
- **Unknown stays unknown.** If nothing could be opened that states a thing, the thing is not there. No follower or subscriber count was read off a live platform page. Where a number appears, it is the figure a dated article or newsroom post reported, and the statement says so.
- **The validator enforces this.** `src/lib/validateSnapshot.js` rejects a file with a fact that has no https source, an analysis item that points at a fact id that does not exist, a malformed date, or an id that is not in the competitor list. A unit test runs it over every snapshot file, so a bad file fails the test suite. The app also runs it on load and shows "No verified data yet" for a system whose file is missing or invalid.

Things to know before you rely on it:

- **"Verified" means "checked against the linked page on that date".** Each source page was retrieved through a web fetch tool on 2026-11-10 and the statement was written against what came back. Nobody has re-read every page by eye afterwards. The trail is the URL, the retrieval date and the excerpt next to each statement.
- **Excerpts are not exact quotations.** The fetch tool returns short excerpts, sometimes sentence fragments. The app labels them "Excerpt (retrieved <date>)" for that reason. The line "In its own words (excerpt)" under a positioning is the same kind of text: a mission or description sentence as retrieved, not always a tagline.
- **"date not shown on page"** means the page itself gives no publication date.
- **Some social channels were not opened directly.** For several Facebook, Instagram, TikTok, LinkedIn, X and Pinterest accounts the evidence is the organization's own page that links to the account. The channel note says so where it applies.
- **A few facts come from vendors or trade press.** Their text says who the source is.
- **It is a snapshot.** Pages change and links rot. The date is on every card and in the header.
- **It is a small sample, not a measurement.** Ten facts per system, chosen while reading their public pages. Nothing here ranks the systems.

### Why the original sample data was replaced

An earlier, unpublished version of this project shipped with sample text about these organizations that a language model had written: specific numbers, campaign names, strengths and weaknesses, and "sources" that were names, not links. That sample data is not published in this repository.

Before replacing it, every statement in it was checked against pages opened on 2026-11-10. The tables are in [docs/audit/](docs/audit/), one per system plus one for the trends. Each table quotes the old statement next to its verdict. The quoted column is there for the audit only; nothing in it is asserted by this project. Old lines that were unsourced negative judgments about a named organization are not reproduced, only counted.

276 statements audited in 10 tables: 50 supported, 72 corrected, 92 not found, 6 wrong, 56 opinion.

"Supported" means an opened page states the claim. "Corrected" means a page states something close and the table gives the right version. "Not found" means no opened page states it, which is not the same as false. "Wrong" means an opened page contradicts it. "Opinion" means the line was a judgment and was not researched. 50 of the 220 factual statements held up as written. That is why the sample data is gone and why the app now refuses to show a fact without a link.

The two sentences with numbers are checked by a test against the `TOTALS` lines of the tables, and each `TOTALS` line is checked against the rows of its table.

## Live research (optional)

Each competitor card has a "Run Live Research" button, and the Trends tab has a search box. Both need your own Anthropic API key. Nothing happens until you connect one.

What it sends, and where:

- One HTTPS request per run goes straight from your browser to `https://api.anthropic.com/v1/messages`. There is no server in between and no other network call in the app.
- The request holds a research prompt (the name of the system or your search words), the model you chose and the web search tool. Your key is in a request header.
- The key is kept in the page's memory only. It is not written to browser storage, cookies or the URL, and it is not logged. Reloading or closing the tab forgets it. Anyone with access to the open tab could read it, so use a key you can revoke.

What happens to the answer:

- The model is asked for the same schema as the snapshot. The answer is filtered before anything is shown. A fact, channel or positioning is kept only if it has an https source that the search tool actually returned in that response. An analysis point is kept only if every fact it rests on survived. What is left must pass the same validator as the snapshot.
- Model-written text is treated as untrusted. Every string is reduced to a single line when it is filtered, and the report escapes Markdown in every piece of text it prints. A model answer cannot add a heading, a "Verified snapshot" line or a link of its own to the exported report. Links in the app and in the report are only ever built from http and https addresses.
- An answer that was cut off at the token limit is reported as cut off, not as empty.
- The card says how many statements were dropped.
- The result is marked "Live research · unreviewed · time · model". It never replaces the verified snapshot: "Back to verified snapshot" discards it. The landing-page numbers, the "Verified Trends" tile and the report summary count the snapshot only and name live results separately.

**The live path has been tested against fixtures only.** There was no API key in the development environment. The client is exercised with a fake `fetch` and response fixtures written from the API documentation as read on 2026-11-10: a multi-block web-search response, a paused turn, a refusal, an empty answer, malformed JSON, a truncated answer, a failed search, and each documented error status. It has not made a real API call. Details that come from the documentation and may need adjusting on first real use: the tool type `web_search_20250305`, the default model `claude-opus-5-5` (changeable in the dialog), and the request header that allows calls from a browser.

## Tests

- `npm test`: unit and component tests. They cover the schema validator, the URL filter (only http and https ever become links; `javascript:` and `data:` values are tested), response parsing, the API client with every error status, the live-answer filter, forged Markdown in model text, opportunities, the report, the cards, the API-key dialog (focus trap, Escape, key never stored), reduced motion, and repository hygiene (no personal data, no leftover claims, no network fonts).
- `npm run e2e`: Chromium against `vite preview`, on two builds: the fictional fixture and the shipped build. One flow goes landing, dashboard, open a competitor, source link present, analysis item highlights its facts, save an insight, find it under Opportunities, generate the report, disclaimer line present. Layout checks run at 390 x 844, 800 x 900 and 1440 x 900: every view reachable, no sideways scrolling. Any console error or request to another host fails the flow.
- Test fixtures are fictional and say so: "Example Health (fictional)", links to example.com. They live in `tests/fixtures/` and are never part of `npm run build`.
- `.github/workflows/ci.yml` runs lint, unit tests, build and the e2e tests on ubuntu-24.04, and lint, unit tests and build on windows-2025, on the newest Node 22 that satisfies `engines`. The workflow has not run yet; it will on the first push.

## Limitations

- The snapshot is one day's reading of public pages. It is not monitored or refreshed automatically.
- Source excerpts come from a fetch tool, not from a person reading the page (see above).
- The analysis is one student's judgment from an outside view. It uses no internal data from any organization.
- Live research is untested against the real API and its output is unreviewed by design.
- The API key is handled in the browser. That is fine for a personal tool on your own machine and wrong for anything shared.
- Small uppercase section labels and inactive navigation items use a dim grey with a contrast of about 3.6 to 4 to 1. Reading text (statements, source details, excerpts) is at 4.5 to 1 or better.
- The demo GIF uses a reduced palette to stay under 8 MB, so its colours are flatter than the app. The mp4 is accurate.

## License

MIT, see [LICENSE](LICENSE). Copyright 2026 Tianyi Jia. The names of the organizations belong to their owners and are used only to describe publicly available information about them.
