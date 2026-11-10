import { test, expect } from '@playwright/test';

const VIEWS = ['Competitors', 'Trends', 'Opportunities', 'Report'];

/** The page must never be wider than the window. */
async function expectNoSidewaysScroll(page, where) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, `${where}: page is ${scrollWidth}px wide in a ${clientWidth}px window`).toBeLessThanOrEqual(clientWidth);
}

async function enter(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Initialize Dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Competitors', level: 1 })).toBeVisible();
}

test.describe('phone (390 x 844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('every view is reachable and nothing scrolls sideways', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Initialize Dashboard' })).toBeVisible();
    await expectNoSidewaysScroll(page, 'landing');
    await page.getByRole('button', { name: 'Initialize Dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Competitors', level: 1 })).toBeVisible();

    const nav = page.getByRole('navigation', { name: 'Sections' });
    await expect(nav).toBeVisible();
    for (const view of VIEWS) {
      await nav.getByRole('button', { name: view, exact: true }).click();
      await expect(page.getByRole('heading', { name: view, level: 1 })).toBeVisible();
      await expect(nav.getByRole('button', { name: view, exact: true })).toHaveAttribute('aria-current', 'page');
      await page.waitForTimeout(400); // tab transition
      await expectNoSidewaysScroll(page, view);
    }

    // open a card, and the report, which hold the longest lines
    await nav.getByRole('button', { name: 'Competitors', exact: true }).click();
    const card = page.locator('[data-testid="competitor-card"][data-has-data="true"]').first();
    if (await card.count() > 0) {
      await card.getByRole('button', { name: /Facts & Analysis/ }).click();
      await expect(card.getByTestId('fact').first()).toBeVisible();
      await expectNoSidewaysScroll(page, 'open card');
      // the bottom bar does not cover the last thing on the page
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const footerBottom = await page.getByTestId('disclaimer').evaluate((el) => el.getBoundingClientRect().bottom);
      const navTop = await nav.evaluate((el) => el.getBoundingClientRect().top);
      expect(footerBottom).toBeLessThanOrEqual(navTop);
    }
    await nav.getByRole('button', { name: 'Report', exact: true }).click();
    await page.getByRole('button', { name: 'Generate Report' }).click();
    await expect(page.getByTestId('report-text')).toBeVisible();
    await expectNoSidewaysScroll(page, 'generated report');

    // the API dialog fits too, and its model list is not cut off
    await page.getByRole('button', { name: /Connect/ }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expectNoSidewaysScroll(page, 'API dialog');
    const box = await dialog.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    const select = page.getByLabel('Model', { exact: true });
    expect(await select.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  });
});

test.describe('narrow desktop (800 x 900)', () => {
  test.use({ viewport: { width: 800, height: 900 } });

  test('nothing scrolls sideways or is clipped', async ({ page }) => {
    await enter(page);
    for (const view of VIEWS) {
      await page.locator('.sidebar-item', { hasText: view }).click();
      await expect(page.getByRole('heading', { name: view, level: 1 })).toBeVisible();
      await page.waitForTimeout(400);
      await expectNoSidewaysScroll(page, view);
      // the top bar keeps its content inside the window
      const right = await page.locator('header').evaluate((el) => Math.max(...[...el.querySelectorAll('*')].map((n) => n.getBoundingClientRect().right)));
      expect(right).toBeLessThanOrEqual(800);
    }
    // stat labels stay inside their tiles
    await page.locator('.sidebar-item', { hasText: 'Competitors' }).click();
    const overflowing = await page.locator('[data-testid="stat-tile"]').evaluateAll((tiles) => tiles.filter((t) => t.scrollWidth > t.clientWidth + 1).length);
    expect(overflowing).toBe(0);
  });
});

test.describe('wide desktop (1440 x 900)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the sidebar does not scroll sideways after navigating', async ({ page }) => {
    await enter(page);
    const sidebar = page.locator('.sidebar');
    for (const view of [...VIEWS, 'Competitors']) {
      await page.locator('.sidebar-item', { hasText: view }).click();
      await expect(page.getByRole('heading', { name: view, level: 1 })).toBeVisible();
      const m = await sidebar.evaluate((el) => ({ scrollLeft: el.scrollLeft, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
      expect(m.scrollLeft, view).toBe(0);
      expect(m.scrollWidth, view).toBeLessThanOrEqual(m.clientWidth);
    }
  });

  test('the "Connect API" control in the top bar is a button that opens the dialog; Escape closes it from anywhere', async ({ page }) => {
    await enter(page);
    await page.locator('header').getByRole('button', { name: /Connect API for live research/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Connect Claude API' });
    await expect(dialog).toBeVisible();
    // click on plain text inside the dialog (focus leaves the fields), then press Escape
    await dialog.getByText('Live research is optional', { exact: false }).click();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
});
