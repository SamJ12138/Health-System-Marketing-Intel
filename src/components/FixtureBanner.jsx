import { FlaskConical } from 'lucide-react';

/** Shown on every screen when the app was built with the fictional test fixture. */
export default function FixtureBanner() {
  return (
    <div className="fixture-banner" role="note" data-testid="fixture-banner">
      <FlaskConical size={13} aria-hidden="true" />
      Fixture data: fictional organizations and example.com links, for tests and development only
    </div>
  );
}
