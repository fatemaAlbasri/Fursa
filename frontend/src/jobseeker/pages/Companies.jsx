import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../shared/api.js'
import CompanyLogo from '../components/CompanyLogo.jsx'
import { SearchBox, FilterChips } from '../components/FilterParts.jsx'
import { INDUSTRIES, LOCATIONS } from '../../shared/utils/companyOptions.js'
import '../styles/Companies.css'

// The two tabs: "Hiring now" = companies with at least one open job, "All companies" = every company
const TABS = [
  { id: 'hiring', label: 'Hiring now' },
  { id: 'all', label: 'All companies' }
]

const EMPTY_FILTERS = { search: '', industry: '', location: '' }

// Industry / Location menus: the usual list (same as company Sign up) + anything else
// a company typed, so every choice is there even when only a few companies are loaded
const optionsFrom = (companies, key, usual) => {
  const known = new Set(usual.map((v) => v.toLowerCase()))
  const extra = companies
    .map((company) => company[key]?.trim())
    .filter((v) => v && !known.has(v.toLowerCase()))
  return [...usual, ...new Set(extra)].sort()
}

// "manama " and "Manama" are the same place
const same = (a, b) => (a || '').trim().toLowerCase() === b.trim().toLowerCase()

// The backend returns all companies, so the search + filters happen here in the browser
function filterCompanies(companies, filters) {
  const search = filters.search.trim().toLowerCase()
  return companies.filter(
    (company) =>
      (!search || company.name.toLowerCase().includes(search)) &&
      (!filters.industry || same(company.industry, filters.industry)) &&
      (!filters.location || same(company.location, filters.location))
  )
}

// What is switched on, as removable chips: [{ key, label }]
function activeChips(filters) {
  const chips = []
  if (filters.search.trim()) chips.push({ key: 'search', label: `"${filters.search.trim()}"` })
  if (filters.industry) chips.push({ key: 'industry', label: filters.industry })
  if (filters.location) chips.push({ key: 'location', label: filters.location })
  return chips
}

// 1 → "1 open job", 3 → "3 open jobs", 0 → "No open jobs"
const openJobsText = (count) => {
  if (count === 0) return 'No open jobs'
  return count === 1 ? '1 open job' : `${count} open jobs`
}

// CompanyLogo reads the same names a job has (company_id, company_name, company_logo)
const logoInfo = (company) => ({
  company_id: company.id,
  company_name: company.name,
  company_logo: company.logo_url
})

const fadeIn = (index) => ({ animationDelay: `${Math.min(index, 8) * 40}ms` })

// One company box in the grid; the whole box opens the company's page
function CompanyCard({ company, index }) {
  return (
    <Link to={`/jobseeker/companies/${company.id}`} className="co-card" style={fadeIn(index)}>
      <div className="co-card__banner" />
      <div className="co-card__body">
        <CompanyLogo job={logoInfo(company)} className="co-logo" />
        <h3 className="co-card__name">{company.name}</h3>
        <p className="co-card__meta">
          {company.industry} · {company.location}
        </p>
        {company.about && <p className="co-card__about">{company.about}</p>}
        <div className="co-card__foot">
          <span className={company.open_jobs > 0 ? 'co-open' : 'co-open co-open--none'}>
            {openJobsText(company.open_jobs)}
          </span>
          <span className="co-card__view">
            View <span aria-hidden="true">→</span>
          </span>
        </div>
      </div>
    </Link>
  )
}

