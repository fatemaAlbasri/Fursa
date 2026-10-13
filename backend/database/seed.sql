-- =====================================================================
--  Fursa — Test data (run AFTER schema.sql)
--  All people and companies are invented. Every account's password is:  Fursa@123
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- for crypt() password hashing (bcrypt)

-- ---------- Plans ----------
INSERT INTO plans (id, name, price_bhd_month, max_active_jobs, has_ai_ranking, has_match_reasons, has_bulk_actions, has_hiring_summary) VALUES
 (1, 'Free',    0.000,  1,    false, false, false, false),
 (2, 'Starter', 15.000, 2,    true,  true,  true,  false),
 (3, 'Growth',  35.000, NULL, true,  true,  true,  true);

-- ---------- Skills ----------
INSERT INTO skills (id, name) VALUES
 (1,'JavaScript'),(2,'React'),(3,'SQL'),(4,'HTML'),(5,'CSS'),(6,'Git'),(7,'Node.js'),
 (8,'Python'),(9,'Excel'),(10,'Power BI'),(11,'Networking'),(12,'English'),(13,'Arabic'),
 (14,'Customer Service'),(15,'Java');

-- ---------- Users (1 admin, 4 employers, 6 seekers) ----------
INSERT INTO users (id, first_name, last_name, email, password_hash, role) VALUES
 (1,  'Admin',  'Fursa',     'admin@fursa.bh',        crypt('Fursa@123', gen_salt('bf')), 'admin'),
 (2,  'Huda',   'Saleh',     'hr@nakhlatech.bh',      crypt('Fursa@123', gen_salt('bf')), 'employer'),
 (3,  'Yousif', 'Kamal',     'hr@pearlsoft.bh',       crypt('Fursa@123', gen_salt('bf')), 'employer'),
 (4,  'Mariam', 'Isa',       'hr@dilmunit.bh',        crypt('Fursa@123', gen_salt('bf')), 'employer'),
 (5,  'Khalid', 'Nasser',    'hr@seefdata.bh',        crypt('Fursa@123', gen_salt('bf')), 'employer'),
 (6,  'Fatima', 'Ali',       'fatima@example.com',    crypt('Fursa@123', gen_salt('bf')), 'seeker'),
 (7,  'Noor',   'Ahmed',     'noor@example.com',      crypt('Fursa@123', gen_salt('bf')), 'seeker'),
 (8,  'Zainab', 'Mohammed',  'zainab@example.com',    crypt('Fursa@123', gen_salt('bf')), 'seeker'),
 (9,  'Ali',    'Hasan',     'ali@example.com',       crypt('Fursa@123', gen_salt('bf')), 'seeker'),
 (10, 'Sara',   'Jaffar',    'sara@example.com',      crypt('Fursa@123', gen_salt('bf')), 'seeker'),
 (11, 'Hamad',  'Rashid',    'hamad@example.com',     crypt('Fursa@123', gen_salt('bf')), 'seeker');

-- ---------- Seeker profiles ----------
INSERT INTO seeker_profiles (user_id, phone, major, graduation_status, preferred_work_modes, preferred_job_types) VALUES
 (6,  '+97333000001', 'Computer Science',       'Graduated',  '{onsite,hybrid}', '{full_time,internship}'),
 (7,  '+97333000002', 'Computer Science',       'Graduated',  '{remote,hybrid}', '{full_time}'),
 (8,  '+97333000003', 'Information Technology', 'Final year', '{}',              '{internship,part_time}'),
 (9,  '+97333000004', 'Computer Engineering',   'Graduated',  '{onsite}',        '{}'),
 (10, '+97333000005', 'Information Systems',    'Graduated',  '{}',              '{}'),
 (11, '+97333000006', 'Business Administration','Final year', '{hybrid}',        '{part_time}');

INSERT INTO seeker_skills (seeker_id, skill_id) VALUES
 (6,1),(6,2),(6,3),(6,4),(6,12),
 (7,1),(7,2),(7,3),(7,6),(7,12),(7,13),
 (8,1),(8,2),(8,4),(8,5),(8,12),
 (9,11),(9,14),(9,12),(9,13),
 (10,3),(10,9),(10,8),(10,12),
 (11,9),(11,14),(11,12),(11,13);

