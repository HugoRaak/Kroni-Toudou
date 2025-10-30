"use client";

import { useState, useEffect } from "react";
import DayView, { DayTasksData } from "@/components/calendar/day-view";
import ViewSwitcher from "@/components/calendar/view-switcher";
import { CalendarTask } from "@/lib/calendar-utils";
import WeekView from "@/components/calendar/week-view";
import MonthView from "@/components/calendar/month-view";
import { getTasksForTodayAction, getTasksForDateRangeAction } from "@/app/actions/tasks";
import { getWorkdayAction, getWorkdaysForRangeAction } from "@/app/actions/workdays";

type CalendarView = "day" | "week" | "month";

export function Calendar({ userId }: { userId: string }) {
  const [currentView, setCurrentView] = useState<CalendarView>("day");
  // Independent anchors per view
  const [dayDate, setDayDate] = useState<Date>(new Date());
  const [weekDate, setWeekDate] = useState<Date>(new Date());
  const [monthDate, setMonthDate] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [dayTasks, setDayTasks] = useState<DayTasksData>(null);
  const [loading, setLoading] = useState(true);
  const [dayWorkMode, setDayWorkMode] = useState<"Présentiel" | "Distanciel" | "Congé">("Présentiel");
  const [workdaysMap, setWorkdaysMap] = useState<Record<string, "Présentiel" | "Distanciel" | "Congé">>({});

  useEffect(() => {
    loadTasks();
  }, [currentView, dayDate, weekDate, monthDate]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      if (currentView === "day") {
        const [dayData, mode] = await Promise.all([
          getTasksForTodayAction(userId, dayDate),
          getWorkdayAction(userId, dayDate),
        ]);
        setDayTasks(dayData);
        setDayWorkMode(mode ?? "Présentiel");
      } else {
        const anchor = currentView === "week" ? weekDate : monthDate;
        const startDate = new Date(anchor);
        const endDate = new Date(anchor);

        if (currentView === "week") {
          startDate.setDate(anchor.getDate() - anchor.getDay() + 1); // Lundi
          endDate.setDate(startDate.getDate() + 6); // Dimanche
        } else if (currentView === "month") {
          startDate.setDate(1); // Premier du mois
          endDate.setMonth(anchor.getMonth() + 1, 0); // Dernier du mois
        }

        const [tasksData, workdays] = await Promise.all([
          getTasksForDateRangeAction(userId, startDate, endDate),
          getWorkdaysForRangeAction(userId, startDate, endDate),
        ]);
        setTasks(tasksData);
        setWorkdaysMap(workdays);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // No setter: work mode is informational only

  // Navigation functions
  const navigatePrevious = () => {
    if (currentView === "day") {
      const d = new Date(dayDate);
      d.setDate(d.getDate() - 1);
      setDayDate(d);
    } else if (currentView === "week") {
      const d = new Date(weekDate);
      d.setDate(d.getDate() - 7);
      setWeekDate(d);
    } else if (currentView === "month") {
      const d = new Date(monthDate);
      d.setMonth(d.getMonth() - 1);
      setMonthDate(d);
    }
  };

  const navigateNext = () => {
    if (currentView === "day") {
      const d = new Date(dayDate);
      d.setDate(d.getDate() + 1);
      setDayDate(d);
    } else if (currentView === "week") {
      const d = new Date(weekDate);
      d.setDate(d.getDate() + 7);
      setWeekDate(d);
    } else if (currentView === "month") {
      const d = new Date(monthDate);
      d.setMonth(d.getMonth() + 1);
      setMonthDate(d);
    }
  };

  return (
    <div className="space-y-6">
      <ViewSwitcher value={currentView} onChange={setCurrentView} />

      <div className="rounded-lg border border-border bg-card p-6">
        {currentView === "day" && (
          <DayView
            date={dayDate}
            loading={loading}
            tasks={dayTasks}
            workMode={dayWorkMode}
            onModeSaved={loadTasks}
            onPrev={navigatePrevious}
            onNext={navigateNext}
          />
        )}
        {currentView === "week" && (
          <WeekView
            anchorDate={weekDate}
            tasks={tasks}
            workdays={workdaysMap}
            loading={loading}
            onPrev={navigatePrevious}
            onNext={navigateNext}
          />
        )}
        {currentView === "month" && (
          <MonthView
            anchorDate={monthDate}
            tasks={tasks}
            workdays={workdaysMap}
            loading={loading}
            onPrev={navigatePrevious}
            onNext={navigateNext}
          />
        )}
      </div>
    </div>
  );
}
