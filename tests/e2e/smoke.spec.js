import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DISCLAIMER = 'Independent student project by Sam Jia. Not affiliated with, endorsed by, or built for UPMC or any organization named here. Every fact links to a public source; analysis is labelled and points at the facts it rests on.';
const REPORT_LINE = 'Independent analysis by Sam Jia. Not affiliated with or endorsed by UPMC. Sources are linked next to each fact.';

/** Fails the test on any page error, console error, or request that leaves localhost. */
function watch(page) {
  const problems = [];
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') problems.push(`console error: ${message.text()}`); });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol !== 'data:' && url.protocol !== 'blob:') {
      problems.push(`request left the page's origin: ${request.url()}`);
    }
  });
  return problems;
}

async function enterDashboard(page) {
  await page.goto('/');
  await expect(page).toHaveTitle('Competitive Intelligence Dashboard — health-system digital marketing');
  await expect(page.getByTestId('disclaimer')).toHaveText(DISCLAIMER);
  await page.getByRole('button', { name: 'Initialize Dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Competitors', level: 1 })).toBeVisible();
}

test('landing → dashboard → competitor → source link → save → opportunities → report', async ({ page }, testInfo) => {
  const problems = watch(page);
  const isFixture = testInfo.project.name === 'fixture';
  await enterDashboard(page);

  if (isFixture) await expect(page.getByTestId('fixture-banner')).toBeVisible();
  else await expect(page.getByTestId('fixture-banner')).toHaveCount(0);

  // The stylesheet regressions fixed earlier: spacing utilities apply and headings use the display font.
  const anyCard = page.getByTestId('competitor-card').first();
  await expect(anyCard).toBeVisible();
  expect(await anyCard.locator('.p-6').first().evaluate((el) => getComputedStyle(el).paddingLeft)).toBe('24px');
  expect(await page.getByRole('heading', { name: 'Competitors', level: 1 }).evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Chakra Petch');
  expect(await page.evaluate(() => document.fonts.check('700 16px "Chakra Petch"') && document.fonts.check('400 16px "IBM Plex Mono"'))).toBe(true);

  const grid = page.locator('.grid').getByTestId('competitor-card');
  const withData = grid.and(page.locator('[data-has-data="true"]'));
  test.skip(await withData.count() === 0, 'no snapshot files in src/data/snapshot yet');
  await expect(page.getByTestId('snapshot-date')).toHaveText(/^Snapshot · \d{4}-\d{2}-\d{2}/);

  // Open a competitor that can be saved.
  const card = withData.filter({ has: page.getByRole('button', { name: /to opportunities$/ }) }).first();
  const name = await card.getByRole('heading', { level: 3 }).innerText();
  await expect(card.getByTestId('provenance-badge')).toHaveText(/^Verified snapshot · \d{4}-\d{2}-\d{2}$/);
  await card.getByRole('button', { name: /Facts & Analysis/ }).click();

  // A fact with its source link.
  const fact = card.getByTestId('fact').first();
  await expect(fact).toBeVisible();
  const link = fact.getByTestId('source-link').first();
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', /^https:\/\//);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  // No link on the page is anything but http(s).
  const hrefs = await page.locator('a[href]').evaluateAll((links) => links.map((a) => a.getAttribute('href')));
  expect(hrefs.filter((href) => !/^https?:\/\//.test(href))).toEqual([]);

  // Analysis is labelled, and an item points at its facts.
  const analysis = card.getByTestId('analysis');
  await expect(analysis.getByText('Analysis', { exact: true })).toBeVisible();
  await expect(card.locator('.fact-highlight')).toHaveCount(0);
  await analysis.getByTestId('analysis-item').first().getByRole('button').first().click();
  expect(await card.locator('.fact-highlight').count()).toBeGreaterThan(0);

  // Save it, find it under Opportunities.
  await card.getByRole('button', { name: /^Save .* to opportunities$/ }).click();
  await page.getByRole('button', { name: 'Opportunities', exact: true }).click();
  await expect(page.getByTestId('opportunity')).toHaveCount(1);
  await expect(page.getByTestId('opportunity')).toContainText(name);

  // Generate the report: the disclaimer line and the saved opportunity are in it.
  await page.getByRole('button', { name: 'Report', exact: true }).click();
  await page.getByRole('button', { name: 'Generate Report' }).click();
  const report = page.getByTestId('report-text');
  await expect(report).toContainText(REPORT_LINE);
  await expect(report).toContainText('Content: verified snapshot of');
  await expect(report).toContainText(`${name}: opportunity for UPMC`);
  await expect(report).not.toContainText('AI-powered');

  await expect(page.getByTestId('disclaimer')).toHaveText(DISCLAIMER); // footer
  expect(problems).toEqual([]);
});

test('trends tab shows sourced trends or a plain empty state', async ({ page }) => {
  const problems = watch(page);
  await enterDashboard(page);
  await page.getByRole('button', { name: 'Trends', exact: true }).click();
  const cards = page.getByTestId('trend-card');
  await expect(cards.first().or(page.getByTestId('no-trends'))).toBeVisible();
  if (await cards.count() > 0) {
    await expect(cards.first().getByTestId('source-link').first()).toHaveAttribute('href', /^https:\/\//);
    await cards.first().getByRole('button', { name: 'Examples & Analysis' }).click();
    await expect(cards.first().getByTestId('analysis').getByText('Analysis', { exact: true })).toBeVisible();
  }
  expect(problems).toEqual([]);
});

test('the API-key dialog closes on Escape and nothing is sent without a key', async ({ page }) => {
  const problems = watch(page);
  await enterDashboard(page);
  await page.getByRole('button', { name: 'Connect Claude API' }).click();
  const dialog = page.getByRole('dialog', { name: 'Connect Claude API' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('straight from this browser to api.anthropic.com and nowhere else');
  await expect(page.getByLabel('Anthropic API key')).toBeFocused();
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  expect(problems).toEqual([]); // includes: no request to any other host
});

test('with prefers-reduced-motion the landing page is complete at once and nothing loops', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  // Normally the button appears after about 2.2 s of typing; here it must be there straight away.
  await expect(page.getByRole('button', { name: 'Initialize Dashboard' })).toBeVisible({ timeout: 700 });
  await expect(page.locator('.typing-cursor')).toHaveCount(0);
  const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity).length);
  expect(running).toBe(0);
  await page.getByRole('button', { name: 'Initialize Dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Competitors', level: 1 })).toBeVisible({ timeout: 1500 });
  await context.close();
});

test('the shipped build contains no fixture data', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'snapshot', 'only meaningful for the shipped build');
  const assets = join(process.cwd(), 'dist', 'assets');
  expect(existsSync(assets)).toBe(true);
  for (const file of readdirSync(assets).filter((f) => f.endsWith('.js'))) {
    const text = readFileSync(join(assets, file), 'utf8');
    expect(text).not.toContain('(fictional)');
    expect(text).not.toContain('example.com/fixture');
  }
  await page.goto('/');
  await expect(page.getByTestId('fixture-banner')).toHaveCount(0);
});
