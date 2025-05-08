import 'detox';
import {expect} from 'detox';
import {IndexableNativeElement} from 'detox/detox';

describe('Raw queries', () => {
  let testCount = 0;

  beforeAll(async () => {
    await device.launchApp();
    const suiteElement = element(by.id('Raw queries'));
    await suiteElement.tap();

    const testCounterLabel = ((await suiteElement.getAttributes()) as any)
      .label;
    testCount = Number(testCounterLabel);

    await waitFor(element(by.text('⏳')))
      .not.toBeVisible()
      .withTimeout(20000);
  });

  // Since tests need to be defined statically, we need to use a loop to evaluate the tests dynamically
  it('should pass all tests', async () => {
    const tests: {
      title: string;
      status: 'passed' | 'failed' | 'pending';
      message?: string;
      trace?: string;
    }[] = [];
    for (let i = 0; i < testCount; i++) {
      const title = await getText(element(by.id('testtitle-' + i)));
      try {
        await expect(element(by.id('teststate-' + i))).toHaveText('✅');

        tests.push({
          title: title,
          status: 'passed',
          message: 'Test passed',
        });
      } catch (e) {
        try {
          await expect(element(by.id('teststate-' + i))).toHaveText('❌');
          const errorMessage = await getText(element(by.id('errorstate-' + i)));
          tests.push({
            title: title,
            status: 'failed',
            message: errorMessage,
            trace: (e as any).message,
          });
        } catch (_e) {
          tests.push({
            title: title,
            status: 'pending',
          });
        }
      }
    }
    let hasErrors = !!tests.filter(t => t.status === 'failed').length;

    // Dump error traces first
    if (hasErrors) {
      console.log('\n\x1b[31m\x1b[1m✖ Failed test traces:\x1b[0m\n');
      tests.forEach((t, i) => {
        if (t.status !== 'failed') {
          return;
        }
        console.log(`\x1b[31m#${i + 1} ${t.title}\n\x1b[37m${t.trace}`);
      });
    }

    // Print final summary
    console.log('\n\x1b[1mTest Summary:\x1b[0m');
    tests.forEach((t, i) => {
      if (t.status === 'passed') {
        console.log(`\x1b[32m#${i + 1} ${t.title}\x1b[0m`);
      } else if (t.status === 'failed') {
        console.log(
          `\x1b[31m#${i + 1} ${t.title} - Failed \x1b[37m${t.message}`,
        );
      } else {
        console.log(`\x1b[33m#${i + 1} ${t.title}`);
      }
    });

    if (hasErrors) {
      throw new Error('Test suite failed - check the above errors for details');
    }
  });
});

async function getText(element: IndexableNativeElement): Promise<string> {
  return ((await element.getAttributes()) as any).label as string;
}
