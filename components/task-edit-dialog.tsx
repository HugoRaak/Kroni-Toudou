"use client";

import { useState, useTransition } from "react";
import { Task } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TaskForm } from "@/components/task-form";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import Image from "next/image";

type TaskEditDialogProps = {
  task: Task | (Partial<Task> & { id: string; title: string });
  trigger: React.ReactNode;
  onSubmit: (formData: FormData) => Promise<boolean>;
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

  const handleSubmit = async (formData: FormData) => {
    const result = await onSubmit(formData);
    if (result) {
      toast.success("Tâche modifiée avec succès");
      setOpen(false);
      onSuccess?.();
    } else {
      toast.error("Erreur lors de la modification de la tâche");
    }
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
        onSuccess?.();
      } else {
        toast.error("Erreur lors de la suppression de la tâche");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>

        <DialogContent className="sm:max-w-lg max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Modifier la tâche</DialogTitle>
            <DialogDescription>
              Modifiez les détails de votre tâche.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 scrollbar-track-transparent pr-4 pl-1">
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
        </DialogContent>
      </Dialog>

      {onDelete && (
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex flex-col items-center gap-4 mb-4">
                <Image 
                  src="/kroni-sad.png" 
                  alt="Kroni triste" 
                  width={80} 
                  height={80} 
                  className="rounded-md"
                />
                <DialogTitle className="text-center">Supprimer la tâche ?</DialogTitle>
                <DialogDescription className="text-center">
                  Êtes-vous sûr de vouloir supprimer la tâche <strong>"{task.title}"</strong> ?<br />
                  Cette action est irréversible.
                </DialogDescription>
              </div>
            </DialogHeader>
            <div className="flex flex-col sm:flex-row gap-2">
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
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

