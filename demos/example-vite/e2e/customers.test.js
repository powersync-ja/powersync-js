import { describe, expect, it, vi } from 'vitest';
import { setupTestDOM } from './test-setup.js';

describe('Customer List E2E', () => {
  it('should display the inserted customer "Fred" in the HTML list', async () => {
    // Set up the DOM structure for testing
    setupTestDOM();

    // Import the main script which will execute and populate the DOM
    await import('../src/index.js');

    // Trigger DOMContentLoaded if needed (script listens for this)
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      document.dispatchEvent(new Event('DOMContentLoaded'));
    }

    // Wait for the customer list to appear and contain "Fred" using vi.waitFor
    await vi.waitFor(() => {
      const customersList = document.getElementById('customers-list');
      expect(customersList).not.toBeNull();

      const listItems = customersList.querySelectorAll('li');
      const customerNames = Array.from(listItems).map((li) => li.textContent);
      expect(customerNames).toContain('Fred');
    });
  });
});
