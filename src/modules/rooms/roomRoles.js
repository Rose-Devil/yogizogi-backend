const ROOM_ROLES = {
  OWNER: "OWNER",
  EDITOR: "EDITOR",
  VIEWER: "VIEWER",
};

const ROLE_ORDER = {
  VIEWER: 1,
  EDITOR: 2,
  OWNER: 3,
};

function isValidRole(role) {
  return role === ROOM_ROLES.OWNER || role === ROOM_ROLES.EDITOR || role === ROOM_ROLES.VIEWER;
}

function hasAtLeastRole(actualRole, requiredRole) {
  const a = ROLE_ORDER[actualRole] ?? 0;
  const r = ROLE_ORDER[requiredRole] ?? 0;
  return a >= r;
}

module.exports = { ROOM_ROLES, isValidRole, hasAtLeastRole };

