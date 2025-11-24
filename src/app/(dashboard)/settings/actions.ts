"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateOrganization(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const display_phone_number = formData.get("display_phone_number") as string;
  const phone_number_id = formData.get("phone_number_id") as string;

  if (!id) {
    return { error: "Organization ID is required" };
  }

  // Verify user belongs to this organization and has permission
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.organization_id !== id) {
    return { error: "You do not have permission to edit this organization" };
  }

  // Check role (Superadmin or Org Admin)
  if (profile.role !== 'superadmin' && profile.role !== 'org_admin') {
    return { error: "Insufficient permissions" };
  }

  const { data, error } = await supabase
    .from("organizations")
    .update({
      name,
      display_phone_number,
      phone_number_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("Error updating organization:", error);
    return { error: "Failed to update organization" };
  }

  if (!data || data.length === 0) {
    console.error("No rows updated. Check RLS policies or permissions.");
    return { error: "No changes saved. You might not have permission." };
  }

  revalidatePath("/settings");
  return { success: true };
}
