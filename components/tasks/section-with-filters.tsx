"use client"

import { useState } from 'react';
import { Task, Frequency } from '@/lib/types';
import TaskItem from '@/components/tasks/task-item';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';

type PresenceFilter = 'all' | 'presentiel' | 'distanciel';
type FrequencyFilter = 'all' | Frequency;

interface SectionWithFiltersProps {
  title: string;
  count: number;
  accent: 'yellow' | 'violet' | 'orange';
  icon: React.ReactNode;
  tasks: Task[];
  showFrequencyFilter?: boolean;
  onSubmit: (formData: FormData) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  showProgressStatus?: boolean;
  emptyMessage: string;
}

export function SectionWithFilters({
  title,
  count,
  accent,
  icon,
  tasks,
  showFrequencyFilter = false,
  onSubmit,
  onDelete,
  showProgressStatus = false,
  emptyMessage,
}: SectionWithFiltersProps) {
  const [presenceFilter, setPresenceFilter] = useState<PresenceFilter>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<FrequencyFilter>('all');

  const filteredTasks = tasks.filter(task => {
    const mode = task.mode ?? 'Tous';
    if (presenceFilter === 'presentiel' && mode === 'Distanciel') return false;
    if (presenceFilter === 'distanciel' && mode === 'Présentiel') return false;
    if (showFrequencyFilter && frequencyFilter !== 'all' && task.frequency !== frequencyFilter) return false;
    return true;
  });

  const accentClasses: Record<string, { bar: string; chip: string; headerBg: string; title: string }> = {
    yellow: {
      bar: 'bg-yellow-400/30',
      chip: 'bg-yellow-50',
      headerBg: 'bg-yellow-200/50',
      title: 'text-yellow-900',
    },
    violet: {
      bar: 'bg-violet-500/20',
      chip: 'bg-violet-500/10 text-violet-700',
      headerBg: 'bg-violet-500/10',
      title: 'text-violet-800',
    },
    orange: {
      bar: 'bg-orange-600/25',
      chip: 'bg-orange-50 text-orange-800',
      headerBg: 'bg-orange-200/40',
      title: 'text-orange-800',
    },
  };

  const c = accentClasses[accent];
  const hasActiveFilters = presenceFilter !== 'all' || (showFrequencyFilter && frequencyFilter !== 'all');

  // Couleurs pour le bouton filtre selon l'accent
  const filterButtonClasses: Record<string, { active: string; hover: string; icon: string }> = {
    yellow: {
      active: 'bg-yellow-100 hover:bg-yellow-200',
      hover: 'hover:bg-yellow-50',
      icon: 'text-yellow-700',
    },
    violet: {
      active: 'bg-violet-100 hover:bg-violet-200',
      hover: 'hover:bg-violet-50',
      icon: 'text-violet-700',
    },
    orange: {
      active: 'bg-orange-100 hover:bg-orange-200',
      hover: 'hover:bg-orange-50',
      icon: 'text-orange-700',
    },
  };

  const filterColors = filterButtonClasses[accent];

  return (
    <section className="mb-8 group transition-transform">
      <div className={`relative rounded-md border overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
        <div className={`absolute inset-0 ${c.headerBg} pointer-events-none`} />
        <div className={`h-1 ${c.bar}`} />
        <div className="p-4 flex items-center justify-between relative">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-background border shadow-sm">
              {icon}
            </span>
            <h2 className={`text-base font-semibold ${c.title}`}>{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={`h-8 w-8 cursor-pointer transition-colors relative focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0 data-[state=open]:ring-0 data-[state=open]:ring-offset-0 data-[state=open]:border-0 ${
                    hasActiveFilters ? filterColors.active : filterColors.hover
                  }`}
                >
                  <Filter className={`h-4 w-4 ${filterColors.icon}`} />
                  {hasActiveFilters && (
                    <span className="absolute top-0.5 right-0.5 h-2 w-2 bg-red-500 rounded-full border-2 border-background" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Présence</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={presenceFilter}
                  onValueChange={(value) => setPresenceFilter(value as PresenceFilter)}
                >
                  <DropdownMenuRadioItem value="all" className="cursor-pointer">Tous</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="presentiel" className="cursor-pointer">Présentiel</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="distanciel" className="cursor-pointer">Distanciel</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                {showFrequencyFilter && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Fréquence</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={frequencyFilter}
                      onValueChange={(value) => setFrequencyFilter(value as FrequencyFilter)}
                    >
                      <DropdownMenuRadioItem value="all" className="cursor-pointer">Toutes</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="quotidien" className="cursor-pointer">Quotidien</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="hebdomadaire" className="cursor-pointer">Hebdomadaire</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="mensuel">Mensuel</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <span className={`text-xs px-2 py-1 rounded ${c.chip}`}>
              {filteredTasks.length} tâche{filteredTasks.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="p-4 pt-0">
          <div className="grid gap-3">
            {filteredTasks.length === 0 ? (
              <div className="text-sm text-muted-foreground">{emptyMessage}</div>
            ) : (
              filteredTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onSubmit={onSubmit}
                  onDelete={onDelete}
                  showProgressStatus={showProgressStatus}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

