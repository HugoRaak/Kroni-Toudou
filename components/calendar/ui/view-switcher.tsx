"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import type { CalendarView } from "@/lib/calendar/calendar-navigation";

export function ViewSwitcher({
  value,
  onChange,
}: {
  value: CalendarView;
  onChange: (view: CalendarView) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      <Image 
        src="/kroni-calendar.png" 
        alt="Kroni calendrier" 
        width={64} 
        height={64} 
        className="rounded-md pointer-events-none select-none mr-4"
        loading="eager"
      />
      <Button
        variant={value === "today" ? "default" : "outline"}
        onClick={() => onChange("today")}
        size="sm"
        className="cursor-pointer"
      >
        Aujourd&apos;hui
      </Button>
      <Button
        variant={value === "day" ? "default" : "outline"}
        onClick={() => onChange("day")}
        size="sm"
        className="cursor-pointer"
      >
        Jour
      </Button>
      <Button
        variant={value === "week" ? "default" : "outline"}
        onClick={() => onChange("week")}
        size="sm"
        className="cursor-pointer"
      >
        Semaine
      </Button>
      <Button
        variant={value === "month" ? "default" : "outline"}
        onClick={() => onChange("month")}
        size="sm"
        className="cursor-pointer"
      >
        Mois
      </Button>
      <Image 
        src="/kroni-sleepy.png" 
        alt="Kroni endormi" 
        width={64}
        height={64} 
        className="rounded-md pointer-events-none select-none ml-4"
      />
    </div>
  );
}

export default ViewSwitcher;


