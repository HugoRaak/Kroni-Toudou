import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { TaskWithType } from '@/lib/types';

interface HideTaskDialogProps {
  open: boolean;
  task: TaskWithType | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function HideTaskDialog({ open, task, onConfirm, onCancel }: HideTaskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center gap-4 mb-4">
            <DialogTitle className="text-center">C&apos;est bon c&apos;est fini ?</DialogTitle>
            <Image
              src="/kroni-impatient.png"
              alt="Kroni impatient"
              width={80}
              height={80}
              className="rounded-md"
            />
            <DialogDescription className="text-center">
              Êtes-vous sûr d&apos;avoir bien fini la tâche{' '}
              <strong>&quot;{task?.title}&quot;</strong> ?<br />
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="w-full sm:w-auto cursor-pointer">
              Annuler
            </Button>
          </DialogClose>
          <Button
            type="button"
            className="w-full sm:w-auto cursor-pointer bg-green-600 hover:bg-green-700 text-white"
            onClick={onConfirm}
          >
            Fini !
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
