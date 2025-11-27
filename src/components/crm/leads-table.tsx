"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/src/components/ui/table"
import { Button } from "@/src/components/ui/button"
import { Checkbox } from "@/src/components/ui/checkbox"
import { Badge } from "@/src/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar"
import { Input } from "@/src/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"
import {
    LayoutList,
    LayoutGrid,
    Filter,
    Download,
    Plus,
    Phone,
    MoreHorizontal,
    Facebook,
    Linkedin,
    Instagram,
    Globe
} from "lucide-react"

// Mock Data
const data: Lead[] = [
    {
        id: "1",
        name: "Jenny Wilson",
        avatar: "https://github.com/shadcn.png",
        subject: "Redesign mobile app",
        activity: "Sep 12 at 09:10 AM",
        status: "Cold Lead",
        created: "1 month ago",
        source: "Dribbble",
        sourceIcon: "dribbble"
    },
    {
        id: "2",
        name: "David Lane",
        avatar: "https://github.com/shadcn.png",
        subject: "Full Website Design",
        activity: "Sep 12 at 10:15 AM",
        status: "Hot Lead",
        created: "2 months ago",
        source: "Instagram",
        sourceIcon: "instagram"
    },
    {
        id: "3",
        name: "Michael Smith",
        avatar: "https://github.com/shadcn.png",
        subject: "Dashboard & Admin Panel",
        activity: "Sep 12 at 11:20 AM",
        status: "Warm Lead",
        created: "3 months ago",
        source: "Google",
        sourceIcon: "google"
    },
    {
        id: "4",
        name: "Chris Lee",
        avatar: "https://github.com/shadcn.png",
        subject: "Landing Page Design",
        activity: "Sep 12 at 12:25 PM",
        status: "Cold Lead",
        created: "4 months ago",
        source: "Facebook",
        sourceIcon: "facebook"
    },
    {
        id: "5",
        name: "Emily Johnson",
        avatar: "https://github.com/shadcn.png",
        subject: "Branding & Identity",
        activity: "Sep 12 at 01:30 PM",
        status: "Hot Lead",
        created: "5 months ago",
        source: "Dribbble",
        sourceIcon: "dribbble"
    },
    {
        id: "6",
        name: "Steven Davis",
        avatar: "https://github.com/shadcn.png",
        subject: "Marketing Website Design",
        activity: "Sep 12 at 02:35 PM",
        status: "Warm Lead",
        created: "6 months ago",
        source: "Google",
        sourceIcon: "google"
    },
    {
        id: "7",
        name: "Alex Jaka",
        avatar: "https://github.com/shadcn.png",
        subject: "Mobile Game UI",
        activity: "Sep 12 at 03:40 PM",
        status: "Cold Lead",
        created: "7 months ago",
        source: "Dribbble",
        sourceIcon: "dribbble"
    },
    {
        id: "8",
        name: "James Brown",
        avatar: "https://github.com/shadcn.png",
        subject: "SaaS Product Design",
        activity: "Sep 12 at 04:45 PM",
        status: "Hot Lead",
        created: "8 months ago",
        source: "Facebook",
        sourceIcon: "facebook"
    },
    {
        id: "9",
        name: "James kaka",
        avatar: "https://github.com/shadcn.png",
        subject: "Portfolio Website",
        activity: "Sep 12 at 05:50 PM",
        status: "Warm Lead",
        created: "9 months ago",
        source: "LinkedIn",
        sourceIcon: "linkedin"
    },
    {
        id: "10",
        name: "Thomas hodai",
        avatar: "https://github.com/shadcn.png",
        subject: "Onboarding Flow Design",
        activity: "Sep 13 at 09:55 AM",
        status: "Cold Lead",
        created: "10 months ago",
        source: "Instagram",
        sourceIcon: "instagram"
    },
    {
        id: "11",
        name: "Linda Martinez",
        avatar: "https://github.com/shadcn.png",
        subject: "Chat & Messaging App UI",
        activity: "Sep 13 at 11:00 AM",
        status: "Hot Lead",
        created: "11 months ago",
        source: "LinkedIn",
        sourceIcon: "linkedin"
    },
]

