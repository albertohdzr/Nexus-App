"use client"


import { LeadsChart } from "@/src/components/dashboard/leads-chart"
import { StatsCards } from "@/src/components/dashboard/stats-cards"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Plus } from "lucide-react"

export default function AdmissionsPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Admissions</h2>
                    <p className="text-muted-foreground">Manage applications, cycles, and student intake.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New Application
                    </Button>
                </div>
            </div>

            <StatsCards />

            <div className="grid gap-6 md:grid-cols-1">
                 <LeadsChart />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                 <Card>
                    <CardHeader>
                        <CardTitle>Active Cycles</CardTitle>
                        <CardDescription>Current admission periods</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">No active cycles configured.</p>
                    </CardContent>
                 </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Pending Documents</CardTitle>
                         <CardDescription>Files awaiting review</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <p className="text-sm text-muted-foreground">All documents reviewed.</p>
                    </CardContent>
                 </Card>
            </div>
        </div>
    )
}
