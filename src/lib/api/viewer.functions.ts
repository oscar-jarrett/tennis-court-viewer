import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const verifyPassword = createServerFn({ method: "POST" })
  .validator((d: any) => z.object({ password: z.string().min(1).max(200) }).parse(d.data ?? d))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("app_settings")
      .select("key,value")
      .in("key", ["viewer_password", "admin_password"]);
      
    if (error) throw new Error(`Database Error: ${error.message}`);

    const map = Object.fromEntries((rows ?? []).map((r: any) => [r.key, r.value]));

    if (data.password === map.admin_password) return { role: "admin" as const };
    if (data.password === map.viewer_password) return { role: "viewer" as const };
    return { role: null };
  });

export const listTournaments = createServerFn({ method: "POST" })
  .handler(async () => {
    const { data, error } = await (supabaseAdmin as any)
      .from("tournaments")
      .select("*")
      .order("created_at");
      
    if (error) throw new Error(error.message);
    return data;
  });

export const listCourts = createServerFn({ method: "POST" })
  .handler(async () => {
    const { data, error } = await (supabaseAdmin as any)
      .from("courts")
      .select("*")
      .order("created_at");
      
    if (error) throw new Error(error.message);
    return data;
  });

export const listAvailableModels = createServerFn({ method: "POST" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin.storage
      .from("3d-models")
      .list("", { limit: 100, sortBy: { column: "name", order: "asc" } });
      
    if (error) throw new Error(error.message);

    return (data ?? [])
      // FIX: Filter out Supabase's hidden files (like .emptyFolderPlaceholder)
      .filter((file: any) => !file.name.startsWith(".")) 
      .map((file: any) => {
        const { data: pUrl } = supabaseAdmin.storage.from("3d-models").getPublicUrl(file.name);
        return {
          name: file.name,
          url: pUrl.publicUrl
        };
      });
  });

export const listCameras = createServerFn({ method: "POST" })
  .handler(async () => {
    const { data: cameras, error } = await (supabaseAdmin as any)
      .from("cameras")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
      
    if (error) throw new Error(`Database Error: ${error.message}`);

    const out = await Promise.all(
      (cameras ?? []).map(async (c: any) => {
        const signed: string[] = [];
        for (const path of c.photos ?? []) {
          if (!path) continue;
          const { data: s } = await supabaseAdmin.storage
            .from("camera-photos")
            .createSignedUrl(path, 60 * 60 * 24);
          if (s?.signedUrl) signed.push(s.signedUrl);
        }
        return { ...c, photoUrls: signed };
      }),
    );
    return out;
  });