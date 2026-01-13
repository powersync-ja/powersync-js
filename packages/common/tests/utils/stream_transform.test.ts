import { describe, test, expect } from 'vitest';
import {
  doneResult,
  extractJsonLines,
  injectable,
  SimpleAsyncIterator,
  valueResult
} from '../../src/utils/stream_transform';

describe('extractJsonLines', () => {
  function testWith(...chunks: string[]): SimpleAsyncIterator<string> {
    const encoder = new TextEncoder();
    const input: SimpleAsyncIterator<Uint8Array> = {
      async next() {
        if (chunks.length == 0) {
          return { done: true, value: undefined };
        }

        const entry = chunks.shift();
        return { value: encoder.encode(entry) };
      }
    };

    return extractJsonLines(input, new TextDecoder());
  }

  test('empty lines', async () => {
    const json = testWith('foo\n', '\n', '\nbar\n');
    expect(await json.next()).toStrictEqual(valueResult('foo'));
    expect(await json.next()).toStrictEqual(valueResult('bar'));
    expect(await json.next()).toStrictEqual(doneResult);
  });

  test('trailing line', async () => {
    const json = testWith('foo\n', 'bar');
    expect(await json.next()).toStrictEqual(valueResult('foo'));
    expect(await json.next()).toStrictEqual(valueResult('bar'));
    expect(await json.next()).toStrictEqual(doneResult);
  });
});

describe('injectible', () => {
  test('forwards upstream events', async () => {
    async function* source() {
      yield 1;
      yield 2;
      yield 3;
    }

    const stream = injectable(source());
    for (let i = 1; i <= 3; i++) {
      expect(await stream.next()).toStrictEqual(valueResult(i));
    }
    expect(await stream.next()).toStrictEqual(doneResult);
  });

  test('forwards injected events', async () => {
    let pendingCall: ((value: IteratorResult<number>) => void) | null = null;
    const stream = injectable<number>({
      next() {
        return new Promise((resolve) => (pendingCall = resolve));
      }
    });

    stream.inject(-1);
    expect(await stream.next()).toStrictEqual(valueResult(-1));

    {
      const next = stream.next();
      expect(pendingCall).not.toBeNull();

      stream.inject(-2); // Inject before resolving upstream next()
      expect(await next).toStrictEqual(valueResult(-2));
    }

    {
      const next = stream.next();
      expect(pendingCall).not.toBeNull();
      pendingCall!(valueResult(3));
      pendingCall = null;

      expect(await next).toStrictEqual(valueResult(3));
    }

    {
      const next = stream.next();
      expect(pendingCall).not.toBeNull();
      pendingCall!(doneResult);
      pendingCall = null;

      expect(await next).toStrictEqual(doneResult);
    }
  });
});
