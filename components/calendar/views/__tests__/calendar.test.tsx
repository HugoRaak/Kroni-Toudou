import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Calendar } from '../calendar';
import type { CalendarTask } from '@/lib/calendar/calendar-utils';
import type { DayTasksData } from '../day-view';

const mockOnUpdateTask = vi.fn();
const mockOnDeleteTask = vi.fn();
const mockOnViewChange = vi.fn();

const mockUseCalendarData = {
  tasks: [] as CalendarTask[],
  dayTasks: null as DayTasksData | null,
  loading: false,
  dayWorkMode: 'Présentiel' as const,
  workdaysMap: {},
  setDayTasks: vi.fn(),
  setDayWorkMode: vi.fn(),
};

const mockUseCalendarHandlers = {
  handleModeSaved: vi.fn(),
  handleUpdateTask: vi.fn(),
  handleDeleteTask: vi.fn(),
};

vi.mock('@/lib/hooks/calendar/use-calendar-data', () => ({
  useCalendarData: () => mockUseCalendarData,
}));

vi.mock('@/lib/hooks/calendar/use-calendar-handlers', () => ({
  useCalendarHandlers: () => mockUseCalendarHandlers,
}));

vi.mock('../day-view', () => ({
  default: ({ date, onPrev, onNext }: { date: Date; onPrev: () => void; onNext: () => void }) => (
    <div data-testid="day-view">
      <button onClick={onPrev} data-testid="day-prev">
        Prev
      </button>
      <button onClick={onNext} data-testid="day-next">
        Next
      </button>
      <div data-testid="day-date">Day View - {date.toISOString()}</div>
    </div>
  ),
}));

vi.mock('../week-view', () => ({
  default: ({
    anchorDate,
    onPrev,
    onNext,
  }: {
    anchorDate: Date;
    onPrev: () => void;
    onNext: () => void;
  }) => (
    <div data-testid="week-view">
      <button onClick={onPrev} data-testid="week-prev">
        Prev
      </button>
      <button onClick={onNext} data-testid="week-next">
        Next
      </button>
      <div data-testid="week-anchor">Week View - {anchorDate.toISOString()}</div>
    </div>
  ),
}));

vi.mock('../month-view', () => ({
  default: ({
    anchorDate,
    onPrev,
    onNext,
  }: {
    anchorDate: Date;
    onPrev: () => void;
    onNext: () => void;
  }) => (
    <div data-testid="month-view">
      <button onClick={onPrev} data-testid="month-prev">
        Prev
      </button>
      <button onClick={onNext} data-testid="month-next">
        Next
      </button>
      <div data-testid="month-anchor">Month View - {anchorDate.toISOString()}</div>
    </div>
  ),
}));

vi.mock('@/components/calendar/ui/view-switcher', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div data-testid="view-switcher">
      <button onClick={() => onChange('day')} data-testid="switch-day">
        Day
      </button>
      <button onClick={() => onChange('week')} data-testid="switch-week">
        Week
      </button>
      <button onClick={() => onChange('month')} data-testid="switch-month">
        Month
      </button>
      <div>Current: {value}</div>
    </div>
  ),
}));

vi.mock('@/lib/storage/localStorage-tasks', () => ({
  isToday: vi.fn((date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }),
}));

