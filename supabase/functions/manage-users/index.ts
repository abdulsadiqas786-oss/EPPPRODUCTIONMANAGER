import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is admin via JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authErr } = await adminClient.auth.getUser(token);
    if (authErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (callerRole?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = body.action;

    // LIST users
    if (action === "list") {
      const { data: roles } = await adminClient.from("user_roles").select("*");
      const { data: users, error } = await adminClient.auth.admin.listUsers();
      if (error) throw new Error(error.message);

      const result = users.users
        .filter((u: { id: string }) => !u.id.startsWith("dummy"))
        .map((u: { id: string; email?: string; created_at?: string }) => {
          const r = roles?.find((rl: { user_id: string; role: string }) => rl.user_id === u.id);
          return { id: u.id, email: u.email, role: r?.role ?? "viewer", created_at: u.created_at };
        });

      return new Response(JSON.stringify({ users: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ADD user
    if (action === "add") {
      const { email, password, role } = body;
      if (!email || !password || !role) throw new Error("Missing fields");
      const { data: newUser, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) throw new Error(error.message);
      const { error: roleErr } = await adminClient
        .from("user_roles")
        .upsert({ user_id: newUser.user.id, role });
      if (roleErr) throw new Error(roleErr.message);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE user (email/password/role)
    if (action === "update") {
      const { id, email, password, role } = body;
      const updates: { email?: string; password?: string } = {};
      if (email) updates.email = email;
      if (password) updates.password = password;
      if (Object.keys(updates).length > 0) {
        const { error } = await adminClient.auth.admin.updateUserById(id, updates);
        if (error) throw new Error(error.message);
      }
      if (role) {
        const { error: roleErr } = await adminClient
          .from("user_roles")
          .update({ role })
          .eq("user_id", id);
        if (roleErr) throw new Error(roleErr.message);
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE user
    if (action === "delete") {
      const { id } = body;
      const { error } = await adminClient.auth.admin.deleteUser(id);
      if (error) throw new Error(error.message);
      await adminClient.from("user_roles").delete().eq("user_id", id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
