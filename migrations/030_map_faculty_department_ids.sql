-- 030: Map faculty_members.department_id from the department text column
--
-- The faculty data import from Excel set the `department` text column but
-- left `department_id` NULL for most records (only 46 of 2479 had it set).
-- This caused the supervisor picker to return empty results for most
-- departments, because the query filters by `fm.department_id = $1`.
--
-- This migration maps department text values to department IDs using:
--   1. Exact case-insensitive match
--   2. "Department of" prefix normalization
--   3. "&" -> "and" substitution
--   4. "(SGD)" suffix stripping (Sargodha campus)
--   5. "Science" vs "Sciences" normalization
--   6. "Behavioral" vs "Behavioural" (US vs UK spelling)
--   7. Targeted manual mappings for remaining unmatched values
--
-- After this migration, all 2479 faculty members have department_id set.

-- Step 1: Exact case-insensitive match
UPDATE faculty_members fm
SET department_id = d.id, updated_at = NOW()
FROM departments d
WHERE LOWER(TRIM(fm.department)) = LOWER(TRIM(d.name))
  AND fm.department_id IS NULL
  AND fm.deleted_at IS NULL;

-- Step 2: "Department of" prefix normalization
UPDATE faculty_members fm
SET department_id = d.id, updated_at = NOW()
FROM departments d
WHERE LOWER(TRIM(REGEXP_REPLACE(d.name, '^Department of\s+', ''))) = LOWER(TRIM(fm.department))
  AND fm.department_id IS NULL
  AND fm.deleted_at IS NULL;

-- Step 3: "&" -> "and" substitution
UPDATE faculty_members fm
SET department_id = d.id, updated_at = NOW()
FROM departments d
WHERE LOWER(REPLACE(TRIM(fm.department), '&', 'and')) = LOWER(REPLACE(TRIM(d.name), '&', 'and'))
  AND fm.department_id IS NULL
  AND fm.deleted_at IS NULL;

-- Step 4: "(SGD)" suffix stripping + prefix normalization + ampersand
UPDATE faculty_members fm
SET department_id = d.id, updated_at = NOW()
FROM departments d
WHERE LOWER(REPLACE(TRIM(REGEXP_REPLACE(fm.department, '\s*\(SGD\)\s*$', '')), '&', 'and'))
      = LOWER(REPLACE(TRIM(REGEXP_REPLACE(d.name, '^Department of\s+', '')), '&', 'and'))
  AND fm.department_id IS NULL
  AND fm.deleted_at IS NULL;

-- Step 5: "Behavioral" -> "Behavioural" spelling normalization + SGD
UPDATE faculty_members fm
SET department_id = d.id, updated_at = NOW()
FROM departments d
WHERE LOWER(REPLACE(REPLACE(TRIM(REGEXP_REPLACE(fm.department, '\s*\(SGD\)\s*$', '')), 'Behavioral', 'Behavioural'), 'Science ', 'Sciences '))
      = LOWER(REPLACE(REPLACE(TRIM(REGEXP_REPLACE(d.name, '^Department of\s+', '')), 'Behavioral', 'Behavioural'), 'Science ', 'Sciences '))
  AND fm.department_id IS NULL
  AND fm.deleted_at IS NULL;

-- Step 6: Targeted manual mappings for remaining unmatched values
-- Computer Science variants -> Department of Computer Science and IT (id=231)
UPDATE faculty_members
SET department_id = 231, updated_at = NOW()
WHERE department_id IS NULL AND deleted_at IS NULL
  AND (LOWER(department) LIKE '%computer science%' OR LOWER(department) LIKE '%computer%it%');

-- Physical Therapy -> University Institute of Physical Therapy (id=4)
UPDATE faculty_members SET department_id = 4, updated_at = NOW()
WHERE department_id IS NULL AND deleted_at IS NULL AND LOWER(TRIM(department)) LIKE '%physical therapy%';

-- English Language and Literature -> Deptartment of English Language and Literature (id=22)
UPDATE faculty_members SET department_id = 22, updated_at = NOW()
WHERE department_id IS NULL AND deleted_at IS NULL AND LOWER(TRIM(department)) LIKE '%english language%literature%';

