import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { dataset } from '../fixtures/dataset';
import { buildDataset } from '../../src/lib/dataset';
import { fixtureCompetitors } from '../fixtures/competitors';

async function enterDashboard(ds = dataset) {
  const user = userEvent.setup();
  render(<App dataset={ds} />);
  await user.click(await screen.findByRole('button', { name: /Initialize Dashboard/ }, { timeout: 5000 }));
  await screen.findByRole('heading', { name: 'Competitors', level: 1 }, { timeout: 5000 });
  return user;
}

describe('App', () => {
  it('starts on the landing page and marks fixture builds', () => {
    render(<App dataset={dataset} />);
    expect(screen.getByText('Intelligence')).toBeInTheDocument();
    expect(screen.getByTestId('fixture-banner')).toHaveTextContent('Fixture data');
  });

  it('shows the snapshot date, the home system panel, and one card per system', async () => {
    const user = await enterDashboard();
    expect(screen.getByTestId('snapshot-date')).toHaveTextContent('Snapshot · 2026-01-20');
    const home = screen.getByTestId('home-panel');
    expect(within(home).getByText(/Baseline system: Home Example System \(fictional\)/)).toBeInTheDocument();
    // the home system is a slim, separate panel until it is opened
    expect(within(home).getByTestId('home-summary')).toHaveTextContent('5 sourced facts');
    expect(within(home).getByTestId('provenance-badge')).toHaveTextContent('Verified snapshot · 2026-01-20');
    expect(screen.getAllByTestId('competitor-card')).toHaveLength(3);
    await user.click(within(home).getByRole('button', { name: /Show Home Example System \(fictional\) baseline/ }));
    expect(within(home).getByTestId('competitor-card')).toHaveAttribute('data-competitor-id', 'home-example');
    await user.click(within(home).getByRole('button', { name: 'Hide baseline' }));
    const cards = screen.getAllByTestId('competitor-card');
    expect(cards).toHaveLength(3);
    expect(cards.filter((c) => c.dataset.hasData === 'false')).toHaveLength(1);
    expect(screen.getByTestId('no-data')).toHaveTextContent('No verified data yet');
  });

  it('with no snapshot at all it shows empty states instead of content', async () => {
    const user = await enterDashboard(buildDataset({ competitorList: fixtureCompetitors }));
    expect(screen.getByTestId('snapshot-date')).toHaveTextContent('No verified snapshot loaded');
    expect(screen.getAllByTestId('no-data')).toHaveLength(3);
    expect(screen.queryByTestId('home-panel')).toBeNull();
    expect(screen.queryByTestId('fixture-banner')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Trends' }));
    expect(await screen.findByTestId('no-trends')).toHaveTextContent('No verified trends yet');
  });
});

describe('App: save, opportunities, report', () => {
  it('saves insights, lists them as opportunities and prints them in the report', async () => {
    const user = await enterDashboard();
    await user.click(screen.getByRole('button', { name: /Save Example Health \(fictional\) to opportunities/ }));
    await user.click(screen.getByRole('button', { name: 'Trends' }));
    await user.click(await screen.findByRole('button', { name: /Save "Short video explainers \(fixture trend\)" to opportunities/ }));

    await user.click(screen.getByRole('button', { name: 'Opportunities' }));
    const items = await screen.findAllByTestId('opportunity');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Example Health (fictional): opportunity for UPMC');
    expect(items[0]).toHaveTextContent('based on f1');
    expect(items[0]).not.toHaveTextContent('Impact');
    expect(items[1]).toHaveTextContent('High Impact');

    // filtering by impact leaves out the one whose impact is unknown
    await user.selectOptions(screen.getByDisplayValue('All Impact'), 'High');
    expect(screen.getAllByTestId('opportunity')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Report' }));
    await user.click(await screen.findByRole('button', { name: /Generate Report/ }));
    const report = await screen.findByTestId('report-text');
    expect(report).toHaveTextContent('Independent analysis by Sam Jia. Not affiliated with or endorsed by UPMC. Sources are linked next to each fact.');
    expect(report).toHaveTextContent('Content: verified snapshot of 2026-01-20.');
    expect(report).toHaveTextContent('## Saved opportunities');
    expect(report).not.toHaveTextContent('AI-powered');

    // removing an opportunity clears its bookmark
    await user.click(screen.getByRole('button', { name: 'Opportunities' }));
    await user.click(await screen.findByRole('button', { name: /Remove Short video explainers/ }));
    await user.click(screen.getByRole('button', { name: 'Trends' }));
    expect(await screen.findByRole('button', { name: /Save "Short video explainers \(fixture trend\)" to opportunities/ })).toHaveAttribute('aria-pressed', 'false');
  }, 20000);
});
