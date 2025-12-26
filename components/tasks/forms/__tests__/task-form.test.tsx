import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskForm } from '../task-form';
import type { Task } from '@/lib/types';
import { TASK_TYPES } from '@/lib/tasks/constants/task-constants';

const mockOnTaskTypeChange = vi.fn();
const mockOnTempTaskChange = vi.fn();

vi.mock('../description/task-description-editor', () => ({
  TaskDescriptionEditor: ({ id, name, value }: { id?: string; name?: string; value?: string }) => (
    <div data-testid={`description-editor-${id}`} data-name={name} data-value={value}>
      Description Editor
    </div>
  ),
}));

describe('TaskForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render form with default specific type for new task', () => {
    render(<TaskForm />);

    expect(screen.getByLabelText(/Type de la tâche/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(TASK_TYPES.SPECIFIC)).toBeInTheDocument();
  });

  it('should render periodic task fields when type is periodic', () => {
    render(<TaskForm />);

    fireEvent.change(screen.getByLabelText(/Type de la tâche/i), {
      target: { value: TASK_TYPES.PERIODIC },
    });

    expect(screen.getByLabelText(/Fréquence/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Date de la tâche/i)).not.toBeInTheDocument();
  });

  it('should show day field for hebdomadaire frequency', () => {
    render(<TaskForm />);

    fireEvent.change(screen.getByLabelText(/Type de la tâche/i), {
      target: { value: TASK_TYPES.PERIODIC },
    });

    const frequencySelect = screen.getByLabelText(/Fréquence/i);
    fireEvent.change(frequencySelect, { target: { value: 'hebdomadaire' } });

    expect(screen.getByLabelText(/Jour de la répétition/i)).toBeInTheDocument();
  });

  it('should show start_date field for annuel frequency', () => {
    render(<TaskForm />);

    fireEvent.change(screen.getByLabelText(/Type de la tâche/i), {
      target: { value: TASK_TYPES.PERIODIC },
    });

    const frequencySelect = screen.getByLabelText(/Fréquence/i);
    fireEvent.change(frequencySelect, { target: { value: 'annuel' } });

    expect(screen.getByLabelText(/Date de début/i)).toBeInTheDocument();
  });

  it('should show custom fields for personnalisé frequency', () => {
    render(<TaskForm />);

    fireEvent.change(screen.getByLabelText(/Type de la tâche/i), {
      target: { value: TASK_TYPES.PERIODIC },
    });

    const frequencySelect = screen.getByLabelText(/Fréquence/i);
    fireEvent.change(frequencySelect, { target: { value: 'personnalisé' } });

    expect(screen.getByLabelText(/Répéter tous les X jours/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date de début/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre de jours maximum de décalage/i)).toBeInTheDocument();
  });

  it('should render specific task fields when type is specific', () => {
    render(<TaskForm />);

    const taskTypeSelect = screen.getByLabelText(/Type de la tâche/i);
    fireEvent.change(taskTypeSelect, { target: { value: TASK_TYPES.SPECIFIC } });

    expect(screen.getByLabelText(/Date de la tâche/i)).toBeInTheDocument();
  });

  it('should render when-possible task fields when type is when-possible', () => {
    render(<TaskForm />);

    const taskTypeSelect = screen.getByLabelText(/Type de la tâche/i);
    fireEvent.change(taskTypeSelect, { target: { value: TASK_TYPES.WHEN_POSSIBLE } });

    expect(screen.getByLabelText(/En cours/i)).toBeInTheDocument();
  });

  it('should call onTaskTypeChange when task type changes', () => {
    render(<TaskForm onTaskTypeChange={mockOnTaskTypeChange} />);

    const taskTypeSelect = screen.getByLabelText(/Type de la tâche/i);
    fireEvent.change(taskTypeSelect, { target: { value: TASK_TYPES.SPECIFIC } });

    expect(mockOnTaskTypeChange).toHaveBeenCalledWith(TASK_TYPES.SPECIFIC);
  });

  it('should prefill due date when switching to specific type in day view', () => {
    const dayDate = new Date(2024, 5, 15);
    render(<TaskForm currentView="day" dayDate={dayDate} isViewingToday={false} />);

    const taskTypeSelect = screen.getByLabelText(/Type de la tâche/i);
    fireEvent.change(taskTypeSelect, { target: { value: TASK_TYPES.SPECIFIC } });

    const dueDateInput = screen.getByLabelText(/Date de la tâche/i) as HTMLInputElement;
    expect(dueDateInput.value).toBe('2024-06-15');
  });

  it('should render task data when editing existing task', () => {
    const task: Task = {
      id: '1',
      user_id: 'user1',
      title: 'Test Task',
      description: 'Test description',
      frequency: 'hebdomadaire',
      day: 'Lundi',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    render(<TaskForm task={task} />);

    expect(screen.getByDisplayValue('Test Task')).toBeInTheDocument();

    const frequencySelect = screen.getByLabelText(/Fréquence/i) as HTMLSelectElement;
    expect(frequencySelect.value).toBe('hebdomadaire');

    const daySelect = screen.getByLabelText(/Jour de la répétition/i) as HTMLSelectElement;
    expect(daySelect.value).toBe('Lundi');
  });

  it('should render temp task checkbox for new tasks', () => {
    render(<TaskForm />);

    expect(screen.getByLabelText(/Uniquement pour aujourd'hui/i)).toBeInTheDocument();
  });

  it('should hide task type selector when temp task is checked', () => {
    render(<TaskForm isViewingToday={true} />);

    expect(screen.queryByLabelText(/Type de la tâche/i)).not.toBeInTheDocument();
  });

  it('should show temp task indicator when editing temp task', () => {
    const tempTask = {
      id: 'temp-1',
      title: 'Temp Task',
      description: '',
      created_at: '2024-06-15T00:00:00Z',
    };

    render(<TaskForm task={tempTask} />);

    expect(screen.getByText(/Tâche temporaire/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Type de la tâche/i)).not.toBeInTheDocument();
  });

  it('should call onTempTaskChange when temp task checkbox changes', () => {
    render(<TaskForm onTempTaskChange={mockOnTempTaskChange} isViewingToday={true} />);

    const tempCheckbox = screen.getByLabelText(/Uniquement pour aujourd'hui/i);
    fireEvent.click(tempCheckbox);

    expect(mockOnTempTaskChange).toHaveBeenCalledWith(true);
  });

  it('should default to temp task when isViewingToday is true and no task', () => {
    render(<TaskForm isViewingToday={true} />);

    const tempCheckbox = screen.getByLabelText(/Uniquement pour aujourd'hui/i) as HTMLInputElement;
    expect(tempCheckbox.checked).toBe(true);
  });

  it('should render mode selector for non-temp tasks', () => {
    render(<TaskForm />);

    expect(screen.getByLabelText(/Mode/i)).toBeInTheDocument();
  });

  it('should not render mode selector for temp tasks', () => {
    const tempTask = {
      id: 'temp-1',
      title: 'Temp Task',
      description: '',
      created_at: '2024-06-15T00:00:00Z',
    };

    render(<TaskForm task={tempTask} />);

    expect(screen.queryByLabelText(/Mode/i)).not.toBeInTheDocument();
  });

  it('should prefill specific type when creating task in day view (not today)', () => {
    const dayDate = new Date(2024, 5, 15);
    render(<TaskForm currentView="day" dayDate={dayDate} isViewingToday={false} />);

    const taskTypeSelect = screen.getByLabelText(/Type de la tâche/i) as HTMLSelectElement;
    expect(taskTypeSelect.value).toBe(TASK_TYPES.SPECIFIC);
  });

  it('should clear due date when switching away from specific type', () => {
    const dayDate = new Date(2024, 5, 15);
    render(<TaskForm currentView="day" dayDate={dayDate} isViewingToday={false} />);

    const taskTypeSelect = screen.getByLabelText(/Type de la tâche/i);
    fireEvent.change(taskTypeSelect, { target: { value: TASK_TYPES.SPECIFIC } });

    const dueDateInput = screen.getByLabelText(/Date de la tâche/i) as HTMLInputElement;
    expect(dueDateInput.value).toBe('2024-06-15');

    fireEvent.change(taskTypeSelect, { target: { value: TASK_TYPES.PERIODIC } });

    const dueDateInputAfter = screen.queryByLabelText(/Date de la tâche/i);
    expect(dueDateInputAfter).not.toBeInTheDocument();
  });
});