-- ---------- Resumes (Fatima has an old CV and a current one) ----------
INSERT INTO resumes (id, seeker_id, file_name, file_url, parsed_text, parsed_experience, parsed_languages, is_current, uploaded_at) VALUES
 (1, 6,  'fatima_cv_old.pdf', '/uploads/cv/1.pdf', 'IT graduate looking for a job.', 'None stated', 'English, Arabic', false, '2026-09-20'),
 (2, 6,  'my_cv.pdf',         '/uploads/cv/2.pdf', 'IT graduate looking for a job. Made a website for my senior project.', '6-month internship', 'English, Arabic', true, '2026-10-08'),
 (3, 7,  'noor_cv.pdf',       '/uploads/cv/3.pdf', 'Computer Science graduate ...', '1-year internship', 'English, Arabic', true, '2026-10-01'),
 (4, 8,  'zainab_cv.pdf',     '/uploads/cv/4.pdf', 'IT student ...', 'None stated', 'English', true, '2026-10-02'),
 (5, 9,  'ali_cv.pdf',        '/uploads/cv/5.pdf', 'Computer Engineering graduate ...', '3-month internship', 'English, Arabic', true, '2026-09-25'),
 (6, 10, 'sara_cv.pdf',       '/uploads/cv/6.pdf', 'Information Systems graduate ...', 'None stated', 'English', true, '2026-09-27'),
 (7, 11, 'hamad_cv.pdf',      '/uploads/cv/7.pdf', 'Business student ...', 'Part-time retail', 'English, Arabic', true, '2026-10-05');

-- ---------- Companies + subscriptions ----------
INSERT INTO companies (id, user_id, name, website, industry, location, phone, about) VALUES
 (1, 2, 'Nakhla Tech',  'www.nakhlatech.bh', 'Technology', 'Manama',   '+97317000001', 'Builds web and mobile apps for local businesses.'),
 (2, 3, 'PearlSoft',    'www.pearlsoft.bh',  'Software',   'Seef',     '+97317000002', 'Software house focused on fintech products.'),
 (3, 4, 'Dilmun IT',    NULL,                'IT Services','Muharraq', '+97317000003', 'IT support and networking services.'),
 (4, 5, 'Seef Data',    'www.seefdata.bh',   'Analytics',  'Manama',   '+97317000004', 'Data analytics consultancy.');

INSERT INTO subscriptions (id, company_id, plan_id, status, started_at, renews_at) VALUES
 (1, 1, 2, 'active', '2026-10-12', '2026-11-12'),
 (2, 2, 3, 'active', '2026-10-01', '2026-11-01'),
 (3, 3, 1, 'active', '2026-09-15', NULL),
 (4, 4, 2, 'active', '2026-09-20', '2026-10-20');

-- ---------- Jobs ----------
INSERT INTO jobs (id, company_id, type, work_mode, title, description, responsibilities, location, salary, deadline, required_major, major_must_have, experience_min, experience_max, language, status, created_at) VALUES
 (1, 1, 'full_time',  'onsite', 'Junior Frontend Developer',   'Build the React frontend of our client apps.', 'Build UI screens; fix bugs; work with the backend team.', 'Manama',   450.000, '2026-10-30', 'Computer Science', true,  0, 2, 'English', 'open',  '2026-10-05'),
 (2, 2, 'internship', 'hybrid', 'Software Engineering Intern', 'Three-month internship in our product team.',  'Write and test code; join daily stand-ups.',               'Seef',     NULL,    '2026-10-25', NULL,               false, 0, 1, 'English', 'open',  '2026-10-08'),
 (3, 3, 'full_time',  'onsite', 'IT Support Officer',          'First-line IT support for clients.',           'Answer tickets; set up devices; basic networking.',        'Muharraq', 380.000, '2026-11-02', NULL,               false, 0, 2, 'Arabic',  'open',  '2026-10-01'),
 (4, 4, 'internship', 'remote', 'Data Analyst Trainee',        'Learn to build reports for clients.',          'Clean data; build dashboards.',                            'Manama',   NULL,    '2026-11-05', NULL,               false, 0, 1, 'English', 'open',  '2026-09-20'),
 (5, 1, 'part_time',  'hybrid', 'Web Developer Trainee',       'Entry-level web role.',                        'Build pages with HTML, CSS and JavaScript.',               'Manama',   NULL,    '2026-10-30', NULL,               false, 0, 1, 'English', 'draft', '2026-10-10');

