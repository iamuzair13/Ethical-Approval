-- Parent-child departments under faculties
CREATE TABLE IF NOT EXISTS departments (
  id BIGSERIAL PRIMARY KEY,
  faculty_id BIGINT NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (faculty_id, name)
);

CREATE INDEX IF NOT EXISTS idx_departments_faculty ON departments(faculty_id);
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active);

-- Department-level admin scope mappings (dean primary / ireb scope)
CREATE TABLE IF NOT EXISTS admin_department_assignments (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  faculty_id BIGINT NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  assignment_type VARCHAR(30) NOT NULL CHECK (assignment_type IN ('dean_primary', 'ireb_scope')),
  assigned_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_department_assignments_admin
  ON admin_department_assignments(admin_user_id, assignment_type)
  WHERE deleted_at IS NULL;
