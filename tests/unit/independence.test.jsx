import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import LandingPage from '../../src/components/LandingPage';
import Footer from '../../src/components/Footer';
import { DISCLAIMER, APP_TITLE } from '../../src/lib/disclaimer';
import { computeStats, buildDataset } from '../../src/lib/dataset';
import { dataset } from '../fixtures/dataset';
import { fixtureCompetitors } from '../fixtures/competitors';

const EXPECTED = 'Independent student project by Sam Jia. Not affiliated with, endorsed by, or built for UPMC or any organization named here. Every fact links to a public source; analysis is labelled and points at the facts it rests on.';

describe('independence statement', () => {
  it('has the agreed wording', () => {
    expect(DISCLAIMER).toBe(EXPECTED);
  });

  it('is in the footer', () => {
    render(<Footer />);
    expect(screen.getByTestId('disclaimer')).toHaveTextContent(EXPECTED);
  });

  it('is on the landing page', async () => {
    render(<LandingPage onEnter={() => {}} stats={computeStats(dataset)} snapshotLabel="2026-01-20" />);
    expect(await screen.findByTestId('disclaimer', {}, { timeout: 6000 })).toHaveTextContent(EXPECTED);
  }, 10000);

  it('is in the dashboard footer, and the old phrasing is gone', async () => {
    const user = userEvent.setup();
    const { container } = render(<App dataset={dataset} />);
    await user.click(await screen.findByRole('button', { name: /Initialize Dashboard/ }, { timeout: 6000 }));
    expect(await screen.findByTestId('disclaimer', {}, { timeout: 6000 })).toHaveTextContent(EXPECTED);
    for (const old of ['for UPMC Digital Marketing', 'Developed for UPMC', 'Created by Sam Jia for UPMC', 'Powered by', 'AI-powered', 'AI-Powered']) {
      expect(container.textContent).not.toContain(old);
    }
  }, 15000);

  it('the page title names the subject, not an organization', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain(`<title>${APP_TITLE}</title>`);
    expect(APP_TITLE).toBe('Competitive Intelligence Dashboard — health-system digital marketing');
    expect(html).not.toContain(['fonts', 'googleapis', 'com'].join('.'));
  });
});

describe('landing page numbers', () => {
  it('are computed from the loaded data', async () => {
    const stats = computeStats(dataset);
    render(<LandingPage onEnter={() => {}} stats={stats} snapshotLabel="2026-01-20" />);
    expect(await screen.findByText(`${stats.systemsTracked} systems`, {}, { timeout: 6000 })).toBeInTheDocument();
    expect(screen.getByText('Snapshot 2026-01-20')).toBeInTheDocument();
    const value = (label) => screen.getByText(label).previousElementSibling;
    await expect.poll(() => value('Systems with data').textContent, { timeout: 4000 }).toBe('2');
    await expect.poll(() => value('Sourced facts').textContent, { timeout: 4000 }).toBe(String(stats.facts));
    await expect.poll(() => value('Linked sources').textContent, { timeout: 4000 }).toBe(String(stats.sources));
  }, 15000);

  it('are zero, and say so, when no snapshot is loaded', async () => {
    const empty = buildDataset({ competitorList: fixtureCompetitors });
    render(<LandingPage onEnter={() => {}} stats={computeStats(empty)} snapshotLabel={null} />);
    expect(await screen.findByText('No snapshot loaded', {}, { timeout: 6000 })).toBeInTheDocument();
    expect(screen.getByText('Systems with data').previousElementSibling).toHaveTextContent('0');
  }, 10000);
});
