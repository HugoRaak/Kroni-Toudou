"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CalendarTask, getTasksForDate } from "@/lib/calendar-utils";
import { Task } from "@/lib/types";
import { getTasksForTodayAction, getTasksForDateRangeAction } from "@/app/actions/tasks";

type CalendarView = "today" | "week" | "month";

export function Calendar({ userId }: { userId: string }) {
  const [currentView, setCurrentView] = useState<CalendarView>("today");
  // Independent anchors per view
  const [todayDate, setTodayDate] = useState<Date>(new Date());
  const [weekDate, setWeekDate] = useState<Date>(new Date());
  const [monthDate, setMonthDate] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [todayTasks, setTodayTasks] = useState<{
    periodic: Task[];
    specific: Task[];
    whenPossible: {
      inProgress: Task[];
      notStarted: Task[];
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [currentView, todayDate, weekDate, monthDate]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      if (currentView === "today") {
        const todayData = await getTasksForTodayAction(userId, todayDate);
        setTodayTasks(todayData);
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

        const tasksData = await getTasksForDateRangeAction(
          userId,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );
        setTasks(tasksData);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Navigation functions
  const navigatePrevious = () => {
    if (currentView === "today") {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - 1);
      setTodayDate(d);
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
    if (currentView === "today") {
      const d = new Date(todayDate);
      d.setDate(d.getDate() + 1);
      setTodayDate(d);
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

  const getCurrentDate = () => {
    return {
      day: todayDate.getDate(),
      month: todayDate.toLocaleDateString("fr-FR", { month: "long" }),
      year: todayDate.getFullYear(),
      dayName: todayDate.toLocaleDateString("fr-FR", { weekday: "long" }),
    };
  };

  const getWeekDates = () => {
    const startOfWeek = new Date(weekDate);
    startOfWeek.setDate(weekDate.getDate() - weekDate.getDay() + 1); // Lundi
    
    const weekDates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDates.push({
        date: date.getDate(),
        dayName: date.toLocaleDateString("fr-FR", { weekday: "short" }),
        isToday: date.toDateString() === today.toDateString(),
      });
    }
    return weekDates;
  };

  const getMonthDates = () => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay() + 1); // Lundi
    
    const dates = [];
    const dateIterator = new Date(startDate);
    const today = new Date();
    
    for (let i = 0; i < 42; i++) { // 6 semaines max
      dates.push({
        date: dateIterator.getDate(),
        month: dateIterator.getMonth(),
        isCurrentMonth: dateIterator.getMonth() === month,
        isToday: dateIterator.toDateString() === today.toDateString(),
      });
      dateIterator.setDate(dateIterator.getDate() + 1);
    }
    return dates;
  };

  const renderTodayView = () => {
    const { day, month, year, dayName } = getCurrentDate();
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={navigatePrevious}
            className="cursor-pointer hover:bg-primary/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">{dayName}</h2>
            <p className="text-lg text-muted-foreground">
              {day} {month} {year}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={navigateNext}
            className="cursor-pointer hover:bg-primary/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
        <div className="min-h-[400px] rounded-lg border border-border bg-card p-6">
          {loading ? (
            <p className="text-center text-muted-foreground">Chargement...</p>
          ) : !todayTasks ? (
            <p className="text-center text-muted-foreground">
              Aucune tâche pour aujourd'hui
            </p>
          ) : (
            <div className="space-y-6">
              {/* Tâches périodiques */}
              {todayTasks.periodic.length > 0 && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-foreground">
                    🔄 Tâches périodiques
                  </h3>
                  <div className="space-y-2">
                    {todayTasks.periodic.map((task) => (
                      <div
                        key={task.id}
                        className="rounded-lg border border-border bg-secondary/50 p-3"
                      >
                        <div className="font-medium text-foreground">{task.title}</div>
                        {task.description && (
                          <div className="text-sm text-muted-foreground">
                            {task.description}
                          </div>
                        )}
                        <div className="mt-1 text-xs text-muted-foreground">
                          {task.frequency === 'quotidien' && '📅 Quotidien'}
                          {task.frequency === 'hebdomadaire' && `📅 Hebdomadaire (${task.day})`}
                          {task.frequency === 'mensuel' && `📅 Mensuel (${task.day})`}
                          {task.frequency === 'annuel' && `📅 Annuel (${task.day})`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tâches à date précise */}
              {todayTasks.specific.length > 0 && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-foreground">
                    📅 Tâches à date précise
                  </h3>
                  <div className="space-y-2">
                    {todayTasks.specific.map((task) => (
                      <div
                        key={task.id}
                        className="rounded-lg border border-border bg-secondary/50 p-3"
                      >
                        <div className="font-medium text-foreground">{task.title}</div>
                        {task.description && (
                          <div className="text-sm text-muted-foreground">
                            {task.description}
                          </div>
                        )}
                        <div className="mt-1 text-xs text-muted-foreground">
                          📅 Échéance: {task.due_on}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tâches quand je peux */}
              {(todayTasks.whenPossible.inProgress.length > 0 || todayTasks.whenPossible.notStarted.length > 0) && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-foreground">
                    ⏰ Quand je peux
                  </h3>
                  
                  {/* Tâches en cours */}
                  {todayTasks.whenPossible.inProgress.length > 0 && (
                    <div className="mb-4">
                      <h4 className="mb-2 text-sm font-medium text-foreground">
                        En cours ({todayTasks.whenPossible.inProgress.length})
                      </h4>
                      <div className="space-y-2">
                        {todayTasks.whenPossible.inProgress.map((task) => (
                          <div
                            key={task.id}
                            className="rounded-lg border border-green-200 bg-green-50 p-3"
                          >
                            <div className="font-medium text-foreground">{task.title}</div>
                            {task.description && (
                              <div className="text-sm text-muted-foreground">
                                {task.description}
                              </div>
                            )}
                            <div className="mt-1 text-xs text-green-600">
                              ✅ En cours
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tâches pas encore commencées */}
                  {todayTasks.whenPossible.notStarted.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium text-foreground">
                        Pas encore commencées ({todayTasks.whenPossible.notStarted.length})
                      </h4>
                      <div className="space-y-2">
                        {todayTasks.whenPossible.notStarted.map((task) => (
                          <div
                            key={task.id}
                            className="rounded-lg border border-border bg-secondary/50 p-3"
                          >
                            <div className="font-medium text-foreground">{task.title}</div>
                            {task.description && (
                              <div className="text-sm text-muted-foreground">
                                {task.description}
                              </div>
                            )}
                            <div className="mt-1 text-xs text-muted-foreground">
                              ⏳ Pas encore commencée
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Message si aucune tâche */}
              {todayTasks.periodic.length === 0 && 
               todayTasks.specific.length === 0 && 
               todayTasks.whenPossible.inProgress.length === 0 && 
               todayTasks.whenPossible.notStarted.length === 0 && (
                <p className="text-center text-muted-foreground">
                  Aucune tâche pour aujourd'hui
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates();
    const startOfWeek = new Date(weekDate);
    startOfWeek.setDate(weekDate.getDate() - weekDate.getDay() + 1);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={navigatePrevious}
            className="cursor-pointer hover:bg-primary/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">Semaine</h2>
            <p className="text-sm text-muted-foreground">
              {startOfWeek.getDate()} {startOfWeek.toLocaleDateString("fr-FR", { month: "long" }).slice(0, 3)} - {endOfWeek.getDate()} {endOfWeek.toLocaleDateString("fr-FR", { month: "long" }).slice(0, 3)} {endOfWeek.getFullYear()}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={navigateNext}
            className="cursor-pointer hover:bg-primary/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((day, index) => {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(startOfWeek.getDate() + index);
            const dayTasks = getTasksForDate(tasks, dayDate);
            
            return (
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
                <div className="mt-2 min-h-[60px] space-y-1">
                  {loading ? (
                    <div className="text-xs text-muted-foreground">...</div>
                  ) : dayTasks.length === 0 ? (
                    <div className="text-xs text-muted-foreground">-</div>
                  ) : (
                    dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className="rounded bg-secondary/50 p-1 text-xs"
                      >
                        <div className="truncate font-medium">{task.title}</div>
                      </div>
                    ))
                  )}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{dayTasks.length - 3} autres
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthDates = getMonthDates();
    const monthName = monthDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={navigatePrevious}
            className="cursor-pointer hover:bg-primary/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">{monthName}</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={navigateNext}
            className="cursor-pointer hover:bg-primary/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => (
            <div key={index} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
          {monthDates.map((date, index) => {
            const dayTasks = getTasksForDate(tasks, new Date(monthDate.getFullYear(), date.month, date.date));
            
            return (
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
                <div className="mt-1 space-y-1">
                  {loading ? (
                    <div className="text-xs text-muted-foreground">...</div>
                  ) : dayTasks.length === 0 ? (
                    <div className="text-xs text-muted-foreground">-</div>
                  ) : (
                    dayTasks.slice(0, 2).map((task) => (
                      <div
                        key={task.id}
                        className="rounded bg-secondary/50 p-1 text-xs"
                      >
                        <div className="truncate font-medium">{task.title}</div>
                      </div>
                    ))
                  )}
                  {dayTasks.length > 2 && (
                    <div className="text-xs text-muted-foreground">
                      +{dayTasks.length - 2}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
