import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DayView from '../day-view';
import type { DayTasksData } from '../day-view';
import type { Task } from '@/lib/types';

const mockOnPrev = vi.fn();
const mockOnNext = vi.fn();
const mockOnUpdateTask = vi.fn();
const mockOnDeleteTask = vi.fn();

const mockUseTempTasks = {
  tempTasks: [],
  loadTempTasks: vi.fn(),
  getHiddenTempTaskIds: vi.fn(() => []),
};

const mockUseUnifiedTaskHandlers = {
  handleUpdateTaskUnified: vi.fn(),
  handleDeleteTaskUnified: vi.fn(),
};

const mockUseDayViewState = {
  layout: 'single' as 'single' | 'three-column',
  hideConfirmOpen: false,
  taskToHide: null,
  orderVersion: 0,
  handleToggleLayout: vi.fn(),
  handleHideTaskClick: vi.fn(),
  handleConfirmHide: vi.fn(),
  handleCancelHide: vi.fn(),
};

const mockUseDayTasksPreparation = {
  preparedTasks: [],
  groupedPreparedTasks: null,
};

vi.mock('@/lib/hooks/tasks/use-temp-tasks', () => ({
  useTempTasks: () => mockUseTempTasks,
}));

vi.mock('@/lib/hooks/tasks/use-unified-task-handlers', () => ({
  useUnifiedTaskHandlers: () => mockUseUnifiedTaskHandlers,
}));

vi.mock('@/lib/hooks/calendar/use-day-view-state', () => ({
  useDayViewState: () => mockUseDayViewState,
}));

vi.mock('@/lib/hooks/calendar/use-day-tasks-preparation', () => ({
  useDayTasksPreparation: () => mockUseDayTasksPreparation,
}));

vi.mock('@/lib/storage/localStorage-tasks', () => ({
  isToday: vi.fn(() => false),
  hideTodayTask: vi.fn(),
  hideTodayTempTask: vi.fn(),
}));

vi.mock('../day-view-layouts/single-column-layout', () => ({
  SingleColumnLayout: ({ tasks }: { tasks: DayTasksData }) => (
    <div data-testid="single-column-layout">
      {tasks ? `Tasks: ${tasks.periodic.length + tasks.specific.length}` : 'No tasks'}
    </div>
  ),
}));

vi.mock('../day-view-layouts/three-column-layout', () => ({
  ThreeColumnLayout: ({ tasks }: { tasks: DayTasksData }) => (
    <div data-testid="three-column-layout">
      {tasks ? `Tasks: ${tasks.periodic.length + tasks.specific.length}` : 'No tasks'}
    </div>
  ),
}));

vi.mock('@/components/calendar/ui/workmode-badge', () => ({
  WorkModeBadge: ({ workMode }: { workMode: string }) => (
    <div data-testid="workmode-badge">{workMode}</div>
  ),
}));

vi.mock('@/components/calendar/dialogs/hide-task-dialog', () => ({
  HideTaskDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="hide-task-dialog">Hide Task Dialog</div> : null,
}));

const defaultTasks: DayTasksData = {
  periodic: [],
  specific: [],
  whenPossible: {
    inProgress: [],
    notStarted: [],
  },
  alerts: [],
};

