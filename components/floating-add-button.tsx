"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createTaskAction } from "@/app/actions/tasks";
import { Frequency, DayOfWeek } from "@/lib/types";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface FloatingAddButtonProps {
  userId: string;
}

export function FloatingAddButton({ userId }: FloatingAddButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    taskType: "" as "periodic" | "specific" | "when-possible" | "",
    frequency: "" as Frequency | "",
    day: "" as DayOfWeek | "",
    due_on: "",
    postponed_days: "",
    in_progress: false,
    is_remote: false,
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      taskType: "",
      frequency: "",
      day: "",
      due_on: "",
      postponed_days: "",
      in_progress: false,
      is_remote: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Préparer les données selon le type de tâche
      let taskData = {
        userId,
        title: formData.title,
        description: formData.description,
        frequency: undefined as Frequency | undefined,
        day: undefined as DayOfWeek | undefined,
        due_on: undefined as string | undefined,
        postponed_days: undefined as number | undefined,
        in_progress: formData.taskType === "when-possible" ? formData.in_progress : undefined,
        is_remote: formData.is_remote,
      };

      // Adapter les données selon le type
      if (formData.taskType === "periodic") {
        taskData.frequency = formData.frequency || undefined;
        taskData.day = formData.day || undefined;
      } else if (formData.taskType === "specific") {
        taskData.due_on = formData.due_on || undefined;
        taskData.postponed_days = formData.postponed_days ? parseInt(formData.postponed_days) : undefined;
      }

      const result = await createTaskAction(
        taskData.userId,
        taskData.title,
        taskData.description,
        taskData.frequency,
        taskData.day,
        taskData.due_on,
        taskData.postponed_days,
        taskData.in_progress,
        taskData.is_remote
      );

      if (result) {
        toast.success("Tâche créée avec succès");
        setIsOpen(false);
        resetForm();
        // Recharger la page pour afficher la nouvelle tâche
        window.location.reload();
      } else {
        toast.error("Erreur lors de la création de la tâche");
      }
    } catch (error) {
      toast.error("Erreur lors de la création de la tâche");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    if (!formData.title.trim() || !formData.taskType) return false;
    
    if (formData.taskType === "periodic") {
      if (!formData.frequency) return false;
      if ((formData.frequency === "hebdomadaire" || formData.frequency === "mensuel") && !formData.day) {
        return false;
      }
    }
    
    if (formData.taskType === "specific") {
        if (!formData.due_on) return false;
    }
    
    return true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-50 cursor-pointer"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[95vh] overflow-hidden">
                  
        <DialogHeader>
            <DialogTitle>Nouvelle tâche</DialogTitle>
        </DialogHeader>
         <div className="max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 scrollbar-track-transparent pr-4 pl-1">
            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <div className="block text-sm font-medium text-foreground mb-1">
                Titre *
                </div>
                <Input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Titre de la tâche"
                required
                />
            </div>

            <div>
                <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
                Description
                </label>
                <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Description de la tâche"
                rows={3}
                />
            </div>

            <div>
                <label htmlFor="taskType" className="block text-sm font-medium text-foreground mb-1">
                Type de la tâche *
                </label>
                <select
                id="taskType"
                value={formData.taskType}
                onChange={(e) => handleInputChange("taskType", e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                required
                >
                <option value="">Choisir un type</option>
                <option value="periodic">Périodique</option>
                <option value="specific">À faire à date précise</option>
                <option value="when-possible">Quand je peux</option>
                </select>
            </div>

            {/* Champs pour tâches périodiques */}
            {formData.taskType === "periodic" && (
                <>
                <div>
                    <label htmlFor="frequency" className="block text-sm font-medium text-foreground mb-1">
                    Fréquence *
                    </label>
                    <select
                    id="frequency"
                    value={formData.frequency}
                    onChange={(e) => handleInputChange("frequency", e.target.value)}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                    required
                    >
                    <option value="">Choisir une fréquence</option>
                    <option value="quotidien">Quotidien</option>
                    <option value="hebdomadaire">Hebdomadaire</option>
                    <option value="mensuel">Mensuel</option>
                    </select>
                </div>

                {(formData.frequency === "hebdomadaire" || formData.frequency === "mensuel") && (
                    <div>
                    <label htmlFor="day" className="block text-sm font-medium text-foreground mb-1">
                        Jour de la répétition *
                    </label>
                    <select
                        id="day"
                        value={formData.day}
                        onChange={(e) => handleInputChange("day", e.target.value)}
                        className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                        required
                    >
                        <option value="">Choisir un jour</option>
                        <option value="Lundi">Lundi</option>
                        <option value="Mardi">Mardi</option>
                        <option value="Mercredi">Mercredi</option>
                        <option value="Jeudi">Jeudi</option>
                        <option value="Vendredi">Vendredi</option>
                    </select>
                    </div>
                )}
                </>
            )}

            {/* Champs pour tâches à date précise */}
            {formData.taskType === "specific" && (
                <>
                <div>
                    <label htmlFor="due_on" className="block text-sm font-medium text-foreground mb-1">
                    Date de la tâche *
                    </label>
                    <Input
                    id="due_on"
                    type="date"
                    value={formData.due_on}
                    onChange={(e) => handleInputChange("due_on", e.target.value)}
                    required
                    />
                </div>

                <div>
                    <label htmlFor="postponed_days" className="block text-sm font-medium text-foreground mb-1">
                    À reporter dans (jours)
                    </label>
                    <Input
                    id="postponed_days"
                    type="number"
                    value={formData.postponed_days}
                    onChange={(e) => handleInputChange("postponed_days", e.target.value)}
                    placeholder="0"
                    min="0"
                    />
                </div>
                </>
            )}

            {/* Champs pour tâches "Quand je peux" */}
            {formData.taskType === "when-possible" && (
                <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2">
                    <input
                    type="checkbox"
                    checked={formData.in_progress}
                    onChange={(e) => handleInputChange("in_progress", e.target.checked)}
                    className="rounded"
                    />
                    <span className="text-sm font-medium text-foreground">En cours</span>
                </label>
                </div>
            )}

            {/* Champ télétravail pour tous les types */}
            <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2">
                <input
                    type="checkbox"
                    checked={formData.is_remote}
                    onChange={(e) => handleInputChange("is_remote", e.target.checked)}
                    className="rounded"
                    />
                <span className="text-sm font-medium text-foreground">Télétravail</span>
                </label>
            </div>

            <div className="flex space-x-2 pt-4">
                <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1 cursor-pointer"
                >
                Annuler
                </Button>
                <Button
                type="submit"
                disabled={loading || !isFormValid()}
                className="flex-1 cursor-pointer"
                >
                {loading ? "Création..." : "Créer"}
                </Button>
            </div>
            </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
