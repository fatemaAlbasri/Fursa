import { Link } from 'react-router-dom'
import Loading from '../../shared/components/Loading.jsx'
import Notice from '../../shared/components/Notice.jsx'
import CompanyLogo from '../../jobseeker/components/CompanyLogo.jsx'
import ListToolbar from '../components/ListToolbar.jsx'
import Pager from '../components/Pager.jsx'
import useAdminList from '../utils/useAdminList.js'
import { formatCount, formatShortDate } from '../utils/format.js'
import '../styles/Admin.css'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'Free', label: 'Free' },
  { key: 'Starter', label: 'Starter' },
  { key: 'Growth', label: 'Growth' }
]

// CompanyLogo reads the same names a job has (company_id, company_name, company_logo)
const logoInfo = (company) => ({
  company_id: company.id,
  company_name: company.name,
  company_logo: company.logo_url
})

export default function AdminCompanies() {
  const list = useAdminList('/admin/companies', 'plan')
  const { data, error } = list

  if (!data) {
    return error ? <Notice notice={{ type: 'error', text: error }} /> : <Loading />
  }

  const c = data.cards
  const cards = [
    ['Companies', c.all],
    ['On Free plan', c.Free],
    ['On Starter plan', c.Starter],
    ['On Growth plan', c.Growth]
  ]

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Companies</h1>
          <p>Every company hiring on Fursa.</p>
        </div>
      </div>

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
        placeholder="Search company or email"
      />

      <section className="admin-panel admin-table-box">
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Industry</th>
                <th>Location</th>
                <th>Plan</th>
                <th>Jobs</th>
                <th>Applicants</th>
                <th>Joined</th>
                <th>
                  <span className="admin-sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.companies.map((co) => (
                <tr key={co.id}>
                  <td>
                    <div className="admin-who">
                      <CompanyLogo job={logoInfo(co)} className="admin-logo" />
                      <div>
                        <div className="admin-who__name">{co.name}</div>
                        <div className="admin-who__sub">{co.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{co.industry}</td>
                  <td>{co.location}</td>
                  <td>
                    <span className={`admin-pill admin-pill--${co.plan.toLowerCase()}`}>{co.plan}</span>
                  </td>
                  <td>{co.jobs}</td>
                  <td>{formatCount(co.applicants)}</td>
                  <td className="admin-muted">{formatShortDate(co.joined)}</td>
                  <td className="admin-actions">
                    <Link to={`/admin/companies/${co.id}`} className="admin-view">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.companies.length === 0 && <p className="admin-empty">No companies found.</p>}

        <Pager data={data} noun="companies" onPage={list.setPage} />
      </section>
    </>
  )
}
