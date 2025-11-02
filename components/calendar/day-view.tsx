"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Task } from "@/lib/types";
import { TaskItemCompact } from "@/components/task-item-compact";
import { WorkModeBadge } from "@/components/calendar/workmode-badge";

export type DayTasksData = {
  periodic: Task[];
  specific: Task[];
  whenPossible: {
    inProgress: Task[];
    notStarted: Task[];
  };
} | null;

export function DayView({
  date,
  loading,
  tasks,
  workMode,
  onPrev,
  onNext,
  onModeSaved,
  onUpdateTask,
  onDeleteTask,
}: {
  date: Date;
  loading: boolean;
  tasks: DayTasksData;
  workMode: "Présentiel" | "Distanciel" | "Congé";
  onPrev: () => void;
  onNext: () => void;
  onModeSaved?: () => void;
  onUpdateTask: (formData: FormData) => Promise<boolean>;
  onDeleteTask: (id: string) => Promise<boolean>;
}) {
  const day = date.getDate();
  const month = date.toLocaleDateString("fr-FR", { month: "long" });
  const year = date.getFullYear();
  const dayName = date.toLocaleDateString("fr-FR", { weekday: "long" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          className="cursor-pointer hover:bg-primary/10 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        <div className="text-center">
          {date.toDateString() === new Date().toDateString() && (
            <span className="inline-block mb-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Aujourd'hui
            </span>
          )}
          <h2 className="text-2xl font-bold text-foreground">{dayName}</h2>
          <p className="text-lg text-muted-foreground">
            {day} {month} {year}
          </p>
          {!loading && (
            <div className="mt-2 flex items-center justify-center">
              <WorkModeBadge
                workMode={workMode}
                date={date}
                onSaved={onModeSaved}
                disabled={loading}
              />
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          className="cursor-pointer hover:bg-primary/10 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
      <div className="min-h-[400px] rounded-lg border border-border bg-card p-6">
        {loading ? (
          <div className="space-y-6">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="space-y-2">
                <div className="rounded-lg border border-border bg-secondary/50 p-3">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="mt-2 h-3 w-2/3" />
                </div>
                <div className="rounded-lg border border-border bg-secondary/50 p-3">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                </div>
              </div>
            </div>

            <div>
              <Skeleton className="mb-3 h-5 w-40" />
              <div className="space-y-2">
                <div className="rounded-lg border border-border bg-secondary/50 p-3">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="mt-2 h-3 w-2/3" />
                </div>
                <div className="rounded-lg border border-border bg-secondary/50 p-3">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                </div>
              </div>
            </div>

            <div>
              <Skeleton className="mb-3 h-5 w-48" />
              <div className="space-y-2">
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="mt-2 h-3 w-2/3" />
                </div>
                <div className="rounded-lg border border-border bg-secondary/50 p-3">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                </div>
              </div>
            </div>
          </div>
        ) : !tasks ? (
          <p className="text-center text-muted-foreground">{workMode === 'Congé' ? 'Là c\'est repos !' : 'Aucune tâche pour ce jour'}</p>
        ) : (
          <div className="space-y-6">
            {tasks.periodic.length > 0 && (
              <div>
                <h3 className="mb-3 text-lg font-semibold text-yellow-900 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-yellow-700">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                    <path d="M12 6v6l4 2" strokeWidth="2" />
                  </svg>
                  Tâches périodiques
                </h3>
                <div className="space-y-2">
                  {tasks.periodic.map((task) => (
                    <TaskItemCompact 
                      key={task.id} 
                      task={task} 
                      className="border-yellow-400/30 bg-yellow-100/50"
                      onSubmit={onUpdateTask}
                      onDelete={onDeleteTask}
                      onSuccess={onModeSaved}
                    />
                  ))}
                </div>
              </div>
            )}

            {tasks.specific.length > 0 && (
              <div>
                <h3 className="mb-3 text-lg font-semibold text-violet-800 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-violet-700">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
                    <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
                    <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
                    <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
                  </svg>
                  Tâches à date précise
                </h3>
                <div className="space-y-2">
                  {tasks.specific.map((task) => (
                    <TaskItemCompact 
                      key={task.id} 
                      task={task} 
                      className="border-violet-500/20 bg-violet-500/10"
                      onSubmit={onUpdateTask}
                      onDelete={onDeleteTask}
                      onSuccess={onModeSaved}
                    />
                  ))}
                </div>
              </div>
            )}

            {(tasks.whenPossible.inProgress.length > 0 || tasks.whenPossible.notStarted.length > 0) && (
              <div>
                <h3 className="mb-3 text-lg font-semibold text-orange-800 flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-orange-700">
                    <path d="M12 5.5l1.6 3.7 3.7 1.6-3.7 1.6L12 16.1l-1.6-3.7L6.7 10.8l3.7-1.6L12 5.5z" strokeWidth="2" />
                  </svg>
                  Quand je peux
                </h3>

                {tasks.whenPossible.inProgress.length > 0 && (
                  <div className="mb-4">
                    <h4 className="mb-2 text-sm font-medium text-foreground">
                      En cours ({tasks.whenPossible.inProgress.length})
                    </h4>
                    <div className="space-y-2">
                      {tasks.whenPossible.inProgress.map((task) => (
                        <TaskItemCompact 
                          key={task.id} 
                          task={task} 
                          className="border-orange-600/25 bg-orange-50"
                          onSubmit={onUpdateTask}
                          onDelete={onDeleteTask}
                          onSuccess={onModeSaved}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {tasks.whenPossible.notStarted.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-foreground">
                      Pas encore commencées ({tasks.whenPossible.notStarted.length})
                    </h4>
                    <div className="space-y-2">
                      {tasks.whenPossible.notStarted.map((task) => (
                        <TaskItemCompact 
                          key={task.id} 
                          task={task} 
                          className="border-orange-600/25 bg-orange-50"
                          onSubmit={onUpdateTask}
                          onDelete={onDeleteTask}
                          onSuccess={onModeSaved}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tasks.periodic.length === 0 &&
              tasks.specific.length === 0 &&
              tasks.whenPossible.inProgress.length === 0 &&
              tasks.whenPossible.notStarted.length === 0 && (
                <p className="text-center text-muted-foreground">{workMode === 'Congé' ? 'Là c\'est repos !' : 'Aucune tâche pour ce jour'}</p>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DayView;