-- UIRSMIT -> University Institute of Radiological Sciences & Medical Imaging (id=6)
UPDATE faculty_members SET department_id = 6, updated_at = NOW()
WHERE department_id IS NULL AND deleted_at IS NULL AND LOWER(TRIM(department)) LIKE '%uirsmit%';

-- Skill Development -> Center for Skills Develop. & Leadership (id=247)
UPDATE faculty_members SET department_id = 247, updated_at = NOW()
WHERE department_id IS NULL AND deleted_at IS NULL AND LOWER(TRIM(department)) LIKE '%skill development%';

-- M.A. Raoof College of LAW -> M.A Raoof College of Law (id=24)
UPDATE faculty_members SET department_id = 24, updated_at = NOW()
WHERE department_id IS NULL AND deleted_at IS NULL AND LOWER(TRIM(department)) LIKE '%raoof%law%';

-- Diet and Nutritional Science(s) -> University Institute of Diet & Nutritional Sciences (id=8)
UPDATE faculty_members SET department_id = 8, updated_at = NOW()
WHERE department_id IS NULL AND deleted_at IS NULL AND LOWER(TRIM(department)) LIKE '%diet%nutritional%';

-- Public Health -> University Institute of Public Health (id=5)
UPDATE faculty_members SET department_id = 5, updated_at = NOW()
WHERE department_id IS NULL AND deleted_at IS NULL AND LOWER(TRIM(department)) = 'public health';

-- International Qualifications -> Academy of International Qualifications (id=64)
UPDATE faculty_members SET department_id = 64, updated_at = NOW()
WHERE department_id IS NULL AND deleted_at IS NULL AND LOWER(TRIM(department)) LIKE '%international qualifications%';

-- Electronics and Electrical Systems -> Deptt of Electronics & Electrical System (id=57)
UPDATE faculty_members SET department_id = 57, updated_at = NOW()
WHERE department_id IS NULL AND deleted_at IS NULL AND LOWER(TRIM(department)) LIKE '%electronics%electrical%';

-- Pain and Regenerative Medicine -> School of Pain & Regenrative Medicine (id=40)
UPDATE faculty_members SET department_id = 40, updated_at = NOW()
WHERE department_id IS NULL AND deleted_at IS NULL AND LOWER(TRIM(department)) LIKE '%pain%regenerative%';

-- University Institute of Radiological Sciences and... -> id=6
UPDATE faculty_members SET department_id = 6, updated_at = NOW()
WHERE department_id IS NULL AND deleted_at IS NULL AND LOWER(TRIM(department)) LIKE '%radiological sciences%';

-- CRiMM -> Center for Research in Molecular Medicine (id=38)
UPDATE faculty_members SET department_id = 38, updated_at = NOW()
WHERE department_id IS NULL AND deleted_at IS NULL AND LOWER(TRIM(department)) = 'crimm';

-- Allied Health Sciences (GRT) -> Faculty of Allied Health Sciences (id=199)
UPDATE faculty_members SET department_id = 199, updated_at = NOW()
WHERE department_id IS NULL AND deleted_at IS NULL AND LOWER(TRIM(department)) LIKE '%allied health sciences%';

-- Management -> Department of Management Sciences (id=213)
UPDATE faculty_members SET department_id = 213, updated_at = NOW()
WHERE department_id IS NULL AND deleted_at IS NULL AND LOWER(TRIM(department)) = 'management';

-- Admissions -> Admission Department (id=288)
UPDATE faculty_members SET department_id = 288, updated_at = NOW()
WHERE department_id IS NULL AND deleted_at IS NULL AND LOWER(TRIM(department)) LIKE '%admission%';

-- Lahore School of Phyto-medical Sciences -> Department of Pharmacy (id=33)
UPDATE faculty_members SET department_id = 33, updated_at = NOW()
WHERE department_id IS NULL AND deleted_at IS NULL AND LOWER(TRIM(department)) LIKE '%phyto-medical%';
