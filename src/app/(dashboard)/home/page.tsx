"use client"

import { DashboardHeader } from "@/src/components/dashboard/header"
import { StatsCards } from "@/src/components/dashboard/stats-cards"
import { LeadsChart } from "@/src/components/dashboard/leads-chart"
import { TopPerformers } from "@/src/components/dashboard/top-performers"
import { LeadsTable } from "@/src/components/dashboard/leads-table"
import { navigationModules } from "@/src/config/navigation"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/src/components/ui/card"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <StatsCards />

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        <LeadsChart />
        <TopPerformers />
      </div>

      <LeadsTable />

      {/* Quick Access Modules (Preserved functionality) */}
      <div className="mt-8 pt-8 border-t">
          <h2 className="text-xl font-semibold tracking-tight mb-4">Quick Access</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {navigationModules.filter(m => m.key !== 'home').map((module) => {
              const Icon = module.icon
              return (
                <Card key={module.key} className="group hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{module.title}</CardTitle>
                          <CardDescription className="text-xs">
                            {module.subNavigation.length} sections
                          </CardDescription>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" asChild className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={module.href}>
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-1">
                      {module.subNavigation.slice(0, 3).map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          • {item.title}
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
      </div>
    </div>
  )
}
