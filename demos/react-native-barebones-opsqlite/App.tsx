import '@azure/core-asynciterator-polyfill';
import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { OPSqliteOpenFactory } from '@powersync/op-sqlite';
import { column, Table, Schema, type PowerSyncBackendConnector, PowerSyncDatabase } from '@powersync/react-native';

const Colors = {
  primary: '#0a7ea4',
  white: '#ffffff',
  black: '#000000',
  light: '#f5f5f5',
  dark: '#333333',
  lighter: '#f3f4f6',
  darker: '#1a1a1a'
};

const RANDOM_NAMES = [
  'Alex',
  'Jordan',
  'Sam',
  'Casey',
  'Riley',
  'Morgan',
  'Quinn',
  'Avery',
  'Taylor',
  'Jamie'
];

/**
 * A placeholder connector which doesn't do anything but used to confirm connect can run.
 */
class DummyConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    return {
      endpoint: '',
      token: ''
    };
  }

  async uploadData() {}
}

const customersTable = new Table({ name: column.text });
const schema = new Schema({ customers: customersTable });

let powerSync: PowerSyncDatabase | null = null;

const setupDatabase = async (): Promise<PowerSyncDatabase> => {
  if (powerSync) return powerSync;

  const factory = new OPSqliteOpenFactory({
    dbFilename: 'powersync.db'
  });

  powerSync = new PowerSyncDatabase({
    schema,
    database: factory
  });

  await powerSync.init();
  return powerSync;
};

type Customer = { id: string; name: string };

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter
  };
  const cardBg = isDarkMode ? Colors.darker : Colors.white;
  const textColor = isDarkMode ? Colors.white : Colors.black;
  const mutedColor = isDarkMode ? Colors.light : Colors.dark;

  const loadCustomers = useCallback(async () => {
    if (!powerSync) return;
    try {
      const result = await powerSync.getAll<Customer>('SELECT id, name FROM customers ORDER BY name');
      setCustomers(Array.isArray(result) ? result : []);
    } catch (e) {
      console.error('Failed to load customers:', e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const db = await setupDatabase();
        await db.connect(new DummyConnector());
        if (mounted) await loadCustomers();
      } catch (error) {
        console.error('Database initialization error:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, [loadCustomers]);

  const addRandomCustomer = async () => {
    if (!powerSync || adding) return;
    setAdding(true);
    try {
      const name = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
      await powerSync.execute('INSERT INTO customers(id, name) VALUES(uuid(), ?)', [name]);
      await loadCustomers();
    } catch (e) {
      console.error('Failed to add customer:', e);
    } finally {
      setAdding(false);
    }
  };

  const deleteCustomer = async (id: string) => {
    if (!powerSync || deletingId) return;
    setDeletingId(id);
    try {
      await powerSync.execute('DELETE FROM customers WHERE id = ?', [id]);
      await loadCustomers();
    } catch (e) {
      console.error('Failed to delete customer:', e);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[backgroundStyle, styles.container]}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={backgroundStyle.backgroundColor}
        />
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: textColor }]}>Customers</Text>
          <Text style={[styles.headerSubtitle, { color: mutedColor }]}>
            PowerSync + OP-SQLite
          </Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[styles.mutedText, { color: mutedColor }]}>Loading…</Text>
          </View>
        ) : (
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={backgroundStyle}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              {customers.length === 0 ? (
                <Text style={[styles.emptyText, { color: mutedColor }]}>No customers yet.</Text>
              ) : (
                customers.map((c) => (
                  <View key={c.id} style={styles.row}>
                    <Text style={[styles.customerName, { color: textColor }]}>{c.name}</Text>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteCustomer(c.id)}
                      disabled={deletingId !== null}
                    >
                      {deletingId === c.id ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : (
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            <TouchableOpacity
              style={[styles.button, adding && styles.buttonDisabled]}
              onPress={addRandomCustomer}
              disabled={adding}
            >
              {adding ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.buttonText}>Add random customer</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 24
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700'
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)'
  },
  customerName: {
    fontSize: 18,
    flex: 1
  },
  deleteButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 72,
    alignItems: 'center'
  },
  deleteButtonText: {
    color: '#c53030',
    fontSize: 15,
    fontWeight: '500'
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 24
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '600'
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12
  },
  mutedText: {
    fontSize: 16
  }
});

export default App;
