const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { signToken } = require('../middleware/auth');
const { fileUrl, removeFiles } = require('../middleware/upload');

// The frontend says 'jobseeker' / 'company', the database says 'seeker' / 'employer'
const ROLES = { jobseeker: 'seeker', seeker: 'seeker', company: 'employer', employer: 'employer' };

const isEmail = (v) => /^\S+@\S+\.\S+$/.test(v);
const clean = (v) => (typeof v === 'string' ? v.trim() : '');

// FormData sends arrays as repeated fields ("skills"=a, "skills"=b) or one JSON string
function toList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  if (value.trim().startsWith('[')) {
    try { return JSON.parse(value); } catch { return []; }
  }
  return [value];
}

// Phone is optional. "+973 3XXX XXXX" → "+9733XXXXXXX"; just "+973" means empty
function toPhone(value) {
  const digits = clean(value).replace(/\s/g, '').replace(/^\+973/, '');
  if (!digits) return { phone: null };
  if (!/^\d{8}$/.test(digits)) return { error: 'Enter 8 digits' };
  return { phone: '+973' + digits };
}

// Public user info returned to the frontend (never the password hash)
async function loadUser(id) {
  const { rows } = await db.query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.role, c.id AS company_id, c.name AS company_name
       FROM users u
       LEFT JOIN companies c ON c.user_id = u.id
      WHERE u.id = $1`,
    [id]
  );
  if (!rows[0]) return null;
  const { company_id, company_name, ...user } = rows[0];
  return user.role === 'employer' ? { ...user, company: { id: company_id, name: company_name } } : user;
}

function validateAccount(body, errors) {
  if (!clean(body.firstName)) errors.firstName = 'Required';
  if (!clean(body.lastName)) errors.lastName = 'Required';
  if (!isEmail(clean(body.email))) errors.email = 'Enter a valid email';
  if (typeof body.password !== 'string' || body.password.length < 8) errors.password = 'At least 8 characters';
}

async function createUser(client, body, role) {
  const hash = await bcrypt.hash(body.password, 10);
  const { rows } = await client.query(
    `INSERT INTO users (first_name, last_name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [clean(body.firstName), clean(body.lastName), clean(body.email).toLowerCase(), hash, role]
  );
  return rows[0].id;
}

async function createSeeker(client, userId, body, phone, skills, cv) {
  await client.query(
    `INSERT INTO seeker_profiles (user_id, phone, major, graduation_status) VALUES ($1, $2, $3, $4)`,
    [userId, phone, clean(body.major), clean(body.graduationStatus)]
  );

  // Add any skill that isn't in the skills table yet, then link all of them
  await client.query(
    `INSERT INTO skills (name) SELECT unnest($1::text[]) ON CONFLICT (name) DO NOTHING`,
    [skills]
  );
  await client.query(
    `INSERT INTO seeker_skills (seeker_id, skill_id)
     SELECT $1, id FROM skills WHERE name = ANY($2::text[])`,
    [userId, skills]
  );

  if (cv) {
    await client.query(
      `INSERT INTO resumes (seeker_id, file_name, file_url) VALUES ($1, $2, $3)`,
      [userId, cv.originalname, fileUrl(cv)]
    );
  }
}

