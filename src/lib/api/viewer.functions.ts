import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Password verification bypass (Local-only mode)
export const verifyPassword = createServerFn({ method: "POST" })
  .validator((d: any) => z.object({ password: z.string().min(1).max(200) }).parse(d.data ?? d))
  .handler(async ({ data }) => {
    const password = data.password;
    
    if (password === "admin") {
      return { role: "admin" };
    }
    
    // Default local viewer bypass
    return { role: "viewer" };
  });

// Tournaments mock bypass
export const listTournaments = createServerFn({ method: "POST" })
  .handler(async () => {
    // Local bypass: returns an empty list of tournaments
    return [];
  });

// Courts mock bypass
export const listCourts = createServerFn({ method: "POST" })
  .handler(async () => {
    // Local bypass: returns an empty list of courts
    return [];
  });

// Get individual court details bypass (if used by your app)
export const getCourt = createServerFn({ method: "POST" })
  .validator((d: any) => z.object({ id: z.string() }).parse(d.data ?? d))
  .handler(async () => {
    // Local bypass: returns null or empty object
    return null;
  });

// Get individual tournament details bypass (if used by your app)
export const getTournament = createServerFn({ method: "POST" })
  .validator((d: any) => z.object({ id: z.string() }).parse(d.data ?? d))
  .handler(async () => {
    // Local bypass: returns null or empty object
    return null;
  });