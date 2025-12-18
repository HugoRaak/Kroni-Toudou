'use client';

import { useState, useMemo, useEffect } from 'react';
import { Task, Frequency } from '@/lib/types';
import { formatDateLocal, normalizeToMidnight, parseDateLocal } from '@/lib/utils';
import TaskItem from '@/components/tasks/items/task-item';
import { DraggableTaskList } from '@/components/tasks/ui/draggable-task-list';
import { groupInProgressTasksByDueDate } from '@/lib/tasks/processing/task-filtering';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Filter, GripVertical, Check, X } from 'lucide-react';
import { updateTasksDisplayOrderAction, type ModeConflictError } from '@/app/actions/tasks';
import { useRouter } from 'next/navigation';

type PresenceFilter = 'all' | 'presentiel' | 'distanciel';
type FrequencyFilter = 'all' | Frequency;

// Constants extracted outside component to avoid recreation
const ACCENT_CLASSES: Record<
  string,
  { bar: string; chip: string; headerBg: string; title: string }
> = {
  yellow: {
    bar: 'bg-yellow-400/30',
    chip: 'bg-yellow-50',
    headerBg: 'bg-yellow-200/50',
    title: 'text-yellow-900',
  },
  violet: {
    bar: 'bg-violet-500/20',
    chip: 'bg-violet-500/10 text-violet-700',
    headerBg: 'bg-violet-500/10',
    title: 'text-violet-800',
  },
  orange: {
    bar: 'bg-orange-600/25',
    chip: 'bg-orange-50 text-orange-800',
    headerBg: 'bg-orange-200/40',
    title: 'text-orange-800',
  },
};

const FILTER_BUTTON_CLASSES: Record<string, { active: string; hover: string; icon: string }> = {
  yellow: {
    active: 'bg-yellow-100 hover:bg-yellow-200',
    hover: 'hover:bg-yellow-50',
    icon: 'text-yellow-700',
  },
  violet: {
    active: 'bg-violet-100 hover:bg-violet-200',
    hover: 'hover:bg-violet-50',
    icon: 'text-violet-700',
  },
  orange: {
    active: 'bg-orange-100 hover:bg-orange-200',
    hover: 'hover:bg-orange-50',
    icon: 'text-orange-700',
  },
};

interface SectionWithFiltersProps {
  title: string;
  count: number;
  accent: 'yellow' | 'violet' | 'orange';
  icon: React.ReactNode;
  tasks: Task[];
  showFrequencyFilter?: boolean;
  onSubmit: (formData: FormData) => Promise<boolean | ModeConflictError>;
  onDelete: (id: string) => Promise<boolean>;
  showProgressStatus?: boolean;
  emptyMessage: string;
  showDateStatusSplit?: boolean;
  allowEditOrder?: boolean;
}

