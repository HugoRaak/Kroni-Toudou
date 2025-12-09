import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaskDescriptionEditor } from '../use-task-description-editor';

const mockSetContent = vi.fn();

const mockChainFn = vi.fn(() => ({
  focus: vi.fn().mockReturnThis(),
  setColor: vi.fn().mockReturnThis(),
  setHighlight: vi.fn().mockReturnThis(),
  unsetHighlight: vi.fn().mockReturnThis(),
  run: vi.fn(),
}));

const mockEditor = {
  getHTML: vi.fn(() => '<p>Test</p>'),
  setContent: mockSetContent, // keep for compatibility with old tests
  commands: {
    setContent: mockSetContent,
    setColor: vi.fn().mockReturnThis(),
    setHighlight: vi.fn().mockReturnThis(),
    unsetHighlight: vi.fn().mockReturnThis(),
    focus: vi.fn().mockReturnThis(),
    chain: mockChainFn,
  },
  chain: mockChainFn,
  getAttributes: vi.fn(() => ({ color: '#000000' })),
  isActive: vi.fn(() => false),
  state: {
    selection: { from: 0, to: 0 },
    storedMarks: null,
    doc: {
      resolve: vi.fn(() => ({
        marks: vi.fn(() => []),
        node: vi.fn(() => ({ marks: [] })),
      })),
    },
  },
  on: vi.fn(),
  off: vi.fn(),
};

const mockUseEditor = vi.fn(() => mockEditor);

vi.mock('@tiptap/react', () => ({
  useEditor: (...args: Parameters<typeof mockUseEditor>) => mockUseEditor(...args),
}));

vi.mock('@/lib/editor/task-editor-config', () => ({
  createTaskEditorExtensions: vi.fn(() => []),
  createTaskEditorProps: vi.fn(() => ({})),
}));

