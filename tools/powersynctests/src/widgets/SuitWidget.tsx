import type * as MochaTypes from 'mocha';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, IconButton } from 'react-native-paper';
import { runFiltered } from '../mocha/MochaSetup';
import { TestResult, TestState, TestWidget } from './TestWidget';

export type SuiteState = {
  result: TestResult;
  testResults: Map<string, TestState>;
};

export type SuitWidgetProps = {
  suit: MochaTypes.Suite;
  initial?: SuiteState;
};

export const SuitWidget = (props: SuitWidgetProps): React.JSX.Element => {
  const { initial, suit } = props;

  const [state, setState] = React.useState<SuiteState>(
    initial ?? {
      result: TestResult.IDLE,
      testResults: new Map(),
    },
  );
  const id = suit.fullTitle().trim();
  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.container}>
          <Text style={styles.testName} numberOfLines={3}>
            {suit.fullTitle()} - <Text>{suit.tests.length}</Text> tests
          </Text>
          <IconButton
            icon="play"
            aria-label={suit.tests.length + ''}
            testID={id}
            mode="contained"
            onPress={async () => {
              const pendingState = new Map<string, TestState>();
              suit.tests.forEach(test => {
                pendingState.set(test.title, {
                  result: TestResult.RUNNING,
                });
              });
              setState({
                result: TestResult.RUNNING,
                testResults: pendingState,
              });
              try {
                const r = await runFiltered(suit);

                const testStates = new Map<string, TestState>();
                suit.tests.forEach(test => {
                  const testResult = r.find(t => t.description === test.title);
                  if (testResult) {
                    testStates.set(test.title, {
                      result:
                        testResult.type == 'correct'
                          ? TestResult.PASSED
                          : TestResult.FAILED,
                      error: testResult.errorMsg,
                    });
                  }
                });

                const failed = !!r.find(t => t.type === 'incorrect');

                setState({
                  result: failed ? TestResult.FAILED : TestResult.PASSED,
                  testResults: testStates,
                });

                if (failed) {
                  console.error(r);
                }
              } catch (error) {
                console.error(error);
                setState({
                  result: TestResult.FAILED,
                  testResults: new Map(),
                });
              }
            }}
            disabled={state.result === TestResult.RUNNING}
          />
        </View>

        <View>

          {suit.tests.map((test, index) => (
            <TestWidget
              key={test.fullTitle()}
              test={test}
              index={index}
              upstreamState={state.testResults.get(test.title)}
            />
          ))}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
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
  card: {
    padding: 5,
    marginVertical: 10,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  testName: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 18,
    marginHorizontal: 5,
  },
});
