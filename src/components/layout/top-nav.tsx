
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserNav } from "@/src/components/layout/user-nav"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/src/components/ui/breadcrumb"
import { Fragment } from "react"

interface TopNavProps {
    organizationName: string
    organizationLogo?: string | null
}

export function TopNav({ organizationName, organizationLogo }: TopNavProps) {
    const pathname = usePathname()

    // Generate breadcrumbs from pathname
    // e.g. /dashboard/crm/leads -> Home > CRM > Leads
    const segments = pathname.split('/').filter(Boolean)

    // Map segments to readable titles (simple capitalization for now)
    const breadcrumbs = segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join('/')}`
        const title = segment.charAt(0).toUpperCase() + segment.slice(1)
        const isLast = index === segments.length - 1

        return { href, title, isLast }
    })

    return (
        <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
            <div className="flex items-center gap-4">
                {/* Logo and Org Name */}
                <div className="flex items-center gap-2 font-semibold">
                    {organizationLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={organizationLogo} alt={organizationName} className="h-6 w-6 object-contain" />
                    ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs">
                            {organizationName.charAt(0)}
                        </div>
                    )}
                    <span className="hidden md:inline-block">{organizationName}</span>
                </div>

                {/* Separator */}
                <div className="h-4 w-[1px] bg-border mx-2" />

                {/* Breadcrumbs */}
                <Breadcrumb className="hidden md:flex">
                    <BreadcrumbList>
                        {breadcrumbs.map((crumb) => (
                            <Fragment key={crumb.href}>
                                <BreadcrumbItem>
                                    {crumb.isLast ? (
                                        <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink asChild>
                                            <Link href={crumb.href}>{crumb.title}</Link>
                                        </BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                                {!crumb.isLast && <BreadcrumbSeparator />}
                            </Fragment>
                        ))}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
                <UserNav />
            </div>
        </header>
    )
}
