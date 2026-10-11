import { redirect } from "@tanstack/react-router";

/**
 * Route guard to require authentication on protected pages.
 * If user does not have a valid token, redirects to /login.
 */
export function requireAuth() {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (!token) {
      throw redirect({ to: "/login" });
    }
  }
}
