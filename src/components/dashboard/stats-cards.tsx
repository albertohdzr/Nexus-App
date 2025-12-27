"use client";

import {
  DollarSign,
  Users,
  MessageSquare,
  Building,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/src/lib/utils";

// Placeholder data since we don't have the real dashboardStats yet
const stats = [
  {
    title: "Generated Revenue",
    value: "$45,231.89",
    change: 20.1,
    icon: DollarSign,
    trend: "up" as const,
  },
  {
    title: "Signed Clients",
    value: "2,350",
    change: -4.5,
    icon: Users,
    trend: "down" as const,
  },
  {
    title: "Total Leads",
    value: "12,234",
    change: 15.2,
    icon: MessageSquare,
    trend: "up" as const,
  },
  {
    title: "Team Members",
    value: "24",
    extra: { active: 18 },
    icon: Building,
  },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-card text-card-foreground rounded-xl border p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">{stat.title}</span>
            <stat.icon className="size-4 text-muted-foreground" />
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight">
                {stat.value}
              </span>
            </div>
             <div className="flex items-center gap-2 mt-2">
                {stat.change !== undefined && stat.trend ? (
                  <div
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full",
                      stat.trend === "up" 
                        ? "text-emerald-500 bg-emerald-500/10" 
                        : "text-rose-500 bg-rose-500/10"
                    )}
                  >
                    {stat.trend === "up" ? (
                      <TrendingUp className="size-3" />
                    ) : (
                      <TrendingDown className="size-3" />
                    )}
                    <span>{Math.abs(stat.change)}%</span>
                  </div>
                ) : stat.extra ? (
                  <div className="text-xs text-muted-foreground">
                    <span className="text-foreground font-medium">{stat.extra.active}</span>{" "}
                    active now
                  </div>
                ) : null}
                  {stat.change && (
                       <span className="text-xs text-muted-foreground">from last month</span>
                  )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
