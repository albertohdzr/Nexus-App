import { CalendarProvider } from "@/src/store/calendar-store";
import { CalendarHeader } from "@/src/components/calendar/calendar-header";
import { CalendarControls } from "@/src/components/calendar/calendar-controls";
import { CalendarView } from "@/src/components/calendar/calendar-view";
import { getCalendarEvents, getCalendarLeads, getCalendarSlots } from "./actions";
import { format, subWeeks, addWeeks } from "date-fns";

export default async function CalendarPage() {
    // Fetch initial data: +/- 4 weeks to ensure we have data when navigating
    const today = new Date();
    const start = subWeeks(today, 4);
    const end = addWeeks(today, 4);
    
    // Server Actions to get data
    const [events, leads, slots] = await Promise.all([
        getCalendarEvents(format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd")),
        getCalendarLeads(),
        getCalendarSlots(format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd")),
    ]);

    return (
        <CalendarProvider initialEvents={events} initialLeads={leads} initialSlots={slots}>
             <div className="flex flex-col h-[calc(100vh-200px)] lg:h-full min-h-[600px] w-full bg-card rounded-lg border shadow-sm items-stretch">
                <CalendarHeader />
                <CalendarControls />
                <div className="flex-1 overflow-hidden relative flex flex-col">
                    <CalendarView />
                </div>
            </div>
        </CalendarProvider>
    )
}
