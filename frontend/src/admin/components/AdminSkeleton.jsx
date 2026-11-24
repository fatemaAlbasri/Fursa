// Grey shapes shown while an admin page loads (same idea as the company pages).
// The .sk / .sk--line / .sk--thin shapes are in JobsForYou.css.

const range = (n) => Array.from({ length: n }, (_, i) => i)

export const SkLine = ({ width, thin }) => (
  <span className={thin ? 'sk sk--line sk--thin' : 'sk sk--line'} style={{ width }} />
)

// Row of number cards
export function StatsLoading({ count = 4, className = '' }) {
  return (
    <div className={`admin-stats ${className}`} aria-hidden="true">
      {range(count).map((i) => (
        <div key={i} className="admin-stat admin-sk-stat">
          <SkLine width={48} />
          <SkLine width="60%" thin />
        </div>
      ))}
    </div>
  )
}

// Cards (optional) + tabs + search + table rows.
// columns = how many columns the real table has, so the shapes line up with it
export function ListLoading({ label, stats = true, tabs = 3, columns = 6 }) {
  const grid = { gridTemplateColumns: `minmax(0, 2.4fr) repeat(${columns - 1}, minmax(0, 1fr))` }
  return (
    <div role="status" aria-label={label}>
      {stats && <StatsLoading />}

      <div className="admin-toolbar" aria-hidden="true">
        <div className="admin-tabs">
          {range(tabs).map((i) => (
            <span key={i} className="sk admin-sk-tab" />
          ))}
        </div>
        <span className="sk admin-sk-search" />
      </div>

      <section className="admin-panel admin-table-box" aria-hidden="true">
        <div className="admin-sk-row admin-sk-row--head" style={grid}>
          {range(columns).map((i) => (
            <SkLine key={i} width={i === 0 ? '30%' : '55%'} thin />
          ))}
        </div>
        {range(5).map((row) => (
          <div key={row} className="admin-sk-row" style={grid}>
            <div className="admin-sk-who">
              <span className="sk admin-sk-avatar" />
              <div className="admin-sk-lines">
                <SkLine width="55%" />
                <SkLine width="40%" thin />
              </div>
            </div>
            {range(columns - 1).map((i) => (
              <SkLine key={i} width="70%" thin />
            ))}
          </div>
        ))}
      </section>
    </div>
  )
}
