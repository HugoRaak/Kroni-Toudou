"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { TaskForm } from "@/components/task-form";
import { createTaskFromForm } from "@/app/actions/tasks";
import { createTodayTempTask } from "@/lib/localStorage-tasks";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface FloatingAddButtonProps {
  userId: string;
  onSubmit?: (formData: FormData) => Promise<any>;
  isViewingToday?: boolean;
}

export function FloatingAddButton({ userId, onSubmit, isViewingToday = false }: FloatingAddButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isTempTask, setIsTempTask] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const isTemp = formData.get('is_temp_task') === 'true';
    
    startTransition(async () => {
      let result;
      
      if (isTemp) {
        // Create temporary task in localStorage
        const title = String(formData.get('title') || '');
        const description = String(formData.get('description') || '');
        const is_remote = formData.get('is_remote') != null;
        const in_progress = formData.get('in_progress') != null;
        
        try {
          createTodayTempTask(title, description, is_remote, in_progress);
          result = true;
        } catch (error) {
          console.error('Error creating temp task:', error);
          result = false;
        }
      } else if (onSubmit) {
        result = await onSubmit(formData);
      } else {
        result = await createTaskFromForm(userId, formData);
      }
      
      if (result) {
        toast.success("Tâche créée avec succès");
        setIsOpen(false);
        setIsTempTask(false);
        // For temp tasks, trigger a custom event to refresh the day view
        if (isTemp) {
          window.dispatchEvent(new Event('temp-task-updated'));
        }
        router.refresh();
      } else {
        toast.error("Erreur lors de la création de la tâche");
      }
    });
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
          <DialogDescription>
            Créez une nouvelle tâche à ajouter à votre calendrier.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 scrollbar-track-transparent pr-4 pl-1">
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <TaskForm 
              isViewingToday={isViewingToday}
              onTempTaskChange={setIsTempTask}
            />
            
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
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 cursor-pointer"
                      disabled={isPending}
                    >
                      Annuler
                    </Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    className="flex-1 cursor-pointer"
                    disabled={isPending}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Création...
                      </>
                    ) : (
                      "Créer"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