INSERT INTO job_skills (job_id, skill_id, is_must_have) VALUES
 (1,1,true),(1,2,true),(1,3,false),(1,6,false),(1,12,false),
 (2,1,true),(2,6,false),(2,15,false),(2,3,false),(2,12,false),
 (3,11,true),(3,14,false),(3,13,false),(3,12,false),
 (4,3,true),(4,9,false),(4,10,true),(4,12,false),(4,8,false),
 (5,4,true),(5,5,false),(5,1,false);

-- ---------- Match scores (normally written by the AI) ----------
INSERT INTO match_scores (job_id, seeker_id, score, is_qualified, matched_skills, total_skills, missing_skills, major_ok, experience_ok, language_ok, work_mode_ok, job_type_ok, explanation) VALUES
 -- work_mode_ok / job_type_ok: NULL = the seeker left that preference empty (neutral)
 (1, 6,  92, true,  4, 5, 'Git',                     true,  true, true, true,  true,  'Has both must-have skills and a CS major.'),
 (1, 7,  88, true,  5, 5, NULL,                      true,  true, true, false, true,  'Matches every skill; 1-year internship. Prefers remote/hybrid.'),
 (1, 8,  70, false, 3, 5, 'SQL, Git',                false, true, true, NULL,  false, 'Missing must-have: Computer Science major.'),
 (2, 6,  84, true,  4, 5, 'Java',                    true,  true, true, true,  true,  'Strong JavaScript; missing Java.'),
 (2, 7,  80, true,  4, 5, 'Java',                    true,  true, true, true,  false, 'Good skills, but prefers full-time over internships.'),
 (3, 9,  78, true,  4, 4, NULL,                      true,  true, true, true,  NULL,  'Has networking and customer service.'),
 (3, 6,  40, false, 1, 4, 'Networking, Customer Service, Arabic', true, true, true, true, true, 'Missing must-have: Networking.'),
 (4, 10, 71, false, 3, 5, 'Power BI',                true,  true, true, NULL,  NULL,  'Missing must-have: Power BI.'),
 (4, 6,  45, false, 2, 5, 'Excel, Power BI, Python', true,  true, true, false, true,  'Missing must-have: Power BI.');

-- ---------- Applications (one in every status, like the wireframes) ----------
INSERT INTO applications (id, job_id, seeker_id, resume_id, status, rejection_reason, applied_at) VALUES
 (1, 1, 6,  1, 'shortlisted', NULL, '2026-10-08'),   -- sent the OLD CV, later replaced
 (2, 1, 7,  3, 'interview',   NULL, '2026-10-07'),
 (3, 2, 6,  2, 'applied',     NULL, '2026-10-12'),
 (4, 3, 9,  5, 'accepted',    NULL, '2026-10-01'),
 (5, 4, 10, 6, 'rejected',    'Missing must-have skill: Power BI. Your CV also didn''t clearly show Excel.', '2026-09-28');

INSERT INTO application_history (application_id, changed_by, from_status, to_status, changed_at) VALUES
 (1, 6,  NULL,          'applied',     '2026-10-08'),
 (1, 2,  'applied',     'shortlisted', '2026-10-10'),
 (2, 7,  NULL,          'applied',     '2026-10-07'),
 (2, 2,  'applied',     'shortlisted', '2026-10-10'),
 (2, 2,  'shortlisted', 'interview',   '2026-10-12'),
 (3, 6,  NULL,          'applied',     '2026-10-12'),
 (4, 9,  NULL,          'applied',     '2026-10-01'),
 (4, 4,  'applied',     'shortlisted', '2026-10-03'),
 (4, 4,  'shortlisted', 'interview',   '2026-10-06'),
 (4, 4,  'interview',   'accepted',    '2026-10-09'),
 (5, 10, NULL,          'applied',     '2026-09-28'),
 (5, 5,  'applied',     'rejected',    '2026-10-01');

