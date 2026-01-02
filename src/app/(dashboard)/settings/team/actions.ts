"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";
import { checkPermission, getProfileWithRole } from "@/src/lib/permissions-server";

const resend = new Resend(process.env.RESEND_API_KEY);

type ParsedName = {
  first_name: string;
  middle_name: string | null;
  last_name_paternal: string;
  last_name_maternal: string | null;
};

function parseMexicanName(fullName: string): ParsedName {
  const parts = fullName.trim().split(/\s+/);

  if (parts.length === 0) {
    return { first_name: "", middle_name: null, last_name_paternal: "", last_name_maternal: null };
  }

  if (parts.length === 1) {
    return { first_name: parts[0], middle_name: null, last_name_paternal: "", last_name_maternal: null };
  }

  if (parts.length === 2) {
    const [first, paternal] = parts;
    return { first_name: first, middle_name: null, last_name_paternal: paternal, last_name_maternal: null };
  }

  if (parts.length === 3) {
    const [first, paternal, maternal] = parts;
    return { first_name: first, middle_name: null, last_name_paternal: paternal, last_name_maternal: maternal };
  }

  const [first, middle, paternal, ...rest] = parts;
  return {
    first_name: first,
    middle_name: middle || null,
    last_name_paternal: paternal,
    last_name_maternal: rest.join(" ") || null,
  };
}

async function getTeamContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado", supabase: null, profile: null, user: null };
  }

  const { profile, error } = await getProfileWithRole(supabase, user.id);
  if (error || !profile?.organization_id) {
    return { error: "No se encontró tu organización", supabase: null, profile: null, user: null };
  }

  const allowed = await checkPermission(supabase, user.id, "settings", "manage_team");
  if (!allowed) {
    return { error: "Sin permisos para gestionar el equipo", supabase: null, profile: null, user: null };
  }

  return { supabase, profile, user };
}

export async function createTeamMember(formData: FormData) {
  const ctx = await getTeamContext();
  if (!ctx.supabase || !ctx.profile || !ctx.user) {
    return { error: ctx.error };
  }

  const fullName = (formData.get("full_name") as string | null)?.trim() || "";
  const email = (formData.get("email") as string | null)?.trim().toLowerCase() || "";
  const roleId = (formData.get("role_id") as string | null) || "";
  const phone = (formData.get("phone") as string | null) || null;

  if (!fullName || !email || !roleId) {
    return { error: "Nombre, correo y rol son obligatorios" };
  }

  const { data: role, error: roleError } = await ctx.supabase
    .from("roles")
    .select("id, slug")
    .eq("id", roleId)
    .eq("organization_id", ctx.profile.organization_id)
    .single();

  if (roleError || !role) {
    return { error: "Rol inválido para esta organización" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: "Faltan credenciales de Supabase en el servidor" };
  }

  const supabaseAdmin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const tempPassword = Math.random().toString(36).slice(-8) + "Aa1!";
  const { data: adminUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (userError || !adminUser?.user) {
    console.error("User creation error:", userError);
    return { error: userError?.message || "No se pudo crear el usuario" };
  }

  const parsedName = parseMexicanName(fullName);
  const { error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .insert({
      id: adminUser.user.id,
      first_name: parsedName.first_name,
      middle_name: parsedName.middle_name,
      last_name_paternal: parsedName.last_name_paternal,
      last_name_maternal: parsedName.last_name_maternal,
      email,
      phone,
      organization_id: ctx.profile.organization_id,
      role: role.slug,
      role_id: role.id,
      force_password_change: true,
      is_active: true,
    });

  if (profileError) {
    console.error("Profile creation error:", profileError);
    return { error: profileError.message };
  }

  if (process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: "Nexus <onboarding@team5526.com>",
        to: email,
        subject: "Acceso a Nexus - Credenciales temporales",
        html: `
          <h1>Bienvenido a Nexus</h1>
          <p>Ya tienes acceso a tu organización.</p>
          <p><strong>Usuario:</strong> ${email}</p>
          <p><strong>Contraseña temporal:</strong> ${tempPassword}</p>
          <p>Al iniciar sesión te pediremos cambiarla.</p>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send invite email:", emailError);
    }
  }

  revalidatePath("/settings/team");
  return { success: true, tempPassword };
}

export async function updateTeamMemberRole(formData: FormData) {
  const ctx = await getTeamContext();
  if (!ctx.supabase || !ctx.profile) {
    return { error: ctx.error };
  }

  const memberId = (formData.get("member_id") as string | null) || "";
  const roleId = (formData.get("role_id") as string | null) || "";

  if (!memberId || !roleId) {
    return { error: "Falta el usuario o el rol" };
  }

  const { data: role, error: roleError } = await ctx.supabase
    .from("roles")
    .select("id, slug")
    .eq("id", roleId)
    .eq("organization_id", ctx.profile.organization_id)
    .single();

  if (roleError || !role) {
    return { error: "Rol inválido para esta organización" };
  }

  const { error } = await ctx.supabase
    .from("user_profiles")
    .update({
      role_id: role.id,
      role: role.slug,
      updated_at: new Date().toISOString(),
    })
    .eq("id", memberId)
    .eq("organization_id", ctx.profile.organization_id);

  if (error) {
    console.error("Update member role error:", error);
    return { error: "No se pudo actualizar el rol" };
  }

  revalidatePath("/settings/team");
  return { success: true };
}
