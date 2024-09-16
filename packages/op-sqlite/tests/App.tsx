import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';
import 'reflect-metadata';

import { registerBaseTests, runTests } from './tests/index';
const TEST_SERVER_URL = 'http://localhost:4243/results';

export default function App() {
  const [results, setResults] = useState<any>([]);

  const executeTests = React.useCallback(async () => {
    setResults([]);

    try {
      const results = await runTests(registerBaseTests);
      console.log(JSON.stringify(results, null, '\t'));
      setResults(results);
      // Send results to host server
      await fetch(TEST_SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(results)
      });
    } catch (ex) {
      console.error(ex);
      // Send results to host server
      fetch(TEST_SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          {
            description: `Caught exception: ${ex}`,
            type: 'incorrect'
          }
        ])
      });
    }
  }, []);

  useEffect(() => {
    console.log('Running Tests:');
    executeTests();
  }, []);

  return (
    <SafeAreaView class="flex-1 bg-neutral-900">
      <ScrollView class="p-4">
        <Text class="font-bold text-blue-500 text-lg text-center">OPSQLite Test Suite</Text>
        {results.map((r: any, i: number) => {
          if (r.type === 'grouping') {
            return (
              <Text key={i} class="mt-3 font-bold text-white">
                {r.description}
              </Text>
            );
          }

          if (r.type === 'incorrect') {
            return (
              <Text key={i} class="mt-1 text-white">
                🔴 {r.description}: {r.errorMsg}
              </Text>
            );
          }

          return (
            <Text key={i} class="mt-1 text-white">
              🟢 {r.description}
            </Text>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
