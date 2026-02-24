"use client";

import { format } from "date-fns";
import { useState } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { useCalendarStore } from "@/src/store/calendar-store";
import { CreateEventDialog } from "./create-event-dialog";
import { SchedulePopover } from "./schedule-popover";


export function CalendarHeader() {
  const { currentWeekStart, events } = useCalendarStore();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayEvents = events.filter(e => e.date === todayStr);

  const meetingsCount = todayEvents.filter(
    (e) =>
      e.title.toLowerCase().includes("call") ||
      e.title.toLowerCase().includes("meeting")
  ).length;
  const eventsCount = todayEvents.length - meetingsCount;
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <>
      <CreateEventDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      <div className="border-b border-border bg-background">
        <div className="px-3 md:px-6 py-2.5 md:py-3">
          <div className="flex items-center justify-between gap-2 md:gap-3 flex-nowrap">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <h1 className="text-sm md:text-base lg:text-lg font-semibold text-foreground truncate mb-0 md:mb-1">
                  {format(currentWeekStart, "MMMM dd, yyyy")}
                </h1>
                <p className="hidden md:block text-xs text-muted-foreground">
                  You have {meetingsCount} meeting
                  {meetingsCount !== 1 ? "s" : ""} and {eventsCount} event
                  {eventsCount !== 1 ? "s" : ""} today 🗓️
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 md:gap-1.5 lg:gap-2 shrink-0">

              <SchedulePopover>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7 md:size-8 shrink-0 md:w-auto md:px-2 md:gap-1.5"
                >
                  <CalendarIcon className="size-4" />
                  <span className="hidden lg:inline">Schedule</span>
                </Button>
              </SchedulePopover>

              <Button
                size="icon"
                className="size-7 md:size-8 shrink-0 md:w-auto md:px-2 md:gap-1.5 bg-foreground text-background hover:bg-foreground/90"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="size-4" />
                <span className="hidden lg:inline">Create Event</span>
              </Button>


            </div>
          </div>
        </div>
      </div>
    </>
  );
}
