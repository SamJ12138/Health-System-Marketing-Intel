import { tabConfig } from './tabConfig';

// Same width as the stylesheet rule that hides the sidebar.
export const MOBILE_QUERY = '(max-width: 768px)';

/** Bottom bar with the four views, for windows too narrow for the sidebar. */
export default function MobileNav({ activeTab, onTabChange }) {
  return (
    <nav className="mobile-nav" aria-label="Sections">
      {tabConfig.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
