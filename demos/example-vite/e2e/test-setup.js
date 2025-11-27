/**
 * Test setup: Creates the DOM structure needed for tests
 * This mimics the structure in index.html
 */
export function setupTestDOM() {
  // Set up the HTML structure to match index.html
  document.body.innerHTML = `
    <h1>Vite bundling test: Check the console to see it in action!</h1>
    <h2>Customers:</h2>
    <ul id="customers-list"></ul>
  `;
}
