import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#for-job-seekers', label: 'For job seekers' },
  { href: '#for-employers', label: 'For employers' },
  { href: '#pricing', label: 'Pricing' },
];

const SEEKER_STEPS = [
  ['Add your skills & CV', 'Pick skills from a list and upload your CV once.'],
  ['See jobs that match you', 'Jobs and internships ranked by your match score.'],
  ['Improve your CV with AI', 'Before → after suggestions, never invented experience.'],
];

const EMPLOYER_STEPS = [
  ['Post a job or internship', 'Set requirements and mark the must-haves.'],
  ['Get a ranked Top 10', 'AI reads every CV and explains each score.'],
  ['Shortlist or reject in bulk', 'You decide. Rejected applicants get the reason.'],
];

const PLANS = [
  {
    id: 'free', name: 'Free', tagline: 'Try Fursa with one job', price: 'BHD 0', cta: 'Start free',
    features: [
      ['1 active job', true], ['Applicants sorted by date', true],
      ['AI ranking & Top 10', false], ['Bulk shortlist / reject', false],
    ],
  },
  {
    id: 'starter', name: 'Starter', tagline: 'For small teams hiring 1–2 roles', price: 'BHD 15',
    cta: 'Choose Starter', popular: true,
    features: [
      ['Up to 2 active jobs', true], ['AI ranking & Top 10', true],
      ['Match reasons for every applicant', true], ['Bulk shortlist / reject', true],
    ],
  },
  {
    id: 'growth', name: 'Growth', tagline: 'For companies hiring often', price: 'BHD 25', cta: 'Choose Growth',
    features: [
      ['Unlimited active jobs', true], ['AI ranking & Top 10', true],
      ['Bulk shortlist / reject', true], ['Hiring summary per job', true],
    ],
  },
];

const PersonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </svg>
);

// Fade sections in as they scroll into view: anything with class "reveal" gets "is-visible".
// `--d` (a CSS delay) staggers items that sit side by side.
function useReveal() {
  useEffect(() => {
    const items = document.querySelectorAll('.landing .reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

const delay = (i, step = 0.12) => ({ '--d': `${i * step}s` });

function StepsCard({ id, title, icon, steps, dark, index }) {
  return (
    <article id={id} className={`${dark ? 'how__card how__card--dark' : 'how__card'} reveal`} style={delay(index)}>
      <h3 className="how__title"><span className="how__icon">{icon}</span>{title}</h3>
      <ol className="how__steps">
        {steps.map(([name, text], i) => (
          <li key={name} className="reveal" style={delay(index + i + 1, 0.1)}>
            <span className="how__num">{i + 1}</span>
            <div><strong>{name}</strong><p>{text}</p></div>
          </li>
        ))}
      </ol>
    </article>
  );
}

export default function Landing() {
  useReveal();
  return (
    <div className="landing">
      <Navbar
        links={NAV_LINKS}
        right={
          <span className="topbar__actions">
            <Link to="/signin" className="btn btn--ghost">Sign in</Link>
            <Link to="/signup" className="btn btn--teal">Create account</Link>
          </span>
        }
      />

      <section className="hero">
        {/* photo is a CSS background faded into the navy (see .hero__bg) */}
        <div className="hero__bg" role="img" aria-label="Two graduates reviewing a job match on the Fursa platform in an office" />
        <div className="hero__inner">
          <div className="hero__copy">
            <span className="hero__pill">Entry-level jobs &amp; internships in Bahrain</span>
            <h1 className="hero__title">
              Every Career, Every Opportunity <span>Starts with Fursa</span>
            </h1>
            <p className="hero__text">
              Bridging graduates and employers in Bahrain. AI-ranked shortlists for companies,
              instant CV feedback for job seekers.
            </p>
            <div className="hero__actions">
              <Link to="/signup" className="btn btn--teal">I'm looking for a job</Link>
              <Link to="/signup?role=company" className="btn btn--white-navy">I'm hiring</Link>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="section">
        <p className="section__eyebrow reveal">How it works</p>
        <h2 className="section__title reveal" style={delay(1, 0.08)}>One platform, two sides</h2>
        <div className="how">
          <StepsCard id="for-job-seekers" title="For job seekers" icon={<PersonIcon />} steps={SEEKER_STEPS} index={0} />
          <StepsCard id="for-employers" title="For employers & HR" icon={<BriefcaseIcon />} steps={EMPLOYER_STEPS} dark index={1} />
        </div>
      </section>

      <section id="pricing" className="section">
        <p className="section__eyebrow reveal">Pricing for employers</p>
        <h2 className="section__title reveal" style={delay(1, 0.08)}>Simple plans for hiring</h2>
        <p className="section__sub reveal" style={delay(2, 0.08)}>Always free for job seekers. Companies start free and upgrade for AI ranking.</p>
        <div className="pricing">
          {PLANS.map((p, i) => (
            <article key={p.id} className={`${p.popular ? 'price price--popular' : 'price'} reveal`} style={delay(i)}>
              <div className="price__head">
                <h3>{p.name}</h3>
                {p.popular && <span className="price__badge">Most popular</span>}
              </div>
              <p className="price__tagline">{p.tagline}</p>
              <p className="price__amount">{p.price} <span>/ month</span></p>
              <ul className="price__list">
                {p.features.map(([f, ok]) => (
                  <li key={f} className={ok ? '' : 'price__no'}>{ok ? '✓' : '–'} {f}</li>
                ))}
              </ul>
              <Link to={`/signup?role=company&plan=${p.id}`} className="btn price__btn">{p.cta}</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="cta reveal">
          <div>
            <h2>Ready to find your fursa?</h2>
            <p>Free for job seekers. Simple plans for employers.</p>
          </div>
          <Link to="/signup" className="btn btn--accent">Get started</Link>
        </div>
      </section>

      <footer className="footer">© 2026 Fursa</footer>
    </div>
  );
}