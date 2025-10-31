"use client";

import { useState, useTransition } from "react";
import { Task } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TaskForm } from "@/components/task-form";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import Image from "next/image";

type TaskItemProps = {
  task: Task;
  onSubmit: (formData: FormData) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
  showProgressStatus?: boolean;
};

export default function TaskItem({ task, onSubmit, onDelete, showProgressStatus = false }: TaskItemProps) {
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-full text-left rounded-md border p-4 bg-card/50 backdrop-blur-sm hover:bg-card transition-colors shadow-xs hover:shadow-sm cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-foreground">{task.title}</h3>
              {task.description ? (
                <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
              ) : null}
            </div>
            {task.in_progress ? (
              <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-700 border border-blue-500/20">En cours</span>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground mt-3 flex flex-wrap gap-2">
            {task.frequency ? (
              <span className="px-2 py-1 rounded border bg-muted/50">{task.frequency}</span>
            ) : null}
            {task.day ? (
              <span className="px-2 py-1 rounded border bg-muted/50">{task.day}</span>
            ) : null}
            {task.due_on ? (
              <span className="px-2 py-1 rounded border bg-muted/50">
                {new Date(task.due_on).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            ) : null}
            {typeof task.postponed_days === "number" ? (
              <span className="px-2 py-1 rounded border bg-muted/50">à reporter dans {task.postponed_days} jours</span>
            ) : null}
            {showProgressStatus && task.in_progress && (
              <span className="px-2 py-1 rounded border bg-muted/50">En cours</span>
            )}
            <span className={`px-2 py-1 rounded border ${task.is_remote ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
              {task.is_remote ? "Distanciel" : "Présentiel"}
            </span>
          </div>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Modifier la tâche</DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 scrollbar-track-transparent pr-4 pl-1">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              startTransition(async () => {
                const result = await onSubmit(formData);
                if (result) {
                  toast.success("Tâche modifiée avec succès");
                  setOpen(false);
                } else {
                  toast.error("Erreur lors de la modification de la tâche");
                }
              });
            }}
            className="space-y-4"
          >
            <input type="hidden" name="id" defaultValue={task.id} />
            
            <TaskForm task={task} />
            
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
            <DialogFooter className="flex-col sm:flex-row gap-2">
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
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    const result = await onDelete(task.id);
                    if (result) {
                      toast.success("Tâche supprimée avec succès");
                      setDeleteConfirmOpen(false);
                      setOpen(false);
                    } else {
                      toast.error("Erreur lors de la suppression de la tâche");
                    }
                  } finally {
                    setIsDeleting(false);
                  }
                }}
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
        </Dialog>
      )}
    </Dialog>
  );
}


