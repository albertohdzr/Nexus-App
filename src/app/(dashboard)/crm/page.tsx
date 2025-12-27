"use client"

import { DashboardHeader } from "@/src/components/dashboard/header"
import { navigationModules } from "@/src/config/navigation"
import Link from "next/link"
import { ArrowUpRight, Calendar, Users, FileText, Settings } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/src/components/ui/card"
import { StatsCards } from "@/src/components/dashboard/stats-cards"

export default function CRMPage() {
    return (
        <div className="space-y-6">
            <div className="border-b pb-4">
               <h2 className="text-2xl font-bold tracking-tight">CRM Dashboard</h2>
               <p className="text-muted-foreground">Central hub for managing your customer relationships.</p>
            </div>

            <StatsCards />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Link href="/crm/leads" className="block group">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Leads</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Manage Leads</div>
                            <p className="text-xs text-muted-foreground">View and follow up with prospects.</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/crm/appointments" className="block group">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Appointments</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Schedule</div>
                            <p className="text-xs text-muted-foreground">Manage availability and bookings.</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/crm/templates" className="block group">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Templates</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Email Templates</div>
                            <p className="text-xs text-muted-foreground">Configure automated responses.</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>

             <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Latest updates from your team.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="flex items-center justify-center p-8 border rounded-lg border-dashed text-muted-foreground">
                            No recent activity found.
                         </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Common tasks.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        <Button variant="outline" className="justify-start">
                             <Users className="mr-2 h-4 w-4" />
                             Add New Lead
                        </Button>
                         <Button variant="outline" className="justify-start">
                             <Calendar className="mr-2 h-4 w-4" />
                             Block Calendar Date
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
