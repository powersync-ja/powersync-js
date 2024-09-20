import 'mocha';
import { clearTests, rootSuite } from './MochaRNAdapter';

export async function runTests(...registrators: Array<() => void>) {
  // testRegistrators: Array<() => void> = []
  // console.log('setting up mocha');

  const promise = new Promise((resolve) => {
    const { EVENT_RUN_BEGIN, EVENT_RUN_END, EVENT_TEST_FAIL, EVENT_TEST_PASS, EVENT_SUITE_BEGIN } =
      Mocha.Runner.constants;

    clearTests();
    const results: {
      description: string;
      key: string;
      type: string;
      errorMsg?: string;
    }[] = [];
    var runner = new Mocha.Runner(rootSuite);

    runner
      .once(EVENT_RUN_BEGIN, () => {})
      .on(EVENT_SUITE_BEGIN, (suite) => {
        const name = suite.title;
        if (name !== '') {
          results.push({
            description: name,
            key: Math.random().toString(),
            type: 'grouping'
          });
        }
      })
      .on(EVENT_TEST_PASS, (test) => {
        results.push({
          description: test.title,
          key: Math.random().toString(),
          type: 'correct'
        });
        // console.log(`${indent()}pass: ${test.fullTitle()}`);
      })
      .on(EVENT_TEST_FAIL, (test, err: Error) => {
        results.push({
          description: test.title,
          key: Math.random().toString(),
          type: 'incorrect',
          errorMsg: err.message
        });
        // console.log(
        // `${indent()}fail: ${test.fullTitle()} - error: ${err.message}`
        // );
      })
      .once(EVENT_RUN_END, () => {
        resolve(results);
      });

    registrators.forEach((register) => register());
    runner.run();
  });

  // return () => {
  //   console.log('aborting');
  //   runner.abort();
  // };

  return promise;
}
