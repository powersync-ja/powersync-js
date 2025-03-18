import { type SyncStatus } from "@powersync/node";

// Declared in preload.ts
declare const powersync: {
    addPort: (port: MessagePort) => void,
    get: (sql: string, variables: any[]) => Promise<any[]>,
    syncStatus: (cb: (status: SyncStatus) => void) => void,
    watch: (sql: string, args: any[], cb: (rows: any[]) => void) => void,
};

const syncStatusTarget = document.getElementById('sync-status')!;
const results = document.getElementById('results') as HTMLLIElement;

// Simple query
powersync.get('SELECT powersync_rs_version()', []).then(console.log);

powersync.syncStatus((status) => {
    syncStatusTarget.innerText = `${JSON.stringify(status)}`;    
});

powersync.watch('SELECT * FROM lists', [], (rows) => {
    console.log(rows);
    const newElements: HTMLUListElement[] = [];
    for (const entry of rows) {
        const dom = document.createElement('ul');
        dom.textContent = JSON.stringify(entry);
        newElements.push(dom);
    }

    results.replaceChildren(...newElements);
});