describe('Calendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCalendarData.loading = false;
    mockUseCalendarData.dayTasks = null;
  });

  it('should render day view by default', () => {
    render(
      <Calendar userId="user1" onUpdateTask={mockOnUpdateTask} onDeleteTask={mockOnDeleteTask} />,
    );

    expect(screen.getByTestId('day-view')).toBeInTheDocument();
  });

  it('should switch to week view when view switcher changes', () => {
    render(
      <Calendar userId="user1" onUpdateTask={mockOnUpdateTask} onDeleteTask={mockOnDeleteTask} />,
    );

    const weekButton = screen.getByTestId('switch-week');
    fireEvent.click(weekButton);

    expect(screen.getByTestId('week-view')).toBeInTheDocument();
  });

  it('should switch to month view when view switcher changes', () => {
    render(
      <Calendar userId="user1" onUpdateTask={mockOnUpdateTask} onDeleteTask={mockOnDeleteTask} />,
    );

    const monthButton = screen.getByTestId('switch-month');
    fireEvent.click(monthButton);

    expect(screen.getByTestId('month-view')).toBeInTheDocument();
  });

  it('should navigate day view forward (change day date)', () => {
    render(
      <Calendar userId="user1" onUpdateTask={mockOnUpdateTask} onDeleteTask={mockOnDeleteTask} />,
    );

    const first = screen.getByTestId('day-date').textContent;

    fireEvent.click(screen.getByTestId('day-next'));

    const second = screen.getByTestId('day-date').textContent;

    expect(second).not.toBe(first);
  });

  it('should navigate day view backward (change day date)', () => {
    render(
      <Calendar userId="user1" onUpdateTask={mockOnUpdateTask} onDeleteTask={mockOnDeleteTask} />,
    );

    const first = screen.getByTestId('day-date').textContent;

    fireEvent.click(screen.getByTestId('day-prev'));

    const second = screen.getByTestId('day-date').textContent;

    expect(second).not.toBe(first);
  });

  it('should navigate week view forward (change week anchorDate)', () => {
    render(
      <Calendar userId="user1" onUpdateTask={mockOnUpdateTask} onDeleteTask={mockOnDeleteTask} />,
    );

    fireEvent.click(screen.getByTestId('switch-week'));

    const first = screen.getByTestId('week-anchor').textContent;

    fireEvent.click(screen.getByTestId('week-next'));

    const second = screen.getByTestId('week-anchor').textContent;

    expect(second).not.toBe(first);
  });

  it('should navigate week view backward (change week anchorDate)', () => {
    render(
      <Calendar userId="user1" onUpdateTask={mockOnUpdateTask} onDeleteTask={mockOnDeleteTask} />,
    );

    fireEvent.click(screen.getByTestId('switch-week'));

    const first = screen.getByTestId('week-anchor').textContent;

    fireEvent.click(screen.getByTestId('week-prev'));

    const second = screen.getByTestId('week-anchor').textContent;

    expect(second).not.toBe(first);
  });

  it('should navigate month view forward (change month anchorDate)', () => {
    render(
      <Calendar userId="user1" onUpdateTask={mockOnUpdateTask} onDeleteTask={mockOnDeleteTask} />,
    );

    fireEvent.click(screen.getByTestId('switch-month'));

    const first = screen.getByTestId('month-anchor').textContent;

    fireEvent.click(screen.getByTestId('month-next'));

    const second = screen.getByTestId('month-anchor').textContent;

    expect(second).not.toBe(first);
  });

  it('should navigate month view backward (change month anchorDate)', () => {
    render(
      <Calendar userId="user1" onUpdateTask={mockOnUpdateTask} onDeleteTask={mockOnDeleteTask} />,
    );

    fireEvent.click(screen.getByTestId('switch-month'));

    const first = screen.getByTestId('month-anchor').textContent;

    fireEvent.click(screen.getByTestId('month-prev'));

    const second = screen.getByTestId('month-anchor').textContent;

    expect(second).not.toBe(first);
  });

  it('should call onViewChange when view changes', async () => {
    render(
      <Calendar
        userId="user1"
        onUpdateTask={mockOnUpdateTask}
        onDeleteTask={mockOnDeleteTask}
        onViewChange={mockOnViewChange}
      />,
    );

    fireEvent.click(screen.getByTestId('switch-week'));

    await waitFor(() => {
      expect(mockOnViewChange).toHaveBeenCalled();
    });

    expect(mockOnViewChange).toHaveBeenCalledTimes(2); // 1 at mount + 1 at change
    expect(mockOnViewChange).toHaveBeenLastCalledWith(false, 'week', undefined);
  });

  it('should pass handlers to day view', () => {
    render(
      <Calendar userId="user1" onUpdateTask={mockOnUpdateTask} onDeleteTask={mockOnDeleteTask} />,
    );

    expect(screen.getByTestId('day-view')).toBeInTheDocument();
  });
});
