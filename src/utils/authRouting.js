export function getDefaultRedirectForRole(role) {
  return role === "admin" ? "/admin" : "/home";
}

export function getPostAuthRedirect({ role, fromPath }) {
  if (typeof fromPath === "string" && fromPath.trim()) {
    return fromPath;
  }

  return getDefaultRedirectForRole(role);
}

