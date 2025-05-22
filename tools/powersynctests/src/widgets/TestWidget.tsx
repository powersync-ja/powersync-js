import type * as MochaTypes from 'mocha';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, IconButton } from 'react-native-paper';
import { runFiltered } from '../mocha/MochaSetup';

export type TestState = {
  result: TestResult;
  error?: string;
};

export type TestWidgetProps = {
  test: MochaTypes.Test;
  upstreamState?: TestState;
  index?: number;
};

export enum TestResult {
  IDLE = 'idle',
  RUNNING = 'running',
  PASSED = 'passed',
  FAILED = 'failed',
}

export const TestWidget = (props: TestWidgetProps): React.JSX.Element => {
  const { test, upstreamState } = props;

  const [state, setState] = React.useState<TestState>(
    upstreamState ?? { result: TestResult.IDLE },
  );

  React.useEffect(() => {
    setState(upstreamState ?? state);
  }, [upstreamState]);

  const onComplete = React.useCallback((error?: any) => {
    if (error) {
      setState({ result: TestResult.FAILED, error: error });
    } else {
      setState({ result: TestResult.PASSED });
    }
  }, []);

  const getStatusIcon = () => {
    switch (state.result) {
      case TestResult.PASSED:
        return '✅';
      case TestResult.FAILED:
        return '❌';
      case TestResult.RUNNING:
        return '⏳';
      default:
        return '⚪';
    }
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.container} testID={'testtitle-' + props.index} aria-label={test.title}>
          <Text testID={'teststate-' + props.index} style={styles.status}>{getStatusIcon()}</Text>
          <Text style={styles.testName} numberOfLines={3}>
            {test.title}
          </Text>
          <IconButton
            icon="play"
            mode="contained"
            onPress={async () => {
              setState({ result: TestResult.RUNNING });
              const results = await runFiltered(test.parent!, test);
              const r = results.find(r => r.description == test.title);
              if (r?.type === 'incorrect') {
                onComplete(r.errorMsg);
              } else {
                onComplete();
              }
            }}
            disabled={state.result === TestResult.RUNNING}
          />
        </View>
        <View testID={'errorstate-' + props.index} aria-label={JSON.stringify(state.error)}>
          {state.error ? <Text>{JSON.stringify(state.error)}</Text> : null}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
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