INSERT INTO interviews (application_id, scheduled_at, type, location_or_link, note_to_applicant, employer_notes, status) VALUES
 (2, '2026-10-20 10:00+03', 'in_person', 'Nakhla Tech office, Manama', 'Bring a copy of your CV and your student ID.', NULL, 'confirmed'),
 (4, '2026-10-06 11:00+03', 'online',    'https://meet.example.com/abc', NULL, 'Good communication skills.', 'done');

-- ---------- AI CV Optimizer ----------
INSERT INTO cv_reviews (id, resume_id, strength_score, potential_score, is_advanced, comparison, created_at) VALUES
 (1, 2, 72, 88, true,
  '{"short_summary": true, "projects_with_tools": true, "full_skill_names": true, "portfolio_link": false, "relevant_courses": false, "one_page": true}',
  '2026-10-08');

INSERT INTO cv_suggestions (review_id, section, before_text, after_text, reason, points, is_free_preview, status) VALUES
 (1,'summary',  'IT graduate looking for a job.', 'IT graduate (University of Bahrain, 2026) focused on frontend development with React and JavaScript.', 'A clear summary tells employers what you do in one line.', 7, true,  'accepted'),
 (1,'projects', 'Made a website for my senior project.', 'Built the React frontend for my senior project and connected it to a PostgreSQL database.', 'Shows the tools you used. Uses only what you already did.', 5, false, 'pending'),
 (1,'skills',   'JS, react, databases', 'JavaScript · React · SQL (PostgreSQL)', 'Full skill names are recognised by employers and by Fursa matching.', 2, false, 'pending'),
 (1,'education','BSc Computer Science, University of Bahrain', 'BSc Computer Science, University of Bahrain (2026) · Courses: Web Development, Database Systems', 'Courses show your skills when you have little work experience.', 1, false, 'pending'),
 (1,'layout',   'Education → Hobbies → Projects → Skills', 'Summary → Projects → Skills → Education', 'Puts your strongest section first.', 1, false, 'dismissed');

-- ---------- Notifications ----------
INSERT INTO notifications (user_id, application_id, job_id, type, title, message, is_read, created_at) VALUES
 (7,  2,    NULL, 'interview',   'Interview scheduled',        'Nakhla Tech invited you to an interview for Junior Frontend Developer on 20 Oct, 10:00 AM.', false, '2026-10-12 08:00+03'),
 (6,  NULL, 1,    'new_matches', '3 new jobs match your skills','Including Junior Frontend Developer at Nakhla Tech · 92% match.', false, '2026-10-12 05:00+03'),
 (10, 5,    NULL, 'rejected',    'Application not successful',  'Data Analyst Trainee at Seef Data. Reason: missing must-have skill Power BI.', false, '2026-10-01 12:00+03'),
 (9,  4,    NULL, 'accepted',    'You were accepted',           'IT Support Officer at Dilmun IT. They will contact you about the offer.', true, '2026-10-09 09:00+03'),
 (6,  NULL, NULL, 'cv_ready',    'Your CV suggestions are ready','We found 5 ways to improve your CV.', true, '2026-10-08 10:00+03'),
 (6,  NULL, 2,    'deadline',    'Deadline soon',               'Software Engineering Intern at PearlSoft closes in 2 days.', true, '2026-10-07 10:00+03');

-- ---------- Payments (simulated) ----------
INSERT INTO payments (user_id, subscription_id, cv_review_id, item, method, subtotal_bhd, vat_bhd, total_bhd, status, is_simulated, paid_at) VALUES
 (2, 1,    NULL, 'plan',               'card',       15.000, 1.500, 16.500, 'paid', true, '2026-10-12'),
 (3, 2,    NULL, 'plan',               'benefitpay', 35.000, 3.500, 38.500, 'paid', true, '2026-10-01'),
 (6, NULL, 1,    'advanced_cv_report', 'card',        2.000, 0.200,  2.200, 'paid', true, '2026-10-12');

-- ---------- Reset ID counters (because we inserted IDs by hand) ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','password_resets','resumes','skills','companies','plans','subscriptions','jobs',
                           'match_scores','applications','application_history','interviews','cv_reviews',
                           'cv_suggestions','notifications','payments'] LOOP
    EXECUTE format('SELECT setval(pg_get_serial_sequence(%L, ''id''), COALESCE((SELECT MAX(id) FROM %I), 0) + 1, false)', t, t);
  END LOOP;
END $$;
