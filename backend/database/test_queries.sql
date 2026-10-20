-- =====================================================================
--  Fursa — Test queries. Run after seed.sql to check everything works.
-- =====================================================================

-- 1) Employer: Top 10 applicants for "Junior Frontend Developer" (job 1)
SELECT u.first_name || ' ' || u.last_name AS applicant, m.score, m.tier, a.status,
       m.breakdown->>'matchedRequired' AS required_skills, m.breakdown->'missing' AS missing
FROM applications a
JOIN users u        ON u.id = a.seeker_id
JOIN match_scores m ON m.job_id = a.job_id AND m.seeker_id = a.seeker_id
WHERE a.job_id = 1 AND m.is_qualified
ORDER BY m.score DESC
LIMIT 10;

-- 2) Seeker: "Jobs for you" for Fatima (user 6), best match first
SELECT j.title, c.name AS company, j.job_type, j.work_mode, m.score, m.tier, j.deadline
FROM match_scores m
JOIN jobs j      ON j.id = m.job_id
JOIN companies c ON c.id = j.company_id
WHERE m.seeker_id = 6 AND j.status = 'open'
ORDER BY m.score DESC
LIMIT 10;

-- 3) Seeker: "My applications" with status counts
SELECT status, COUNT(*) FROM applications WHERE seeker_id = 6 GROUP BY status;

-- 4) Timeline of one application (Noor → job 1)
SELECT to_status, changed_at::date FROM application_history WHERE application_id = 2 ORDER BY changed_at;

-- 5) Employer dashboard numbers for Nakhla Tech (company 1)
SELECT j.title,
       COUNT(a.id)                                              AS applicants,
       COUNT(a.id) FILTER (WHERE m.is_qualified)                AS qualified,
       COUNT(a.id) FILTER (WHERE a.applied_at > now() - interval '7 days') AS new_this_week
FROM jobs j
LEFT JOIN applications a ON a.job_id = j.id
LEFT JOIN match_scores m ON m.job_id = a.job_id AND m.seeker_id = a.seeker_id
WHERE j.company_id = 1 AND j.status = 'open'
GROUP BY j.id, j.title;

-- 6) Active jobs used vs plan limit ("2 of 2 active jobs used")
SELECT c.name, p.name AS plan,
       (SELECT COUNT(*) FROM jobs WHERE company_id = c.id AND status = 'open') AS active_jobs,
       COALESCE(p.max_active_jobs::text, 'unlimited') AS limit
FROM companies c
JOIN subscriptions s ON s.company_id = c.id AND s.status = 'active'
JOIN plans p ON p.id = s.plan_id;

-- 7) The CV an employer sees is the one that was SENT (Fatima replaced hers later)
SELECT a.id AS application, r.file_name AS cv_sent, r.is_current
FROM applications a JOIN resumes r ON r.id = a.resume_id WHERE a.seeker_id = 6;

-- 8) Unread notifications for Fatima
SELECT COUNT(*) AS unread FROM notifications WHERE user_id = 6 AND NOT is_read;

-- 9) Login check: does this email + password match? (returns 1 row if correct)
SELECT id, role FROM users WHERE email = 'fatima@example.com' AND password_hash = crypt('Fursa@123', password_hash);

-- 10) Preference fit half-scores, as the algorithm calculates them (Fatima = 6, Sara = 10)
SELECT u.first_name, j.title, j.job_type, j.work_mode,
       CASE WHEN cardinality(s.job_types) = 0 THEN 0.25
            WHEN j.job_type = ANY (s.job_types) THEN 0.5 ELSE 0 END AS job_type_half,
       CASE WHEN cardinality(s.work_modes) = 0 THEN 0.25
            WHEN j.work_mode = ANY (s.work_modes) THEN 0.5
            WHEN j.work_mode = 'hybrid' OR 'hybrid' = ANY (s.work_modes) THEN 0.25
            ELSE 0 END AS work_mode_half
FROM seeker_profiles s
JOIN users u ON u.id = s.user_id
CROSS JOIN jobs j
WHERE j.status = 'open' AND s.user_id IN (6, 10)
ORDER BY u.first_name, j.id;

-- 11) Education: is the seeker's major equal / related / unrelated to the job's field?
SELECT u.first_name, s.major, j.title, j.field,
       CASE WHEN s.major = j.field THEN 1
            WHEN EXISTS (SELECT 1 FROM related_fields r
                         WHERE (r.field_a = s.major AND r.field_b = j.field)
                            OR (r.field_b = s.major AND r.field_a = j.field)) THEN 0.5
            ELSE 0 END AS education
FROM seeker_profiles s JOIN users u ON u.id = s.user_id CROSS JOIN jobs j
WHERE s.user_id IN (6, 8) AND j.status = 'open'
ORDER BY u.first_name, j.id;


