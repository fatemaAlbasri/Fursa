-- =====================================================================
--  Fursa — Test data (run AFTER schema.sql)
--  All people and companies are invented. Every account's password is:  Fursa@123
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- for crypt() password hashing (bcrypt)

-- ---------- Plans ----------
INSERT INTO plans (id, name, price_bhd_month, max_active_jobs, has_ai_ranking, has_match_reasons, has_bulk_actions, has_hiring_summary) VALUES
 (1, 'Free',    0.000,  1,    false, false, false, false),
 (2, 'Starter', 15.000, 2,    true,  true,  true,  false),
 (3, 'Growth',  25.000, NULL, true,  true,  true,  true);

-- ---------- Skills (a starter list, users can add more) ----------
INSERT INTO skills (id, name) VALUES
 (1,'JavaScript'),(2,'React'),(3,'SQL'),(4,'HTML'),(5,'CSS'),(6,'Git'),(7,'Node.js'),
 (8,'Python'),(9,'Excel'),(10,'Power BI'),(11,'Networking'),(12,'English'),(13,'Arabic'),
 (14,'Customer Service'),(15,'Java'),
 (16,'TypeScript'),(17,'Express'),(18,'PostgreSQL'),(19,'MySQL'),(20,'MongoDB'),
 (21,'C#'),(22,'C++'),(23,'PHP'),(24,'Linux'),(25,'Tableau'),(26,'Data Analysis'),
 (27,'Machine Learning'),(28,'UI/UX Design'),(29,'Figma'),(30,'Communication'),
 (31,'Project Management'),(32,'Accounting');

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
INSERT INTO seeker_profiles (user_id, phone, major, graduation_status, years_experience, job_types, work_modes) VALUES
 (6, '+97333000001', 'Computer Science', 'Graduated', 0.5, '{full_time,internship}', '{onsite,hybrid}'),
 (7, '+97333000002', 'Computer Science', 'Graduated', 1.0, '{full_time}', '{remote,hybrid}'),
 (8, '+97333000003', 'Information Technology', 'Final year', 0, '{internship,part_time}', '{}'),
 (9, '+97333000004', 'Computer Engineering', 'Graduated', 0.3, '{}', '{onsite}'),
 (10, '+97333000005', 'Information Systems', 'Graduated', 0, '{}', '{}'),
 (11, '+97333000006', 'Business Administration', 'Final year', 0, '{part_time}', '{hybrid}');

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
 (2, 6,  'my_cv.pdf',         '/uploads/cv/2.pdf', E'Fatima Ali\nfatima@example.com | +973 3300 0001 | Manama, Bahrain\nIT graduate looking for a job.\n\nEducation\nBSc Computer Science, University of Bahrain\n\nProjects\nMade a website for my senior project.\n\nSkills\nJS, react, databases\n\nHobbies\nReading, football', '6-month internship', 'English, Arabic', true, '2026-10-08'),
 (3, 7,  'noor_cv.pdf',       '/uploads/cv/3.pdf', E'Noor Ahmed\nnoor.ahmed@example.com | Riffa, Bahrain\n\nAbout me\nComputer science student looking for a job.\n\nObjective\nTo get a job in a good company and learn new things.\n\nEducation\nUniversity of Bahrain - computer science\nGPA 3.4 / 4\n\nExperience\nDid an internship at a local software company.\nMade a small inventory app for the company.\n\nSkills\njavascript, react, sql, git, programming, computers\n\nLanguages\nenglish, arabic', '1-year internship', 'English, Arabic', true, '2026-10-01'),
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
INSERT INTO jobs (id, company_id, job_type, work_mode, location, title, description, responsibilities, salary, deadline, field, major_must_have, min_years, max_years, language, status, created_at) VALUES
 (1, 1, 'full_time', 'onsite', 'Manama', 'Junior Frontend Developer', 'Build the React frontend of our client apps.', 'Build UI screens; fix bugs; work with the backend team.', 450.000, '2026-10-30', 'Computer Science', true, 0, 2, 'English', 'open', '2026-10-05'),
 (2, 2, 'internship', 'hybrid', 'Seef', 'Software Engineering Intern', 'Three-month internship in our product team.', 'Write and test code; join daily stand-ups.', NULL, '2026-10-25', 'Computer Science', false, 0, 1, 'English', 'open', '2026-10-08'),
 (3, 3, 'full_time', 'onsite', 'Muharraq', 'IT Support Officer', 'First-line IT support for clients.', 'Answer tickets; set up devices; basic networking.', 380.000, '2026-11-02', 'Information Technology', false, 0, 2, 'Arabic', 'open', '2026-10-01'),
 (4, 4, 'internship', 'remote',  'Manama', 'Data Analyst Trainee', 'Learn to build reports for clients.', 'Clean data; build dashboards.', NULL, '2026-11-05', 'Information Systems', false, 0, 1, 'English', 'open', '2026-09-20'),
 (5, 1, 'part_time', 'hybrid', 'Manama', 'Web Developer Trainee', 'Entry-level web role.', 'Build pages with HTML, CSS and JavaScript.', NULL, '2026-10-30', 'Computer Science', false, 0, 1, 'English', 'draft', '2026-10-10');

