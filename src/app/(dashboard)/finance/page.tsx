"use client"

import { StatsCards } from "@/src/components/dashboard/stats-cards"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Download, Plus } from "lucide-react"

export default function FinancePage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                     <h2 className="text-2xl font-bold tracking-tight">Finance</h2>
                     <p className="text-muted-foreground">Overview of revenue, payments, and invoices.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Export Report
                    </Button>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Record Payment
                    </Button>
                </div>
            </div>

            <StatsCards />

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                        <CardDescription>Latest financial activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] flex items-center justify-center border rounded-md border-dashed text-muted-foreground text-sm">
                            No transactions found.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