describe('DayView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDayViewState.layout = 'single';
    mockUseDayViewState.hideConfirmOpen = false;
    mockUseDayViewState.taskToHide = null;
  });

  it('should render loading state', () => {
    render(
      <DayView
        date={new Date(2024, 5, 15)}
        loading={true}
        tasks={null}
        workMode="Présentiel"
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onUpdateTask={mockOnUpdateTask}
        onDeleteTask={mockOnDeleteTask}
      />,
    );

    expect(screen.queryByText(/Aucune tâche pour ce jour/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('single-column-layout')).not.toBeInTheDocument();
  });

  it('should render empty state when no tasks and not loading', () => {
    render(
      <DayView
        date={new Date(2024, 5, 15)}
        loading={false}
        tasks={null}
        workMode="Présentiel"
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onUpdateTask={mockOnUpdateTask}
        onDeleteTask={mockOnDeleteTask}
      />,
    );

    expect(screen.getByText(/Aucune tâche pour ce jour/i)).toBeInTheDocument();
  });

  it('should render empty state when workMode is Congé', () => {
    render(
      <DayView
        date={new Date(2024, 5, 15)}
        loading={false}
        tasks={null}
        workMode="Congé"
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onUpdateTask={mockOnUpdateTask}
        onDeleteTask={mockOnDeleteTask}
      />,
    );

    expect(screen.getByText(/Là c'est repos !/i)).toBeInTheDocument();
  });

  it('should render tasks with single column layout', () => {
    const tasks: DayTasksData = {
      ...defaultTasks,
      periodic: [
        {
          id: '1',
          title: 'Task 1',
          description: '',
          user_id: 'user1',
          created_at: '',
          updated_at: '',
        } as Task,
      ],
    };

    render(
      <DayView
        date={new Date(2024, 5, 15)}
        loading={false}
        tasks={tasks}
        workMode="Présentiel"
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onUpdateTask={mockOnUpdateTask}
        onDeleteTask={mockOnDeleteTask}
      />,
    );

    expect(screen.getByTestId('single-column-layout')).toBeInTheDocument();
  });

  it('should render tasks with three column layout when layout is three-column', () => {
    mockUseDayViewState.layout = 'three-column';
    const tasks: DayTasksData = {
      ...defaultTasks,
      periodic: [
        {
          id: '1',
          title: 'Task 1',
          description: '',
          user_id: 'user1',
          created_at: '',
          updated_at: '',
        } as Task,
      ],
    };

    render(
      <DayView
        date={new Date(2024, 5, 15)}
        loading={false}
        tasks={tasks}
        workMode="Présentiel"
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onUpdateTask={mockOnUpdateTask}
        onDeleteTask={mockOnDeleteTask}
      />,
    );

    expect(screen.getByTestId('three-column-layout')).toBeInTheDocument();
  });

  it('should call onPrev when previous button is clicked', () => {
    render(
      <DayView
        date={new Date(2024, 5, 15)}
        loading={false}
        tasks={defaultTasks}
        workMode="Présentiel"
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onUpdateTask={mockOnUpdateTask}
        onDeleteTask={mockOnDeleteTask}
        showNavigation={true}
      />,
    );

    fireEvent.click(screen.getByTestId('day-prev'));
    expect(mockOnPrev).toHaveBeenCalled();
  });

  it('should call onNext when next button is clicked', () => {
    render(
      <DayView
        date={new Date(2024, 5, 15)}
        loading={false}
        tasks={defaultTasks}
        workMode="Présentiel"
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onUpdateTask={mockOnUpdateTask}
        onDeleteTask={mockOnDeleteTask}
        showNavigation={true}
      />,
    );

    fireEvent.click(screen.getByTestId('day-next'));
    expect(mockOnNext).toHaveBeenCalled();
  });

  it('should display work mode badge', () => {
    render(
      <DayView
        date={new Date(2024, 5, 15)}
        loading={false}
        tasks={defaultTasks}
        workMode="Distanciel"
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onUpdateTask={mockOnUpdateTask}
        onDeleteTask={mockOnDeleteTask}
      />,
    );

    expect(screen.getByTestId('workmode-badge')).toBeInTheDocument();
    expect(screen.getByTestId('workmode-badge')).toHaveTextContent('Distanciel');
  });

  it('should show hide task dialog when hideConfirmOpen is true', () => {
    mockUseDayViewState.hideConfirmOpen = true;
    mockUseDayViewState.taskToHide = {
      id: '1',
      title: 'Task',
      description: '',
      taskType: 'periodic',
    } as any;

    render(
      <DayView
        date={new Date(2024, 5, 15)}
        loading={false}
        tasks={defaultTasks}
        workMode="Présentiel"
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onUpdateTask={mockOnUpdateTask}
        onDeleteTask={mockOnDeleteTask}
      />,
    );

    expect(screen.getByTestId('hide-task-dialog')).toBeInTheDocument();
  });
});
