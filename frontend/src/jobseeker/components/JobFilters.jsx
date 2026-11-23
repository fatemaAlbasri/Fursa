import { formatJobType, formatWorkMode } from '../../shared/utils/jobFormat.js'
import { MAJORS, LOCATIONS } from '../../company/data/jobs.js'

// Search + filters box shared by Jobs for you and All jobs.
// The backend returns all open jobs, so filtering happens here in the browser (filterJobs).

// Values the backend allows (jobs.job_type / jobs.work_mode in schema.sql)
const JOB_TYPES = ['full_time', 'part_time', 'internship']
const WORK_MODES = ['onsite', 'hybrid', 'remote']

export const EMPTY_FILTERS = { search: '', type: '', mode: '', field: '', location: '' }

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

const isFiltering = (filters) => JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)

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
      (!filters.location || same(job.location, filters.location))
  )
}

// jobs = all loaded jobs (fills the Field / Location menus), onChange(newFilters)
export default function JobFilters({ jobs, filters, onChange }) {
  const change = (e) => onChange({ ...filters, [e.target.name]: e.target.value })

  return (
    <section className="card jfy-filters" aria-label="Search and filters">
      <div className="field">
        <label htmlFor="jfy-search">Search</label>
        <input
          id="jfy-search"
          name="search"
          type="search"
          placeholder="Job title or company"
          value={filters.search}
          onChange={change}
        />
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
      {isFiltering(filters) && (
        <div className="jfy-filters__action">
          <button type="button" className="btn btn--outline jfy-clear" onClick={() => onChange(EMPTY_FILTERS)}>
            Clear filters
          </button>
        </div>
      )}
    </section>
  )
}
