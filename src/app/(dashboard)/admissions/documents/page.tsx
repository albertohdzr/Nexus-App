import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Badge } from "@/src/components/ui/badge";
import { uploadRequirementPdf } from "./actions";

const DIVISIONS = [
  { value: "prenursery", label: "Pre Nursery" },
  { value: "early_child", label: "Early Child" },
  { value: "elementary", label: "Elementary" },
  { value: "middle_school", label: "Middle School" },
  { value: "high_school", label: "High School" },
];

export default async function AdmissionDocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    redirect("/dashboard");
  }

  const { data: documents } = await supabase
    .from("admission_requirement_documents")
    .select("id, division, title, file_name, is_active, updated_at")
    .eq("organization_id", profile.organization_id)
    .order("updated_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Requisitos por división</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={uploadRequirementPdf} className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="division">División</Label>
              <select
                id="division"
                name="division"
                required
                className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Selecciona división
                </option>
                {DIVISIONS.map((division) => (
                  <option key={division.value} value={division.value}>
                    {division.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Título (opcional)</Label>
              <Input id="title" name="title" placeholder="Requisitos admisiones" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">PDF</Label>
              <Input id="file" name="file" type="file" accept="application/pdf" required />
            </div>
            <div className="flex items-end">
              <Button type="submit">Subir PDF</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentos cargados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!documents?.length ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay documentos cargados.
            </p>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <div className="space-y-1">
                  <div className="font-medium">
                    {doc.title || doc.file_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {DIVISIONS.find((d) => d.value === doc.division)?.label ||
                      doc.division}
                    {" • "}
                    {new Date(doc.updated_at).toLocaleDateString("es-MX")}
                  </div>
                </div>
                <Badge variant={doc.is_active ? "secondary" : "outline"}>
                  {doc.is_active ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