describe('useTaskDescriptionEditor', () => {
  let hiddenInputRef: React.RefObject<HTMLInputElement>;

  beforeEach(() => {
    vi.clearAllMocks();
    hiddenInputRef = { current: document.createElement('input') };
    mockUseEditor.mockReturnValue(mockEditor);
  });

  it('should initialize editor with default value', () => {
    renderHook(() =>
      useTaskDescriptionEditor({
        value: '',
        hiddenInputRef,
      }),
    );

    expect(mockUseEditor).toHaveBeenCalled();
  });

  it('should initialize editor with provided value', () => {
    renderHook(() =>
      useTaskDescriptionEditor({
        value: '<p>Initial content</p>',
        hiddenInputRef,
      }),
    );

    expect(mockUseEditor).toHaveBeenCalled();
  });

  it('should call onChange when editor updates', () => {
    const mockOnChange = vi.fn();
    mockEditor.getHTML.mockReturnValue('<p>Updated</p>');

    renderHook(() =>
      useTaskDescriptionEditor({
        value: '',
        onChange: mockOnChange,
        hiddenInputRef,
      }),
    );

    // Simulate editor update
    const onUpdateCallback = (mockUseEditor as any).mock.calls[0]?.[0]?.onUpdate;
    if (onUpdateCallback) {
      act(() => {
        onUpdateCallback({ editor: mockEditor });
      });

      expect(mockOnChange).toHaveBeenCalledWith('<p>Updated</p>');
    }
  });

  it('should update hidden input when editor updates', () => {
    mockEditor.getHTML.mockReturnValue('<p>Updated</p>');

    renderHook(() =>
      useTaskDescriptionEditor({
        value: '',
        hiddenInputRef,
      }),
    );

    // Simulate editor update
    const onUpdateCallback = (mockUseEditor as any).mock.calls[0]?.[0]?.onUpdate;
    if (onUpdateCallback) {
      act(() => {
        onUpdateCallback({ editor: mockEditor });
      });

      expect(hiddenInputRef.current?.value).toBe('<p>Updated</p>');
    }
  });

  it('should sync editor content when value prop changes', () => {
    // the editor already contains the initial HTML
    mockEditor.getHTML.mockReturnValue('<p>Initial</p>');

    const { rerender } = renderHook(
      ({ value }) =>
        useTaskDescriptionEditor({
          value,
          hiddenInputRef,
        }),
      { initialProps: { value: '<p>Initial</p>' } },
    );

    expect(mockEditor.setContent).not.toHaveBeenCalled();

    // now we change the prop
    mockEditor.getHTML.mockReturnValue('<p>Initial</p>'); // before the change
    rerender({ value: '<p>Updated</p>' });

    expect(mockEditor.setContent).toHaveBeenCalledWith('<p>Updated</p>', { emitUpdate: false });
  });

  it('should not sync editor content when value is the same', () => {
    mockEditor.getHTML.mockReturnValue('<p>Same</p>');

    const { rerender } = renderHook(
      ({ value }) =>
        useTaskDescriptionEditor({
          value,
          hiddenInputRef,
        }),
      { initialProps: { value: '<p>Same</p>' } },
    );

    rerender({ value: '<p>Same</p>' });

    expect(mockEditor.setContent).not.toHaveBeenCalled();
  });

  it('should set text color when setTextColor is called', () => {
    const { result } = renderHook(() =>
      useTaskDescriptionEditor({
        value: '',
        hiddenInputRef,
      }),
    );

    act(() => {
      result.current.setTextColor('#ff0000');
    });

    expect(mockEditor.commands.chain).toHaveBeenCalled();
  });

  it('should set highlight color when setHighlightColor is called', () => {
    const { result } = renderHook(() =>
      useTaskDescriptionEditor({
        value: '',
        hiddenInputRef,
      }),
    );

    act(() => {
      result.current.setHighlightColor('#ffff00');
    });

    expect(mockEditor.commands.chain).toHaveBeenCalled();
  });

  it('should unset highlight when setHighlightColor is called with null', () => {
    const { result } = renderHook(() =>
      useTaskDescriptionEditor({
        value: '',
        hiddenInputRef,
      }),
    );

    act(() => {
      result.current.setHighlightColor(null);
    });

    expect(mockEditor.commands.chain).toHaveBeenCalled();
  });

  it('should return current text color from editor attributes', () => {
    mockEditor.getAttributes.mockReturnValue({ color: '#0000ff' });

    const { result } = renderHook(() =>
      useTaskDescriptionEditor({
        value: '',
        hiddenInputRef,
      }),
    );

    expect(result.current.currentTextColor).toBe('#0000ff');
  });

  it('should return null for text color when editor is not available', () => {
    (mockUseEditor as any).mockReturnValueOnce(null);

    const { result } = renderHook(() =>
      useTaskDescriptionEditor({
        value: '',
        hiddenInputRef,
      }),
    );

    expect(result.current.currentTextColor).toBeNull();
    (mockUseEditor as any).mockReturnValue(mockEditor);
  });

  it('should return isHighlightActive from editor', () => {
    mockEditor.isActive.mockReturnValue(true);

    const { result } = renderHook(() =>
      useTaskDescriptionEditor({
        value: '',
        hiddenInputRef,
      }),
    );

    expect(result.current.isHighlightActive).toBe(true);
  });

  it('should update hidden input on form submit', () => {
    const form = document.createElement('form');
    form.appendChild(hiddenInputRef.current!);

    renderHook(() =>
      useTaskDescriptionEditor({
        value: '',
        hiddenInputRef,
      }),
    );

    mockEditor.getHTML.mockReturnValue('<p>Form submit</p>');

    act(() => {
      form.dispatchEvent(new Event('submit'));
    });

    expect(hiddenInputRef.current?.value).toBe('<p>Form submit</p>');
  });

  it('should increment editorState on update', () => {
    const { result } = renderHook(() =>
      useTaskDescriptionEditor({
        value: '',
        hiddenInputRef,
      }),
    );

    const initialState = result.current.editorState;

    // Simulate editor update by calling the onUpdate callback directly
    const onUpdateCallback = (mockUseEditor as any).mock.calls[0]?.[0]?.onUpdate;
    if (onUpdateCallback) {
      act(() => {
        onUpdateCallback({ editor: mockEditor });
      });

      expect(result.current.editorState).toBeGreaterThan(initialState);
    }
  });

  it('should increment editorState on selection update', () => {
    const { result } = renderHook(() =>
      useTaskDescriptionEditor({
        value: '',
        hiddenInputRef,
      }),
    );

    const initialState = result.current.editorState;

    // Simulate selection update by calling the onSelectionUpdate callback directly
    const onSelectionUpdateCallback = (mockUseEditor as any).mock.calls[0]?.[0]?.onSelectionUpdate;
    if (onSelectionUpdateCallback) {
      act(() => {
        onSelectionUpdateCallback();
      });

      expect(result.current.editorState).toBeGreaterThan(initialState);
    }
  });

  it('should call forceUpdate to increment editorState', () => {
    const { result } = renderHook(() =>
      useTaskDescriptionEditor({
        value: '',
        hiddenInputRef,
      }),
    );

    const initialState = result.current.editorState;

    act(() => {
      result.current.forceUpdate();
    });

    expect(result.current.editorState).toBeGreaterThan(initialState);
  });

  it('should register and cleanup editor event listeners', () => {
    const { unmount } = renderHook(() =>
      useTaskDescriptionEditor({
        value: '',
        hiddenInputRef,
      }),
    );

    // We have registered the listeners
    expect(mockEditor.on).toHaveBeenCalledWith('update', expect.any(Function));
    expect(mockEditor.on).toHaveBeenCalledWith('create', expect.any(Function));
    expect(mockEditor.on).toHaveBeenCalledWith('transaction', expect.any(Function));
    expect(mockEditor.on).toHaveBeenCalledWith('selectionUpdate', expect.any(Function));
    expect(mockEditor.on).toHaveBeenCalledWith('focus', expect.any(Function));

    // We get the exact handlers passed to `on`
    const updateHandler = mockEditor.on.mock.calls.find(
      ([event]) => event === 'update',
    )?.[1] as () => void;
    const createHandler = mockEditor.on.mock.calls.find(
      ([event]) => event === 'create',
    )?.[1] as () => void;
    const transactionHandler = mockEditor.on.mock.calls.find(
      ([event]) => event === 'transaction',
    )?.[1] as () => void;
    const selectionUpdateHandler = mockEditor.on.mock.calls.find(
      ([event]) => event === 'selectionUpdate',
    )?.[1] as () => void;
    const focusHandler = mockEditor.on.mock.calls.find(
      ([event]) => event === 'focus',
    )?.[1] as () => void;

    expect(updateHandler).toBeDefined();
    expect(createHandler).toBeDefined();
    expect(transactionHandler).toBeDefined();
    expect(selectionUpdateHandler).toBeDefined();
    expect(focusHandler).toBeDefined();

    // Unmount the hook → cleanup the listeners
    unmount();

    expect(mockEditor.off).toHaveBeenCalledWith('update', updateHandler);
    expect(mockEditor.off).toHaveBeenCalledWith('create', createHandler);
    expect(mockEditor.off).toHaveBeenCalledWith('transaction', transactionHandler);
    expect(mockEditor.off).toHaveBeenCalledWith('selectionUpdate', selectionUpdateHandler);
    expect(mockEditor.off).toHaveBeenCalledWith('focus', focusHandler);
  });

  it('should derive currentHighlight from storedMarks when highlight mark has a color', () => {
    // Highlight active
    mockEditor.isActive.mockReturnValue(true);
    // No color directly in getAttributes('highlight')
    mockEditor.getAttributes.mockReturnValue({} as any);

    // We simulate a "highlight" mark with a color in storedMarks
    (mockEditor.state as any).storedMarks = [
      {
        type: { name: 'highlight' },
        attrs: { color: '#ff00ff' },
      } as any,
    ];

    const { result } = renderHook(() =>
      useTaskDescriptionEditor({
        value: '',
        hiddenInputRef,
      }),
    );

    expect(result.current.currentHighlight).toBe('#ff00ff');
  });

  it('should fallback to selectedHighlightColor when highlight mark has no explicit color', () => {
    // Highlight active
    mockEditor.isActive.mockReturnValue(true);
    // No color directly in getAttributes('highlight')
    mockEditor.getAttributes.mockReturnValue({} as any);

    // Mark highlight present but without attrs.color
    (mockEditor.state as any).storedMarks = [
      {
        type: { name: 'highlight' },
        attrs: {},
      } as any,
    ];

    const { result } = renderHook(() =>
      useTaskDescriptionEditor({
        value: '',
        hiddenInputRef,
      }),
    );

    // The user chooses a highlight color → selectedHighlightColor is updated
    act(() => {
      result.current.setHighlightColor('#00ff00');
    });

    // currentHighlight should then use selectedHighlightColor as fallback
    expect(result.current.currentHighlight).toBe('#00ff00');
  });

  it('should update hidden input when editor fires an update event via editor.on', () => {
    mockEditor.getHTML.mockReturnValue('<p>From event</p>');

    renderHook(() =>
      useTaskDescriptionEditor({
        value: '',
        hiddenInputRef,
      }),
    );

    // We get the handler registered for the "update" event
    const updateHandler = (mockEditor.on as unknown as Mock).mock.calls.find(
      ([eventName]) => eventName === 'update',
    )?.[1] as () => void;

    expect(updateHandler).toBeDefined();

    act(() => {
      updateHandler();
    });

    expect(hiddenInputRef.current?.value).toBe('<p>From event</p>');
  });

  it('should increment editorState when editor fires a transaction event', () => {
    const { result } = renderHook(() =>
      useTaskDescriptionEditor({
        value: '',
        hiddenInputRef,
      }),
    );

    const initialState = result.current.editorState;

    const transactionHandler = (mockEditor.on as unknown as Mock).mock.calls.find(
      ([eventName]) => eventName === 'transaction',
    )?.[1] as () => void;

    expect(transactionHandler).toBeDefined();

    act(() => {
      transactionHandler();
    });

    expect(result.current.editorState).toBeGreaterThan(initialState);
  });

  it('should derive currentHighlight from selection marks when storedMarks do not provide a color', () => {
    // Highlight active, but no color in getAttributes('highlight')
    mockEditor.isActive.mockReturnValue(true);
    mockEditor.getAttributes.mockReturnValue({} as any);

    // No storedMarks
    (mockEditor.state as any).storedMarks = null;

    const highlightMark = {
      type: { name: 'highlight' },
      attrs: { color: '#ff00ff' },
    };

    // The selection returns a highlight mark with a color
    (mockEditor.state.doc.resolve as unknown as Mock).mockReturnValue({
      marks: () => [highlightMark],
      node: () => ({ marks: [] }),
    });

    const { result } = renderHook(() =>
      useTaskDescriptionEditor({
        value: '',
        hiddenInputRef,
      }),
    );

    expect(result.current.currentHighlight).toBe('#ff00ff');
  });

  it('should derive currentHighlight from node marks when selection marks have no color', () => {
    mockEditor.isActive.mockReturnValue(true);
    mockEditor.getAttributes.mockReturnValue({} as any);

    (mockEditor.state as any).storedMarks = null;

    const highlightMark = {
      type: { name: 'highlight' },
      attrs: { color: '#00ffff' },
    };

    (mockEditor.state.doc.resolve as unknown as Mock).mockReturnValue({
      marks: () => [],
      node: () => ({ marks: [highlightMark] }),
    });

    const { result } = renderHook(() =>
      useTaskDescriptionEditor({
        value: '',
        hiddenInputRef,
      }),
    );

    expect(result.current.currentHighlight).toBe('#00ffff');
  });

  it('should apply highlight color using selection range when from !== to', () => {
    // We force a selection with a real range
    (mockEditor.state as any).selection = { from: 0, to: 5 };

    const { result } = renderHook(() =>
      useTaskDescriptionEditor({
        value: '',
        hiddenInputRef,
      }),
    );

    act(() => {
      result.current.setHighlightColor('#ffcc00');
    });

    // We don't check the details of the call, just that the chain is used
    expect(mockEditor.commands.chain).toHaveBeenCalled();
  });
});
