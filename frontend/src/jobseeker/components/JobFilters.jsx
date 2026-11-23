import { formatJobType, formatWorkMode } from '../../shared/utils/jobFormat.js'
import { MAJORS, LOCATIONS } from '../../company/data/jobs.js'
import { SearchIcon, XIcon } from '../../shared/components/icons.jsx'

// Search + filters box on All jobs.
// The backend returns all open jobs, so filtering happens here in the browser (filterJobs).

// Values the backend allows (jobs.job_type / jobs.work_mode in schema.sql)
const JOB_TYPES = ['full_time', 'part_time', 'internship']
const WORK_MODES = ['onsite', 'hybrid', 'remote']

// qualified = "Only jobs I qualify for" (the switch above the results)
export const EMPTY_FILTERS = { search: '', type: '', mode: '', field: '', location: '', qualified: false }

// Field / Location menus: the usual list (same as the Post a job form) + anything else
// a company typed in, so every choice is there even when only a few jobs are loaded
const optionsFrom = (jobs, key, usual) => {
  const known = new Set(usual.map((v) => v.toLowerCase()))
  const extra = jobs
    .map((job) => job[key]?.trim())
    .filter((v) => v && !known.has(v.toLowerCase()))
  return [...usual, ...new Set(extra)].sort()
}

// "manama " and "Manama" are the same place
const same = (a, b) => (a || '').trim().toLowerCase() === b.trim().toLowerCase()

// The jobs that pass the search + every chosen filter
export function filterJobs(jobs, filters) {
  const search = filters.search.trim().toLowerCase()
  return jobs.filter(
    (job) =>
      (!search ||
        job.title.toLowerCase().includes(search) ||
        job.company_name.toLowerCase().includes(search)) &&
      (!filters.type || job.job_type === filters.type) &&
      (!filters.mode || job.work_mode === filters.mode) &&
      (!filters.field || same(job.field, filters.field)) &&
      (!filters.location || same(job.location, filters.location)) &&
      // not scored yet (null) still shows
      (!filters.qualified || job.is_qualified !== false)
  )
}

// What is switched on, as removable chips: [{ key, label }]
function activeChips(filters) {
  const chips = []
  if (filters.search.trim()) chips.push({ key: 'search', label: `"${filters.search.trim()}"` })
  if (filters.type) chips.push({ key: 'type', label: formatJobType(filters.type) })
  if (filters.mode) chips.push({ key: 'mode', label: formatWorkMode(filters.mode) })
  if (filters.field) chips.push({ key: 'field', label: filters.field })
  if (filters.location) chips.push({ key: 'location', label: filters.location })
  if (filters.qualified) chips.push({ key: 'qualified', label: 'Only jobs I qualify for' })
  return chips
}

// jobs = all loaded jobs (fills the Field / Location menus), onChange(newFilters)
export default function JobFilters({ jobs, filters, onChange }) {
  const change = (e) => onChange({ ...filters, [e.target.name]: e.target.value })
  const remove = (key) => onChange({ ...filters, [key]: EMPTY_FILTERS[key] })
  const chips = activeChips(filters)

  return (
    <section className="card jfy-filters" aria-label="Search and filters">
      <div className="field">
        <label htmlFor="jfy-search">Search</label>
        <div className="jfy-search">
          <SearchIcon />
          <input
            id="jfy-search"
            name="search"
            type="text"
            placeholder="Job title or company"
            value={filters.search}
            onChange={change}
            autoComplete="off"
          />
          {filters.search && (
            <button
              type="button"
              className="jfy-search__clear"
              onClick={() => remove('search')}
              aria-label="Clear search"
              title="Clear search"
            >
              <XIcon />
            </button>
          )}
        </div>
      </div>
      <div className="field">
        <label htmlFor="jfy-type">Job type</label>
        <select id="jfy-type" name="type" value={filters.type} onChange={change}>
          <option value="">All types</option>
          {JOB_TYPES.map((type) => (
            <option key={type} value={type}>
              {formatJobType(type)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="jfy-mode">Work mode</label>
        <select id="jfy-mode" name="mode" value={filters.mode} onChange={change}>
          <option value="">All modes</option>
          {WORK_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {formatWorkMode(mode)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="jfy-field">Field</label>
        <select id="jfy-field" name="field" value={filters.field} onChange={change}>
          <option value="">All fields</option>
          {optionsFrom(jobs, 'field', MAJORS).map((field) => (
            <option key={field}>{field}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="jfy-location">Location</label>
        <select id="jfy-location" name="location" value={filters.location} onChange={change}>
          <option value="">All Bahrain</option>
          {optionsFrom(jobs, 'location', LOCATIONS).map((location) => (
            <option key={location}>{location}</option>
          ))}
        </select>
      </div>

      {/* what's switched on, each with its own ×, and Clear all */}
      {chips.length > 0 && (
        <div className="jfy-chips">
          <span className="jfy-chips__label">Filters:</span>
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="jfy-chip"
              onClick={() => remove(chip.key)}
              aria-label={`Remove ${chip.label}`}
            >
              {chip.label}
              <span className="jfy-chip__x" aria-hidden="true">
                <XIcon />
              </span>
            </button>
          ))}
          <button type="button" className="jfy-chips__clear" onClick={() => onChange(EMPTY_FILTERS)}>
            Clear all
          </button>
        </div>
      )}
    </section>
  )
}