export type Lead = {
    id: string
    name: string
    avatar: string
    subject: string
    activity: string
    status: "Cold Lead" | "Hot Lead" | "Warm Lead"
    created: string
    source: string
    sourceIcon: string
}

export const columns: ColumnDef<Lead>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "name",
        header: "Leads",
        cell: ({ row }) => (
            <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={row.original.avatar} alt={row.original.name} />
                    <AvatarFallback>{row.original.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{row.original.name}</span>
            </div>
        ),
    },
    {
        accessorKey: "subject",
        header: "Subject",
        cell: ({ row }) => <div className="text-muted-foreground">{row.original.subject}</div>,
    },
    {
        accessorKey: "activity",
        header: "Activities",
        cell: ({ row }) => (
            <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{row.original.activity}</span>
            </div>
        ),
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.original.status
            let variant = "default"
            let className = ""

            if (status === "Cold Lead") {
                className = "bg-blue-100 text-blue-700 hover:bg-blue-100/80 border-none shadow-none"
            } else if (status === "Hot Lead") {
                className = "bg-red-100 text-red-700 hover:bg-red-100/80 border-none shadow-none"
            } else if (status === "Warm Lead") {
                className = "bg-yellow-100 text-yellow-700 hover:bg-yellow-100/80 border-none shadow-none"
            }

            return (
                <Badge variant="outline" className={className}>
                    {status}
                </Badge>
            )
        },
    },
    {
        accessorKey: "created",
        header: "Created",
        cell: ({ row }) => (
            <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-xs">🕒</span>
                <span>{row.original.created}</span>
            </div>
        ),
    },
    {
        accessorKey: "source",
        header: "Sources",
        cell: ({ row }) => {
            const icon = row.original.sourceIcon
            let Icon = Globe
            let color = "text-gray-500"

            if (icon === "facebook") { Icon = Facebook; color = "text-blue-600" }
            else if (icon === "linkedin") { Icon = Linkedin; color = "text-blue-700" }
            else if (icon === "instagram") { Icon = Instagram; color = "text-pink-600" }
            else if (icon === "dribbble") { Icon = Globe; color = "text-pink-500" } // Dribbble icon not in lucide basic set, using Globe
            else if (icon === "google") { Icon = Globe; color = "text-red-500" }

            return (
                <div className="flex items-center gap-2">
                    <Icon className={`h-3 w-3 ${color}`} />
                    <span>{row.original.source}</span>
                </div>
            )
        },
    },
]

export function LeadsTable() {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    })

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
                    <Button variant="ghost" size="sm" className="h-8 bg-background shadow-sm">
                        <LayoutList className="h-4 w-4 mr-2" />
                        List
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground">
                        <LayoutGrid className="h-4 w-4 mr-2" />
                        Grid
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                    </Button>
                    <Button variant="outline" size="sm" className="h-9">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                    <Button size="sm" className="h-9 bg-primary text-primary-foreground hover:bg-primary/90">
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Lead
                    </Button>
                </div>
            </div>

            <div className="rounded-xl border bg-card">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent">
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="h-10 text-xs font-medium">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="h-16"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Show</span>
                    <Button variant="outline" size="sm" className="h-8 w-12 p-0">
                        11
                    </Button>
                    <span>Leads per page</span>
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <span className="sr-only">Go to previous page</span>
                        <ChevronRight className="h-4 w-4 rotate-180" />
                    </Button>
                    <Button variant="default" size="sm" className="h-8 w-8 p-0 bg-primary text-primary-foreground">
                        1
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        2
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        3
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        4
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        5
                    </Button>
                    <span className="text-muted-foreground">...</span>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        16
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <span className="sr-only">Go to next page</span>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

function ChevronRight({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="m9 18 6-6-6-6" />
        </svg>
    )
}
