// Keep these in sync with backend/apps/accounts/models.py User.Role
export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  DEPT_ADMIN: "DEPT_ADMIN",
  HOD: "HOD",
  ADVISOR: "ADVISOR",
  FACULTY: "FACULTY",
  NON_TEACHING: "NON_TEACHING",
  STUDENT: "STUDENT",
  PARENT: "PARENT",
};

export const ROLE_LABELS = {
  SUPER_ADMIN: "Super Admin",
  DEPT_ADMIN: "Department Admin",
  HOD: "Head of Department",
  ADVISOR: "Advisor / Mentor",
  FACULTY: "Faculty",
  NON_TEACHING: "Non-Teaching Staff",
  STUDENT: "Student",
  PARENT: "Parent",
};

// Roles that can manage an entire department's records (students, faculty,
// courses, fee structures, bonafide approvals). Super Admin sees every
// department; Dept Admin/HOD are scoped to their own by the backend.
export const DEPT_MANAGER_ROLES = [ROLES.SUPER_ADMIN, ROLES.DEPT_ADMIN, ROLES.HOD];

// Roles that carry teaching responsibilities.
export const TEACHING_ROLES = [ROLES.FACULTY, ROLES.HOD, ROLES.ADVISOR];

// Any kind of staff/employee account (used for the staff directory and account
// creation forms).
export const STAFF_ROLES = [
  ROLES.DEPT_ADMIN, ROLES.HOD, ROLES.ADVISOR, ROLES.FACULTY, ROLES.NON_TEACHING,
];

// Roles a Department Admin/HOD is allowed to create (never another admin-level role).
export const DEPT_CREATABLE_ROLES = [
  ROLES.FACULTY, ROLES.ADVISOR, ROLES.NON_TEACHING, ROLES.STUDENT, ROLES.PARENT,
];

export const ALL_STAFF_CREATABLE_ROLES = [
  ROLES.HOD, ROLES.ADVISOR, ROLES.FACULTY, ROLES.NON_TEACHING, ROLES.DEPT_ADMIN,
];
