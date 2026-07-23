UPDATE submissions AS s
SET
  current_status = 'under_ireb_review',
  updated_at = NOW()
FROM submission_applicant_snapshot AS sas
WHERE sas.submission_id = s.id
  AND LOWER(TRIM(sas.email)) NOT LIKE '%@student.uol.edu.pk'
  AND s.current_status = 'under_supervisor_review';
