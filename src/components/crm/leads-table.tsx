"use client"

import { useActionState, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Upload,
  Snowflake,
  Flame,
  Check,
  X,
  User,
  Mail,
  Hand,
  Activity,
  Globe,
  ArrowUp,
  ArrowDown,
  Linkedin,
  Phone,
  Users2,
  Zap,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Target,
  MoreHorizontal,
  Eye,
  ExternalLink,
  Plus
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Checkbox } from "@/src/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/src/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar"
import { Badge } from "@/src/components/ui/badge"
import { Label } from "@/src/components/ui/label"
import { Separator } from "@/src/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/src/components/ui/sheet"
import { LeadFollowUpForm } from "@/src/components/crm/lead-follow-up-form"
import {
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

// --- Badges from Dashboard Template ---

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase()
  if (s === "closed" || s === "enrolled") {
    return (
      <div
        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-500/40 w-fit outline-none"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.06) 30%, rgba(16, 185, 129, 0) 100%)",
        }}
      >
        <Check className="size-3.5 text-emerald-400" />
        <span className="text-sm font-medium text-emerald-400 capitalize">{statusLabel(status)}</span>
      </div>
    )
  }
  
  if (s === "lost" || s === "archived") {
    return (
      <div
        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-amber-500/40 w-fit outline-none"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.06) 30%, rgba(245, 158, 11, 0) 100%)",
        }}
      >
        <X className="size-3.5 text-amber-400" />
        <span className="text-sm font-medium text-amber-400 capitalize">{statusLabel(status)}</span>
      </div>
    )
  }

  if (s === "new") {
      return (
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-blue-500/40 w-fit outline-none"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.06) 30%, rgba(59, 130, 246, 0) 100%)",
          }}
        >
          <div className="size-1.5 rounded-full bg-blue-500" />
          <span className="text-sm font-medium text-blue-500 capitalize">{statusLabel(status)}</span>
        </div>
      )
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border w-fit">
        <span className="text-sm font-medium capitalize text-muted-foreground">{statusLabel(status)}</span>
    </div>
  )
}

function SourceBadge({ source }: { source: string }) {
  const s = source?.toLowerCase() || "direct"
  
  if (s.includes("linkedin")) {
    return (
       <div className="flex items-center gap-1.5 px-2 py-1 rounded-md w-fit bg-blue-500/10">
          <Linkedin className="size-3 text-blue-400" />
          <span className="text-xs font-medium text-blue-400">LinkedIn</span>
       </div>
    )
  }
  if (s.includes("google")) {
    return (
       <div className="flex items-center gap-1.5 px-2 py-1 rounded-md w-fit bg-red-500/10">
          <Search className="size-3 text-red-400" />
          <span className="text-xs font-medium text-red-400">Google</span>
       </div>
    )
  }
  if (s.includes("referral")) {
    return (
       <div className="flex items-center gap-1.5 px-2 py-1 rounded-md w-fit bg-violet-500/10">
          <Users2 className="size-3 text-violet-400" />
          <span className="text-xs font-medium text-violet-400">Referral</span>
       </div>
    )
  }
  if (s.includes("website")) {
    return (
       <div className="flex items-center gap-1.5 px-2 py-1 rounded-md w-fit bg-cyan-500/10">
          <Globe className="size-3 text-cyan-400" />
          <span className="text-xs font-medium text-cyan-400">Website</span>
       </div>
    )
  }
  
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md w-fit bg-muted/50">
       <span className="text-xs font-medium text-muted-foreground capitalize">{s}</span>
    </div>
  )
}

// --- Main Table Component ---

type SortField = "name" | "email" | "date" | "status"
type SortOrder = "asc" | "desc"

function getSortIcon(
  sortField: SortField,
  sortOrder: SortOrder,
  field: SortField
) {
  if (sortField !== field) return <ArrowUpDown className="size-3" />
  return sortOrder === "asc" ? (
    <ArrowUp className="size-3" />
  ) : (
    <ArrowDown className="size-3" />
  )
}

type LeadsTableProps = {
  leads: LeadRecord[]
  sendFollowUpAction: SendLeadFollowUpAction
}

