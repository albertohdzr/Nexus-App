"use server"

import { createClient } from "@/src/lib/supabase/server"
import { redirect } from "next/navigation"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { buildEmailHtml, sendResendEmail, toPlainText } from "@/src/lib/email"

type ParsedName = {
  first_name: string
  middle_name: string | null
  last_name_paternal: string
  last_name_maternal: string | null
}

function parseMexicanName(fullName: string): ParsedName {
  const parts = fullName.trim().split(/\s+/)

  if (parts.length === 0) {
    return { first_name: "", middle_name: null, last_name_paternal: "", last_name_maternal: null }
  }

  if (parts.length === 1) {
    return { first_name: parts[0], middle_name: null, last_name_paternal: "", last_name_maternal: null }
  }

  if (parts.length === 2) {
    const [first, paternal] = parts
    return { first_name: first, middle_name: null, last_name_paternal: paternal, last_name_maternal: null }
  }

  if (parts.length === 3) {
    const [first, paternal, maternal] = parts
    return { first_name: first, middle_name: null, last_name_paternal: paternal, last_name_maternal: maternal }
  }

  const [first, middle, paternal, ...rest] = parts
  return {
    first_name: first,
    middle_name: middle,
    last_name_paternal: paternal,
    last_name_maternal: rest.join(" "),
  }
}

export async function createOrganizationAction(formData: FormData) {
  console.log("Starting createOrganizationAction")
  const supabase = await createClient()

  // Verify superadmin
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("No user found")
    throw new Error("Unauthorized")
  }

  const { data: isSuperAdmin } = await supabase.rpc('is_superadmin', { user_id: user.id })
  console.log("isSuperAdmin:", isSuperAdmin)

  if (!isSuperAdmin) {
    console.log("User is not superadmin")
    throw new Error("Unauthorized")
  }

  const name = formData.get("name") as string
  const slug = formData.get("slug") as string
  const plan = formData.get("plan") as string
  const adminName = formData.get("adminName") as string
  const adminEmail = formData.get("adminEmail") as string
  
  console.log("Form data:", { name, slug, plan, adminName, adminEmail })

  // 1. Create Organization
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name,
      slug,
      plan,
    })
    .select()
    .single()

  if (orgError) {
    console.error("Org creation error:", orgError)
    return { error: orgError.message }
  }
  console.log("Org created:", org.id)

  // 2. Create Admin User (using service role client for admin actions)
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is missing")
    return { error: "Server configuration error: Missing service role key" }
  }

  const { error: seedError } = await supabaseAdmin.rpc("seed_org_roles", {
    p_org_id: org.id,
  })

  if (seedError) {
    console.error("Role seed error:", seedError)
    return { error: "Failed to seed organization roles" }
  }

  const { data: orgAdminRole, error: roleError } = await supabaseAdmin
    .from("roles")
    .select("id, slug")
    .eq("organization_id", org.id)
    .eq("slug", "org_admin")
    .single()

  if (roleError || !orgAdminRole) {
    console.error("Org admin role not found:", roleError)
    return { error: "Failed to resolve org admin role" }
  }

  const tempPassword = Math.random().toString(36).slice(-8) + "Aa1!" // Simple temp password

  const { data: adminUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
        full_name: adminName,
    }
  })

  if (userError) {
    console.error("User creation error:", userError)
    // Rollback org creation? Ideally yes, but for MVP we might just error out.
    // In a real app, we'd use a transaction or manual rollback.
    return { error: userError.message }
  }
  console.log("Admin user created:", adminUser.user.id)

  if (adminUser.user) {
      const parsedName = parseMexicanName(adminName)
      // 3. Create User Profile
      const { error: profileError } = await supabaseAdmin
        .from("user_profiles")
        .insert({
            id: adminUser.user.id,
            first_name: parsedName.first_name,
            middle_name: parsedName.middle_name,
            last_name_paternal: parsedName.last_name_paternal,
            last_name_maternal: parsedName.last_name_maternal,
            email: adminEmail,
            organization_id: org.id,
            role: orgAdminRole.slug,
            role_id: orgAdminRole.id,
            force_password_change: true,
        })

      if (profileError) {
          console.error("Profile creation error:", profileError)
          return { error: profileError.message }
      }
      console.log("Profile created")

      // 4. Send Email
      try {
        console.log("Sending email...")
        const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`
        const bodyHtml = `
          <h1 style="margin: 0 0 12px; font-size: 20px;">Welcome to Nexus!</h1>
          <p style="margin: 0 0 12px;">Your organization <strong>${name}</strong> has been created.</p>
          <p style="margin: 0 0 12px;">Here are your login credentials:</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 16px 0; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600;">Email</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${adminEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600;">Temporary Password</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${tempPassword}</td>
            </tr>
          </table>
          <p style="margin: 0;">Please login at <a href="${loginUrl}">Nexus Login</a> and change your password immediately.</p>
        `
        const html = buildEmailHtml({
          bodyHtml,
          previewText: "Your Nexus organization is ready",
        })

        await sendResendEmail({
          to: adminEmail,
          subject: "Welcome to Nexus - Your Organization is Ready",
          html,
          text: toPlainText(html),
        })
        console.log("Email sent")
      } catch (emailError) {
        console.error("Failed to send email:", emailError)
        // Don't fail the whole process if email fails, but maybe warn
      }
  }

  console.log("Redirecting...")
  redirect("/superadmin/organizations")
}
