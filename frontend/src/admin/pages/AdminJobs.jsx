import { Link } from 'react-router-dom'
import Notice from '../../shared/components/Notice.jsx'
import CompanyLogo from '../../jobseeker/components/CompanyLogo.jsx'
import { formatJobType } from '../../shared/utils/jobFormat.js'
import { ListLoading } from '../components/AdminSkeleton.jsx'
import ListToolbar from '../components/ListToolbar.jsx'
import ExportButton from '../components/ExportButton.jsx'
import Pager from '../components/Pager.jsx'
import useAdminList from '../utils/useAdminList.js'
import { formatCount, formatShortDate } from '../utils/format.js'
import '../styles/Admin.css'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'closed', label: 'Closed' }
]

const STATUS_LABELS = { active: 'Active', closed: 'Closed' }

// CompanyLogo reads the same names a job has (company_id, company_name, company_logo)
const logoInfo = (company) => ({
  company_id: company.id,
  company_name: company.name,
  company_logo: company.logo_url
})

export default function AdminJobs() {
  const list = useAdminList('/admin/jobs', 'status')
  const { data, error } = list

  const head = (
    <div className="admin-head">
      <div>
        <h1>Jobs</h1>
        <p>Every job posted on Fursa.</p>
      </div>
      {data && (
        <ExportButton
          path="/admin/jobs/export"
          query={list.exportQuery}
          name="jobs"
          filter={list.tab === 'all' ? null : TABS.find((t) => t.key === list.tab)?.label}
          searched={list.searching}
          count={data.total}
        />
      )}
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
          <ListLoading label="Loading jobs" stats={false} tabs={3} columns={7} />
        )}
      </>
    )
  }

  return (
    <>
      {head}

      <Notice notice={error && { type: 'error', text: error }} />

      <ListToolbar
        tabs={TABS}
        counts={data.tabs}
        active={list.tab}
        onTab={list.pickTab}
        search={list.search}
        onSearch={list.setSearch}
        placeholder="Search job or company"
      />

      <section className="admin-panel admin-table-box">
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Type</th>
                <th className="admin-num">Applicants</th>
                <th>Posted</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>
                  <span className="admin-sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <div className="admin-who">
                      <CompanyLogo job={logoInfo(job.company)} className="admin-logo" />
                      <div>
                        <div className="admin-who__name">{job.title}</div>
                        <div className="admin-who__sub">{job.company.name}</div>
                      </div>
                    </div>
                  </td>
                  <td>{formatJobType(job.job_type)}</td>
                  <td className="admin-num">{formatCount(job.applicants)}</td>
                  <td className="admin-muted">{formatShortDate(job.posted)}</td>
                  <td className="admin-muted">{formatShortDate(job.deadline)}</td>
                  <td>
                    <span className={`admin-pill admin-pill--${job.status}`}>
                      {STATUS_LABELS[job.status]}
                    </span>
                  </td>
                  <td className="admin-actions">
                    <Link to={`/admin/jobs/${job.id}`} className="admin-view">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.jobs.length === 0 && <p className="admin-empty">No jobs found.</p>}

        <Pager data={data} noun="jobs" onPage={list.setPage} />
      </section>
    </>
  )
}
