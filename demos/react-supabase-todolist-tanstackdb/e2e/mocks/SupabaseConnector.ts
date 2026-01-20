import {
  AbstractPowerSyncDatabase,
  BaseObserver,
  PowerSyncBackendConnector,
  type PowerSyncCredentials
} from '@powersync/web';

// Mock user ID for testing
export const MOCK_USER_ID = 'test-user-123';

export type SupabaseConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  powersyncUrl: string;
};

// Mock Session type matching Supabase's Session
type MockSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: {
    id: string;
    email: string;
    aud: string;
    role: string;
    created_at: string;
  };
};

export type SupabaseConnectorListener = {
  initialized: () => void;
  sessionStarted: (session: MockSession) => void;
};

/**
 * Mock SupabaseConnector for testing.
 * Simulates an authenticated session without requiring actual Supabase credentials.
 */
export class SupabaseConnector extends BaseObserver<SupabaseConnectorListener> implements PowerSyncBackendConnector {
  readonly client: MockSupabaseClient;
  readonly config: SupabaseConfig;

  ready: boolean;
  currentSession: MockSession | null;

  constructor() {
    super();
    this.config = {
      supabaseUrl: 'https://mock.supabase.test',
      powersyncUrl: 'https://mock.powersync.test',
      supabaseAnonKey: 'mock-anon-key'
    };

    this.client = new MockSupabaseClient();

    // Pre-authenticated session
    this.currentSession = createMockSession();
    this.ready = false;
  }

  async init() {
    if (this.ready) {
      return;
    }

    // Simulate session being loaded
    this.ready = true;
    this.iterateListeners((cb) => cb.initialized?.());

    // Trigger session started since we're pre-authenticated
    if (this.currentSession) {
      this.iterateListeners((cb) => cb.sessionStarted?.(this.currentSession!));
    }
  }

  async login(_username: string, _password: string) {
    // Mock login - always succeeds
    this.currentSession = createMockSession();
    this.updateSession(this.currentSession);
  }

  async fetchCredentials(): Promise<PowerSyncCredentials> {
    // Return mock credentials
    return {
      endpoint: this.config.powersyncUrl,
      token: this.currentSession?.access_token ?? 'mock-token'
    };
  }

  async uploadData(_database: AbstractPowerSyncDatabase): Promise<void> {
    // Mock upload - do nothing
  }

  updateSession(session: MockSession | null) {
    this.currentSession = session;
    if (session) {
      this.iterateListeners((cb) => cb.sessionStarted?.(session));
    }
  }
}

/**
 * Creates a mock authenticated session
 */
function createMockSession(): MockSession {
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: MOCK_USER_ID,
      email: 'test@example.com',
      aud: 'authenticated',
      role: 'authenticated',
      created_at: new Date().toISOString()
    }
  };
}

/**
 * Mock Supabase client for testing
 */
class MockSupabaseClient {
  auth = {
    getSession: async () => ({
      data: { session: createMockSession() },
      error: null
    }),
    signInWithPassword: async (_credentials: { email: string; password: string }) => ({
      data: { session: createMockSession() },
      error: null
    }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: (_callback: (event: string, session: MockSession | null) => void) => {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
  };

  from(_table: string) {
    return {
      upsert: async (_record: unknown) => ({ error: null }),
      update: (_data: unknown) => ({
        eq: async (_column: string, _value: unknown) => ({ error: null })
      }),
      delete: () => ({
        eq: async (_column: string, _value: unknown) => ({ error: null })
      })
    };
  }
}
