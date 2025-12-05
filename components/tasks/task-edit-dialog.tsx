"use client";

import { useState, useTransition, useEffect, useDeferredValue } from "react";
import { Task } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TaskForm } from "@/components/tasks/task-form";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { ModeConflictError } from "@/app/actions/tasks";
import { ModeConflictDialog } from "@/components/tasks/mode-conflict-dialog";
import { getCurrentUserIdAction } from "@/app/actions/tasks";
import { useRouter } from "next/navigation";

type TaskEditDialogProps = {
  task: Task | (Partial<Task> & { id: string; title: string });
  trigger: React.ReactNode;
  onSubmit: (formData: FormData) => Promise<boolean | ModeConflictError>;
  onDelete?: (id: string) => Promise<boolean>;
  onSuccess?: () => void;
};

export function TaskEditDialog({ 
  task, 
  trigger, 
  onSubmit, 
  onDelete,
  onSuccess 
}: TaskEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [shouldRenderContent, setShouldRenderContent] = useState(false);
  const [modeConflict, setModeConflict] = useState<ModeConflictError | null>(null);
  const [conflictFormData, setConflictFormData] = useState<FormData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  
  const deferredOpen = useDeferredValue(open);

  useEffect(() => {
    if (open && !userId) {
      getCurrentUserIdAction().then(setUserId);
    }
  }, [open, userId]);
  
  useEffect(() => {
    if (open) {
      const timer = requestAnimationFrame(() => {
        setShouldRenderContent(true);
      });
      return () => cancelAnimationFrame(timer);
    } else {
      setShouldRenderContent(false);
    }
  }, [open]);

  const handleSubmit = async (formData: FormData) => {
    const result = await onSubmit(formData);
    
    // Check for mode conflict
    if (result && typeof result === 'object' && 'type' in result && result.type === 'MODE_CONFLICT') {
      setModeConflict(result as ModeConflictError);
      setConflictFormData(formData);
      return;
    }
    
    if (result) {
      toast.success("Tâche modifiée avec succès");
      setOpen(false);
      // Notify calendar to reload tasks from DB
      window.dispatchEvent(new Event('task-updated'));
      onSuccess?.();
    } else {
      toast.error("Erreur lors de la modification de la tâche");
    }
  };

  const handleConflictResolve = () => {
    setModeConflict(null);
    setConflictFormData(null);
    // Re-submit the form after resolving conflict
    const form = document.querySelector('form');
    if (form) {
      form.requestSubmit();
    }
  };

  const handleConfirmAnyway = async () => {
    if (!conflictFormData || !userId) return;
    
    setModeConflict(null);
    
    startTransition(async () => {
      // Import updateTaskFromFormAction dynamically to avoid circular dependencies
      const { updateTaskFromFormAction } = await import('@/app/actions/tasks');
      const result = await updateTaskFromFormAction(conflictFormData, true);
      
      if (result === true) {
        toast.success("Tâche modifiée avec succès");
        setOpen(false);
        window.dispatchEvent(new Event('task-updated'));
        onSuccess?.();
      } else {
        toast.error("Erreur lors de la modification de la tâche");
      }
      
      setConflictFormData(null);
    });
  };

  const handleDateChange = (newDate: string) => {
    const form = document.querySelector('form');
    if (form) {
      const dueOnInput = form.querySelector('input[name="due_on"]') as HTMLInputElement;
      if (dueOnInput) {
        dueOnInput.value = newDate;
      }
    }
  };

  const handleModeChange = () => {
    // Mode change is handled server-side, just refresh
    router.refresh();
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      const result = await onDelete(task.id);
      if (result) {
        toast.success("Tâche supprimée avec succès");
        setDeleteConfirmOpen(false);
        setOpen(false);
        // Notify calendar to reload tasks from DB
        window.dispatchEvent(new Event('task-deleted'));
        onSuccess?.();
      } else {
        toast.error("Erreur lors de la suppression de la tâche");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    startTransition(() => {
      setOpen(newOpen);
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>

        {deferredOpen && (
          <DialogContent className="sm:max-w-lg max-h-[95vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Modifier la tâche</DialogTitle>
              <DialogDescription>
                Modifiez les détails de votre tâche.
              </DialogDescription>
            </DialogHeader>
            
            {shouldRenderContent && (
              <div className="max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 scrollbar-track-transparent pr-4 pl-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    startTransition(() => handleSubmit(formData));
                  }}
                  className="space-y-4"
                >
                  <input type="hidden" name="id" defaultValue={task.id} />
                  
                  <TaskForm task={task as Task} />
                  
                  <div className="flex flex-col gap-3 pt-4">
                    <div className="relative">
                      <Image 
                        src="/kroni-pointing-down2.png" 
                        alt="Kroni pointe vers le bas" 
                        width={72} 
                        height={72} 
                        className="absolute left-3/4 -translate-x-1/2 -top-13 rounded-md pointer-events-none select-none z-10"
                        priority={false}
                      />
                      <div className="flex space-x-2 w-full">
                        <DialogClose asChild>
                          <Button type="button" variant="outline" className="flex-1 cursor-pointer" disabled={isPending || isDeleting}>
                            Annuler
                          </Button>
                        </DialogClose>
                        <Button type="submit" className="flex-1 cursor-pointer" disabled={isPending || isDeleting}>
                          {isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Enregistrement...
                            </>
                          ) : (
                            "Enregistrer"
                          )}
                        </Button>
                      </div>
                    </div>
                    {onDelete && (
                      <Button
                        type="button"
                        variant="destructive"
                        className="w-full cursor-pointer"
                        disabled={isPending || isDeleting}
                        onClick={() => setDeleteConfirmOpen(true)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Supprimer la tâche
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>

      {onDelete && (
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          {deleteConfirmOpen && (
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <div className="flex flex-col items-center gap-4 mb-4">
                  <DialogTitle className="text-center">Supprimer la tâche ?</DialogTitle>
                  <Image 
                    src="/kroni-sad.png" 
                    alt="Kroni triste" 
                    width={80} 
                    height={80} 
                    className="rounded-md"
                    priority={false}
                  />
                  <DialogDescription className="text-center">
                    Êtes-vous sûr de vouloir supprimer la tâche <strong>"{task.title}"</strong> ?<br />
                    Cette action est irréversible.
                  </DialogDescription>
                </div>
              </DialogHeader>
              <DialogFooter className="flex-col sm:flex-row sm:justify-end gap-2">
                <DialogClose asChild>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full sm:w-auto cursor-pointer"
                    disabled={isDeleting}
                  >
                    Annuler
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full sm:w-auto cursor-pointer"
                  disabled={isDeleting}
                  onClick={handleDelete}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      )}
      
      {modeConflict && userId && (
        <ModeConflictDialog
          open={!!modeConflict}
          onOpenChange={(open) => !open && setModeConflict(null)}
          conflict={modeConflict}
          userId={userId}
          taskTitle={task.title}
          onDateChange={handleDateChange}
          onModeChange={handleModeChange}
          onResolve={handleConflictResolve}
          onConfirmAnyway={handleConfirmAnyway}
        />
      )}
    </>
  );
}

