# Snapshot schema

The dashboard shows a dated research snapshot. Every factual statement in it
carries one or more URLs that were opened and support it.

Two kinds of statement, never mixed:

- **Fact**: something a public source states or shows. Has evidence.
- **Analysis**: the author's judgment. Has no evidence of its own. It must
  point at the ids of the facts it rests on, and the UI labels it "Analysis".

The rules below are enforced by `src/lib/validateSnapshot.js`. The test
`tests/unit/snapshotFiles.test.js` runs that validator over every file in
`src/data/snapshot/`, so a file that breaks a rule cannot be committed with a
green test run. `npm run validate:data` prints the same check per file.

## System file: `src/data/snapshot/competitors/<id>.json`

```jsonc
{
  "id": "cleveland-clinic",        // must equal the file name and an id in src/data/competitors.js
  "name": "Cleveland Clinic",
  "asOf": "2026-11-10",            // date the research was done (YYYY-MM-DD)
  "positioning": {                  // FACT: how the system describes itself
    "text": "one or two sentences, in neutral words",
    "quote": "optional: a short phrase in the organization's own words, as retrieved",
    "evidence": [ EVIDENCE ]       // one or more
  },
  "facts": [                        // 5 to 10 per system
    {
      "id": "f1",                  // unique within the file
      "category": "campaign | content | channel | metric | program | recognition",
      "text": "one sentence, neutral, checkable",
      "evidence": [ EVIDENCE ]     // one or more
    }
  ],
  "channels": [                     // official channels that exist
    { "name": "YouTube", "url": "https://...", "note": "optional", "evidence": [ EVIDENCE ] }
  ],
  "analysis": {
    "strengths":            [ { "text": "...", "basedOn": ["f1", "f3"] } ],  // 2 to 4
    "gaps":                 [ { "text": "...", "basedOn": ["f2"] } ],        // 0 to 3, observable gaps only
    "opportunitiesForUpmc": [ { "text": "...", "basedOn": ["f2", "f5"] } ]   // 2 to 4
  }
}
```

`upmc.json` is the baseline-system profile. It has the same shape, except that
`analysis` holds only `strengths` and `gaps`.

```jsonc
EVIDENCE = {
  "url": "https://...",            // the page that was opened; https only
  "title": "page or article title",
  "publisher": "site or organization",
  "published": "2026-03-25",       // YYYY-MM-DD, YYYY-MM or YYYY as the page states, or null if it shows no date
  "accessed": "2026-11-10",        // YYYY-MM-DD
  "quote": "optional: supporting text from the page, at most 240 characters"
}
```

## Trends file: `src/data/snapshot/trends.json` (an array)

```jsonc
{
  "id": "ai-chatbots",             // unique in the file
  "topic": "AI chatbots for patient engagement",
  "asOf": "2026-11-10",
  "summary": { "text": "2 to 3 sentences", "evidence": [ EVIDENCE ] },
  "examples": [ { "text": "named, checkable example", "evidence": [ EVIDENCE ] } ],   // 2 to 4
  "channel": "Email | Social | Search | Content | Paid | Marketing Technology",
  "analysis": {                     // the author's judgment, labelled as such
    "relevance": "HIGH | MEDIUM | LOW",
    "effort": "Quick Win | Medium | Strategic Initiative",
    "note": "optional: the author's reading of the evidence, e.g. how thin it is",
    "recommendation": "one or two sentences for UPMC",
    "challenges": ["..."]
  }
}
```

## What the validator rejects

- a missing `id`, `name`, `asOf`, `positioning`, `facts`, `channels` or `analysis`
- an `id` that differs from the file name or is not in the competitor list
- a date that is not a real calendar date in ISO form
- a fact, positioning, channel, summary or example without evidence
- an evidence entry without an https `url`, a `title`, a `publisher` or an `accessed` date
- a `quote` longer than 240 characters
- a duplicate fact id or trend id, or a category/channel/relevance/effort outside the lists above
- an analysis item with an empty `basedOn`, or one that names a fact id the file does not contain

Item counts outside the ranges above are reported as notes, not errors.

## Rules for whoever writes a snapshot

- Write a claim only if a page that was opened states it. Record that page.
- "Unknown" is a valid outcome. Leave the statement out. Unknown never becomes "none".
- Numbers only as the source states them, with the source's own date if it gives one.
- Counts shown on a platform page change daily. Write them as "shown as N on <date>".
- A gap is something observable and tied to a fact. "Feels corporate" is not a gap.
- A summary states what the sources state. The author's reading of them ("the evidence is thin", "small by comparison") goes in `analysis.note`.
- Prefer the organization's own pages and newsroom, then established trade press, then platform pages.
