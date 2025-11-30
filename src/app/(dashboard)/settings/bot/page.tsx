"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/src/lib/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Label } from "@/src/components/ui/label";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { Organization } from "@/src/types/organization";
import { updateOrganization } from "../actions";

export default function BotSettingsPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  useEffect(() => {
    const fetchOrg = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profile?.organization_id) {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", profile.organization_id)
          .single();

        if (orgData) {
          setOrg(orgData);
        }
      }
      setLoading(false);
    };

    fetchOrg();
  }, [supabase]);

  const handleSave = async (formData: FormData) => {
    startTransition(async () => {
      const result = await updateOrganization(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Bot settings updated");
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Organization Not Found</CardTitle>
            <CardDescription>You do not appear to belong to an organization.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Bot Settings</h1>
        <p className="text-sm text-muted-foreground">Configura nombre, tono, modelo e instrucciones.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bot configuration</CardTitle>
          <CardDescription>Personaliza la voz y contexto del asistente.</CardDescription>
        </CardHeader>
        <form action={handleSave}>
          <input type="hidden" name="id" value={org.id} />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bot_name">Bot name</Label>
                <Input
                  id="bot_name"
                  name="bot_name"
                  defaultValue={org.bot_name || ""}
                  placeholder="Asistente"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bot_model">Modelo</Label>
                <Input
                  id="bot_model"
                  name="bot_model"
                  defaultValue={org.bot_model || "gpt-4o-mini"}
                  placeholder="gpt-4o-mini"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bot_language">Idioma</Label>
                <Input
                  id="bot_language"
                  name="bot_language"
                  defaultValue={org.bot_language || "es"}
                  placeholder="es"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bot_tone">Tono</Label>
                <Input
                  id="bot_tone"
                  name="bot_tone"
                  defaultValue={org.bot_tone || ""}
                  placeholder="Profesional, amigable, breve..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bot_instructions">Instrucciones del bot</Label>
              <textarea
                id="bot_instructions"
                name="bot_instructions"
                defaultValue={org.bot_instructions || ""}
                className="w-full min-h-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Contexto, objetivos y límites del asistente"
              />
              <p className="text-xs text-muted-foreground">Define cómo debe responder el asistente.</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar cambios
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
