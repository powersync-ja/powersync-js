import '@azure/core-asynciterator-polyfill';
import React, { useEffect } from 'react';
import type {PropsWithChildren} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';
import { OPSqliteOpenFactory } from '@powersync/op-sqlite';
import { column, Schema, Table, PowerSyncDatabase } from '@powersync/react-native';

/**
 * A placeholder connector which doesn't do anything but used to confirm connect can run.
 */
class DummyConnector {
  async fetchCredentials() {
    return {
      endpoint: '',
      token: '',
    };
  }

  async uploadData() {}
}

const customers = new Table({ name: column.text });

const schema = new Schema({ customers });

let powerSync: PowerSyncDatabase | null = null;

const setupDatabase = async () => {
  if (powerSync) return powerSync;

  const factory = new OPSqliteOpenFactory({
    dbFilename: 'powersync.db',
  });

  powerSync = new PowerSyncDatabase({
    schema,
    database: factory,
  });

  await powerSync.init();
  return powerSync;
};

type SectionProps = PropsWithChildren<{
  title: string;
}>;

function Section({children, title}: SectionProps): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
        {children}
      </Text>
    </View>
  );
}

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  useEffect(() => {
    const initDB = async () => {
      try {
        const db = await setupDatabase();

        // Test database operations
        await db.execute('INSERT INTO customers(id, name) VALUES(uuid(), ?)', ['Fred']);
        const result = await db.getAll('SELECT * FROM customers');
        console.log('Customers:', result);

        // Connect with dummy connector
        await db.connect(new DummyConnector());
      } catch (error) {
        console.error('Database initialization error:', error);
      }
    };

    initDB();
  }, []);

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <Header />
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
          <Section title="Step One">
            Edit <Text style={styles.highlight}>App.tsx</Text> to change this
            screen and then come back to see your edits.
          </Section>
          <Section title="See Your Changes">
            <ReloadInstructions />
          </Section>
          <Section title="Debug">
            <DebugInstructions />
          </Section>
          <Section title="Learn More">
            Read the docs to discover what to do next:
          </Section>
          <LearnMoreLinks />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

export default App;
