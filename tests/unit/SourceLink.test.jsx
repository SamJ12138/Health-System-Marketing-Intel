import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SourceLink, EvidenceList } from '../../src/components/SourceLink';

const evidence = {
  url: 'https://example.com/fixture/page',
  title: 'A page (fictional page)',
  publisher: 'Example Publisher (fictional)',
  published: '2026-01-15',
  accessed: '2026-01-20',
  quote: 'part of a sentence from the page',
};

describe('SourceLink', () => {
  it('renders title, publisher and date as a link that opens in a new tab', () => {
    render(<SourceLink evidence={evidence} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com/fixture/page');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveTextContent('A page (fictional page)');
    expect(link).toHaveTextContent('Example Publisher (fictional)');
    expect(link).toHaveTextContent('2026-01-15');
  });

  it('says so when the page shows no date', () => {
    render(<SourceLink evidence={{ ...evidence, published: null }} />);
    expect(screen.getByRole('link')).toHaveTextContent('date not shown on page');
  });

  it.each([
    ['javascript:alert(1)'],
    ['data:text/html,<script>alert(1)</script>'],
    ['vbscript:x'],
    ['/relative'],
    [''],
    [undefined],
  ])('never renders %j as a link', (url) => {
    const { container } = render(<SourceLink evidence={{ ...evidence, url }} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
    expect(container.innerHTML).not.toContain('javascript:');
    expect(container.innerHTML).not.toContain('data:text');
    expect(screen.getByTestId('source-withheld')).toHaveTextContent('A page (fictional page)');
    expect(screen.getByTestId('source-withheld')).toHaveTextContent('link withheld');
  });
});

describe('EvidenceList', () => {
  it('labels the stored text as an excerpt with its retrieval date, not as a quotation', () => {
    render(<EvidenceList evidence={[evidence, { ...evidence, url: 'https://example.com/other', quote: undefined }]} />);
    expect(screen.getAllByRole('link')).toHaveLength(2);
    const excerpts = screen.getAllByTestId('source-excerpt');
    expect(excerpts).toHaveLength(1);
    expect(excerpts[0]).toHaveTextContent('Excerpt (retrieved 2026-01-20): part of a sentence from the page');
  });

  it('renders nothing without evidence', () => {
    const { container } = render(<EvidenceList evidence={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
