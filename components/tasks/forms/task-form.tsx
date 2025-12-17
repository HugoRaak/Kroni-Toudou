"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { Task, Frequency } from "@/lib/types";
import { TASK_TYPES, FREQUENCIES, DAYS_OF_WEEK, TASK_MODES, type TaskType } from "@/lib/tasks/constants/task-constants";
import { Input } from "@/components/ui/input";
import type { CalendarView } from "@/lib/calendar/calendar-navigation";

type TaskFormProps = {
  task?: Task | (Partial<Task> & { id: string; title: string; description?: string });
  formId?: string;
  onTaskTypeChange?: (taskType: TaskType) => void;
  isViewingToday?: boolean;
  onTempTaskChange?: (isTemp: boolean) => void;
  currentView?: CalendarView;
  dayDate?: Date;
};

const TaskDescriptionEditor = dynamic(
  () =>
    import("../description/task-description-editor").then(
      (m) => m.TaskDescriptionEditor
    ),
  {
    ssr: false,
    loading: () => (
      <textarea
        className="w-full min-h-[80px] border border-input rounded-md bg-background text-sm p-2"
        placeholder="Description de la tâche"
        disabled
      />
    ),
  }
);

export function TaskForm({ task, formId = "", onTaskTypeChange, isViewingToday = false, onTempTaskChange, currentView = "day", dayDate }: TaskFormProps) {
  // Check if this is a temp task (temp tasks have IDs starting with "temp-")
  const isEditingTempTask = task?.id?.startsWith('temp-') || false;

  // Déterminer le type de tâche initial selon la vue
  const getInitialTaskType = (): typeof TASK_TYPES[keyof typeof TASK_TYPES] => {
    if (task && !isEditingTempTask) {
      if ((task as Task).frequency) return TASK_TYPES.PERIODIC;
      if ((task as Task).in_progress) return TASK_TYPES.WHEN_POSSIBLE;
      if ((task as Task).due_on) return TASK_TYPES.SPECIFIC;
      return TASK_TYPES.WHEN_POSSIBLE;
    }
    // Si on crée une nouvelle tâche et qu'on est en vue jour != aujourd'hui, semaine ou mois, pré-remplir avec type spécifique
    if (!task && !isViewingToday) {
      if (currentView === "day" || currentView === "week" || currentView === "month") {
        return TASK_TYPES.SPECIFIC;
      }
    }
    return TASK_TYPES.PERIODIC;
  };

  // Format date for input field (YYYY-MM-DD)
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Déterminer la date initiale pour les tâches à date précise ou "quand je peux" avec échéance
  const getInitialDueDate = (): string => {
    if (task?.due_on) {
      return task.due_on.includes('T') ? task.due_on.split('T')[0] : task.due_on;
    }
    // Si on crée une nouvelle tâche et qu'on est en vue jour != aujourd'hui, pré-remplir avec la date du jour de la vue
    if (!task && currentView === "day" && dayDate && !isViewingToday) {
      return formatDateForInput(dayDate);
    }
    return "";
  };

  const [taskType, setTaskType] = useState<typeof TASK_TYPES[keyof typeof TASK_TYPES]>(getInitialTaskType());
  const [frequency, setFrequency] = useState<Frequency | "">((task as Task)?.frequency || "");
  const [dueDate, setDueDate] = useState<string>(getInitialDueDate());
  // If isViewingToday is true and not editing an existing task, default to temp task
  const [isTempTask, setIsTempTask] = useState(isEditingTempTask || (!task && isViewingToday));
  const [inProgress, setInProgress] = useState<boolean>(!!task?.in_progress);

  useEffect(() => {
    if (onTaskTypeChange) {
      onTaskTypeChange(taskType);
    }
  }, [taskType, onTaskTypeChange]);

  useEffect(() => {
    if (onTempTaskChange) {
      onTempTaskChange(isTempTask);
    }
  }, [isTempTask, onTempTaskChange]);

  const handleTaskTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as typeof TASK_TYPES[keyof typeof TASK_TYPES];
    if (Object.values(TASK_TYPES).includes(newType)) {
      setTaskType(newType);
      // Si on passe à SPECIFIC et qu'on a une date disponible (vue jour != aujourd'hui), l'utiliser
      if (newType === TASK_TYPES.SPECIFIC && !task && currentView === "day" && dayDate && !isViewingToday) {
        const year = dayDate.getFullYear();
        const month = String(dayDate.getMonth() + 1).padStart(2, '0');
        const day = String(dayDate.getDate()).padStart(2, '0');
        setDueDate(`${year}-${month}-${day}`);
      } else if (newType !== TASK_TYPES.SPECIFIC) {
        // Si on change de type, réinitialiser la date
        setDueDate("");
      }
    }
  };

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFrequency(e.target.value as Frequency | "");
  };

  const prefix = formId || (task ? `task-${task.id}` : "new");
  const showDayField = frequency === "hebdomadaire" || frequency === "mensuel";
  const showStartDateField = frequency === "annuel";
  const showCustomFields = frequency === "personnalisé";

  return (
    <div className="space-y-4">
      <input type="hidden" name="taskType" value={taskType} />
      
      <div>
        <div className="block text-sm font-medium text-foreground mb-1">
          Titre *
        </div>
        <Input
          id={`title-${prefix}`}
          name="title"
          type="text"
          defaultValue={task?.title || ""}
          placeholder="Titre de la tâche"
          maxLength={100}
          required
        />
      </div>

      <div>
        <label htmlFor={`description-${prefix}`} className="block text-sm font-medium text-foreground mb-1">
          Description
        </label>
        <TaskDescriptionEditor
          id={`description-${prefix}`}
          name="description"
          value={task?.description || ""}
          placeholder="Description de la tâche"
        />
      </div>

      {!isTempTask && (
        <div>
          <label htmlFor={`taskType-${prefix}`} className="block text-sm font-medium text-foreground mb-1">
            Type de la tâche *
          </label>
          <select
            id={`taskType-${prefix}`}
            name="taskType"
            value={taskType}
            onChange={handleTaskTypeChange}
            className="w-full h-9 px-3 border border-input bg-background rounded-md text-sm cursor-pointer"
            required={!task}
            disabled={isEditingTempTask}
          >
            <option value="">Choisir un type</option>
            <option value={TASK_TYPES.PERIODIC}>Périodique</option>
            <option value={TASK_TYPES.SPECIFIC}>À faire à date précise</option>
            <option value={TASK_TYPES.WHEN_POSSIBLE}>Quand je peux</option>
          </select>
        </div>
      )}

      {isEditingTempTask && (
        <>
          <div className="flex items-center space-x-2 border-t pt-4">
            <span className="text-sm font-medium text-blue-600">
              Tâche temporaire (uniquement pour aujourd&apos;hui)
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Note : Pour les tâches temporaires, seuls le titre et la description peuvent être modifiés.
          </div>
        </>
      )}

      {/* Champs pour tâches périodiques */}
      {!isTempTask && taskType === TASK_TYPES.PERIODIC && (
        <>
          <div>
            <label htmlFor={`frequency-${prefix}`} className="block text-sm font-medium text-foreground mb-1">
              Fréquence *
            </label>
            <select
              id={`frequency-${prefix}`}
              name="frequency"
              value={frequency}
              onChange={handleFrequencyChange}
              className="w-full h-9 px-3 border border-input bg-background rounded-md text-sm cursor-pointer"
              required={!task}
            >
              <option value="">Choisir une fréquence</option>
              {FREQUENCIES.map((freq) => (
                <option key={freq} value={freq}>
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {showDayField && (
            <div>
              <label htmlFor={`day-${prefix}`} className="block text-sm font-medium text-foreground mb-1">
                Jour de la répétition *
              </label>
              <select
                id={`day-${prefix}`}
                name="day"
                defaultValue={task?.day || ""}
                className="w-full h-9 px-3 border border-input bg-background rounded-md text-sm cursor-pointer"
                required={!task}
              >
                <option value="">Choisir un jour</option>
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showStartDateField && (
            <div>
              <label htmlFor={`start_date-annuel-${prefix}`} className="block text-sm font-medium text-foreground mb-1">
                Date de début *
              </label>
              <Input
                id={`start_date-annuel-${prefix}`}
                name="start_date"
                type="date"
                defaultValue={task?.start_date ? (task.start_date.includes('T') ? task.start_date.split('T')[0] : task.start_date) : ""}
                required
              />
            </div>
          )}

          {showCustomFields && (
            <>
              <div>
                <label htmlFor={`custom_days-${prefix}`} className="block text-sm font-medium text-foreground mb-1">
                  Répéter tous les X jours *
                </label>
                <Input
                  id={`custom_days-${prefix}`}
                  name="custom_days"
                  type="number"
                  defaultValue={typeof task?.custom_days === "number" ? String(task.custom_days) : ""}
                  placeholder="Ex: 3"
                  min="1"
                  required
                />
              </div>
              <div>
                <label htmlFor={`start_date-custom-${prefix}`} className="block text-sm font-medium text-foreground mb-1">
                  Date de début *
                </label>
                <Input
                  id={`start_date-custom-${prefix}`}
                  name="start_date"
                  type="date"
                  defaultValue={task?.start_date ? (task.start_date.includes('T') ? task.start_date.split('T')[0] : task.start_date) : ""}
                  required
                />
              </div>
              <div>
                <label htmlFor={`max_shifting_days-${prefix}`} className="block text-sm font-medium text-foreground mb-1">
                  Nombre de jours maximum de décalage
                </label>
                <Input
                  id={`max_shifting_days-${prefix}`}
                  name="max_shifting_days"
                  type="number"
                  defaultValue={typeof task?.max_shifting_days === "number" ? String(task.max_shifting_days) : ""}
                  placeholder="Ex: 5"
                  min="1"
                  max="45"
                />
              </div>
            </>
          )}
        </>
      )}

      {/* Champs pour tâches à date précise */}
      {!isTempTask && taskType === TASK_TYPES.SPECIFIC && (
        <>
          <div>
            <label htmlFor={`due_on-${prefix}`} className="block text-sm font-medium text-foreground mb-1">
              Date de la tâche *
            </label>
            <Input
              id={`due_on-${prefix}`}
              name="due_on"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required={!task}
            />
          </div>

          <div>
            <label htmlFor={`postponed_days-${prefix}`} className="block text-sm font-medium text-foreground mb-1">
              À reporter dans (jours)
            </label>
            <Input
              id={`postponed_days-${prefix}`}
              name="postponed_days"
              type="number"
              defaultValue={typeof task?.postponed_days === "number" ? String(task.postponed_days) : ""}
              placeholder="0"
            min="1"
            />
          </div>
        </>
      )}

      {/* Champs pour tâches "Quand je peux" */}
      {!isTempTask && taskType === TASK_TYPES.WHEN_POSSIBLE && (
        <>
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="in_progress"
                checked={inProgress}
                onChange={(e) => setInProgress(e.target.checked)}
                className="rounded cursor-pointer"
              />
              <span className="text-sm font-medium text-foreground">En cours</span>
            </label>
          </div>
          <div>
            <label htmlFor={`due_on-when-possible-${prefix}`} className="block text-sm font-medium text-foreground mb-1">
              Échéance (optionnel)
            </label>
            <Input
              id={`due_on-when-possible-${prefix}`}
              name="due_on"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </>
      )}

      {/* Work mode for all types (except temporary tasks) */}
      {!isTempTask && (
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-foreground" htmlFor={`${prefix}-mode`}>
            Mode
          </label>
          <select
            id={`${prefix}-mode`}
            name="mode"
            defaultValue={task?.mode ?? 'Tous'}
            className="border rounded px-2 py-1 bg-background cursor-pointer"
          >
            {TASK_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Option pour tâche temporaire (uniquement pour aujourd'hui) */}
      {!task && (
        <div className="flex items-center space-x-2 border-t pt-4 pb-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isTempTask}
              onChange={(e) => setIsTempTask(e.target.checked)}
              className="rounded cursor-pointer"
            />
            <span className="text-sm font-medium text-foreground">
              Uniquement pour aujourd&apos;hui (tâche temporaire)
            </span>
          </label>
        </div>
      )}
      {isTempTask && (
        <input type="hidden" name="is_temp_task" value="true" />
      )}
    </div>
  );
}
