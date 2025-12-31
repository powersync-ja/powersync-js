// Re-export MOCK_USER_ID from the mock
export { MOCK_USER_ID } from './mocks/SupabaseConnector';

/**
 * Sets up the test DOM structure matching the app's index.html
 */
export function setupTestDOM() {
  document.body.innerHTML = `
    <div id="app"></div>
  `;
  return document.getElementById('app')!;
}
