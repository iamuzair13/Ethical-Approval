-- Programs under departments for finer-grained RBAC scope
CREATE TABLE IF NOT EXISTS programs (
  id BIGSERIAL PRIMARY KEY,
  department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (department_id, name)
);

CREATE INDEX IF NOT EXISTS idx_programs_department ON programs(department_id);
CREATE INDEX IF NOT EXISTS idx_programs_active ON programs(is_active);

-- Program-level admin scope (supervisor primary / ireb scope)
CREATE TABLE IF NOT EXISTS admin_program_assignments (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  faculty_id BIGINT NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  program_id BIGINT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  assignment_type VARCHAR(30) NOT NULL CHECK (assignment_type IN ('supervisor_primary', 'ireb_scope')),
  assigned_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_program_assignments_admin
  ON admin_program_assignments(admin_user_id, assignment_type)
  WHERE deleted_at IS NULL;
