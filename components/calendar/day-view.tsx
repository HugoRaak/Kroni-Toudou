"use client";

import { Button } from "@/components/ui/button";
import { Task } from "@/lib/types";

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
}: {
  date: Date;
  loading: boolean;
  tasks: DayTasksData;
  workMode: "Présentiel" | "Distanciel" | "Congé";
  onPrev: () => void;
  onNext: () => void;
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
          <div className="mt-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border ${
                workMode === 'Congé'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : workMode === 'Distanciel'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {workMode === 'Distanciel' ? 'Remote' : workMode}
            </span>
          </div>
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
          <p className="text-center text-muted-foreground">Chargement...</p>
        ) : !tasks ? (
          <p className="text-center text-muted-foreground">Aucune tâche pour aujourd'hui</p>
        ) : (
          <div className="space-y-6">
            {tasks.periodic.length > 0 && (
              <div>
                <h3 className="mb-3 text-lg font-semibold text-foreground">🔄 Tâches périodiques</h3>
                <div className="space-y-2">
                  {tasks.periodic.map((task) => (
                    <div key={task.id} className="rounded-lg border border-border bg-secondary/50 p-3">
                      <div className="font-medium text-foreground">{task.title}</div>
                      {task.description && (
                        <div className="text-sm text-muted-foreground">{task.description}</div>
                      )}
                      <div className="mt-1 text-xs text-muted-foreground">
                        {task.frequency === "quotidien" && "📅 Quotidien"}
                        {task.frequency === "hebdomadaire" && `📅 Hebdomadaire (${task.day})`}
                        {task.frequency === "mensuel" && `📅 Mensuel (${task.day})`}
                        {task.frequency === "annuel" && `📅 Annuel (${task.day})`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tasks.specific.length > 0 && (
              <div>
                <h3 className="mb-3 text-lg font-semibold text-foreground">📅 Tâches à date précise</h3>
                <div className="space-y-2">
                  {tasks.specific.map((task) => (
                    <div key={task.id} className="rounded-lg border border-border bg-secondary/50 p-3">
                      <div className="font-medium text-foreground">{task.title}</div>
                      {task.description && (
                        <div className="text-sm text-muted-foreground">{task.description}</div>
                      )}
                      <div className="mt-1 text-xs text-muted-foreground">📅 Échéance: {task.due_on}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(tasks.whenPossible.inProgress.length > 0 || tasks.whenPossible.notStarted.length > 0) && (
              <div>
                <h3 className="mb-3 text-lg font-semibold text-foreground">⏰ Quand je peux</h3>

                {tasks.whenPossible.inProgress.length > 0 && (
                  <div className="mb-4">
                    <h4 className="mb-2 text-sm font-medium text-foreground">
                      En cours ({tasks.whenPossible.inProgress.length})
                    </h4>
                    <div className="space-y-2">
                      {tasks.whenPossible.inProgress.map((task) => (
                        <div key={task.id} className="rounded-lg border border-green-200 bg-green-50 p-3">
                          <div className="font-medium text-foreground">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-muted-foreground">{task.description}</div>
                          )}
                          <div className="mt-1 text-xs text-green-600">✅ En cours</div>
                        </div>
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
                        <div key={task.id} className="rounded-lg border border-border bg-secondary/50 p-3">
                          <div className="font-medium text-foreground">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-muted-foreground">{task.description}</div>
                          )}
                          <div className="mt-1 text-xs text-muted-foreground">⏳ Pas encore commencée</div>
                        </div>
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
                <p className="text-center text-muted-foreground">Aucune tâche pour aujourd'hui</p>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DayView;


