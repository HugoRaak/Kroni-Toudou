"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ModeConflictError } from "@/app/actions/tasks";
import { formatDateLocal, parseDateLocal } from "@/lib/utils";
import { getWorkdayAction } from "@/app/actions/workdays";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getTasksForDayAction } from "@/app/actions/tasks";

type WorkModeConflictDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflict: ModeConflictError;
  userId: string;
  onDateChange: (taskId: string, newDate: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  onConflictResolved?: () => void;
  conflictIndex?: number;
  totalConflicts?: number;
};

export function WorkModeConflictDialog({
  open,
  onOpenChange,
  conflict,
  userId,
  onDateChange,
  onCancel,
  onConfirm,
  onConflictResolved,
  conflictIndex = 0,
  totalConflicts = 1,
}: WorkModeConflictDialogProps) {
  const [isResolving, setIsResolving] = useState(false);
  const [proposedDate, setProposedDate] = useState<string | null>(null);
  const [isSearchingDate, setIsSearchingDate] = useState(false);
  const [conflictingTasks, setConflictingTasks] = useState<Array<{ id: string; title: string }>>([]);

  const formatDate = (dateStr: string): string => {
    const date = parseDateLocal(dateStr);
    return date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatDateShort = (dateStr: string): string => {
    const date = parseDateLocal(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getModeLabel = (mode: string): string => {
    switch (mode) {
      case 'Présentiel': return 'Présentiel';
      case 'Distanciel': return 'Distanciel';
      case 'Congé': return 'Congé';
      default: return mode;
    }
  };

  // Load conflicting tasks when dialog opens
  useEffect(() => {
    if (open && userId) {
      getTasksForDayAction(userId, conflict.taskDate).then(dayTasks => {
        if (dayTasks && dayTasks.specific) {
          const conflicts = dayTasks.specific
            .filter(task => task.mode === conflict.taskMode)
            .map(task => ({ id: task.id, title: task.title }));
          setConflictingTasks(conflicts);
        }
      }).catch(err => {
        console.error('Error loading tasks:', err);
      });
    }
  }, [open, userId, conflict.taskDate, conflict.taskMode]);

  const handleSearchDate = async () => {
    setIsSearchingDate(true);
    try {
      // Find next matching date (up to 10 days ahead)
      const conflictDate = parseDateLocal(conflict.taskDate);
      let nextDate = new Date(conflictDate);
      nextDate.setDate(nextDate.getDate() + 1);
      
      let foundDate: string | null = null;
      for (let i = 0; i < 10; i++) {
        const dateStr = formatDateLocal(nextDate);
        const workMode = await getWorkdayAction(userId, dateStr);
        
        // Check if work mode matches task mode (or is "Tous")
        if (workMode !== 'Congé' && workMode === conflict.taskMode) {
          foundDate = dateStr;
          break;
        }
        
        nextDate.setDate(nextDate.getDate() + 1);
      }
      
      if (foundDate) {
        setProposedDate(foundDate);
      } else {
        toast.error("Aucune date compatible trouvée dans les 10 jours suivants");
      }
    } catch (error) {
      console.error('Error searching date:', error);
      toast.error("Erreur lors de la recherche de date");
    } finally {
      setIsSearchingDate(false);
    }
  };

  const handleAcceptProposedDate = () => {
    if (proposedDate && conflictingTasks.length > 0) {
      setIsResolving(true);
      try {
        conflictingTasks.forEach(task => {
            onDateChange(task.id, proposedDate);
        });
        toast.success(`${conflictingTasks.length} tâche(s) déplacée(s) au ${formatDate(proposedDate)}`);
        setProposedDate(null);
        onOpenChange(false);
        // If onConflictResolved is provided, use it (tasks moved, conflict should be resolved)
        // Otherwise fall back to onConfirm (force save)
        if (onConflictResolved) {
          onConflictResolved();
        } else {
          onConfirm();
        }
      } finally {
        setIsResolving(false);
      }
    }
  };

  const handleBackToForm = () => {
    setProposedDate(null);
    onOpenChange(false);
  };

  const handleConfirmAnyway = () => {
    // User wants to proceed with the mode change anyway
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    setProposedDate(null);
    onCancel();
    onOpenChange(false);
  };

  // If a date is proposed, show the proposal view
  if (proposedDate) {
    const hasMultipleTasks = conflictingTasks.length > 1;
    
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-w-[95vw] overflow-hidden">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-base sm:text-lg">Date proposée</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm break-words leading-relaxed">
              {hasMultipleTasks 
                ? `Nous avons trouvé une date compatible pour déplacer ${conflictingTasks.length} tâche(s) en conflit.`
                : `Nous avons trouvé une date compatible pour la tâche "${conflictingTasks[0]?.title || 'votre tâche'}".`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-3 sm:py-4 space-y-3">
            <div className="bg-muted p-3 sm:p-4 rounded-md">
              <div className="text-center space-y-2">
                <p className="text-xs sm:text-sm text-muted-foreground">Date proposée :</p>
                <p className="text-base sm:text-lg font-semibold text-foreground break-words px-2">
                  {formatDate(proposedDate)}
                </p>
                <p className="text-xs text-muted-foreground mt-2 break-words px-2">
                  Cette date correspond au mode {getModeLabel(conflict.taskMode)} de {hasMultipleTasks ? 'vos tâches' : 'votre tâche'}.
                </p>
              </div>
            </div>

            {hasMultipleTasks && (
              <div className="bg-background border rounded-md p-3 max-h-32 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground mb-2">Tâches concernées :</p>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  {conflictingTasks.map(task => (
                    <li key={task.id} className="break-words">{task.title}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              Que souhaitez-vous faire ?
            </p>
          </div>

          <DialogFooter className="flex-col gap-2 w-full">
          <Button
                variant="default"
                onClick={handleAcceptProposedDate}
                disabled={isResolving}
                className="flex-1 text-sm cursor-pointer w-full"
              >
                Déplacer {hasMultipleTasks ? 'toutes' : 'la'} tâche{hasMultipleTasks ? 's' : ''} à cette date
              </Button>
            <Button
              variant="outline"
              onClick={handleBackToForm}
              disabled={isResolving}
              className="flex-1 text-sm cursor-pointer w-full"
            >
              Choisir une date manuellement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Default view: show conflict
  const hasMultipleTasks = conflictingTasks.length > 1;
  const taskCountText = conflictingTasks.length === 0 
    ? 'une tâche'
    : conflictingTasks.length === 1
    ? `la tâche "${conflictingTasks[0]?.title || 'votre tâche'}"`
    : `${conflictingTasks.length} tâches`;

  const hasMultipleConflicts = totalConflicts > 1;
  const conflictProgress = hasMultipleConflicts ? ` (${conflictIndex + 1}/${totalConflicts})` : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-w-[95vw] overflow-hidden">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-base sm:text-lg">
            Conflit de mode{conflictProgress}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm break-words leading-relaxed">
            Le changement du mode de travail en {getModeLabel(conflict.workMode)} pour le {formatDate(conflict.taskDate)} entre en conflit avec {taskCountText} prévue(s) pour ce jour en mode {getModeLabel(conflict.taskMode)}.
            {hasMultipleConflicts && (
              <span className="block mt-1 text-xs text-muted-foreground">
                {conflictIndex + 1} sur {totalConflicts} conflit(s) à traiter
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-3 sm:py-4 space-y-3">
          {hasMultipleTasks && (
            <div className="bg-background border rounded-md p-3 max-h-32 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground mb-2">Tâches en conflit :</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                {conflictingTasks.map(task => (
                  <li key={task.id} className="break-words">{task.title}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="bg-muted p-3 rounded-md">
            <div className="text-xs sm:text-sm space-y-1.5 break-words">
              <div className="break-words">
                <span className="font-medium">Mode de{hasMultipleTasks ? 's tâches' : ' la tâche'} :</span>{" "}
                <span className="text-amber-600 dark:text-amber-500">{getModeLabel(conflict.taskMode)}</span>
              </div>
              <div className="break-words">
                <span className="font-medium">Nouveau mode de travail :</span>{" "}
                <span className="text-amber-600 dark:text-amber-500">{getModeLabel(conflict.workMode)}</span>
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground">
            Que souhaitez-vous faire ?
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:gap-2">
          <Button
            variant="default"
            onClick={handleSearchDate}
            disabled={isResolving || isSearchingDate}
            className="flex-1 text-sm cursor-pointer w-full"
          >
            {isSearchingDate ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Recherche...
              </>
            ) : (
              conflictingTasks.length > 1 
                ? "Déplacer les tâches à une autre date"
                : "Déplacer la tâche à une autre date"
            )}
          </Button>
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={handleConfirmAnyway}
              disabled={isResolving || isSearchingDate}
              className="flex-1 text-sm cursor-pointer"
            >
              Confirmer quand même
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isResolving || isSearchingDate}
              className="flex-1 text-sm cursor-pointer"
            >
              Annuler
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

