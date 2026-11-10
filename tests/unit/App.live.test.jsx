import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { dataset } from '../fixtures/dataset';
import { fakeFetch, multiBlockResponse, errorBody, trendAnswer } from '../fixtures/api/responses';

const KEY = 'sk-ant-fixture-key-000';

async function openDashboard(fetchImpl) {
  const user = userEvent.setup();
  render(<App dataset={dataset} fetchImpl={fetchImpl} />);
  await user.click(await screen.findByRole('button', { name: /Initialize Dashboard/ }, { timeout: 5000 }));
  await screen.findByRole('heading', { name: 'Competitors', level: 1 }, { timeout: 5000 });
  return user;
}

async function connect(user) {
  await user.type(await screen.findByLabelText('Anthropic API key'), KEY);
  await user.click(screen.getByRole('button', { name: 'Save & Connect' }));
}

const card = (id) => screen.getAllByTestId('competitor-card').find((c) => c.dataset.competitorId === id);

afterEach(() => vi.restoreAllMocks());

describe('App: live research', () => {
  it('asks for a key first and sends nothing without one', async () => {
    const fetchImpl = fakeFetch();
    const user = await openDashboard(fetchImpl);
    await user.click(within(card('example-health')).getByRole('button', { name: /Run Live Research/ }));
    expect(await screen.findByRole('dialog', { name: 'Connect Claude API' })).toBeInTheDocument();
    expect(fetchImpl.calls).toHaveLength(0);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('shows a live answer as unreviewed, says what was dropped, and can go back to the snapshot', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const fetchImpl = fakeFetch({ body: multiBlockResponse() });
    const user = await openDashboard(fetchImpl);
    await user.click(screen.getByRole('button', { name: /Connect Claude API/ }));
    await connect(user);
    expect(await screen.findByText('API Connected')).toBeInTheDocument();

    await user.click(within(card('example-health')).getByRole('button', { name: /Run Live Research/ }));
    const live = await within(card('example-health')).findByText(/Live research · unreviewed · .* · model-under-test/);
    expect(live).toBeInTheDocument();
    expect(within(card('example-health')).getByTestId('live-note')).toHaveTextContent(
      '4 statements dropped (no usable source link); 3 analysis points dropped (no sourced fact left to rest on).',
    );
    expect(fetchImpl.calls).toHaveLength(1);
    expect(fetchImpl.calls[0].url).toBe('https://api.anthropic.com/v1/messages');
    expect(fetchImpl.calls[0].init.headers['x-api-key']).toBe(KEY);

    // the other card is untouched
    expect(within(card('sample-regional')).getByTestId('provenance-badge')).toHaveTextContent('Verified snapshot');

    await user.click(within(card('example-health')).getByRole('button', { name: /Back to verified snapshot/ }));
    expect(within(card('example-health')).getByTestId('provenance-badge')).toHaveTextContent('Verified snapshot · 2026-01-20');

    // the key went into a request header and nowhere else
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(setItem).not.toHaveBeenCalled();
    expect(window.location.href).not.toContain(KEY);
    expect(document.body.innerHTML).not.toContain(KEY);
  });

  it('shows a clear message in the card when the key is rejected, and keeps the snapshot', async () => {
    const fetchImpl = fakeFetch({ status: 401, body: errorBody('authentication_error', 'invalid x-api-key') });
    const user = await openDashboard(fetchImpl);
    await user.click(screen.getByRole('button', { name: /Connect Claude API/ }));
    await connect(user);
    await user.click(within(card('example-health')).getByRole('button', { name: /Run Live Research/ }));
    const alert = await within(card('example-health')).findByRole('alert');
    expect(alert).toHaveTextContent('The API key was not accepted (401)');
    expect(within(card('example-health')).getByTestId('provenance-badge')).toHaveTextContent('Verified snapshot');
  });

  it('adds a live trend at the top of the list, marked unreviewed', async () => {
    const fetchImpl = fakeFetch({ body: multiBlockResponse(trendAnswer) });
    const user = await openDashboard(fetchImpl);
    await user.click(screen.getByRole('button', { name: /Connect Claude API/ }));
    await connect(user);
    await user.click(screen.getByRole('button', { name: 'Trends' }));
    await user.type(await screen.findByPlaceholderText(/Search trends/), 'short video{Enter}');
    const cards = await screen.findAllByTestId('trend-card');
    await within(cards[0]).findByText(/Live research · unreviewed/);
    const first = screen.getAllByTestId('trend-card')[0];
    expect(within(first).getByRole('heading')).toHaveTextContent('Short video explainers (fixture trend)');
    expect(within(first).getByTestId('live-note')).toHaveTextContent('1 statement dropped');
    expect(screen.getAllByTestId('trend-card')).toHaveLength(3);
    expect(fetchImpl.calls[0].body.messages[0].content).toContain('"short video"');
  });
});
