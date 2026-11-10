# Verified snapshot

One JSON file per system in `competitors/` (named `<id>.json`, ids from
`src/data/competitors.js`, plus `upmc.json` for the baseline system) and one
`trends.json`. The format is described in `docs/data-schema.md`.

Every file in this directory is checked by `tests/unit/snapshotFiles.test.js`:
a fact without an https source link, an analysis item that points at a fact id
that does not exist, or a malformed date fails the test suite. A system with
no file here is shown as "No verified data yet".
