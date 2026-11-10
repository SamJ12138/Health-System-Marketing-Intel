import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import AnimatedNumber from '../../src/components/AnimatedNumber';

describe('AnimatedNumber', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] }); });
  afterEach(() => { vi.useRealTimers(); });

  it('counts up to the value and stops there', () => {
    render(<AnimatedNumber value={9} className="n" />);
    expect(screen.getByText('0')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('continues from the number on screen when the value changes mid-animation', () => {
    const { rerender, container } = render(<AnimatedNumber value={100} className="n" />);
    act(() => { vi.advanceTimersByTime(300); });
    const midway = Number(container.textContent);
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(100);
    rerender(<AnimatedNumber value={0} className="n" />);
    act(() => { vi.advanceTimersByTime(48); });
    // The old animation was cancelled: the number moves down from where it was, not up towards 100.
    expect(Number(container.textContent)).toBeLessThanOrEqual(midway);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(container.textContent).toBe('0');
  });
});
