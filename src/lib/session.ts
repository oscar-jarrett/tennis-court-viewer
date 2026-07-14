export interface SessionData {
  role: "admin" | "viewer";
  password?: string;
}

const SESSION_KEY = "court_camera_session";

export function getSession(): SessionData | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
}

export function setSession(session: SessionData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}