INSERT INTO job_skills (job_id, skill_id, is_required) VALUES
 (1,1,true),
 (1,2,true),
 (1,3,false),
 (1,6,false),
 (1,12,false),
 (2,1,true),
 (2,6,false),
 (2,15,false),
 (2,3,false),
 (2,12,false),
 (3,11,true),
 (3,14,false),
 (3,13,false),
 (3,12,false),
 (4,3,true),
 (4,10,true),
 (4,9,false),
 (4,12,false),
 (4,8,false),
 (5,4,true),
 (5,5,false),
 (5,1,false);

-- ---------- Related fields (Education score: related = 0.5) ----------
INSERT INTO related_fields (field_a, field_b) VALUES
 ('Computer Science', 'Information Technology'),
 ('Computer Science', 'Computer Engineering'),
 ('Computer Science', 'Information Systems'),
 ('Computer Science', 'Cybersecurity'),
 ('Information Technology', 'Information Systems'),
 ('Information Technology', 'Computer Engineering'),
 ('Information Technology', 'Cybersecurity'),
 ('Information Systems', 'Business Administration');

-- ---------- Match scores (normally written by the scoring algorithm) ----------
-- Scores below were calculated with the Fursa scoring algorithm (CV component excluded:
-- test data has no embeddings, so the remaining weights are rescaled).
INSERT INTO match_scores (job_id, seeker_id, score, tier, is_qualified, breakdown) VALUES
 (1, 6, 91, 'strong', true, '{"skills": 0.857, "education": 1, "preference": 1.0, "experience": 1, "matchedRequired": "2/2", "missing": ["Git"], "cvIncluded": false}'),
 (1, 7, 97, 'strong', true, '{"skills": 1.0, "education": 1, "preference": 0.75, "experience": 1, "matchedRequired": "2/2", "missing": [], "cvIncluded": false}'),
 (1, 8, 66, 'good', false, '{"skills": 0.714, "education": 0.5, "preference": 0.25, "experience": 1, "matchedRequired": "2/2", "missing": ["SQL", "Git"], "cvIncluded": false}'),
 (2, 6, 80, 'strong', true, '{"skills": 0.667, "education": 1, "preference": 1.0, "experience": 1, "matchedRequired": "1/1", "missing": ["Git", "Java"], "cvIncluded": false}'),
 (2, 7, 83, 'strong', true, '{"skills": 0.833, "education": 1, "preference": 0.5, "experience": 1, "matchedRequired": "1/1", "missing": ["Java"], "cvIncluded": false}'),
 (3, 9, 90, 'strong', true, '{"skills": 1.0, "education": 0.5, "preference": 0.75, "experience": 1, "matchedRequired": "1/1", "missing": [], "cvIncluded": false}'),
 (3, 6, 45, 'low', false, '{"skills": 0.2, "education": 0.5, "preference": 1.0, "experience": 1, "matchedRequired": "0/1", "missing": ["Networking", "Customer Service", "Arabic"], "cvIncluded": false}'),
 (4, 10, 76, 'good', false, '{"skills": 0.714, "education": 1, "preference": 0.5, "experience": 1, "matchedRequired": "1/2", "missing": ["Power BI"], "cvIncluded": false}'),
 (4, 6, 56, 'low', false, '{"skills": 0.429, "education": 0.5, "preference": 0.75, "experience": 1, "matchedRequired": "1/2", "missing": ["Power BI", "Excel", "Python"], "cvIncluded": false}');

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
 (1,'layout',   'Education → Projects → Skills', 'Projects → Skills → Education', 'Puts your strongest section first.', 1, false, 'dismissed');

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
 (3, 2,    NULL, 'plan',               'benefitpay', 25.000, 2.500, 27.500, 'paid', true, '2026-10-01'),
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
