import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LandingPage from '../../src/components/LandingPage';
import AnimatedNumber from '../../src/components/AnimatedNumber';
import { computeStats } from '../../src/lib/dataset';
import { dataset } from '../fixtures/dataset';

function setReducedMotion(matches) {
  window.matchMedia = vi.fn((query) => ({
    matches: query.includes('prefers-reduced-motion') ? matches : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
}

afterEach(() => { delete window.matchMedia; });

const stats = computeStats(dataset);

describe('prefers-reduced-motion', () => {
  it('shows the whole landing page at once, with final numbers, and enters without delay', async () => {
    setReducedMotion(true);
    const onEnter = vi.fn();
    const { container } = render(<LandingPage onEnter={onEnter} stats={stats} snapshotLabel="2026-01-20" />);
    // no typing: the full word is there on the first render, without a cursor
    expect(screen.getByText('Competitive')).toBeInTheDocument();
    expect(container.querySelector('.typing-cursor')).toBeNull();
    // no staging: counters, disclaimer and button are there synchronously
    expect(screen.getByText('Sourced facts').previousElementSibling).toHaveTextContent(String(stats.facts));
    expect(screen.getByText('Linked sources').previousElementSibling).toHaveTextContent(String(stats.sources));
    expect(screen.getByTestId('disclaimer')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: /Initialize Dashboard/ }));
    expect(onEnter).toHaveBeenCalledTimes(1); // no 600 ms exit animation
  });

  it('without the preference the page is staged (control)', () => {
    setReducedMotion(false);
    render(<LandingPage onEnter={() => {}} stats={stats} snapshotLabel="2026-01-20" />);
    expect(screen.queryByText('Competitive')).toBeNull();
    expect(screen.queryByRole('button', { name: /Initialize Dashboard/ })).toBeNull();
  });

  it('shows numbers without counting up', () => {
    setReducedMotion(true);
    const { container, rerender } = render(<AnimatedNumber value={42} className="n" />);
    expect(container.textContent).toBe('42');
    rerender(<AnimatedNumber value={7} className="n" />);
    expect(container.textContent).toBe('7');
  });

  it('the stylesheet switches CSS animations off', () => {
    const css = readFileSync('src/index.css', 'utf8');
    const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toContain('animation-duration: 0.01ms !important');
    expect(block).toContain('animation-iteration-count: 1 !important');
    expect(block).toContain('transition-duration: 0.01ms !important');
  });
});
