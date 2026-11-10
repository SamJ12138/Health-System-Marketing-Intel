# Test fixtures: fictional data

Everything in this directory is invented. "Example Health (fictional)",
"Sample Regional Medical (fictional)", "Placeholder Clinic (fictional)" and
"Home Example System (fictional)" are not real organizations, the facts are
made up, and every link points at example.com, a domain reserved for
documentation.

The fixtures exist so the tests and the UI can be exercised without
depending on the real research snapshot. They are never part of the shipped
app: `npm run build` reads `src/data/snapshot/` only. `npm run dev:fixture`
and `npm run build:fixture` load them instead, and the page then shows a
permanent "Fixture data" banner.
