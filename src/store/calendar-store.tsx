"use client";

import React, { createContext, useContext, useState } from "react";
import { startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { CalendarEvent, CalendarLeadOption, CalendarSlotOption } from "@/src/types/calendar";

type FilterType = "all" | "with-meeting" | "without-meeting";
type ParticipantsFilterType = "all" | "with-participants" | "without-participants";

interface CalendarState {
  events: CalendarEvent[];
  leads: CalendarLeadOption[];
  slots: CalendarSlotOption[];
  currentWeekStart: Date;
  searchQuery: string;
  eventTypeFilter: FilterType;
  participantsFilter: ParticipantsFilterType;
}

interface CalendarStore extends CalendarState {
  setSearchQuery: (query: string) => void;
  setEventTypeFilter: (filter: FilterType) => void;
  setParticipantsFilter: (filter: ParticipantsFilterType) => void;
  goToToday: () => void;
  goToDate: (date: Date) => void;
  goToNextWeek: () => void;
  goToPreviousWeek: () => void;
  getWeekDays: () => Date[];
  getCurrentWeekEvents: () => CalendarEvent[];
  addEvent: (event: Partial<CalendarEvent>) => void;
  updateEvent: (event: CalendarEvent) => void;
  removeEvent: (eventId: string) => void;
  setEvents: (events: CalendarEvent[]) => void;
  setLeads: (leads: CalendarLeadOption[]) => void;
  setSlots: (slots: CalendarSlotOption[]) => void;
  adjustSlotCount: (slotId: string, delta: number) => void;
}

const CalendarContext = createContext<CalendarStore | null>(null);

export function CalendarProvider({
  children,
  initialEvents = [],
  initialLeads = [],
  initialSlots = [],
}: {
  children: React.ReactNode;
  initialEvents?: CalendarEvent[];
  initialLeads?: CalendarLeadOption[];
  initialSlots?: CalendarSlotOption[];
}) {
  const [events, setEventsState] = useState<CalendarEvent[]>(initialEvents);
  const [leads, setLeadsState] = useState<CalendarLeadOption[]>(initialLeads);
  const [slots, setSlotsState] = useState<CalendarSlotOption[]>(initialSlots);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday start
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<FilterType>("all");
  const [participantsFilter, setParticipantsFilter] = useState<ParticipantsFilterType>("all");

  const setEvents = (newEvents: CalendarEvent[]) => {
      setEventsState(newEvents);
  };

  const setLeads = (newLeads: CalendarLeadOption[]) => {
      setLeadsState(newLeads);
  };

  const setSlots = (newSlots: CalendarSlotOption[]) => {
      setSlotsState(newSlots);
  };

  const adjustSlotCount = (slotId: string, delta: number) => {
      setSlotsState((prev) =>
        prev.map((slot) =>
          slot.id === slotId
            ? { ...slot, appointmentsCount: Math.max(slot.appointmentsCount + delta, 0) }
            : slot
        )
      );
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const goToDate = (date: Date) => {
    setCurrentWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart((prev) => addWeeks(prev, 1));
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart((prev) => subWeeks(prev, 1));
  };

  const getWeekDays = () => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  };

  const getCurrentWeekEvents = () => {
    const weekStart = currentWeekStart;
    // 1. Filter by date range (roughly, assuming events are loaded)
    // In a real app we might fetch here, but we assume events are injected via props or setEvents
    let filtered = events.filter(e => {
        const d = new Date(e.date + 'T00:00:00'); 
        // Simple comparison: check if date string is within the week days
        // Better: check if date is >= weekStart and <= weekEnd
        // But since we have simple date strings YYYY-MM-DD
        return d >= startOfWeek(weekStart, {weekStartsOn: 1}) && d <= addDays(startOfWeek(weekStart, {weekStartsOn: 1}), 7);
    });

    // 2. Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.title.toLowerCase().includes(q) || 
        e.participants.some(p => p.toLowerCase().includes(q))
      );
    }

    // 3. Filter by Event Type
    if (eventTypeFilter !== 'all') {
      if (eventTypeFilter === 'with-meeting') {
        filtered = filtered.filter(e => !!e.meetingLink || e.type === 'videocall');
      } else {
        filtered = filtered.filter(e => !e.meetingLink && e.type !== 'videocall');
      }
    }

    // 4. Filter by Participants
    if (participantsFilter !== 'all') {
       if (participantsFilter === 'with-participants') {
          filtered = filtered.filter(e => e.participants && e.participants.length > 0);
       } else {
          filtered = filtered.filter(e => !e.participants || e.participants.length === 0);
       }
    }

    return filtered;
  };

  const addEvent = (event: Partial<CalendarEvent>) => {
      const newEvent = {
          id: Math.random().toString(36).substr(2, 9),
          ...event
      } as CalendarEvent;
      setEventsState(prev => [...prev, newEvent]);
  };

  const updateEvent = (event: CalendarEvent) => {
      setEventsState((prev) => prev.map((item) => (item.id === event.id ? event : item)));
  };

  const removeEvent = (eventId: string) => {
      setEventsState((prev) => prev.filter((item) => item.id !== eventId));
  };

  return (
    <CalendarContext.Provider
      value={{
        events,
        leads,
        slots,
        currentWeekStart,
        searchQuery,
        eventTypeFilter,
        participantsFilter,
        setSearchQuery,
        setEventTypeFilter,
        setParticipantsFilter,
        goToToday,
        goToDate,
        goToNextWeek,
        goToPreviousWeek,
        getWeekDays,
        getCurrentWeekEvents,
        addEvent,
        updateEvent,
        removeEvent,
        setEvents,
        setLeads,
        setSlots,
        adjustSlotCount
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendarStore() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error("useCalendarStore must be used within a CalendarProvider");
  }
  return context;
}
