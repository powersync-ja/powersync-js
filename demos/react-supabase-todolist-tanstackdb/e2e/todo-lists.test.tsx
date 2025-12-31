import { screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../src/app/App';
import { MOCK_USER_ID, setupTestDOM } from './test-setup';

// Get access to the PowerSync database instance exposed on window
declare global {
  interface Window {
    _powersync: import('@powersync/web').PowerSyncDatabase;
  }
}

describe('TodoLists E2E', () => {
  let root: Root | null = null;
  let container: HTMLElement;

  beforeEach(async () => {
    // Set up DOM
    container = setupTestDOM();
    await renderAppAndWaitForTodoListsScreen();
  });

  afterEach(async () => {
    // Cleanup
    if (root) {
      root.unmount();
      root = null;
    }

    // Clean up the PowerSync database if it exists
    if (window._powersync) {
      try {
        await window._powersync.disconnectAndClear();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
  });

  /**
   * Helper to render app and wait for the Todo Lists screen to appear
   */
  async function renderAppAndWaitForTodoListsScreen() {
    await act(async () => {
      root = createRoot(container);
      root.render(<App />);
    });

    // Wait for PowerSync to be initialized
    await waitFor(
      () => {
        expect(window._powersync).toBeDefined();
      },
      { timeout: 10000 }
    );

    // Wait for the Todo Lists screen to appear (app auto-navigates when authenticated)
    await waitFor(
      () => {
        expect(screen.getByText('Todo Lists')).toBeTruthy();
      },
      { timeout: 10000 }
    );
  }

  /**
   * Helper to insert a list and wait for it to appear
   */
  async function insertList(name: string) {
    const listId = crypto.randomUUID();

    await act(async () => {
      await window._powersync.execute(`INSERT INTO lists (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)`, [
        listId,
        name,
        MOCK_USER_ID,
        new Date().toISOString()
      ]);
    });

    return listId;
  }

  /**
   * Helper to insert a todo
   */
  async function insertTodo(listId: string, description: string, completed: boolean = false) {
    const todoId = crypto.randomUUID();

    await act(async () => {
      await window._powersync.execute(
        `INSERT INTO todos (id, list_id, description, created_by, created_at, completed, completed_at, completed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          todoId,
          listId,
          description,
          MOCK_USER_ID,
          new Date().toISOString(),
          completed ? 1 : 0,
          completed ? new Date().toISOString() : null,
          completed ? MOCK_USER_ID : null
        ]
      );
    });

    return todoId;
  }

  it('should load the app and show the Todo Lists screen', async () => {
    // Verify we're on the Todo Lists page
    expect(screen.getByText('Todo Lists')).toBeTruthy();
  });

  it('should display a list widget after inserting a list via PowerSync SQL', async () => {
    const listName = 'My Shopping List';
    await insertList(listName);

    // Wait for the list widget to render with our list name
    await waitFor(
      () => {
        expect(screen.getByText(listName)).toBeTruthy();
      },
      { timeout: 10000 }
    );

    // Verify action buttons are present
    expect(screen.getByRole('button', { name: /delete/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /proceed/i })).toBeTruthy();
  });

  it('should display multiple list widgets after inserting multiple lists', async () => {
    // Insert multiple lists
    await insertList('Groceries');
    await insertList('Work Tasks');
    await insertList('Personal Goals');

    // Wait for all list widgets to render
    await waitFor(
      () => {
        expect(screen.getByText('Groceries')).toBeTruthy();
        expect(screen.getByText('Work Tasks')).toBeTruthy();
        expect(screen.getByText('Personal Goals')).toBeTruthy();
      },
      { timeout: 10000 }
    );

    // Verify we have 3 delete buttons (one per list)
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    expect(deleteButtons).toHaveLength(3);
  });

  it('should display list with correct todo counts (pending and completed)', async () => {
    const listName = 'My Task List';
    const listId = await insertList(listName);

    // Insert todos - 2 incomplete, 1 completed
    await insertTodo(listId, 'Buy groceries', false);
    await insertTodo(listId, 'Call mom', false);
    await insertTodo(listId, 'Finish report', true);

    // Wait for the list widget to render with correct stats
    await waitFor(
      () => {
        expect(screen.getByText(listName)).toBeTruthy();
        // Should show "2 pending, 1 completed" in the description
        expect(screen.getByText(/2 pending/i)).toBeTruthy();
        expect(screen.getByText(/1 completed/i)).toBeTruthy();
      },
      { timeout: 10000 }
    );
  });

  it('should render list widgets with delete and navigate action buttons', async () => {
    const listName = 'Test List';
    await insertList(listName);

    // Wait for the list widget with action buttons
    await waitFor(
      () => {
        expect(screen.getByText(listName)).toBeTruthy();
        expect(screen.getByRole('button', { name: /delete/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /proceed/i })).toBeTruthy();
      },
      { timeout: 10000 }
    );
  });

  it('should display the floating action button to add new lists', async () => {
    // The FAB should be present - find by class
    const fab = document.querySelector('.MuiFab-root');
    expect(fab).not.toBeNull();
  });
});
