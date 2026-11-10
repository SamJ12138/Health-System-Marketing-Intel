import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrendCard from '../../src/components/TrendCard';
import { dataset } from '../fixtures/dataset';

const trend = dataset.trends[0];

describe('TrendCard', () => {
  it('shows topic, snapshot badge and a sourced summary', () => {
    render(<TrendCard trend={trend} />);
    expect(screen.getByRole('heading', { name: trend.topic })).toBeInTheDocument();
    expect(screen.getByTestId('provenance-badge')).toHaveTextContent('Verified snapshot · 2026-01-20');
    expect(screen.getByText(trend.summary.text)).toBeInTheDocument();
    expect(screen.getAllByTestId('source-link')[0]).toHaveAttribute('href', trend.summary.evidence[0].url);
  });

  it('marks relevance and effort as analysis', () => {
    render(<TrendCard trend={trend} />);
    expect(screen.getByText('Analysis')).toBeInTheDocument();
    expect(screen.getByText('HIGH Relevance')).toBeInTheDocument();
    expect(screen.getByText('Quick Win')).toBeInTheDocument();
  });

  it('expands to sourced examples and a labelled analysis block', async () => {
    const user = userEvent.setup();
    render(<TrendCard trend={trend} />);
    await user.click(screen.getByRole('button', { name: /Examples & Analysis/ }));
    const examples = screen.getAllByTestId('trend-example');
    expect(examples).toHaveLength(2);
    for (const example of examples) expect(within(example).getAllByTestId('source-link').length).toBeGreaterThanOrEqual(1);
    const analysis = screen.getByTestId('analysis');
    expect(within(analysis).getByText('Analysis')).toBeInTheDocument();
    expect(within(analysis).getByText('Recommendation for UPMC')).toBeInTheDocument();
    expect(within(analysis).getByText(trend.analysis.recommendation)).toBeInTheDocument();
    expect(within(analysis).getByText('Challenges')).toBeInTheDocument();
    expect(within(analysis).queryAllByTestId('source-link')).toHaveLength(0);
  });

  it('prints nothing for parts a live answer does not have', async () => {
    const partial = { id: 'live-1', topic: 'Partial', summary: trend.summary, examples: [], provenance: { kind: 'live', fetchedAt: '2026-01-21T10:05:00', model: 'm' } };
    const user = userEvent.setup();
    render(<TrendCard trend={partial} />);
    await user.click(screen.getByRole('button', { name: /Examples & Analysis/ }));
    for (const label of ['Examples', 'Analysis', 'Challenges', 'Recommendation for UPMC', 'undefined Relevance']) {
      expect(screen.queryByText(label)).toBeNull();
    }
    expect(screen.getByTestId('provenance-badge')).toHaveTextContent('Live research · unreviewed');
  });

  it('saves through its callback', async () => {
    const onToggleSave = vi.fn();
    render(<TrendCard trend={trend} onToggleSave={onToggleSave} />);
    await userEvent.setup().click(screen.getByRole('button', { name: /Save .* to opportunities/ }));
    expect(onToggleSave).toHaveBeenCalledWith(`trend-${trend.id}`);
  });
});
