"use client";

import { format } from "date-fns";
import {
  Pen,
  FileText,
  Layers,
  Trash2,
  X,
  ArrowUpRight,
  CheckCircle2,
  Bell,
  Calendar as CalendarIcon,
  Phone,
  Users,
  FilePlus,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/src/components/ui/sheet";
import { Avatar, AvatarImage } from "@/src/components/ui/avatar";
import { CalendarEvent } from "@/src/types/calendar";
import { useState } from "react";
import { Kbd } from "@/src/components/ui/kbd";

import { deleteCalendarEvent } from "@/src/app/(dashboard)/crm/calendar/actions";
import { useCalendarStore } from "@/src/store/calendar-store";



interface EventSheetProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (event: CalendarEvent) => void;
}

function formatTime(time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return format(date, "EEEE, MMMM dd");
}

function getMeetingCode(link?: string): string {
  if (!link) return "";
  const match = link.match(/\/[a-z-]+$/);
  if (match) {
    return match[0].slice(1).replace(/-/g, " ").toUpperCase();
  }
  return "dra-jhgg-mvn";
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

export function EventSheet({ event, open, onOpenChange, onEdit }: EventSheetProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { removeEvent, adjustSlotCount } = useCalendarStore();

  if (!event) return null;

  const dateStr = formatDate(event.date);
  const startTimeStr = formatTime(event.startTime);
  const endTimeStr = formatTime(event.endTime);
  const timezone = event.timezone || "America/Mexico_City";
  const meetingCode = getMeetingCode(event.meetingLink);

  const leadName = event.leadName || "Lead";
  const organizerName = event.organizerName || "Staff";
  const participants = [
    {
      id: `lead-${event.leadId || event.id}`,
      name: leadName,
      email: event.leadEmail,
      role: "Lead",
    },
    {
      id: `organizer-${event.id}`,
      name: organizerName,
      email: event.organizerEmail,
      role: "Organizer",
    },
  ].filter((p) => p.name);

  const handleDelete = async () => {
    if (!event?.id || isDeleting) return;
    setIsDeleting(true);
    const response = await deleteCalendarEvent(event.id);
    if (response.success) {
      removeEvent(event.id);
      if (event.slotId) {
        adjustSlotCount(event.slotId, -1);
      }
      onOpenChange(false);
    }
    setIsDeleting(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[560px] overflow-y-auto p-0 border-l border-r border-t [&>button]:hidden"
      >
        <div className="flex flex-col h-full">
          <SheetHeader className="px-4 pt-4 pb-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 hover:bg-muted"
                  onClick={() => onEdit(event)}
                >
                  <Pen className="size-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 hover:bg-muted"
                >
                  <FileText className="size-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 hover:bg-muted"
                >
                  <Layers className="size-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 hover:bg-muted"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </div>
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 rounded-full bg-muted hover:bg-muted"
                >
                  <X className="size-4 text-muted-foreground" />
                </Button>
              </SheetClose>
            </div>

            <div className="flex flex-col gap-1 mb-4">
              <SheetTitle className="text-xl font-semibold text-foreground leading-normal">
                {event.title}
              </SheetTitle>
              <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <span>{dateStr}</span>
                <span className="size-1 rounded-full bg-muted-foreground" />
                <span>
                  {startTimeStr} - {endTimeStr}
                </span>
                <span className="size-1 rounded-full bg-muted-foreground" />
                <span>{timezone}</span>
              </div>
            </div>

            <Button variant="outline">
              <span>Propose new time</span>
              <ArrowUpRight className="size-4" />
            </Button>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="flex flex-col gap-4 max-w-[512px] mx-auto">
              <div className="flex flex-col gap-4">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-start gap-3 relative"
                  >
                    <Avatar className="size-7 border-[1.4px] border-background shrink-0">
                      <AvatarImage
                        src={`https://api.dicebear.com/9.x/glass/svg?seed=${participant.id}`}
                      />
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 relative">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 relative">
                            <p className="text-[13px] font-medium text-foreground leading-[18px]">
                              {participant.name}
                            </p>
                            {participant.role && (
                              <span className="text-[10px] font-medium text-cyan-500 px-0.5 py-0.5 rounded-full">
                                {participant.role}
                              </span>
                            )}
                          </div>
                          {participant.email && (
                            <p className="text-xs text-muted-foreground leading-none">
                              {participant.email}
                            </p>
                          )}
                        </div>
                        <CheckCircle2 className="size-3 text-green-500 shrink-0 absolute right-0 top-[17px]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {event.meetingLink && (
                <div className="flex flex-col gap-2 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="size-6 shrink-0">
                      <svg
                        viewBox="0 0 24 24"
                        className="size-full"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"
                          fill="#22C55E"
                        />
                      </svg>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground flex-1">
                      Meeting in Google Meet
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Code: {meetingCode}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 h-8 bg-foreground text-background hover:bg-foreground/90 text-xs font-medium gap-2 shadow-sm"
                      onClick={() => {
                        if (event.meetingLink) {
                          window.open(event.meetingLink, "_blank");
                        }
                      }}
                    >
                      <span>Join Google Meet meeting</span>
                      <div className="flex gap-0.5">
                        <Kbd className="bg-white/14 text-white text-[10.8px] px-1.5 py-1 rounded">
                          ⌘
                        </Kbd>
                        <Kbd className="bg-white/14 text-white text-[10.8px] px-1.5 py-1 rounded w-[18px]">
                          J
                        </Kbd>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-2 text-xs border-border"
                      onClick={() => {
                        if (event.meetingLink) {
                          copyToClipboard(event.meetingLink);
                        }
                      }}
                    >
                      <LinkIcon className="size-4" />
                      <span>Copy link</span>
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="p-1">
                    <Bell className="size-4" />
                  </div>
                  <span>Reminder: 30min before</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="p-1">
                    <CalendarIcon className="size-4" />
                  </div>
                  <span>Organizer: {event.organizerEmail || "Sin email"}</span>
                </div>
                {event.type && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="p-1">
                      <Layers className="size-4" />
                    </div>
                    <span>Tipo: {event.type}</span>
                  </div>
                )}
                {event.campus && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="p-1">
                      <CalendarIcon className="size-4" />
                    </div>
                    <span>Campus: {event.campus}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="p-1">
                    <Phone className="size-4" />
                  </div>
                  <span>{event.leadPhone || "Sin teléfono"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="p-1">
                    <Users className="size-4" />
                  </div>
                  <span>
                    {participants.length} persons
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="p-1">
                    <FileText className="size-4" />
                  </div>
                  <span>
                    Contacto: {event.leadContactName || event.leadName || "Sin contacto"}
                  </span>
                </div>
                {/* Notes */}
                {event.notes && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="p-1">
                            <FilePlus className="size-4" />
                        </div>
                        <span className="line-clamp-1">{event.notes}</span>
                    </div>
                )}
              </div>

               {event.notes && (
                    <div className="pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground leading-[1.6]">
                            {event.notes}
                        </p>
                    </div>
               )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
