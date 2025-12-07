"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ModeConflictError } from "@/app/actions/tasks";
import { formatDateLocal, parseDateLocal, addDays } from "@/lib/utils";
import { setWorkdayAction } from "@/app/actions/workdays";
import { getWorkdayAction } from "@/app/actions/workdays";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type ModeConflictDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflict: ModeConflictError;
  userId: string;
  taskTitle: string;
  onDateChange: (newDate: string) => void;
  onModeChange: (newMode: 'Présentiel' | 'Distanciel') => void;
  onResolve: () => void;
  onConfirmAnyway?: () => void;
};

export function ModeConflictDialog({
  open,
  onOpenChange,
  conflict,
  userId,
  taskTitle,
  onDateChange,
  onModeChange,
  onResolve,
  onConfirmAnyway,
}: ModeConflictDialogProps) {
  const [isResolving, setIsResolving] = useState(false);
  const [proposedDate, setProposedDate] = useState<string | null>(null);
  const [isSearchingDate, setIsSearchingDate] = useState(false);

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

  // Get the workday mode to use based on task mode
  // For "Tous", default to "Présenttiel" (workdays don't have "Tous" mode)
  const getWorkdayMode = (taskMode: 'Tous' | 'Présentiel' | 'Distanciel'): 'Présentiel' | 'Distanciel' => {
    if (taskMode === 'Présentiel') return 'Présentiel';
    if (taskMode === 'Distanciel') return 'Distanciel';
    // For "Tous", default to "Présentiel"
    return 'Présentiel';
  };

  const handleSearchDate = async () => {
    setIsSearchingDate(true);
    try {
      // Find next matching date (up to 10 days ahead)
      const conflictDate = parseDateLocal(conflict.taskDate);
      let nextDate = addDays(conflictDate, 1);
      
      let foundDate: string | null = null;
      for (let i = 0; i < 10; i++) {
        const dateStr = formatDateLocal(nextDate);
        const workMode = await getWorkdayAction(userId, dateStr);
        
        // Check if work mode matches task mode (or is "Tous")
        if (workMode !== 'Congé' && (conflict.taskMode === 'Tous' || workMode === conflict.taskMode)) {
          foundDate = dateStr;
          break;
        }
        
        // Use addDays consistently to maintain timezone handling
        nextDate = addDays(nextDate, 1);
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
    if (proposedDate) {
      onDateChange(proposedDate);
      onResolve();
      toast.success(`Date de la tâche modifiée au ${formatDate(proposedDate)}`);
      setProposedDate(null);
      onOpenChange(false);
    }
  };

  const handleBackToForm = () => {
    setProposedDate(null);
    onOpenChange(false);
    // Le formulaire reste ouvert pour que l'utilisateur puisse modifier la date manuellement
  };

  const handleChangeWorkMode = async () => {
    setIsResolving(true);
    try {
      const workMode = getWorkdayMode(conflict.taskMode);
      const success = await setWorkdayAction(userId, conflict.taskDate, workMode);
      
      if (success) {
        onModeChange(workMode);
        onResolve();
        toast.success(`Mode de travail modifié en ${getModeLabel(workMode)} pour le ${formatDate(conflict.taskDate)}`);
      } else {
        toast.error("Erreur lors de la modification du mode de travail");
      }
    } catch (error) {
      console.error('Error changing work mode:', error);
      toast.error("Erreur lors de la modification du mode de travail");
    } finally {
      setIsResolving(false);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setProposedDate(null);
    onOpenChange(false);
  };

  const handleConfirmAnyway = () => {
    if (onConfirmAnyway) {
      onConfirmAnyway();
    } else {
      onResolve();
    }
    onOpenChange(false);
  };

  // Si une date est proposée, afficher la vue de proposition
  if (proposedDate) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-w-[95vw] overflow-hidden">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-base sm:text-lg">Date proposée</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm break-words leading-relaxed">
              Nous avons trouvé une date compatible pour votre tâche &quot;{taskTitle}&quot;.
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
                  Cette date correspond au mode {getModeLabel(conflict.taskMode)} de votre tâche.
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              Que souhaitez-vous faire ?
            </p>
          </div>

          <DialogFooter className="flex gap-2 w-full">
            <Button
              variant="default"
              onClick={handleAcceptProposedDate}
              disabled={isResolving}
              className="flex-1 text-sm cursor-pointer"
            >
              Utiliser cette date
            </Button>
            <Button
              variant="outline"
              onClick={handleBackToForm}
              disabled={isResolving}
              className="flex-1 text-sm cursor-pointer"
            >
              Choisir une date manuellement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Vue par défaut : afficher le conflit
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-w-[95vw] overflow-hidden">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-base sm:text-lg">Conflit de mode</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm break-words leading-relaxed">
            Le mode de la tâche &quot;{taskTitle}&quot; ne correspond pas au mode de travail prévu pour le {formatDate(conflict.taskDate)}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-3 sm:py-4 space-y-3">
          <div className="bg-muted p-3 rounded-md">
            <div className="text-xs sm:text-sm space-y-1.5">
              <div className="break-words">
                <span className="font-medium">Mode de la tâche :</span>{" "}
                <span className="text-amber-600 dark:text-amber-500">{getModeLabel(conflict.taskMode)}</span>
              </div>
              <div className="break-words">
                <span className="font-medium">Mode de travail prévu :</span>{" "}
                <span className="text-amber-600 dark:text-amber-500">{getModeLabel(conflict.workMode)}</span>
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground">
            Que souhaitez-vous faire ?
          </p>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-col sm:gap-2">
          {/* Bouton principal en haut */}
          <Button 
            variant="outline" 
            onClick={handleConfirmAnyway} 
            disabled={isResolving || isSearchingDate} 
            className="w-full text-sm cursor-pointer" 
          > 
            Confirmer quand même 
          </Button>
          
          {/* Bouton secondaire */}
          <Button 
            variant="outline" 
            onClick={handleChangeWorkMode} 
            disabled={isResolving || isSearchingDate} 
            className="w-full text-sm cursor-pointer" 
          > 
            Définir {formatDateShort(conflict.taskDate)} en {getModeLabel(getWorkdayMode(conflict.taskMode))} 
          </Button>
          
          {/* Deux boutons côte à côte en bas */}
          <div className="flex gap-2 w-full"> 
            <Button 
              variant="outline" 
              onClick={handleSearchDate} 
              disabled={isResolving || isSearchingDate} 
              className="flex-1 text-sm cursor-pointer" 
            > 
              {isSearchingDate ? ( 
                <> 
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
                  Recherche... 
                </> 
              ) : ( 
                "Proposer une date" 
              )} 
            </Button> 
            <Button 
              variant="default" 
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

