"use client"

import { useActionState, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, MessageSquare, Phone, Search, MoreHorizontal, Eye, ExternalLink, Plus } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Separator } from "@/src/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/src/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table"
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar"
import { cn } from "@/src/lib/utils"
import { LeadFollowUpForm } from "@/src/components/crm/lead-follow-up-form"
import {
  STATUS_STYLES,
  buildDefaultFollowUp,
  formatRelativeDate,
  getLeadSummary,
  getSessions,
  statusLabel,
} from "@/src/lib/lead"
import type {
  CreateLeadActionState,
  FollowUpActionState,
  SendLeadFollowUpAction,
} from "@/src/app/(dashboard)/crm/leads/actions"
import { createLeadManual } from "@/src/app/(dashboard)/crm/leads/actions"
import type { LeadRecord } from "@/src/types/lead"

type LeadsTableProps = {
  leads: LeadRecord[]
  sendFollowUpAction: SendLeadFollowUpAction
}

export function LeadsTable({ leads, sendFollowUpAction }: LeadsTableProps) {
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [search, setSearch] = useState("")
  const router = useRouter()

  const filteredLeads = useMemo(() => {
    const term = search.toLowerCase().trim()
    if (!term) return leads
    return leads.filter((lead) => {
      const haystack = [
        lead.student_name,
        lead.contact_full_name,
        lead.contact_email,
        lead.contact_phone,
        lead.grade_interest,
        lead.source,
        lead.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [leads, search])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">CRM Leads</h2>
          <p className="text-muted-foreground">
            Gestiona tus prospectos y visualiza su actividad reciente.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar leads..."
              className="pl-8"
            />
          </div>
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo lead
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[250px] min-w-[200px]">Estudiante</TableHead>
                <TableHead className="min-w-[200px]">Contacto</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="min-w-[200px]">Resumen IA</TableHead>
                <TableHead className="w-[120px] text-right">Actualizado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredLeads.length ? (
                filteredLeads.map((lead) => {
                    const sessions = getSessions(lead)
                    const latestActivity =
                    sessions[0]?.last_response_at ||
                    sessions[0]?.updated_at ||
                    lead.updated_at
                    return (
                    <TableRow 
                        key={lead.id} 
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => router.push(`/crm/leads/${lead.id}`)}
                    >
                        <TableCell className="align-top">
                        <div className="flex items-start gap-3">
                            <Avatar className="h-9 w-9 border bg-muted/30 mt-0.5">
                            <AvatarFallback className="text-xs font-semibold text-primary">
                                {(lead.student_name || "NA")
                                .substring(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                            <div className="font-semibold leading-none">
                                {lead.student_name || "Sin nombre"}
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-1">
                                {lead.grade_interest || "Sin grado"}
                                {lead.current_school ? ` • ${lead.current_school}` : ""}
                            </div>
                            <Badge variant="secondary" className="mt-1 h-5 text-[10px] px-1.5 font-normal tracking-wide bg-secondary/50 text-secondary-foreground border-0">
                                {lead.source || "N/A"}
                            </Badge>
                            </div>
                        </div>
                        </TableCell>
                        <TableCell className="align-top">
                        <div className="space-y-1.5">
                            <div className="text-sm font-medium">
                            {lead.contact_full_name ||
                                lead.contact_first_name ||
                                "Contacto"}
                            </div>
                            <div className="space-y-0.5">
                                {lead.contact_email && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Mail className="h-3 w-3 shrink-0" />
                                    <span className="truncate max-w-[180px]" title={lead.contact_email}>
                                        {lead.contact_email}
                                    </span>
                                    </div>
                                )}
                                {lead.contact_phone && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Phone className="h-3 w-3 shrink-0" />
                                    <span>{lead.contact_phone}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        </TableCell>
                        <TableCell className="align-top">
                        <Badge
                            variant="outline"
                            className={cn(
                            "capitalize font-medium shadow-none",
                            STATUS_STYLES[lead.status] || "bg-muted text-foreground"
                            )}
                        >
                            {statusLabel(lead.status)}
                        </Badge>
                        </TableCell>
                        <TableCell className="align-top">
                        <div className="space-y-2">
                             <div className="text-xs leading-relaxed text-muted-foreground line-clamp-2" title={getLeadSummary(lead)}>
                                {getLeadSummary(lead)}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/30 w-fit px-2 py-1 rounded-full">
                                <MessageSquare className="h-3 w-3" />
                                <span>
                                {sessions.length} sesión{sessions.length === 1 ? "" : "es"}
                                </span>
                            </div>
                        </div>
                        </TableCell>
                        <TableCell className="align-top text-right text-xs text-muted-foreground tabular-nums">
                            {formatRelativeDate(latestActivity)}
                        </TableCell>
                        <TableCell className="align-top text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                             <DropdownMenuItem onClick={() => setSelectedLead(lead)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Vista rápida
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href={`/crm/leads/${lead.id}`} className="cursor-pointer">
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Ver detalle completo
                                </Link>
                            </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    )
                })
                ) : (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                    No se encontraron leads.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
      </div>

      <LeadDetailsSheet
        key={selectedLead?.id || "lead-sheet"}
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        sendFollowUpAction={sendFollowUpAction}
      />

      <CreateLeadSheet
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={(leadId) => router.push(`/crm/leads/${leadId}`)}
      />
    </div>
  )
}

type LeadDetailsSheetProps = {
  lead: LeadRecord | null
  onClose: () => void
  sendFollowUpAction: SendLeadFollowUpAction
}

function LeadDetailsSheet({
  lead,
  onClose,
  sendFollowUpAction,
}: LeadDetailsSheetProps) {
  const [state, formAction, pending] = useActionState<
    FollowUpActionState,
    FormData
  >(sendFollowUpAction, {})

  if (!lead) return null

  const sessions = getSessions(lead)
  const summary = getLeadSummary(lead)
  const defaultMessage = buildDefaultFollowUp(lead)

  return (
    <Sheet open={Boolean(lead)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-2">
          <SheetTitle>{lead.student_name || "Lead"}</SheetTitle>
          <SheetDescription>
            Detalles del lead, resumen del chat y seguimiento por correo.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-6">
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "capitalize border",
                  STATUS_STYLES[lead.status] || "bg-muted text-foreground"
                )}
              >
                {statusLabel(lead.status)}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {lead.source || "N/A"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Estudiante</p>
                <p className="font-medium">{lead.student_name || "Sin nombre"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Grado</p>
                <p className="font-medium">
                  {lead.grade_interest || "No especificado"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Contacto</p>
                <p className="font-medium">
                  {lead.contact_full_name ||
                    lead.contact_first_name ||
                    "Sin contacto"}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {lead.contact_email || "Sin correo"}
                </p>
                {lead.contact_phone ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {lead.contact_phone}
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-muted-foreground">Escuela actual / ciclo</p>
                <p className="font-medium">
                  {lead.current_school || "N/A"}
                  {lead.school_year ? ` • ${lead.school_year}` : ""}
                </p>
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Sesiones de chat</h4>
              <Badge variant="outline">
                {sessions.length} sesión{sessions.length === 1 ? "" : "es"}
              </Badge>
            </div>
            {sessions.length ? (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="border rounded-lg p-3 bg-muted/30 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="capitalize">
                        {statusLabel(session.status || "activa")}
                      </span>
                      <span>{formatRelativeDate(session.updated_at)}</span>
                    </div>
                    <p className="text-sm leading-relaxed">
                      {session.summary || "Sin resumen capturado."}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay sesiones registradas todavía.
              </p>
            )}
            <div className="rounded-lg border p-3 bg-muted/20">
              <p className="text-xs text-muted-foreground mb-1">
                Resumen consolidado
              </p>
              <p className="text-sm leading-relaxed">{summary}</p>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Enviar follow up</h4>
            <LeadFollowUpForm
              leadId={lead.id}
              defaultSubject={`Seguimiento de admisiones - ${lead.student_name || "Lead"
                }`}
              defaultMessage={defaultMessage}
              sendFollowUpAction={sendFollowUpAction}
            />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}

type CreateLeadSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (leadId: string) => void
}

function CreateLeadSheet({ open, onOpenChange, onCreated }: CreateLeadSheetProps) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState<
    CreateLeadActionState,
    FormData
  >(createLeadManual, {})

  useEffect(() => {
    if (state.error) {
      toast.error(state.error)
    }
    if (state.success && state.leadId) {
      toast.success(state.success)
      onOpenChange(false)
      router.refresh()
      onCreated(state.leadId)
    }
  }, [state, onCreated, onOpenChange, router])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-2">
          <SheetTitle>Nuevo lead</SheetTitle>
          <SheetDescription>
            Captura los datos principales para crear un lead manualmente.
          </SheetDescription>
        </SheetHeader>

        <form action={formAction} className="py-4 space-y-6">
          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Estudiante</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="student_first_name">Nombre</Label>
                <Input id="student_first_name" name="student_first_name" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="student_middle_name">Segundo nombre</Label>
                <Input id="student_middle_name" name="student_middle_name" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="student_last_name_paternal">Apellido paterno</Label>
                <Input
                  id="student_last_name_paternal"
                  name="student_last_name_paternal"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="student_last_name_maternal">Apellido materno</Label>
                <Input id="student_last_name_maternal" name="student_last_name_maternal" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="grade_interest">Grado de interés</Label>
                <Input id="grade_interest" name="grade_interest" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="school_year">Ciclo escolar</Label>
                <Input id="school_year" name="school_year" placeholder="2025-2026" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="current_school">Escuela actual</Label>
                <Input id="current_school" name="current_school" />
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Contacto</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="contact_first_name">Nombre</Label>
                <Input id="contact_first_name" name="contact_first_name" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact_middle_name">Segundo nombre</Label>
                <Input id="contact_middle_name" name="contact_middle_name" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact_last_name_paternal">Apellido paterno</Label>
                <Input
                  id="contact_last_name_paternal"
                  name="contact_last_name_paternal"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact_last_name_maternal">Apellido materno</Label>
                <Input id="contact_last_name_maternal" name="contact_last_name_maternal" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact_phone">Teléfono</Label>
                <Input id="contact_phone" name="contact_phone" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact_email">Email</Label>
                <Input id="contact_email" name="contact_email" type="email" />
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              Guardar lead
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
