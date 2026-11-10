import { FACT_CATEGORIES, TREND_CHANNELS, RELEVANCE_LEVELS, EFFORT_LEVELS } from './validateSnapshot.js';

const EVIDENCE = `{ "url": "https://... (the exact address of a page you opened through web search)", "title": "page title", "publisher": "site or organization", "published": "YYYY-MM-DD or YYYY or null if the page shows no date", "quote": "optional: the supporting words from the page, at most 240 characters" }`;

const RULES = `Rules:
- A FACT is something a public page states or shows. Every fact needs at least one evidence entry whose url is a page returned by your web searches in this conversation. Statements without such a url will be discarded by the application, so do not include them.
- ANALYSIS is your judgment. Every analysis item must list in "basedOn" the ids of the facts it rests on.
- Give numbers only as the source states them. If something is unknown, leave it out. Do not guess.
- Prefer the organization's own pages and newsroom, then established trade press.
- Finish with one JSON object in a \`\`\`json code block and nothing after it.`;

export function buildCompetitorPrompt(competitor, today) {
  return `Today is ${today}. Use web search to research how ${competitor.name}, a US health system, markets itself online. The reader is a digital marketer at UPMC (a Pittsburgh-based health system).

Return this JSON shape:
{
  "positioning": { "text": "one or two neutral sentences on how the organization describes itself", "quote": "optional: a short phrase in the organization's own words, as shown on the page", "evidence": [ EVIDENCE ] },
  "facts": [ { "id": "f1", "category": "${FACT_CATEGORIES.join(' | ')}", "text": "one neutral, checkable sentence", "evidence": [ EVIDENCE ] } ],
  "channels": [ { "name": "e.g. YouTube", "url": "https://... address of the official channel", "note": "optional", "evidence": [ EVIDENCE ] } ],
  "analysis": {
    "strengths": [ { "text": "...", "basedOn": ["f1"] } ],
    "gaps": [ { "text": "an observable gap, or leave the list empty", "basedOn": ["f2"] } ],
    "opportunitiesForUpmc": [ { "text": "...", "basedOn": ["f1", "f3"] } ]
  }
}
EVIDENCE = ${EVIDENCE}

Aim for 5 to 8 facts.
${RULES}`;
}

export function buildTrendPrompt(query, today) {
  return `Today is ${today}. Use web search to research this topic in US hospital and health-system marketing: ${JSON.stringify(query)}. The reader is a digital marketer at UPMC (a Pittsburgh-based health system).

Return this JSON shape:
{
  "topic": "short name of the trend",
  "summary": { "text": "two or three sentences", "evidence": [ EVIDENCE ] },
  "examples": [ { "text": "a named, checkable example", "evidence": [ EVIDENCE ] } ],
  "channel": "${TREND_CHANNELS.join(' | ')}",
  "analysis": {
    "relevance": "${RELEVANCE_LEVELS.join(' | ')}",
    "effort": "${EFFORT_LEVELS.join(' | ')}",
    "note": "optional: your own reading of how strong the evidence is",
    "recommendation": "one or two sentences for UPMC",
    "challenges": ["..."]
  }
}
EVIDENCE = ${EVIDENCE}

Give 2 to 4 examples.
${RULES}`;
}
