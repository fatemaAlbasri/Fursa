import Notice from '../../shared/components/Notice.jsx'
import { ListLoading } from '../components/AdminSkeleton.jsx'
import ListToolbar from '../components/ListToolbar.jsx'
import Pager from '../components/Pager.jsx'
import useAdminList from '../utils/useAdminList.js'
import { avatarColor, formatCount, formatShortDate, nameInitials } from '../utils/format.js'
import '../styles/Admin.css'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'cv', label: 'With CV' },
  { key: 'nocv', label: 'No CV yet' }
]

export default function AdminSeekers() {
  const list = useAdminList('/admin/seekers', 'tab')
  const { data, error } = list

  const head = (
    <div className="admin-head">
      <div>
        <h1>Job seekers</h1>
        <p>Everyone looking for a job on Fursa.</p>
      </div>
    </div>
  )

  // First load: title + grey shapes of the page (or the error)
  if (!data) {
    return (
      <>
        {head}
        {error ? (
          <Notice notice={{ type: 'error', text: error }} />
        ) : (
          <ListLoading label="Loading job seekers" tabs={3} columns={6} />
        )}
      </>
    )
  }

  const c = data.cards
  const cards = [
    ['Job seekers', c.seekers],
    ['Uploaded a CV', c.with_cv],
    ['Used the AI CV Optimizer', c.used_optimizer],
    ['Bought the Advanced report', c.bought_report]
  ]

  return (
    <>
      {head}

      <Notice notice={error && { type: 'error', text: error }} />

      <div className="admin-stats">
        {cards.map(([label, value]) => (
          <div key={label} className="admin-stat">
            <div className="admin-stat__value">{formatCount(value)}</div>
            <div className="admin-stat__label">{label}</div>
          </div>
        ))}
      </div>

      <ListToolbar
        tabs={TABS}
        counts={data.tabs}
        active={list.tab}
        onTab={list.pickTab}
        search={list.search}
        onSearch={list.setSearch}
        placeholder="Search name or email"
      />

      <section className="admin-panel admin-table-box">
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Job seeker</th>
                <th>Major</th>
                <th>Status</th>
                <th>CV</th>
                <th>Applications</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.seekers.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="admin-who">
                      <span
                        className="admin-who__avatar"
                        style={{ background: avatarColor(s.id) }}
                        aria-hidden="true"
                      >
                        {nameInitials(s.name)}
                      </span>
                      <div>
                        <div className="admin-who__name">{s.name}</div>
                        <div className="admin-who__sub">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{s.major}</td>
                  <td>{s.graduation_status}</td>
                  <td>
                    {s.has_cv ? (
                      <span className="admin-yes">✓ Yes</span>
                    ) : (
                      <span className="admin-no">– No</span>
                    )}
                  </td>
                  <td>{s.applications}</td>
                  <td className="admin-muted">{formatShortDate(s.joined)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.seekers.length === 0 && <p className="admin-empty">No job seekers found.</p>}

        <Pager data={data} noun="job seekers" onPage={list.setPage} />
      </section>
    </>
  )
}
