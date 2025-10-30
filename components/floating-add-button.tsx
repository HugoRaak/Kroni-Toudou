"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { TaskForm } from "@/components/task-form";
import { createTaskFromForm } from "@/app/actions/tasks";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface FloatingAddButtonProps {
  userId: string;
  onSubmit?: (formData: FormData) => Promise<any>;
}

export function FloatingAddButton({ userId, onSubmit }: FloatingAddButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      let result;
      
      if (onSubmit) {
        result = await onSubmit(formData);
      } else {
        result = await createTaskFromForm(userId, formData);
      }
      
      if (result) {
        toast.success("Tâche créée avec succès");
        setIsOpen(false);
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
        </DialogHeader>
        <div className="max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 scrollbar-track-transparent pr-4 pl-1">
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <TaskForm />
            
            <div className="flex space-x-2 pt-4">
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
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