// Grey cards in the same shape as the company cards, while the list loads
function CompaniesLoading() {
  return (
    <div className="co-grid" role="status" aria-label="Loading companies">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="co-card co-card--loading" aria-hidden="true">
          <span className="sk co-card__banner" />
          <div className="co-card__body">
            <span className="sk co-logo" />
            <span className="sk sk--line" style={{ width: '60%' }} />
            <span className="sk sk--line sk--thin" style={{ width: '45%' }} />
            <span className="sk sk--line sk--thin co-sk-about" style={{ width: '95%' }} />
            <span className="sk sk--line sk--thin" style={{ width: '70%' }} />
            <div className="co-card__foot">
              <span className="sk sk--pill" />
              <span className="sk sk--line sk--thin" style={{ width: 50 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Companies() {
  const navigate = useNavigate()

  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0) // "Try again" bumps this to load again
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [tab, setTab] = useState('hiring') // Hiring now is selected first, like the wireframe

  // Load the signed-in user, then the companies. No token or a bad token → Sign In; a company → its own home.
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/signin?role=jobseeker', { replace: true })
      return
    }
    let ignore = false // stops a late answer from updating the page after leaving it

    async function load() {
      setLoading(true)
      setError('')

      // 1. Who is signed in?
      let user
      try {
        const data = await api('/auth/me')
        user = data.user
      } catch (err) {
        if (ignore) return
        // The server answered with an error (expired / invalid token) → sign in again
        if (err.error) navigate('/signin?role=jobseeker', { replace: true })
        else {
          setError('Could not reach the server')
          setLoading(false)
        }
        return
      }
      if (ignore) return
      // A company opened the job seeker page: send them to their own home
      if (user.role === 'employer') {
        navigate('/company', { replace: true })
        return
      }

      // 2. The companies
      try {
        const data = await api('/companies')
        if (!ignore) setCompanies(data.companies)
      } catch (err) {
        if (!ignore) setError(err.error || 'Could not reach the server')
      }
      if (!ignore) setLoading(false)
    }
    load()

    return () => {
      ignore = true
    }
  }, [navigate, reloadKey])

  const changeFilter = (e) => setFilters({ ...filters, [e.target.name]: e.target.value })
  const removeFilter = (key) => setFilters({ ...filters, [key]: EMPTY_FILTERS[key] })

  const inTab = tab === 'hiring' ? companies.filter((company) => company.open_jobs > 0) : companies
  const shown = filterCompanies(inTab, filters)
  const filtering = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)

  // ---------- What goes under the tabs: loading / error / empty / the cards ----------
  let results
  if (loading) {
    results = <CompaniesLoading />
  } else if (error) {
    results = (
      <div className="co-state co-state--error" role="alert">
        <h3>Could not load companies</h3>
        <p>{error}</p>
        <button type="button" className="btn btn--outline" onClick={() => setReloadKey(reloadKey + 1)}>
          Try again
        </button>
      </div>
    )
  } else if (companies.length === 0) {
    results = (
      <div className="co-state">
        <h3>No companies on Fursa yet</h3>
        <p>Companies will show here as soon as they join. Check back soon.</p>
      </div>
    )
  } else if (inTab.length === 0) {
    // Only possible on Hiring now: there are companies, but none has an open job
    results = (
      <div className="co-state">
        <h3>No companies are hiring right now</h3>
        <p>New jobs are added all the time. You can still look at every company on Fursa.</p>
        <button type="button" className="btn btn--outline" onClick={() => setTab('all')}>
          See all companies
        </button>
      </div>
    )
  } else if (shown.length === 0) {
    results = (
      <div className="co-state">
        <h3>No companies match your search</h3>
        <p>Try another name or remove a filter.</p>
        {filtering && (
          <button type="button" className="btn btn--outline" onClick={() => setFilters(EMPTY_FILTERS)}>
            Clear all
          </button>
        )}
      </div>
    )
  } else {
    results = (
      <div className="co-grid">
        {shown.map((company, index) => (
          <CompanyCard key={company.id} company={company} index={index} />
        ))}
      </div>
    )
  }

  return (
    <main className="container co">
      <header className="co-head">
        <h1 className="title">Companies hiring on Fursa</h1>
        <p className="muted">Explore employers in Bahrain and see their open jobs and internships.</p>
      </header>

      {/* ---------- Search + filters ---------- */}
      <section className="card co-filters" aria-label="Search and filters">
        <SearchBox
          id="co-search"
          label="Search companies"
          placeholder="Company name"
          value={filters.search}
          onChange={changeFilter}
          onClear={() => removeFilter('search')}
        />
        <div className="field">
          <label htmlFor="co-industry">Industry</label>
          <select id="co-industry" name="industry" value={filters.industry} onChange={changeFilter}>
            <option value="">All industries</option>
            {optionsFrom(companies, 'industry', INDUSTRIES).map((industry) => (
              <option key={industry}>{industry}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="co-location">Location</label>
          <select id="co-location" name="location" value={filters.location} onChange={changeFilter}>
            <option value="">All Bahrain</option>
            {optionsFrom(companies, 'location', LOCATIONS).map((location) => (
              <option key={location}>{location}</option>
            ))}
          </select>
        </div>
        <FilterChips
          chips={activeChips(filters)}
          onRemove={removeFilter}
          onClearAll={() => setFilters(EMPTY_FILTERS)}
        />
      </section>

      {/* ---------- Tabs + count ---------- */}
      <div className="co-toolbar">
        <div className="co-toolbar" role="group" aria-label="Which companies">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={tab === id ? 'co-tab co-tab--active' : 'co-tab'}
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {!loading && !error && companies.length > 0 && (
          <span className="co-count" aria-live="polite">
            {shown.length} {shown.length === 1 ? 'company' : 'companies'}
          </span>
        )}
      </div>

      {results}
    </main>
  )
}
