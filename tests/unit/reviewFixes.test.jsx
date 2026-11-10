import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import ApiKeyModal from '../../src/components/ApiKeyModal';
import TrendCard from '../../src/components/TrendCard';
import MobileNav from '../../src/components/MobileNav';
import { buildReport } from '../../src/lib/report';
import { validateTrend } from '../../src/lib/validateSnapshot';
import { dataset } from '../fixtures/dataset';
import { fakeFetch, multiBlockResponse, trendAnswer } from '../fixtures/api/responses';

async function openDashboard(props = {}) {
  const user = userEvent.setup();
  render(<App dataset={dataset} {...props} />);
  await user.click(await screen.findByRole('button', { name: /Initialize Dashboard/ }, { timeout: 5000 }));
  await screen.findByRole('heading', { name: 'Competitors', level: 1 }, { timeout: 5000 });
  return user;
}
const statValue = (label) => screen.getByText(label, { exact: false }).closest('[data-testid="stat-tile"]');

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('copying the report', () => {
  async function generate(user) {
    await user.click(screen.getByRole('button', { name: 'Report' }));
    await user.click(await screen.findByRole('button', { name: /Generate Report/ }));
    await screen.findByTestId('report-text');
  }

  it('says so when the clipboard refuses', async () => {
    const user = await openDashboard();
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    await generate(user);
    await user.click(screen.getByRole('button', { name: /Copy/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('Could not copy. Select the text below and copy it by hand.');
  });

  it('says so when there is no clipboard at all', async () => {
    const user = await openDashboard();
    vi.stubGlobal('navigator', { userAgent: 'test' });
    await generate(user);
    await user.click(screen.getByRole('button', { name: /Copy/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('Could not copy');
  });

  it('confirms a successful copy', async () => {
    const user = await openDashboard();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    await generate(user);
    await user.click(screen.getByRole('button', { name: /Copy/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('Copied to the clipboard.');
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('# Competitive Intelligence Report'));
  });
});

describe('snapshot numbers and live numbers are not mixed', () => {
  it('the Trends tile counts the verified snapshot and labels live results separately', async () => {
    const user = await openDashboard({ fetchImpl: fakeFetch({ body: multiBlockResponse(trendAnswer) }) });
    await waitFor(() => expect(statValue('Verified Trends')).toHaveTextContent('2Verified Trends'), { timeout: 3000 });
    await user.click(screen.getByRole('button', { name: /Connect Claude API/ }));
    await user.type(await screen.findByLabelText('Anthropic API key'), 'sk-ant-fixture-key-000');
    await user.click(screen.getByRole('button', { name: 'Save & Connect' }));
    await user.click(screen.getByRole('button', { name: 'Trends' }));
    await user.type(await screen.findByPlaceholderText(/Search trends/), 'short video{Enter}');
    await waitFor(() => expect(screen.getAllByTestId('trend-card')).toHaveLength(3));
    const tile = statValue('Verified Trends');
    await waitFor(() => expect(within(tile).getByText('2')).toBeInTheDocument());
    expect(tile).toHaveTextContent('+1 live, unreviewed');
  }, 20000);

  it('the report summary counts verified content only and lists live research on its own line', () => {
    const live = {
      data: { ...dataset.entries['example-health'].data, positioning: undefined, channels: [], analysis: { strengths: [], gaps: [], opportunitiesForUpmc: [] } },
      provenance: { kind: 'live', fetchedAt: '2026-01-22T09:00:00', model: 'model-under-test', dropped: { statements: 0, analysis: 0 } },
    };
    const liveTrend = { ...dataset.trends[0], id: 'live-1', provenance: live.provenance };
    const md = buildReport({
      competitors: dataset.competitors, homeSystem: dataset.homeSystem, homeEntry: dataset.homeEntry,
      entries: { ...dataset.entries, 'example-health': live }, trends: [liveTrend, ...dataset.trends], opportunities: [], generatedAt: new Date(2026, 0, 22),
    });
    expect(md).toContain('- Systems with verified data: 1 of 3');
    expect(md).toContain('- Verified facts: 10, each with one or more linked sources');
    expect(md).toContain('- Verified trends: 2');
    expect(md).toContain('- Live research, unreviewed and not counted above: 5 facts for 1 system, 1 trend');
    const verifiedOnly = buildReport({
      competitors: dataset.competitors, homeSystem: dataset.homeSystem, homeEntry: dataset.homeEntry,
      entries: dataset.entries, trends: dataset.trends, opportunities: [], generatedAt: new Date(2026, 0, 22),
    });
    expect(verifiedOnly).toContain('- Verified facts: 15,');
    expect(verifiedOnly).not.toContain('Live research, unreviewed and not counted above');
  });
});

describe('analysis.note on a trend', () => {
  const withNote = { ...dataset.trends[0], analysis: { ...dataset.trends[0].analysis, note: 'Fixture note: the evidence is thin.' } };

  it('is valid when it is a non-empty string and invalid otherwise', () => {
    expect(validateTrend(withNote).ok).toBe(true);
    expect(validateTrend({ ...withNote, analysis: { ...withNote.analysis, note: '  ' } }).errors.map((e) => e.path)).toEqual(['analysis.note']);
    expect(validateTrend({ ...withNote, analysis: { ...withNote.analysis, note: 3 } }).errors.map((e) => e.path)).toEqual(['analysis.note']);
  });

  it('is shown inside the Analysis block, never next to the sourced summary', async () => {
    render(<TrendCard trend={withNote} />);
    expect(screen.queryByText('Fixture note: the evidence is thin.')).toBeNull();
    await userEvent.setup().click(screen.getByRole('button', { name: /Examples & Analysis/ }));
    expect(within(screen.getByTestId('analysis')).getByTestId('analysis-note')).toHaveTextContent('Fixture note: the evidence is thin.');
  });

  it('is printed under the Analysis heading of the report', () => {
    const md = buildReport({ competitors: [], entries: {}, trends: [withNote], opportunities: [], generatedAt: new Date(2026, 0, 22) });
    expect(md.indexOf('- Reading of the evidence: Fixture note: the evidence is thin.')).toBeGreaterThan(md.indexOf('#### Analysis'));
  });
});

describe('API dialog', () => {
  it('closes on Escape even when focus is outside its fields', async () => {
    const onClose = vi.fn();
    render(<ApiKeyModal onSave={() => {}} onClose={onClose} />);
    document.activeElement.blur();
    expect(document.body).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stops listening when it is closed', () => {
    const onClose = vi.fn();
    const { unmount } = render(<ApiKeyModal onSave={() => {}} onClose={onClose} />);
    unmount();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('top bar', () => {
  it('the "Connect API" control is a button that opens the dialog', async () => {
    const user = await openDashboard();
    const button = within(screen.getByRole('banner')).getByRole('button', { name: /Connect API for live research/ });
    await user.click(button);
    expect(await screen.findByRole('dialog', { name: 'Connect Claude API' })).toBeInTheDocument();
  });
});

describe('MobileNav', () => {
  it('offers the four views and marks the current one', async () => {
    const onTabChange = vi.fn();
    render(<MobileNav activeTab="trends" onTabChange={onTabChange} />);
    const nav = screen.getByRole('navigation', { name: 'Sections' });
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual(['Competitors', 'Trends', 'Opportunities', 'Report']);
    expect(within(nav).getByRole('button', { name: 'Trends' })).toHaveAttribute('aria-current', 'page');
    await userEvent.setup().click(within(nav).getByRole('button', { name: 'Report' }));
    expect(onTabChange).toHaveBeenCalledWith('report');
  });

  it('is rendered by the app only on a narrow window', async () => {
    await openDashboard();
    expect(screen.queryByRole('navigation', { name: 'Sections' })).toBeNull();
  });
});
