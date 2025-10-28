"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type CalendarView = "today" | "week" | "month";

export function Calendar() {
  const [currentView, setCurrentView] = useState<CalendarView>("today");

  const getCurrentDate = () => {
    const now = new Date();
    return {
      day: now.getDate(),
      month: now.toLocaleDateString("fr-FR", { month: "long" }),
      year: now.getFullYear(),
      dayName: now.toLocaleDateString("fr-FR", { weekday: "long" }),
    };
  };

  const getWeekDates = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Lundi
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDates.push({
        date: date.getDate(),
        dayName: date.toLocaleDateString("fr-FR", { weekday: "short" }),
        isToday: date.toDateString() === now.toDateString(),
      });
    }
    return weekDates;
  };

  const getMonthDates = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay() + 1); // Lundi
    
    const dates = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) { // 6 semaines max
      dates.push({
        date: currentDate.getDate(),
        month: currentDate.getMonth(),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: currentDate.toDateString() === now.toDateString(),
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };

  const renderTodayView = () => {
    const { day, month, year, dayName } = getCurrentDate();
    
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">{dayName}</h2>
          <p className="text-lg text-muted-foreground">
            {day} {month} {year}
          </p>
        </div>
        <div className="min-h-[400px] rounded-lg border border-border bg-card p-6">
          <p className="text-center text-muted-foreground">
            Aucune tâche pour aujourd'hui
          </p>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates();
    
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Semaine</h2>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((day, index) => (
            <div
              key={index}
              className={`rounded-lg border p-3 text-center ${
                day.isToday
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card"
              }`}
            >
              <div className="text-sm font-medium text-muted-foreground">
                {day.dayName}
              </div>
              <div className="text-lg font-semibold text-foreground">
                {day.date}
              </div>
              <div className="mt-2 min-h-[60px] text-xs text-muted-foreground">
                {/* Espace pour les tâches */}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthDates = getMonthDates();
    const now = new Date();
    const monthName = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">{monthName}</h2>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => (
            <div key={index} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
          {monthDates.map((date, index) => (
            <div
              key={index}
              className={`min-h-[80px] rounded-lg border p-2 ${
                date.isToday
                  ? "border-primary bg-primary/10"
                  : date.isCurrentMonth
                  ? "border-border bg-card"
                  : "border-transparent bg-muted/30"
              }`}
            >
              <div className="text-sm font-medium text-foreground">
                {date.isCurrentMonth ? date.date : ""}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-center space-x-2">
        <Button
          variant={currentView === "today" ? "default" : "outline"}
          onClick={() => setCurrentView("today")}
          size="sm"
          className="cursor-pointer"
        >
          Aujourd'hui
        </Button>
        <Button
          variant={currentView === "week" ? "default" : "outline"}
          onClick={() => setCurrentView("week")}
          size="sm"
          className="cursor-pointer"
        >
          Semaine
        </Button>
        <Button
          variant={currentView === "month" ? "default" : "outline"}
          onClick={() => setCurrentView("month")}
          size="sm"
          className="cursor-pointer"
        >
          Mois
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        {currentView === "today" && renderTodayView()}
        {currentView === "week" && renderWeekView()}
        {currentView === "month" && renderMonthView()}
      </div>
    </div>
  );
}