export function LeadsTable({ leads, sendFollowUpAction }: LeadsTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | "all">("all")
  
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Sheet states
  const [selectedLeadForSheet, setSelectedLeadForSheet] = useState<LeadRecord | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const router = useRouter()

  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
  }

  const filteredAndSortedLeads = useMemo(() => {
    const term = searchQuery.toLowerCase().trim()
    let result = leads

    // Filter
    if (term || statusFilter !== "all") {
       result = result.filter((lead) => {
         const matchesSearch = !term || [
            lead.student_name,
            lead.contact_full_name, 
            lead.contact_email,
            lead.contact_phone
         ].filter(Boolean).join(" ").toLowerCase().includes(term)

         const matchesStatus = statusFilter === "all" || lead.status === statusFilter

         return matchesSearch && matchesStatus
       })
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "name":
          comparison = (a.student_name || "").localeCompare(b.student_name || "")
          break
        case "email":
          comparison = (a.contact_email || "").localeCompare(b.contact_email || "")
          break
        case "date":
           // Default is desc for date often
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case "status":
          comparison = (a.status || "").localeCompare(b.status || "")
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return result
  }, [leads, searchQuery, statusFilter, sortField, sortOrder])

  const totalPages = Math.ceil(filteredAndSortedLeads.length / itemsPerPage)
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedLeads.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedLeads, currentPage, itemsPerPage])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const toggleSelectAll = () => {
    if (selectedLeads.length === paginatedLeads.length) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(paginatedLeads.map((lead) => lead.id))
    }
  }

  const toggleSelectLead = (id: string) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    setSelectedLeads([])
  }

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value))
    setCurrentPage(1)
    setSelectedLeads([])
  }

  const hasActiveFilters = searchQuery !== "" || statusFilter !== "all"

  return (
    <div className="space-y-4">
        {/* Header Section from Dashboard but adapted for Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
            <div>
                <h3 className="font-semibold text-xl tracking-tight">Lead Management</h3>
                <p className="text-sm text-muted-foreground">Manage your prospects and view recent activity.</p>
            </div>
            <div className="flex items-center gap-2">
                 <Button size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1.5 shadow-sm">
                    <Plus className="size-3.5" />
                    <span className="hidden sm:inline">New Lead</span>
                </Button>
            </div>
        </div>

      <div className="bg-card text-card-foreground rounded-xl border overflow-hidden shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3.5 border-b">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-full sm:w-[250px] text-sm bg-muted/50 border-border/50"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 bg-muted/50 border-border/50"
              >
                <SlidersHorizontal className="size-3.5" />
                <span className="hidden xs:inline">Filter</span>
                {hasActiveFilters && (
                  <span className="size-1.5 rounded-full bg-primary" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  Status
                </p>
                <div className="space-y-1">
                  <DropdownMenuCheckboxItem
                    checked={statusFilter === "all"}
                    onCheckedChange={() => setStatusFilter("all")}
                  >
                    All Statuses
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter === "new"}
                    onCheckedChange={() => setStatusFilter("new")}
                  >
                    New
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter === "contacted"}
                    onCheckedChange={() => setStatusFilter("contacted")}
                  >
                    Contacted
                  </DropdownMenuCheckboxItem>
                </div>
              </div>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                  <DropdownMenuItem onSelect={clearFilters}>
                      Clear Filters
                  </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-2">
             <Button size="sm" variant="outline" className="h-8 gap-1.5">
             <Upload className="size-3.5"/>
             <span className="hidden xs:inline">Export</span>
             </Button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="w-[280px]">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={
                      paginatedLeads.length > 0 &&
                      selectedLeads.length === paginatedLeads.length
                    }
                    onCheckedChange={toggleSelectAll}
                    className="border-border/50 bg-background/70"
                  />
                  <button
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={() => toggleSort("name")}
                  >
                    <span>Student / Lead</span>
                    {getSortIcon(sortField, sortOrder, "name")}
                  </button>
                </div>
              </TableHead>
              <TableHead className="min-w-[200px]">
                <button
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort("email")}
                >
                  <Mail className="size-3.5" />
                  <span>Contact</span>
                  {getSortIcon(sortField, sortOrder, "email")}
                </button>
              </TableHead>
              <TableHead className="w-[120px]">
                <button
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort("status")}
                >
                  <Activity className="size-3.5" />
                  <span>Status</span>
                  {getSortIcon(sortField, sortOrder, "status")}
                </button>
              </TableHead>
              <TableHead className="w-[140px]">
                 <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Target className="size-3.5" />
                    <span>Source</span>
                 </div>
              </TableHead>
              <TableHead className="w-[150px] text-right">
                <button
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground justify-end w-full"
                    onClick={() => toggleSort("date")}
                >
                    <span>Last Activity</span>
                    {getSortIcon(sortField, sortOrder, "date")}
                </button>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLeads.length > 0 ? (
                paginatedLeads.map((lead) => {
                    const sessions = getSessions(lead)
                    const latestActivity =
                        sessions[0]?.last_response_at ||
                        sessions[0]?.updated_at ||
                        lead.updated_at
                    
                    return (
                    <TableRow key={lead.id} className="border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/crm/leads/${lead.id}`)}
                    >
                        <TableCell>
                        <div className="flex items-center gap-3">
                            <Checkbox
                            checked={selectedLeads.includes(lead.id)}
                            onCheckedChange={() => toggleSelectLead(lead.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="border-border/50 bg-background/70"
                            />
                            <Avatar className="size-8 border shadow-sm">
                            <AvatarFallback className="text-xs font-bold text-primary bg-primary/10">
                                {(lead.student_name || "NA").substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="font-medium text-sm text-foreground">{lead.student_name || "Unknown"}</span>
                                <span className="text-xs text-muted-foreground">{lead.grade_interest || "No grade info"}</span>
                            </div>
                        </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col gap-0.5">
                                <div className="text-sm font-medium">{lead.contact_full_name}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-[180px]">{lead.contact_email}</div>
                            </div>
                        </TableCell>
                        <TableCell>
                            <StatusBadge status={lead.status} />
                        </TableCell>
                        <TableCell>
                            <SourceBadge source={lead.source} />
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                            {formatRelativeDate(latestActivity)}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg">
                                        <MoreHorizontal className="size-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => setSelectedLeadForSheet(lead)}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        Quick View
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href={`/crm/leads/${lead.id}`} className="cursor-pointer">
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Full Details
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
                     <TableCell colSpan={6} className="h-32 text-center">
                         <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                             <div className="p-3 rounded-full bg-muted/50">
                                 <Search className="size-6" />
                             </div>
                             <p className="text-sm font-medium">No leads found</p>
                             <p className="text-xs">Try adjusting your filters or search terms.</p>
                         </div>
                     </TableCell>
                 </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(
              currentPage * itemsPerPage,
              filteredAndSortedLeads.length
            )}{" "}
            of {filteredAndSortedLeads.length} leads
          </span>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Show</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={handleItemsPerPageChange}
            >
              <SelectTrigger className="h-8 w-[70px] bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="hidden sm:inline">per page</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="size-4" />
          </Button>

          <div className="flex items-center gap-1 mx-2">
            <span className="text-sm">
                Page {currentPage} of {Math.max(1, totalPages)}
            </span>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
      </div>

       {/* Sheets for Actions */}
       <LeadDetailsSheet
         key={selectedLeadForSheet?.id || "lead-sheet"}
         lead={selectedLeadForSheet}
         onClose={() => setSelectedLeadForSheet(null)}
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

// --- Sheets Components (Preserved from original CRM implementation) ---

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

  useEffect(() => {
    if (state?.success) {
        toast.success(state.success)
    }
  }, [state])

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
            Lead details, chat summary, and email follow-up.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-6">
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <StatusBadge status={lead.status} />
              <Badge variant="secondary" className="capitalize">
                {lead.source || "N/A"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Student</p>
                <p className="font-medium">{lead.student_name || "No Name"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Grade Interest</p>
                <p className="font-medium">
                  {lead.grade_interest || "Unspecified"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Contact</p>
                <p className="font-medium">
                  {lead.contact_full_name ||
                    lead.contact_first_name ||
                    "No Contact"}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {lead.contact_email || "No Email"}
                </p>
                {lead.contact_phone ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {lead.contact_phone}
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-muted-foreground">Current School / Year</p>
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
              <h4 className="text-sm font-semibold">Chat Sessions</h4>
              <Badge variant="outline">
                {sessions.length} session{sessions.length === 1 ? "" : "s"}
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
                        {statusLabel(session.status || "active")}
                      </span>
                      <span>{formatRelativeDate(session.updated_at)}</span>
                    </div>
                    <p className="text-sm leading-relaxed">
                      {session.summary || "No summary captured."}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No sessions recorded yet.
              </p>
            )}
            <div className="rounded-lg border p-3 bg-muted/20">
              <p className="text-xs text-muted-foreground mb-1">
                Consolidated Summary
              </p>
              <p className="text-sm leading-relaxed">{summary}</p>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Send Follow-up</h4>
            <LeadFollowUpForm
              leadId={lead.id}
              defaultSubject={`Admissions Follow-up - ${lead.student_name || "Lead"}`}
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
          <SheetTitle>New Lead</SheetTitle>
          <SheetDescription>
            Enter primary details to manually create a lead.
          </SheetDescription>
        </SheetHeader>

        <form action={formAction} className="py-4 space-y-6">
          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Student</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="student_first_name">First Name</Label>
                <Input id="student_first_name" name="student_first_name" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="student_middle_name">Middle Name</Label>
                <Input id="student_middle_name" name="student_middle_name" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="student_last_name_paternal">Last Name (Paternal)</Label>
                <Input
                  id="student_last_name_paternal"
                  name="student_last_name_paternal"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="student_last_name_maternal">Last Name (Maternal)</Label>
                <Input id="student_last_name_maternal" name="student_last_name_maternal" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="grade_interest">Grade of Interest</Label>
                <Input id="grade_interest" name="grade_interest" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="school_year">School Year</Label>
                <Input id="school_year" name="school_year" placeholder="2025-2026" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="current_school">Current School</Label>
                <Input id="current_school" name="current_school" />
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Contact</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="contact_first_name">First Name</Label>
                <Input id="contact_first_name" name="contact_first_name" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact_middle_name">Middle Name</Label>
                <Input id="contact_middle_name" name="contact_middle_name" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact_last_name_paternal">Last Name (Paternal)</Label>
                <Input
                  id="contact_last_name_paternal"
                  name="contact_last_name_paternal"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact_last_name_maternal">Last Name (Maternal)</Label>
                <Input id="contact_last_name_maternal" name="contact_last_name_maternal" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact_phone">Phone</Label>
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
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              Save Lead
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