export function SectionWithFilters({
  title,
  count: _count,
  accent,
  icon,
  tasks,
  showFrequencyFilter = false,
  onSubmit,
  onDelete,
  showProgressStatus = false,
  emptyMessage,
  showDateStatusSplit = false,
  allowEditOrder = true,
}: SectionWithFiltersProps) {
  const router = useRouter();
  const [presenceFilter, setPresenceFilter] = useState<PresenceFilter>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<FrequencyFilter>('all');
  const [isEditOrderMode, setIsEditOrderMode] = useState(false);
  const [orderedTasks, setOrderedTasks] = useState<Task[]>(tasks);
  const [isSaving, setIsSaving] = useState(false);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const mode = task.mode ?? 'Tous';
      if (presenceFilter === 'presentiel' && mode === 'Distanciel') return false;
      if (presenceFilter === 'distanciel' && mode === 'Présentiel') return false;
      if (showFrequencyFilter && frequencyFilter !== 'all' && task.frequency !== frequencyFilter)
        return false;
      return true;
    });
  }, [tasks, presenceFilter, frequencyFilter, showFrequencyFilter]);

  const todayIso = formatDateLocal(normalizeToMidnight(new Date()));

  const { upcomingTasks, pastTasks } = useMemo(() => {
    if (!showDateStatusSplit) {
      return { upcomingTasks: filteredTasks, pastTasks: [] };
    }

    return filteredTasks.reduce(
      (acc, task) => {
        const dueOn = task.due_on ?? todayIso;
        if (dueOn >= todayIso) {
          acc.upcomingTasks.push(task);
        } else {
          acc.pastTasks.push(task);
        }
        return acc;
      },
      { upcomingTasks: [] as Task[], pastTasks: [] as Task[] },
    );
  }, [filteredTasks, showDateStatusSplit, todayIso]);

  const { inProgressTasks, notStartedTasks, inProgressGrouped } = useMemo(() => {
    if (!showProgressStatus) {
      return { inProgressTasks: [], notStartedTasks: filteredTasks, inProgressGrouped: { upcoming: [], overdue: [], noDue: [] } };
    }

    const inProgress = filteredTasks.filter((t) => t.in_progress === true);
    const notStarted = filteredTasks.filter((t) => t.in_progress !== true);
    const grouped = groupInProgressTasksByDueDate(inProgress);

    return { inProgressTasks: inProgress, notStartedTasks: notStarted, inProgressGrouped: grouped };
  }, [filteredTasks, showProgressStatus]);

  const formatDateDisplay = (dateStr: string): string => {
    const date = parseDateLocal(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const c = useMemo(() => ACCENT_CLASSES[accent], [accent]);
  const hasActiveFilters = useMemo(() => {
    return presenceFilter !== 'all' || (showFrequencyFilter && frequencyFilter !== 'all');
  }, [presenceFilter, frequencyFilter, showFrequencyFilter]);

  const filterColors = useMemo(() => FILTER_BUTTON_CLASSES[accent], [accent]);

  // Update orderedTasks when tasks prop changes (but not in edit mode)
  useEffect(() => {
    if (!isEditOrderMode) {
      setOrderedTasks(filteredTasks);
    }
  }, [filteredTasks, isEditOrderMode]);

  const handleStartEditOrder = () => {
    setOrderedTasks(filteredTasks);
    setIsEditOrderMode(true);
  };

  const handleCancelEditOrder = () => {
    setIsEditOrderMode(false);
    setOrderedTasks(filteredTasks);
  };

  const handleSaveOrder = async () => {
    if (orderedTasks.length === 0) return;

    setIsSaving(true);
    try {
      const taskIds = orderedTasks.map((task) => task.id);
      const success = await updateTasksDisplayOrderAction(taskIds);
      if (success) {
        setIsEditOrderMode(false);
        router.refresh();
      }
    } catch (error) {
      console.error('Error saving order:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOrderChange = (newOrderedTasks: Task[]) => {
    setOrderedTasks(newOrderedTasks);
  };

  // Use orderedTasks when in edit mode, otherwise use filteredTasks
  const tasksToDisplay = isEditOrderMode ? orderedTasks : filteredTasks;

  return (
    <section className="mb-8 group transition-transform">
      <div
        className={`relative rounded-md border overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
      >
        <div className={`absolute inset-0 ${c.headerBg} pointer-events-none`} />
        <div className={`h-1 ${c.bar}`} />
        <div className="p-4 flex items-center justify-between relative">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-background border shadow-sm">
              {icon}
            </span>
            <h2 className={`text-base font-semibold ${c.title}`}>{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {!isEditOrderMode ? (
              <>
                {allowEditOrder && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStartEditOrder}
                    disabled={filteredTasks.length === 0}
                    className={`h-8 text-xs ${filterColors.hover} cursor-pointer`}
                  >
                    <GripVertical className={`h-4 w-4 mr-1 ${filterColors.icon}`} />
                    Ordre
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className={`h-8 w-8 cursor-pointer transition-colors relative focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0 data-[state=open]:ring-0 data-[state=open]:ring-offset-0 data-[state=open]:border-0 ${
                        hasActiveFilters ? filterColors.active : filterColors.hover
                      }`}
                    >
                      <Filter className={`h-4 w-4 ${filterColors.icon}`} />
                      {hasActiveFilters && (
                        <span className="absolute top-0.5 right-0.5 h-2 w-2 bg-red-500 rounded-full border-2 border-background" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Présence</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={presenceFilter}
                      onValueChange={(value) => setPresenceFilter(value as PresenceFilter)}
                    >
                      <DropdownMenuRadioItem value="all" className="cursor-pointer">
                        Tous
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="presentiel" className="cursor-pointer">
                        Présentiel
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="distanciel" className="cursor-pointer">
                        Distanciel
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    {showFrequencyFilter && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Fréquence</DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                          value={frequencyFilter}
                          onValueChange={(value) => setFrequencyFilter(value as FrequencyFilter)}
                        >
                          <DropdownMenuRadioItem value="all" className="cursor-pointer">
                            Toutes
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="quotidien" className="cursor-pointer">
                            Quotidien
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="hebdomadaire" className="cursor-pointer">
                            Hebdomadaire
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="mensuel">Mensuel</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="personnalisé">
                            Personnalisé
                          </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveOrder}
                  disabled={isSaving}
                  className={`h-8 text-xs ${filterColors.hover} cursor-pointer`}
                >
                  <Check className={`h-4 w-4 mr-1 ${filterColors.icon}`} />
                  {isSaving ? '...' : ''}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEditOrder}
                  disabled={isSaving}
                  className={`h-8 text-xs ${filterColors.hover} cursor-pointer`}
                >
                  <X className={`h-4 w-4 mr-1 ${filterColors.icon}`} />
                </Button>
              </>
            )}
            <span className={`text-xs px-2 py-1 rounded ${c.chip}`}>
              {tasksToDisplay.length} tâche{tasksToDisplay.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="p-4 pt-0">
          <div className="grid gap-3">
            {tasksToDisplay.length === 0 ? (
              <div className="text-sm text-muted-foreground">{emptyMessage}</div>
            ) : isEditOrderMode ? (
              <DraggableTaskList
                tasks={tasksToDisplay}
                onSubmit={onSubmit}
                onDelete={onDelete}
                showProgressStatus={showProgressStatus}
                onOrderChange={handleOrderChange}
              />
            ) : showDateStatusSplit ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>Évènements à venir</span>
                    <span>{upcomingTasks.length}</span>
                  </div>
                  <div className="mt-2 space-y-3">
                    {upcomingTasks.length === 0 ? (
                      <div className="text-xs text-muted-foreground/80">
                        Aucun évènement à venir.
                      </div>
                    ) : (
                      upcomingTasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onSubmit={onSubmit}
                          onDelete={onDelete}
                          showProgressStatus={showProgressStatus}
                        />
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>Évènements passés</span>
                    <span>{pastTasks.length}</span>
                  </div>
                  <div className="mt-2 space-y-3">
                    {pastTasks.length === 0 ? (
                      <div className="text-xs text-muted-foreground/80">Aucun évènement passé.</div>
                    ) : (
                      pastTasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onSubmit={onSubmit}
                          onDelete={onDelete}
                          showProgressStatus={showProgressStatus}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : showProgressStatus ? (
              <div className="space-y-5">
                {inProgressTasks.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-medium text-foreground">
                      En cours ({inProgressTasks.length})
                    </h4>
                    <div className="space-y-5">
                      {inProgressGrouped.overdue.length > 0 && (
                        <div className="rounded-lg border-2 border-red-400/70 bg-red-100/90 p-3">
                          <h5 className="mb-3 text-xs font-semibold text-red-900 uppercase tracking-wide flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-red-700"></span>
                            Échéance dépassée ({inProgressGrouped.overdue.length})
                          </h5>
                          <div className="mt-2 space-y-3">
                            {inProgressGrouped.overdue.map((task) => (
                              <div key={task.id}>
                                <TaskItem
                                  task={task}
                                  onSubmit={onSubmit}
                                  onDelete={onDelete}
                                  showProgressStatus={showProgressStatus}
                                />
                                {task.due_on && (
                                  <div className="text-xs text-muted-foreground mt-1 ml-4">
                                    {formatDateDisplay(task.due_on)}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {inProgressGrouped.upcoming.length > 0 && (
                        <div className="rounded-lg border-2 border-amber-400/70 bg-amber-100/90 p-3">
                          <h5 className="mb-3 text-xs font-semibold text-amber-900 uppercase tracking-wide flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-amber-600"></span>
                            Avec échéance à venir ({inProgressGrouped.upcoming.length})
                          </h5>
                          <div className="mt-2 space-y-3">
                            {inProgressGrouped.upcoming.map((task) => (
                              <div key={task.id}>
                                <TaskItem
                                  task={task}
                                  onSubmit={onSubmit}
                                  onDelete={onDelete}
                                  showProgressStatus={showProgressStatus}
                                />
                                {task.due_on && (
                                  <div className="text-xs text-muted-foreground mt-1 ml-4">
                                    {formatDateDisplay(task.due_on)}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {inProgressGrouped.noDue.length > 0 && (
                        <div className="rounded-lg border-2 border-orange-400/70 bg-orange-100/90 p-3">
                          <h5 className="mb-3 text-xs font-semibold text-orange-900 uppercase tracking-wide flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-orange-600"></span>
                            Sans échéance ({inProgressGrouped.noDue.length})
                          </h5>
                          <div className="mt-2 space-y-3">
                            {inProgressGrouped.noDue.map((task) => (
                              <TaskItem
                                key={task.id}
                                task={task}
                                onSubmit={onSubmit}
                                onDelete={onDelete}
                                showProgressStatus={showProgressStatus}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {notStartedTasks.length > 0 && (
                  <div className="rounded-lg border-2 border-slate-400/70 bg-slate-100/90 p-3">
                    <h4 className="mb-3 text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-slate-500"></span>
                      Pas encore commencées ({notStartedTasks.length})
                    </h4>
                    <div className="space-y-3">
                      {notStartedTasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onSubmit={onSubmit}
                          onDelete={onDelete}
                          showProgressStatus={showProgressStatus}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              tasksToDisplay.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onSubmit={onSubmit}
                  onDelete={onDelete}
                  showProgressStatus={showProgressStatus}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
