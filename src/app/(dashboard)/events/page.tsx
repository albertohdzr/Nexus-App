import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import {
  createEvent,
  registerEventAttendance,
  uploadEventDocument,
} from "./actions";

const DIVISIONS = [
  { value: "prenursery", label: "Pre Nursery" },
  { value: "early_child", label: "Early Child" },
  { value: "elementary", label: "Elementary" },
  { value: "middle_school", label: "Middle School" },
  { value: "high_school", label: "High School" },
];

function formatDateTime(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function EventsPage() {
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

  const { data: events } = await supabase
    .from("events")
    .select(
      "id, name, description, divisions, starts_at, ends_at, requires_registration"
    )
    .eq("organization_id", profile.organization_id)
    .order("starts_at", { ascending: true });

  const { data: documents } = await supabase
    .from("event_documents")
    .select("id, event_id, document_type, file_name, mime_type, file_path, created_at")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  const documentsByEvent = new Map<string, typeof documents>();
  (documents || []).forEach((doc) => {
    const list = documentsByEvent.get(doc.event_id) || [];
    list.push(doc);
    documentsByEvent.set(doc.event_id, list);
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Eventos</h2>
        <p className="text-muted-foreground">
          Crea eventos como open house con fecha, horario, division y documentos adjuntos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo evento</CardTitle>
          <CardDescription>
            Completa los datos para publicar un evento en el calendario.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createEvent} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Nombre del evento</Label>
              <Input id="name" name="name" placeholder="Open House 2024" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Descripcion</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Presentacion de campus, recorrido y charla con directivos."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="starts_at">Inicio</Label>
              <Input id="starts_at" name="starts_at" type="datetime-local" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ends_at">Fin</Label>
              <Input id="ends_at" name="ends_at" type="datetime-local" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Divisiones</Label>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {DIVISIONS.map((division) => (
                  <label
                    key={division.value}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="divisions"
                      value={division.value}
                      className="h-4 w-4 rounded border border-input"
                    />
                    {division.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Selecciona al menos una division.
              </p>
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <input
                id="requires_registration"
                name="requires_registration"
                type="checkbox"
                className="h-4 w-4 rounded border border-input"
              />
              <Label htmlFor="requires_registration">Requiere registro</Label>
            </div>
            <div className="flex items-end gap-2 md:col-span-2">
              <Button type="submit">Guardar evento</Button>
              <Button type="reset" variant="outline">
                Limpiar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eventos programados</CardTitle>
          <CardDescription>Eventos proximos y documentos adjuntos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!events?.length ? (
            <div className="flex h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              Aun no hay eventos creados.
            </div>
          ) : (
            events.map((event) => {
              const divisionLabel = (event.divisions || [])
                .map(
                  (division: string) =>
                    DIVISIONS.find((item) => item.value === division)?.label ||
                    division
                )
                .join(" / ");
              const eventDocs = documentsByEvent.get(event.id) || [];

              return (
                <div
                  key={event.id}
                  className="rounded-lg border p-4 space-y-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-semibold">{event.name}</h3>
                      <span className="text-xs text-muted-foreground">
                        {divisionLabel || "Sin division"}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground">
                        {event.description}
                      </p>
                    )}
                    <div className="text-sm">
                      <span className="font-medium">Inicio:</span>{" "}
                      {formatDateTime(event.starts_at)}
                      {event.ends_at && (
                        <>
                          {" "}• <span className="font-medium">Fin:</span>{" "}
                          {formatDateTime(event.ends_at)}
                        </>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {event.requires_registration
                        ? "Requiere registro"
                        : "Sin registro previo"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Adjuntar documento o foto</p>
                    <form
                      action={uploadEventDocument}
                      className="grid gap-3 md:grid-cols-3"
                    >
                      <input type="hidden" name="event_id" value={event.id} />
                      <div className="space-y-1">
                        <Label htmlFor={`document_type_${event.id}`}>Tipo</Label>
                        <Input
                          id={`document_type_${event.id}`}
                          name="document_type"
                          placeholder="Foto, brochure, agenda"
                          required
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <Label htmlFor={`file_${event.id}`}>Archivo</Label>
                        <Input
                          id={`file_${event.id}`}
                          name="file"
                          type="file"
                          required
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Button type="submit">Subir documento</Button>
                      </div>
                    </form>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Documentos cargados</p>
                    {!eventDocs.length ? (
                      <p className="text-sm text-muted-foreground">
                        Sin documentos adjuntos.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {eventDocs.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                          >
                            <div className="space-y-1">
                              <div className="font-medium">{doc.file_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {doc.document_type} • {doc.mime_type}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(doc.created_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Registrar asistencia</p>
                    <form
                      action={registerEventAttendance}
                      className="grid gap-3 md:grid-cols-3"
                    >
                      <input type="hidden" name="event_id" value={event.id} />
                      <div className="space-y-1 md:col-span-2">
                        <Label htmlFor={`lead_${event.id}`}>Lead ID</Label>
                        <Input
                          id={`lead_${event.id}`}
                          name="lead_id"
                          placeholder="UUID del lead"
                          required
                        />
                      </div>
                      <div className="flex items-end">
                        <Button type="submit">Registrar</Button>
                      </div>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
