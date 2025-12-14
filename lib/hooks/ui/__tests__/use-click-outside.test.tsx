import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClickOutside } from '../use-click-outside';

describe('useClickOutside', () => {
  let element: HTMLElement;
  let ref: React.RefObject<HTMLElement | null>;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
    ref = { current: element };
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  it('should call handler when clicking outside the element', () => {
    const handler = vi.fn();

    renderHook(() => useClickOutside(ref, handler));

    const outsideElement = document.createElement('div');
    document.body.appendChild(outsideElement);

    act(() => {
      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      outsideElement.dispatchEvent(event);
    });

    expect(handler).toHaveBeenCalledTimes(1);

    document.body.removeChild(outsideElement);
  });

  it('should not call handler when clicking inside the element', () => {
    const handler = vi.fn();

    renderHook(() => useClickOutside(ref, handler));

    act(() => {
      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(event);
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should not call handler when ref.current is null', () => {
    const handler = vi.fn();
    const nullRef = { current: null };

    renderHook(() => useClickOutside(nullRef, handler));

    const outsideElement = document.createElement('div');
    document.body.appendChild(outsideElement);

    act(() => {
      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      outsideElement.dispatchEvent(event);
    });

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(outsideElement);
  });

  it('should clean up event listener on unmount', () => {
    const handler = vi.fn();
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => useClickOutside(ref, handler));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));

    const outsideElement = document.createElement('div');
    document.body.appendChild(outsideElement);

    act(() => {
      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      outsideElement.dispatchEvent(event);
    });

    // Handler should not be called after unmount
    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(outsideElement);
    removeEventListenerSpy.mockRestore();
  });

  it('should update handler when it changes', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const { rerender } = renderHook(({ handler }) => useClickOutside(ref, handler), {
      initialProps: { handler: handler1 },
    });

    const outsideElement = document.createElement('div');
    document.body.appendChild(outsideElement);

    act(() => {
      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      outsideElement.dispatchEvent(event);
    });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).not.toHaveBeenCalled();

    rerender({ handler: handler2 });

    act(() => {
      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      outsideElement.dispatchEvent(event);
    });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);

    document.body.removeChild(outsideElement);
  });
});
