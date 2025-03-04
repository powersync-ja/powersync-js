import { performance } from 'node:perf_hooks';

import { expect } from 'vitest';
import { databaseTest } from './utils';

databaseTest('links powersync', async ({database}) => {
    await database.get('select powersync_rs_version();');
});

/*
databaseTest('runs queries concurrently', async ({database}) => {
    const start = performance.now();

    await Promise.all(new Array(5).map(() => database.get('SELECT 1;')));

    const end = performance.now();
    expect(end - start).toBeLessThan(1000 * 5);
});
*/