// Every company starts on Free. A paid plan becomes active only after payment.
async function createCompany(client, userId, body, logo) {
  const { rows } = await client.query(
    `INSERT INTO companies (user_id, name, logo_url, website, industry, location, about)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      userId, clean(body.companyName), logo ? fileUrl(logo) : null, clean(body.website) || null,
      clean(body.industry), clean(body.location), clean(body.about) || null,
    ]
  );
  await client.query(
    `INSERT INTO subscriptions (company_id, plan_id) SELECT $1, id FROM plans WHERE name = 'Free'`,
    [rows[0].id]
  );
}

// POST /api/auth/signup  (multipart/form-data or JSON)
// Job seeker: { role:'jobseeker', firstName, lastName, email, password, phone, major, graduationStatus, skills[], cv? }
// Company:    { role:'company', companyName, website?, industry, location, about?, firstName, lastName, email, password, plan, logo? }
async function signup(req, res, next) {
  const body = req.body;
  const files = Object.values(req.files || {}).flat();
  const role = ROLES[body.role];
  const errors = {};
  let phone = null;
  let skills = [];
  let plan = null;

  if (!role) errors.role = 'Role must be jobseeker or company';
  validateAccount(body, errors);

  if (role === 'seeker') {
    const p = toPhone(body.phone);
    if (p.error) errors.phone = p.error; else phone = p.phone;
    if (!clean(body.major)) errors.major = 'Required';
    if (!clean(body.graduationStatus)) errors.graduationStatus = 'Required';
    skills = [...new Set(toList(body.skills).map(clean).filter(Boolean))];
    if (skills.length === 0) errors.skills = 'Pick at least one skill';
  }

  if (role === 'employer') {
    if (!clean(body.companyName)) errors.companyName = 'Required';
    if (body.website && !/^https?:\/\/\S+\.\S+/.test(clean(body.website))) errors.website = 'Start with https://';
    if (!clean(body.industry)) errors.industry = 'Required';
    if (!clean(body.location)) errors.location = 'Required';
    try {
      const { rows } = await db.query(
        `SELECT id, name, price_bhd_month FROM plans WHERE lower(name) = lower($1)`,
        [clean(body.plan) || 'free']
      );
      plan = rows[0];
    } catch (err) {
      removeFiles(files);
      return next(err);
    }
    if (!plan) errors.plan = 'Unknown plan';
  }

  if (Object.keys(errors).length) {
    removeFiles(files);
    return res.status(400).json({ error: 'Please fix the highlighted fields', fields: errors });
  }

  let client;
  try {
    client = await db.connect();
  } catch (err) {
    removeFiles(files);
    return next(err);
  }
  try {
    await client.query('BEGIN');
    const userId = await createUser(client, body, role);
    if (role === 'seeker') {
      await createSeeker(client, userId, body, phone, skills, req.files?.cv?.[0]);
    } else {
      await createCompany(client, userId, body, req.files?.logo?.[0]);
    }
    await client.query('COMMIT');

    const user = await loadUser(userId);
    const result = { token: signToken(user), user };
    // Frontend: if needsPayment, go to the payment page with this plan
    if (plan) result.needsPayment = Number(plan.price_bhd_month) > 0 ? { planId: plan.id, plan: plan.name } : false;
    res.status(201).json(result);
  } catch (err) {
    await client.query('ROLLBACK');
    removeFiles(files);
    if (err.code === '23505' && err.constraint === 'users_email_key') {
      return res.status(409).json({ error: 'An account with this email already exists', fields: { email: 'Already registered' } });
    }
    next(err);
  } finally {
    client.release();
  }
}

// POST /api/auth/signin  { email, password, role? }
// role (jobseeker/company) is the tab the user picked; we tell them if it's the wrong one
async function signin(req, res, next) {
  try {
    const email = clean(req.body.email).toLowerCase();
    const password = req.body.password;
    if (!isEmail(email) || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Enter your email and password' });
    }

    const { rows } = await db.query('SELECT id, password_hash, role FROM users WHERE email = $1', [email]);
    const found = rows[0];
    // Same message for wrong email and wrong password, so emails can't be guessed
    if (!found || !(await bcrypt.compare(password, found.password_hash))) {
      return res.status(401).json({ error: 'Wrong email or password' });
    }

    const wanted = ROLES[req.body.role];
    if (wanted && found.role !== 'admin' && found.role !== wanted) {
      const tab = found.role === 'employer' ? 'Company' : 'Job seeker';
      return res.status(403).json({ error: `This is a ${tab.toLowerCase()} account. Use the "${tab}" tab.` });
    }

    const user = await loadUser(found.id);
    res.json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me  → the logged-in user (frontend calls this on page load)
async function me(req, res, next) {
  try {
    const user = await loadUser(req.user.id);
    if (!user) return res.status(401).json({ error: 'Please sign in' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, signin, me };
