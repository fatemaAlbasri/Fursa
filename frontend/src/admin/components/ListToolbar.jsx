import { SearchIcon, XIcon } from '../../shared/components/icons.jsx'

// Tabs with counts on the left, search box on the right
// tabs = [{ key, label }], counts = { all: 6, cv: 5, ... }
export default function ListToolbar({ tabs, counts, active, onTab, search, onSearch, placeholder }) {
  return (
    <div className="admin-toolbar">
      <div className="admin-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-pressed={active === t.key}
            className={'admin-tab' + (active === t.key ? ' admin-tab--active' : '')}
            onClick={() => onTab(t.key)}
          >
            {t.label}
            <span className="admin-tab__count">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      <div className="admin-search">
        <SearchIcon />
        <input
          type="text"
          aria-label="Search"
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            className="admin-search__clear"
            aria-label="Clear search"
            onClick={() => onSearch('')}
          >
            <XIcon />
          </button>
        )}
      </div>
    </div>
  )
}