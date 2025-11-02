"use client";

import { useState, useEffect } from "react";
import { Task, Frequency, DayOfWeek } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type TaskFormProps = {
  task?: Task;
  formId?: string;
  onTaskTypeChange?: (taskType: "periodic" | "specific" | "when-possible") => void;
};

export function TaskForm({ task, formId = "", onTaskTypeChange }: TaskFormProps) {
  // Déterminer le type de tâche initial
  const getInitialTaskType = (): "periodic" | "specific" | "when-possible" => {
    if (task) {
      if (task.frequency) return "periodic";
      if (task.due_on) return "specific";
      return "when-possible";
    }
    return "periodic";
  };

  const [taskType, setTaskType] = useState<"periodic" | "specific" | "when-possible">(getInitialTaskType());
  const [frequency, setFrequency] = useState<Frequency | "">(task?.frequency || "");

  useEffect(() => {
    if (onTaskTypeChange) {
      onTaskTypeChange(taskType);
    }
  }, [taskType, onTaskTypeChange]);

  const handleTaskTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as "periodic" | "specific" | "when-possible";
    setTaskType(newType);
  };

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFrequency(e.target.value as Frequency | "");
  };

  const prefix = formId || (task ? `task-${task.id}` : "new");
  const showDayField = frequency === "hebdomadaire" || frequency === "mensuel";

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
          required
        />
      </div>

      <div>
        <label htmlFor={`description-${prefix}`} className="block text-sm font-medium text-foreground mb-1">
          Description
        </label>
        <Textarea
          id={`description-${prefix}`}
          name="description"
          defaultValue={task?.description || ""}
          placeholder="Description de la tâche"
          rows={3}
        />
      </div>

      <div>
        <label htmlFor={`taskType-${prefix}`} className="block text-sm font-medium text-foreground mb-1">
          Type de la tâche *
        </label>
        <select
          id={`taskType-${prefix}`}
          name="taskType"
          value={taskType}
          onChange={handleTaskTypeChange}
          className="w-full h-9 px-3 border border-input bg-background rounded-md text-sm"
          required={!task}
        >
          <option value="">Choisir un type</option>
          <option value="periodic">Périodique</option>
          <option value="specific">À faire à date précise</option>
          <option value="when-possible">Quand je peux</option>
        </select>
      </div>

      {/* Champs pour tâches périodiques */}
      {taskType === "periodic" && (
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
              className="w-full h-9 px-3 border border-input bg-background rounded-md text-sm"
              required={!task}
            >
              <option value="">Choisir une fréquence</option>
              <option value="quotidien">Quotidien</option>
              <option value="hebdomadaire">Hebdomadaire</option>
              <option value="mensuel">Mensuel</option>
              <option value="annuel">Annuel</option>
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
                className="w-full h-9 px-3 border border-input bg-background rounded-md text-sm"
                required={!task}
              >
                <option value="">Choisir un jour</option>
                <option value="Lundi">Lundi</option>
                <option value="Mardi">Mardi</option>
                <option value="Mercredi">Mercredi</option>
                <option value="Jeudi">Jeudi</option>
                <option value="Vendredi">Vendredi</option>
                <option value="Samedi">Samedi</option>
                <option value="Dimanche">Dimanche</option>
              </select>
            </div>
          )}
        </>
      )}

      {/* Champs pour tâches à date précise */}
      {taskType === "specific" && (
        <>
          <div>
            <label htmlFor={`due_on-${prefix}`} className="block text-sm font-medium text-foreground mb-1">
              Date de la tâche *
            </label>
            <Input
              id={`due_on-${prefix}`}
              name="due_on"
              type="date"
              defaultValue={task?.due_on ? (task.due_on.includes('T') ? task.due_on.split('T')[0] : task.due_on) : ""}
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
              min="0"
            />
          </div>
        </>
      )}

      {/* Champs pour tâches "Quand je peux" */}
      {taskType === "when-possible" && (
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="in_progress"
              defaultChecked={!!task?.in_progress}
              className="rounded"
            />
            <span className="text-sm font-medium text-foreground">En cours</span>
          </label>
        </div>
      )}

      {/* Champ distanciel pour tous les types */}
      <div className="flex items-center space-x-2">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="is_remote"
            defaultChecked={!!task?.is_remote}
            className="rounded"
          />
          <span className="text-sm font-medium text-foreground">Distanciel</span>
        </label>
      </div>
    </div>
  );
}
