/**
 * Adapted from OP SQLite
 * https://github.com/OP-Engineering/op-sqlite/blob/804d153454f732ee4f37c9c864980cc0545aa3ef/example/src/tests/MochaSetup.ts#L1
 */
import 'mocha';
import type * as MochaTypes from 'mocha';
import {clearTests, rootSuite} from './MochaRNAdapter';

export type TestResult = {
  description: string;
  key: string;
  type: 'correct' | 'incorrect' | 'grouping';
  errorMsg?: string;
};

export async function runTests(...registrators: Array<() => void>) {
  const promise = new Promise<TestResult[]>(resolve => {
    const {
      EVENT_RUN_BEGIN,
      EVENT_RUN_END,
      EVENT_TEST_FAIL,
      EVENT_TEST_PASS,
      EVENT_SUITE_BEGIN,
      // EVENT_SUITE_END,
    } = Mocha.Runner.constants;

    clearTests();
    const results: any[] = [];
    var runner = new Mocha.Runner(rootSuite) as MochaTypes.Runner;

    runner
      .once(EVENT_RUN_BEGIN, () => {})
      .on(EVENT_SUITE_BEGIN, (suite: MochaTypes.Suite) => {
        const name = suite.title;
        if (name !== '') {
          results.push({
            description: name,
            key: Math.random().toString(),
            type: 'grouping',
          });
        }
      })
      .on(EVENT_TEST_PASS, (test: MochaTypes.Runnable) => {
        results.push({
          description: test.title,
          key: Math.random().toString(),
          type: 'correct',
        });
      })
      .on(EVENT_TEST_FAIL, (test: MochaTypes.Runnable, err: Error) => {
        results.push({
          description: test.title,
          key: Math.random().toString(),
          type: 'incorrect',
          errorMsg: err.message,
        });
      })
      .once(EVENT_RUN_END, () => {
        resolve(results);
      });

    registrators.forEach(register => {
      register();
    });

    runner.run();
  });
  return promise;
}

function cloneSuite(suite: MochaTypes.Suite) {
  const copiedSuite = suite.clone();
  copiedSuite.beforeAll = suite.beforeAll;
  // @ts-ignore
  copiedSuite._beforeEach = suite._beforeEach;
  // @ts-ignore
  copiedSuite._afterAll = suite._afterAll;
  // @ts-ignore
  copiedSuite._afterEach = suite._afterEach;
  copiedSuite.suites = suite.suites;

  return copiedSuite;
}

/**
 * Run a child of the root suite. This effectively runs a single test suite.
 */
export async function runFiltered(
  suite: MochaTypes.Suite,
  test?: MochaTypes.Test,
) {
  const promise = new Promise<TestResult[]>(resolve => {
    const {
      EVENT_RUN_BEGIN,
      EVENT_RUN_END,
      EVENT_TEST_FAIL,
      EVENT_TEST_PASS,
      EVENT_SUITE_BEGIN,
      // EVENT_SUITE_END,
    } = Mocha.Runner.constants;

    // Copy the Suite
    const copiedSuite = cloneSuite(suite);

    // Filter tests
    if (test) {
      copiedSuite.tests = [test];
    } else {
      copiedSuite.tests = suite.tests;
    }

    // Filter Suites
    let parent = suite.parent;
    let child = copiedSuite;

    while (parent) {
      copiedSuite.parent = cloneSuite(parent);
      copiedSuite.parent.suites = [child];
      parent = parent.parent;
    }

    const results: any[] = [];
    var runner = new Mocha.Runner(copiedSuite) as MochaTypes.Runner;

    runner
      .once(EVENT_RUN_BEGIN, () => {})
      .on(EVENT_SUITE_BEGIN, (suite: MochaTypes.Suite) => {
        const name = suite.title;
        if (name !== '') {
          results.push({
            description: name,
            key: Math.random().toString(),
            type: 'grouping',
          });
        }
      })
      .on(EVENT_TEST_PASS, (test: MochaTypes.Runnable) => {
        results.push({
          description: test.title,
          key: Math.random().toString(),
          type: 'correct',
        });
      })
      .on(EVENT_TEST_FAIL, (test: MochaTypes.Runnable, err: Error) => {
        results.push({
          description: test.title,
          key: Math.random().toString(),
          type: 'incorrect',
          errorMsg: err.message,
        });
      })
      .once(EVENT_RUN_END, () => {
        resolve(results);
      });

    runner.run();
  });
  return promise;
}
