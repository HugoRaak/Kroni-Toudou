"use client";

import { Button } from "@/components/ui/button";

export type CalendarView = "day" | "week" | "month";

export function ViewSwitcher({
  value,
  onChange,
}: {
  value: CalendarView;
  onChange: (view: CalendarView) => void;
}) {
  return (
    <div className="flex justify-center space-x-2">
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
    </div>
  );
}

export default ViewSwitcher;


