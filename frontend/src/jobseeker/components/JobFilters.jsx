import { formatJobType, formatWorkMode } from '../../shared/utils/jobFormat.js'

// Search + filters box shared by Jobs for you and All jobs.
// The backend returns all open jobs, so filtering happens here in the browser (filterJobs).

// Values the backend allows (jobs.job_type / jobs.work_mode in schema.sql)
const JOB_TYPES = ['full_time', 'part_time', 'internship']
const WORK_MODES = ['onsite', 'hybrid', 'remote']

export const EMPTY_FILTERS = { search: '', type: '', mode: '', field: '', location: '' }

// Unique, sorted, non-empty values of one job column (for the Field / Location menus)
const optionsFrom = (jobs, key) =>
  [...new Set(jobs.map((job) => job[key]).filter(Boolean))].sort()

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
      (!filters.field || job.field === filters.field) &&
      (!filters.location || job.location === filters.location)
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
          {optionsFrom(jobs, 'field').map((field) => (
            <option key={field}>{field}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="jfy-location">Location</label>
        <select id="jfy-location" name="location" value={filters.location} onChange={change}>
          <option value="">All Bahrain</option>
          {optionsFrom(jobs, 'location').map((location) => (
            <option key={location}>{location}</option>
          ))}
        </select>
      </div>
    </section>
  )
}
