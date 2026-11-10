import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompetitorCard from '../../src/components/CompetitorCard';
import { dataset } from '../fixtures/dataset';

const competitor = dataset.competitors[0];
const entry = dataset.entries[competitor.id];

async function renderExpanded(props = {}) {
  const user = userEvent.setup();
  const utils = render(<CompetitorCard competitor={competitor} entry={entry} onResearch={() => {}} onToggleSave={() => {}} {...props} />);
  await user.click(screen.getByRole('button', { name: /Facts & Analysis/ }));
  return { user, ...utils };
}

describe('CompetitorCard', () => {
  it('shows a plain "No verified data yet" state when there is no snapshot', () => {
    render(<CompetitorCard competitor={dataset.competitors[2]} entry={undefined} onResearch={() => {}} />);
    expect(screen.getByTestId('no-data')).toHaveTextContent('No verified data yet');
    expect(screen.queryByTestId('provenance-badge')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByText('Positioning')).toBeNull();
  });

  it('labels snapshot content with its date', () => {
    render(<CompetitorCard competitor={competitor} entry={entry} />);
    expect(screen.getByTestId('provenance-badge')).toHaveTextContent('Verified snapshot · 2026-01-20');
  });

  it('labels live content as unreviewed, with time and model, and offers the way back', async () => {
    const onDiscardLive = vi.fn();
    const live = { data: entry.data, provenance: { kind: 'live', fetchedAt: '2026-01-21T10:05:00', model: 'model-under-test' } };
    render(<CompetitorCard competitor={competitor} entry={live} hasSnapshot onResearch={() => {}} onDiscardLive={onDiscardLive} />);
    const badge = screen.getByTestId('provenance-badge');
    expect(badge).toHaveTextContent(/^Live research · unreviewed · 2026-01-21 10:05 · model-under-test$/);
    await userEvent.setup().click(screen.getByRole('button', { name: /Back to verified snapshot/ }));
    expect(onDiscardLive).toHaveBeenCalledWith(competitor.id);
  });

  it('links the positioning and every channel', () => {
    render(<CompetitorCard competitor={competitor} entry={entry} />);
    expect(screen.getByText(/describes itself as a community health system/)).toBeInTheDocument();
    expect(screen.getByText('In its own words (excerpt):', { exact: false })).toBeInTheDocument();
    const video = screen.getByRole('link', { name: /Video channel/ });
    expect(video).toHaveAttribute('href', 'https://example.com/fixture/example-health/video');
    expect(video).toHaveAttribute('rel', 'noopener noreferrer');
    expect(video).toHaveAttribute('target', '_blank');
  });

  it('shows every fact with at least one source link', async () => {
    await renderExpanded();
    const facts = screen.getAllByTestId('fact');
    expect(facts).toHaveLength(entry.data.facts.length);
    for (const fact of facts) {
      const links = within(fact).getAllByTestId('source-link');
      expect(links.length).toBeGreaterThanOrEqual(1);
      for (const link of links) {
        expect(link.getAttribute('href')).toMatch(/^https:\/\//);
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      }
    }
    expect(within(facts[2]).getAllByTestId('source-link')).toHaveLength(2);
  });

  it('shows channel notes in the details', async () => {
    await renderExpanded();
    expect(screen.getByTestId('channel-note')).toHaveTextContent('shown as 1,234 subscribers on 2026-01-20 (invented)');
  });

  it('puts strengths, gaps and opportunities under an "Analysis" label', async () => {
    await renderExpanded();
    const analysis = screen.getByTestId('analysis');
    expect(within(analysis).getByText('Analysis')).toBeInTheDocument();
    expect(within(analysis).getByText(/author's judgment/)).toBeInTheDocument();
    for (const heading of ['Strengths', 'Observable gaps', 'Opportunities for UPMC']) {
      expect(within(analysis).getByText(heading)).toBeInTheDocument();
    }
    // analysis text never appears among the facts, and analysis items carry no source links
    expect(within(analysis).queryAllByTestId('source-link')).toHaveLength(0);
    expect(within(analysis).getAllByTestId('analysis-item')).toHaveLength(5);
  });

  it('highlights the facts an analysis item rests on', async () => {
    const { user } = await renderExpanded();
    const item = screen.getAllByTestId('analysis-item')[0]; // based on f1, f2
    const highlighted = () => screen.getAllByTestId('fact').filter((f) => f.classList.contains('fact-highlight')).map((f) => f.dataset.factId);
    expect(highlighted()).toEqual([]);
    await user.click(within(item).getByRole('button', { name: 'Show fact f1' }));
    expect(highlighted()).toEqual(['f1', 'f2']);
    expect(within(item).getByRole('button', { name: 'Show fact f1' })).toHaveAttribute('aria-pressed', 'true');
    // another item replaces the highlight
    await user.click(within(screen.getAllByTestId('analysis-item')[1]).getByRole('button', { name: 'Show fact f3' }));
    expect(highlighted()).toEqual(['f3']);
    // selecting the same item again clears it
    await user.click(within(screen.getAllByTestId('analysis-item')[1]).getByRole('button', { name: 'Show fact f3' }));
    expect(highlighted()).toEqual([]);
  });

  it('does not turn a non-http address into a link, wherever it sits', async () => {
    const data = JSON.parse(JSON.stringify(entry.data));
    data.facts[0].evidence[0].url = 'javascript:alert(1)';
    data.channels[0].url = 'data:text/html,<b>x</b>';
    data.positioning.evidence[0].url = 'javascript:void(0)';
    const { container } = await renderExpanded({ entry: { data, provenance: entry.provenance } });
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs.length).toBeGreaterThan(0);
    expect(hrefs.filter((h) => !/^https?:\/\//.test(h))).toEqual([]);
    expect(screen.getAllByTestId('source-withheld').length).toBe(2);
  });

  it('saves and researches through its callbacks', async () => {
    const onToggleSave = vi.fn();
    const onResearch = vi.fn();
    const user = userEvent.setup();
    render(<CompetitorCard competitor={competitor} entry={entry} onToggleSave={onToggleSave} onResearch={onResearch} />);
    await user.click(screen.getByRole('button', { name: /Save Example Health \(fictional\) to opportunities/ }));
    expect(onToggleSave).toHaveBeenCalledWith('comp-example-health');
    await user.click(screen.getByRole('button', { name: /Run Live Research/ }));
    expect(onResearch).toHaveBeenCalledWith('example-health');
  });

  it('as the baseline-system card it has no opportunities, bookmark or research button', async () => {
    const user = userEvent.setup();
    render(<CompetitorCard competitor={dataset.homeSystem} entry={dataset.homeEntry} home />);
    expect(screen.getByText('Baseline system')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Facts & Analysis/ }));
    expect(screen.queryByText('Opportunities for UPMC')).toBeNull();
    expect(screen.queryByRole('button', { name: /Run Live Research/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /to opportunities/ })).toBeNull();
    expect(within(screen.getByTestId('analysis')).getByText('Strengths')).toBeInTheDocument();
  });
});
