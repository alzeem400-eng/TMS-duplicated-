// admin-users edge function v3
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

export async function handleRequest(req: Request, envVars?: any, fetchImpl: any = fetch, createClientImpl: any = createClient) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";
    const body = req.method !== "GET" ? await req.json().catch(() => ({})) : {};

    // ---- BOOTSTRAP main admin (no auth required, one-time) ----
    if (action === "bootstrap") {
      const { email, password } = body as { email: string; password: string };
      if (!email || !password) {
        return json({ error: "البريد وكلمة المرور مطلوبان" }, 400);
      }
      let userId: string;
      const listRes0 = await fetch(
        `${supabaseUrl}/auth/v1/admin/users`,
        { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } },
      );
      const allUsers0 = (await listRes0.json()).users as Array<{ id: string; email: string }>;
      const existing = allUsers0.find((u) => u.email.toLowerCase() === email.toLowerCase());

      if (existing) {
        userId = existing.id;
        const updErr = await admin.auth.admin.updateUserById(userId, { password });
        if (updErr.error) {
          return json({ error: mapAuthError(updErr.error.message) }, 400);
        }
      } else {
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (error) {
          return json({ error: mapAuthError(error.message) }, 400);
        }
        userId = data.user.id;
      }

      await admin.from("user_roles").upsert({
        user_id: userId,
        role: "admin",
        created_by: userId,
      });
      return json({ id: userId, email, role: "admin" }, 201);
    }

    // all other actions require an authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "غير مصرح" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const payloadB64 = token.split(".")[1];
    const payload = JSON.parse(atob(payloadB64));
    const userId = payload.sub as string;
    if (!userId) {
      return json({ error: "غير مصرح" }, 401);
    }
    const user = { id: userId };

    const { data: callerRole } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!callerRole || callerRole.role !== "admin") {
      return json({ error: "هذه العملية تتطلب صلاحية مدير" }, 403);
    }

    // ---- LIST users ----
    if (action === "list") {
      const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
      });
      if (!listRes.ok) {
        return json({ error: "تعذّر جلب قائمة المستخدمين" }, 500);
      }
      const authUsers = (await listRes.json()).users as Array<{
        id: string; email: string; created_at: string;
      }>;

      const { data: roles } = await admin.from("user_roles").select("user_id, role");
      const roleMap = new Map((roles || []).map((r: { user_id: string; role: string }) => [r.user_id, r.role]));

      const { data: perms } = await admin.from("user_permissions").select("user_id, section, level");
      const permMap = new Map<string, { section: string; level: string }[]>();
      (perms || []).forEach((p: { user_id: string; section: string; level: string }) => {
        if (!permMap.has(p.user_id)) permMap.set(p.user_id, []);
        permMap.get(p.user_id)!.push({ section: p.section, level: p.level });
      });

      const users = authUsers.map((u) => ({
        id: u.id,
        email: u.email,
        role: roleMap.get(u.id) || "viewer",
        created_at: u.created_at,
        permissions: permMap.get(u.id) || [],
      }));

      return json({ users }, 200);
    }

    // ---- CREATE user ----
    if (action === "create") {
      const { email, password, role } = body as {
        email: string; password: string; role: string;
      };
      if (!email || !password) {
        return json({ error: "البريد وكلمة المرور مطلوبان" }, 400);
      }
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) {
        return json({ error: mapAuthError(error.message) }, 400);
      }
      await admin.from("user_roles").upsert({
        user_id: data.user.id,
        role: role || "viewer",
        created_by: user.id,
      });
      return json({ id: data.user.id, email, role: role || "viewer" }, 201);
    }

    // ---- UPDATE role ----
    if (action === "update-role") {
      const { targetUserId, role } = body as { targetUserId: string; role: string };
      if (!targetUserId || !role) {
        return json({ error: "معرّف المستخدم والدور مطلوبان" }, 400);
      }
      await admin.from("user_roles").upsert({
        user_id: targetUserId,
        role,
        created_by: user.id,
      });
      return json({ ok: true }, 200);
    }

    // ---- RESET password ----
    if (action === "reset-password") {
      const { targetUserId, newPassword } = body as { targetUserId: string; newPassword: string };
      if (!targetUserId || !newPassword) {
        return json({ error: "معرّف المستخدم وكلمة المرور الجديدة مطلوبان" }, 400);
      }
      const { error } = await admin.auth.admin.updateUserById(targetUserId, {
        password: newPassword,
      });
      if (error) {
        return json({ error: mapAuthError(error.message) }, 400);
      }
      return json({ ok: true }, 200);
    }

    // ---- DELETE user ----
    if (action === "delete") {
      const { targetUserId } = body as { targetUserId: string };
      if (!targetUserId) {
        return json({ error: "معرّف المستخدم مطلوب" }, 400);
      }
      if (targetUserId === user.id) {
        return json({ error: "لا يمكن حذف حسابك الحالي" }, 400);
      }
      const { error } = await admin.auth.admin.deleteUser(targetUserId);
      if (error) {
        return json({ error: mapAuthError(error.message) }, 400);
      }
      return json({ ok: true }, 200);
    }

    // ---- SET permission (upsert) ----
    if (action === "set-permission") {
      const { targetUserId, section, level } = body as {
        targetUserId: string; section: string; level: string;
      };
      if (!targetUserId || !section || !level) {
        return json({ error: "المستخدم والقسم والمستوى مطلوبة" }, 400);
      }
      if (!["view", "add", "edit"].includes(level)) {
        return json({ error: "مستوى الصلاحية غير صالح" }, 400);
      }
      await admin.from("user_permissions").upsert({
        user_id: targetUserId,
        section,
        level,
        granted_by: user.id,
      }, { onConflict: "user_id, section" });
      return json({ ok: true }, 200);
    }

    // ---- DELETE permission ----
    if (action === "delete-permission") {
      const { targetUserId, section } = body as {
        targetUserId: string; section: string;
      };
      if (!targetUserId || !section) {
        return json({ error: "المستخدم والقسم مطلوبان" }, 400);
      }
      await admin.from("user_permissions")
        .delete()
        .eq("user_id", targetUserId)
        .eq("section", section);
      return json({ ok: true }, 200);
    }

    return json({ error: "إجراء غير معروف" }, 400);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

Deno.serve((req) => handleRequest(req));

export function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function mapAuthError(msg: string): string {
  if (msg.includes("weak") || msg.includes("Password")) return "كلمة المرور ضعيفة — استخدم حروف وأرقام ورموز";
  if (msg.includes("already") || msg.includes("registered")) return "هذا البريد مسجّل بالفعل";
  if (msg.includes("User not found")) return "المستخدم غير موجود";
  return msg;
}
