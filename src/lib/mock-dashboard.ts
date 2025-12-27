export type LeadType = "cold" | "warm";
export type LeadStatus = "new" | "contacted" | "qualified" | "closed" | "lost";
export type LeadSource =
    | "linkedin"
    | "google"
    | "referral"
    | "website"
    | "cold-call";

export interface Lead {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    type: LeadType;
    followUp: string;
    status: LeadStatus;
    score: number;
    source: LeadSource;
    website?: string;
}

export const dashboardStats = {
    generatedRevenue: { value: "$45,231.89", change: 20.1 },
    signedClients: { value: "2,350", change: -4.5 },
    totalLeads: { value: "12,234", change: 15.2 },
    teamMembers: { value: "24", activeCount: 18 },
};

export const leadsChartDataWeek = [
    { date: "Mon", line1: 400, line2: 240, line3: 100, line4: 50 },
    { date: "Tue", line1: 300, line2: 139, line3: 200, line4: 100 },
    { date: "Wed", line1: 200, line2: 980, line3: 150, line4: 200 },
    { date: "Thu", line1: 278, line2: 390, line3: 300, line4: 250 },
    { date: "Fri", line1: 189, line2: 480, line3: 200, line4: 300 },
    { date: "Sat", line1: 239, line2: 380, line3: 250, line4: 400 },
    { date: "Sun", line1: 349, line2: 430, line3: 300, line4: 100 },
];

export const leadsChartDataMonth = Array.from({ length: 30 }, (_, i) => ({
    date: `Day ${i + 1}`,
    line1: Math.floor(Math.random() * 500) + 100,
    line2: Math.floor(Math.random() * 500) + 100,
    line3: Math.floor(Math.random() * 500) + 100,
    line4: Math.floor(Math.random() * 500) + 100,
}));

export const leadsChartDataQuarter = Array.from({ length: 90 }, (_, i) => ({
    date: `D${i + 1}`,
    line1: Math.floor(Math.random() * 800) + 100,
    line2: Math.floor(Math.random() * 800) + 100,
    line3: Math.floor(Math.random() * 800) + 100,
    line4: Math.floor(Math.random() * 800) + 100,
}));

export const topPerformers = [
    {
        id: "1",
        name: "Alice Johnson",
        score: 95,
        avatar: "/avatars/01.png",
    },
    {
        id: "2",
        name: "Bob Smith",
        score: 88,
        avatar: "/avatars/02.png",
    },
    {
        id: "3",
        name: "Carol Williams",
        score: 82,
        avatar: "/avatars/03.png",
    },
    {
        id: "4",
        name: "David Brown",
        score: 75,
        avatar: "/avatars/04.png",
    },
    {
        id: "5",
        name: "Eva Davis",
        score: 70,
        avatar: "/avatars/05.png",
    },
];

export const leads: Lead[] = [
    {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        type: "warm",
        followUp: "Tomorrow",
        status: "new",
        score: 85,
        source: "linkedin",
        website: "example.com",
    },
    {
        id: "2",
        name: "Jane Smith",
        email: "jane@example.com",
        type: "cold",
        followUp: "Next Week",
        status: "contacted",
        score: 45,
        source: "google",
        website: "smith.inc",
    },
    {
        id: "3",
        name: "Mike Johnson",
        email: "mike@example.com",
        type: "warm",
        followUp: "Today",
        status: "qualified",
        score: 92,
        source: "referral",
        website: "mike-designs.com",
    },
    {
        id: "4",
        name: "Sarah Williams",
        email: "sarah@example.com",
        type: "cold",
        followUp: "In 3 Days",
        status: "lost",
        score: 20,
        source: "cold-call",
    },
    {
        id: "5",
        name: "Chris Evans",
        email: "chris@example.com",
        type: "warm",
        followUp: "Pending",
        status: "closed",
        score: 100,
        source: "website",
        website: "evans.llc",
    },
    // Generate some more dummy data to fill the table
    ...Array.from({ length: 15 }, (_, i) => ({
        id: `${i + 6}`,
        name: `User ${i + 6}`,
        email: `user${i + 6}@example.com`,
        type: Math.random() > 0.5 ? "warm" : "cold" as LeadType,
        followUp: "Next Month",
        status: [
            "new",
            "contacted",
            "qualified",
            "closed",
            "lost",
        ][Math.floor(Math.random() * 5)] as LeadStatus,
        score: Math.floor(Math.random() * 100),
        source: [
            "linkedin",
            "google",
            "referral",
            "website",
            "cold-call",
        ][Math.floor(Math.random() * 5)] as LeadSource,
        website: `user${i + 6}.com`,
    })),
];
