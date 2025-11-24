import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { navigationModules } from "@/src/config/navigation"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { Button } from "@/src/components/ui/button"

export default function DashboardPage() {
  const stats = [
    { title: "Total Students", value: "2,543", change: "+12%", changeType: "positive" },
    { title: "Active Applications", value: "127", change: "+23%", changeType: "positive" },
    { title: "Revenue (MTD)", value: "$45,231", change: "+8%", changeType: "positive" },
    { title: "Pending Tasks", value: "23", change: "-5%", changeType: "negative" },
  ]

  return (
    <div className="px-4 lg:px-6">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your school today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={`text-xs ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change} from last month
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Access Modules */}
        <div>
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
    </div>
  )
}
