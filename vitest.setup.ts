/**
 * Vitest setup file
 *
 * This file configures all mocks and test utilities needed for the test suite.
 *
 * Mocks included:
 * - Supabase (supabase-server.ts)
 * - Next.js (cookies, headers, navigation)
 * - localStorage
 * - sonner (toast notifications)
 * - fetch API (for workday-defaults)
 * - TipTap editor
 * - Window events
 *
 * Helpers exported:
 * - createMockSupabaseQueryBuilder: Create a mock Supabase query builder
 * - createMockUser: Create a mock user object
 * - createMockTask: Create a mock task object
 *
 * Usage in tests:
 * ```ts
 * import { createMockTask, createMockUser } from '@/vitest.setup';
 *
 * const task = createMockTask({ title: 'My Task' });
 * const user = createMockUser({ email: 'user@example.com' });
 * ```
 */

import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';
import React from 'react';

// ============================================================================
// Mock Supabase
// ============================================================================

// Mock Supabase client
const createMockSupabaseClient = () => ({
  from: vi.fn(() => ({
    select: vi.fn(() => {
      const selectBuilder = {
        eq: vi.fn((_field: string, _value: any) => {
          // Return a chainable builder that can be used with order() or directly
          const eqBuilder = {
            order: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            // Also allow direct resolution for simple queries
            then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
          };
          return eqBuilder;
        }),
        gte: vi.fn(() => ({
          lte: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      };
      return selectBuilder;
    }),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
    })),
    upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  })),
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    signInWithPassword: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    signUp: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    updateUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
  },
});

vi.mock('@/lib/supabase/supabase-server', () => ({
  supabaseServer: vi.fn(() => Promise.resolve(createMockSupabaseClient())),
  supabaseServerReadOnly: vi.fn(() => Promise.resolve(createMockSupabaseClient())),
}));

// ============================================================================
// Mock Next.js
// ============================================================================

// Mock Next.js cookies
const mockCookies = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() =>
      Array.from(mockCookies.entries()).map(([name, value]) => ({ name, value })),
    ),
    get: vi.fn((name: string) => {
      const value = mockCookies.get(name);
      return value ? { name, value } : undefined;
    }),
    set: vi.fn(({ name, value }: { name: string; value: string }) => {
      mockCookies.set(name, value);
    }),
  })),
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// ============================================================================
// Mock localStorage
// ============================================================================

const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// ============================================================================
// Mock sonner (toast)
// ============================================================================

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// ============================================================================
// Mock fetch API (for workday-defaults)
// ============================================================================

global.fetch = vi.fn();

(global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
  if (typeof url === 'string' && url.includes('calendrier.api.gouv.fr/jours-feries')) {
    return Promise.resolve({
      ok: true,
      json: async () => ({
        '2024-01-01': "Jour de l'an",
        '2024-05-01': 'Fête du Travail',
        '2024-05-08': 'Victoire 1945',
        '2024-07-14': 'Fête nationale',
        '2024-08-15': 'Assomption',
        '2024-11-01': 'Toussaint',
        '2024-11-11': 'Armistice 1918',
        '2024-12-25': 'Noël',
      }),
    } as Response);
  }

  return Promise.resolve({
    ok: true,
    json: async () => ({}),
  } as Response);
});

// ============================================================================
// Mock window events (for task events)
// ============================================================================

// Mock window.addEventListener and removeEventListener for custom events
const eventListeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

window.addEventListener = vi.fn(
  (
    type: string,
    listener: EventListenerOrEventListenerObject,
    _options?: boolean | AddEventListenerOptions,
  ) => {
    if (!eventListeners.has(type)) {
      eventListeners.set(type, new Set());
    }
    eventListeners.get(type)!.add(listener);
  },
) as typeof window.addEventListener;

window.removeEventListener = vi.fn(
  (
    type: string,
    listener: EventListenerOrEventListenerObject,
    _options?: boolean | EventListenerOptions,
  ) => {
    eventListeners.get(type)?.delete(listener);
  },
) as typeof window.removeEventListener;

window.dispatchEvent = vi.fn((event: Event) => {
  const listeners = eventListeners.get(event.type);
  if (listeners) {
    listeners.forEach((listener) => {
      try {
        if (typeof listener === 'function') {
          listener(event);
        } else if (listener && typeof listener.handleEvent === 'function') {
          listener.handleEvent(event);
        }
      } catch (error) {
        console.error(`Error in event listener for ${event.type}:`, error);
      }
    });
  }
  return true;
}) as typeof window.dispatchEvent;

// ============================================================================
// Reset all mocks and state before each test
// ============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
  mockCookies.clear();
  eventListeners.clear();
});

// ============================================================================
// Helper: Mock Supabase query builder chain
// ============================================================================

export function createMockSupabaseQueryBuilder(data: any, error: any = null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => {
        const selectBuilder = {
          eq: vi.fn((_field: string, _value: any) => {
            const eqBuilder = {
              order: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data, error })),
                single: vi.fn(() => Promise.resolve({ data, error })),
              })),
              single: vi.fn(() => Promise.resolve({ data, error })),
              then: (resolve: any) => Promise.resolve({ data, error }).then(resolve),
            };
            return eqBuilder;
          }),
          gte: vi.fn(() => ({
            lte: vi.fn(() => Promise.resolve({ data, error })),
          })),
        };
        return selectBuilder;
      }),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data, error })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data, error })),
            })),
          })),
        })),
      })),
      upsert: vi.fn(() => Promise.resolve({ data, error })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error })),
        })),
      })),
    })),
  };
}

// ============================================================================
// Helper: Mock user for auth tests
// ============================================================================

export function createMockUser(overrides: Partial<any> = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {},
    ...overrides,
  };
}

// ============================================================================
// Helper: Mock task for tests
// ============================================================================

export function createMockTask(overrides: Partial<any> = {}) {
  return {
    id: 'test-task-id',
    user_id: 'test-user-id',
    title: 'Test Task',
    description: '',
    frequency: null,
    day: null,
    custom_days: null,
    max_shifting_days: null,
    start_date: null,
    due_on: null,
    in_progress: false,
    mode: 'Tous' as const,
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// Mock TipTap
// ============================================================================

vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(() => {
    const getHTML = vi.fn(() => '<p>Test content</p>');

    return {
      getHTML,
      getText: vi.fn(() => 'Test content'),
      destroy: vi.fn(),
      isEditable: true,
      setEditable: vi.fn(),
      commands: {
        setContent: vi.fn(),
        setColor: vi.fn(),
        unsetColor: vi.fn(),
        setHighlight: vi.fn(),
        unsetHighlight: vi.fn(),
      },
      chain: vi.fn(() => ({
        focus: vi.fn().mockReturnThis(),
        setColor: vi.fn().mockReturnThis(),
        unsetColor: vi.fn().mockReturnThis(),
        setHighlight: vi.fn().mockReturnThis(),
        unsetHighlight: vi.fn().mockReturnThis(),
        run: vi.fn(),
      })),
      getAttributes: vi.fn((name: string) => {
        if (name === 'textStyle') return { color: null };
        if (name === 'highlight') return { color: null };
        return {};
      }),
      isActive: vi.fn(() => false),
      on: vi.fn(),
      off: vi.fn(),
      state: {
        storedMarks: [],
        selection: { from: 0 },
        doc: {
          resolve: () => ({
            marks: () => [],
            node: () => ({ marks: [] }),
          }),
        },
      },
    };
  }),

  EditorContent: (props: any) =>
    React.createElement('div', { 'data-testid': 'tiptap-editor', ...props }),
}));

// ============================================================================
// Environment variables for tests
// ============================================================================

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
