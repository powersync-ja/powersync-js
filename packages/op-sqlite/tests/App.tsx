import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { runTests } from './tests/MochaSetup';
import { registerUnitTests } from './tests/unitTests.spec';

export default function App() {
  const [results, setResults] = useState<any>([]);

  useEffect(() => {
    setResults([]);
    runTests(registerUnitTests).then(setResults);
  }, []);

  return (
    <ScrollView contentContainerStyle={[{ alignItems: 'flex-start' }]}>
      {results.map((r: any, i: number) => {
        if (r.type === 'grouping') {
          return (
            <Text key={i} class="mt-3 font-bold">
              {r.description}
            </Text>
          );
        }

        if (r.type === 'incorrect') {
          return (
            <Text key={i} class="mt-1">
              🔴 {r.description}: {r.errorMsg}
            </Text>
          );
        }

        return (
          <Text key={i} class="mt-1">
            🟢 {r.description}
          </Text>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
