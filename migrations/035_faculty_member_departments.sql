-- Join table for many-to-many relationship between faculty_members and departments.
-- The existing faculty_members.department_id column is kept as the "primary"
-- department for backward compatibility; this table stores all department
-- assignments (including the primary one) so that a single faculty member
-- can belong to multiple departments.

CREATE TABLE IF NOT EXISTS faculty_member_departments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  faculty_member_id UUID NOT NULL REFERENCES faculty_members(id) ON DELETE CASCADE,
  department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (faculty_member_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_faculty_member_departments_faculty_member_id
  ON faculty_member_departments(faculty_member_id);

CREATE INDEX IF NOT EXISTS idx_faculty_member_departments_department_id
  ON faculty_member_departments(department_id);
