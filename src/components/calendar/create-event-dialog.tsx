"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Calendar } from "@/src/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover";
import { useCalendarStore } from "@/src/store/calendar-store";
import { cn } from "@/src/lib/utils";
import { CalendarEvent } from "@/src/types/calendar";
import { createCalendarEvent, updateCalendarEvent } from "@features/appointments";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEvent?: CalendarEvent | null;
}

// Helper to get initial values from props
function getInitialValues(initialEvent: CalendarEvent | null | undefined) {
  if (!initialEvent) {
    return {
      date: new Date(),
      leadId: "",
      slotId: "",
      type: "",
      notes: "",
    };
  }
  return {
    date: new Date(`${initialEvent.date}T00:00:00`),
    leadId: initialEvent.leadId || "",
    slotId: initialEvent.slotId || "",
    type: initialEvent.type || "",
    notes: initialEvent.notes || "",
  };
}

export function CreateEventDialog({
  open,
  onOpenChange,
  initialEvent = null,
}: CreateEventDialogProps) {
  const { addEvent, updateEvent, goToDate, leads, slots, adjustSlotCount } = useCalendarStore();
  const isEditing = Boolean(initialEvent);
  
  const initialValues = useMemo(() => getInitialValues(initialEvent), [initialEvent]);
  
  const [date, setDate] = useState<Date | undefined>(initialValues.date);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [leadId, setLeadId] = useState(initialValues.leadId);
  const [slotId, setSlotId] = useState(initialValues.slotId);
  const [type, setType] = useState(initialValues.type);
  const [notes, setNotes] = useState(initialValues.notes);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset form when dialog opens or initialEvent changes
  // Form reset on dialog open is an acceptable pattern
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const values = getInitialValues(initialEvent);
    setDate(values.date);
    setLeadId(values.leadId);
    setSlotId(values.slotId);
    setType(values.type);
    setNotes(values.notes);
    setFormError(null);
  }, [open, initialEvent]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const selectedDateKey = date ? date.toLocaleDateString("en-CA") : null;
  const slotsForDate = slots.filter((slot) => {
    const slotDate = new Date(slot.startsAt).toLocaleDateString("en-CA");
    return slotDate === selectedDateKey;
  });

  const selectedSlot = slotId ? slots.find((slot) => slot.id === slotId) : null;
  const visibleSlots = selectedSlot && !slotsForDate.some((slot) => slot.id === selectedSlot.id)
    ? [selectedSlot, ...slotsForDate]
    : slotsForDate;

  const handleSlotChange = (value: string) => {
    setSlotId(value);
    const slot = slots.find((item) => item.id === value);
    if (slot) {
      setDate(new Date(slot.startsAt));
    }
  };

  // Clear slot when date changes and slot doesn't match new date
  // Slot sync on date change is an acceptable pattern
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!selectedSlot || !selectedDateKey) return;
    const slotDate = new Date(selectedSlot.startsAt).toLocaleDateString("en-CA");
    if (slotDate !== selectedDateKey) {
      setSlotId("");
    }
  }, [selectedDateKey, selectedSlot]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!date || !slotId || (!isEditing && !leadId)) {
      setFormError("Completa los campos obligatorios.");
      return;
    }

    if (isEditing && initialEvent) {
      const response = await updateCalendarEvent({
        id: initialEvent.id,
        slotId,
        type: type || undefined,
        notes: notes || undefined,
      });

      if (!response.success || !response.event) {
        setFormError(response.error || "No se pudo actualizar la cita.");
        return;
      }

      updateEvent(response.event);
      if (initialEvent.slotId && initialEvent.slotId !== slotId) {
        adjustSlotCount(initialEvent.slotId, -1);
        adjustSlotCount(slotId, 1);
      }
      goToDate(date);
      onOpenChange(false);
      return;
    }

    const response = await createCalendarEvent({
      leadId,
      slotId,
      type: type || undefined,
      notes: notes || undefined,
    });

    if (!response.success || !response.event) {
      setFormError(response.error || "No se pudo crear la cita.");
      return;
    }

    addEvent(response.event);
    adjustSlotCount(slotId, 1);
    goToDate(date);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Event" : "Create Event"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the appointment details."
              : "Add a new event to your calendar. Fill in the details below."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {!isEditing && (
              <div className="grid gap-2">
                <Label>Lead</Label>
                <Select value={leadId} onValueChange={setLeadId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.studentName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isEditing && initialEvent?.leadName && (
              <div className="grid gap-2">
                <Label>Lead</Label>
                <div className="text-sm text-muted-foreground">{initialEvent.leadName}</div>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Date</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 size-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(selectedDate) => {
                      setDate(selectedDate);
                      setDatePickerOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label>Available Slots</Label>
              <Select value={slotId} onValueChange={handleSlotChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a slot" />
                </SelectTrigger>
                <SelectContent>
                  {visibleSlots.length === 0 && (
                    <SelectItem value="no-slots" disabled>
                      No slots available
                    </SelectItem>
                  )}
                  {visibleSlots.map((slot) => {
                    const startLabel = new Date(slot.startsAt).toLocaleTimeString("es-MX", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const endLabel = new Date(slot.endsAt).toLocaleTimeString("es-MX", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const isFull = slot.appointmentsCount >= slot.maxAppointments;
                    const isBlocked = slot.isBlocked || !slot.isActive;
                    const statusLabel = isBlocked ? "Blocked" : isFull ? "Full" : "Open";
                    const isDisabled = (isBlocked || isFull) && slot.id !== selectedSlot?.id;

                    return (
                      <SelectItem
                        key={slot.id}
                        value={slot.id}
                        disabled={isDisabled}
                      >
                        {startLabel} - {endLabel} • {slot.campus || "Campus"}
                        {" "}- {statusLabel}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                placeholder="Meeting"
                value={type}
                onChange={(e) => setType(e.target.value)}
              />
            </div>
            
             <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="Notas"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

          </div>
          <DialogFooter>
            {formError && (
              <p className="text-xs text-red-500 mr-auto">{formError}</p>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">{isEditing ? "Save Changes" : "Create Event"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
