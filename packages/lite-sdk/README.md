# PowerSync Lite SDK

An experimental SDK that provides a lightweight interface to connect to a PowerSync service and interact with its synchronization protocol. This SDK is designed to expose sync bucket and stream operations to agnostic data APIs, such as TanStack DB collections, enabling flexible integration with various data storage solutions.

## Overview

PowerSync Lite SDK focuses on the core synchronization protocol, allowing you to:

- Connect to a PowerSync service and manage bidirectional sync
- Process sync operations from buckets and streams
- Integrate with external data storage systems (e.g., TanStack DB, in-memory stores, custom databases)
- Handle connection management, credential refresh, and automatic retries

The SDK is designed to be storage-agnostic, giving you full control over how synchronized data is stored and accessed in your application.

## Installation

```bash
npm install @powersync/lite-sdk
```

## Quick Start

### Basic Example

Here's a basic example of connecting to a PowerSync service and processing sync operations:

```typescript
import {
  MemoryBucketStorageImpl,
  SyncClientImpl,
  DEFAULT_SYSTEM_DEPENDENCIES,
  type Connector,
  type SyncOperationsHandler
} from '@powersync/lite-sdk';

// Define a connector to fetch credentials
const connector: Connector = {
  fetchCredentials: async () => {
    const tokenResponse = await fetch(`http://localhost:6060/api/auth/token`, {
      method: `GET`,
      headers: {
        'content-type': `application/json`
      }
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to fetch token: ${tokenResponse.statusText}`);
    }

    const tokenBody = await tokenResponse.json();
    return {
      endpoint: `http://localhost:8080`,
      token: tokenBody.token
    };
  }
};

// Define a handler to process sync operations
const syncOperationsHandler: SyncOperationsHandler = {
  processOperations: async (operations) => {
    // Process operations and apply them to your external storage
    // For example, update TanStack DB collections, your database, etc.
    console.log(`Processing ${operations.length} operations`);

    for (const operation of operations) {
      if (operation.op === 'PUT') {
        // Insert or update data in your storage
        console.log(`PUT ${operation.type}:${operation.id}`, operation.data);
      } else if (operation.op === 'REMOVE') {
        // Remove data from your storage
        console.log(`REMOVE ${operation.type}:${operation.id}`);
      }
    }
  }
};

// Create system dependencies (default uses browser/Node.js globals)
const systemDependencies = DEFAULT_SYSTEM_DEPENDENCIES();

// Create storage implementation
const storage = new MemoryBucketStorageImpl({
  operationsHandlers: [syncOperationsHandler],
  systemDependencies: systemDependencies
});

// Create and connect the sync client
const syncClient = new SyncClientImpl({
  connectionRetryDelayMs: 1000,
  uploadRetryDelayMs: 1000,
  debugMode: false,
  storage: storage,
  systemDependencies: systemDependencies
});

// Connect to the PowerSync service
await syncClient.connect(connector);

// The client will now continuously sync data
// When you're done, you can disconnect:
// syncClient.disconnect();
```

## Core Concepts

### SyncClient

The `SyncClient` is the main interface for synchronizing data with a PowerSync service. It handles:

- Connection management and automatic reconnection
- Bidirectional data synchronization
- Credential refresh via the `Connector` interface
- Status tracking (connection state, errors, etc.)

### BucketStorage

`BucketStorage` is an interface for managing bucket data and synchronization state. The SDK provides:

- `MemoryBucketStorageImpl`: An in-memory implementation for cases where persistence is not required
- You can implement your own `BucketStorage` to integrate with your preferred storage solution

### SyncOperationsHandler

`SyncOperationsHandler` receives sync operations from the protocol and allows you to apply them to your external data storage. Each operation contains:

- `type`: The table/collection name
- `id`: The row identifier
- `op`: The operation type (`PUT` or `REMOVE`)
- `data`: The operation data (null for `REMOVE` operations)

### Connector

The `Connector` interface provides a way to dynamically fetch credentials for authentication. This enables:

- Token refresh without disconnecting
- Dynamic credential rotation
- Custom authentication logic

## API Reference

### SyncClient

#### `connect(connector: Connector): Promise<void>`

Establishes a connection to the PowerSync service and begins syncing. The connection will automatically retry on failure using the configured retry delay.

#### `disconnect(): void`

Disconnects from the PowerSync service and stops all sync operations.

#### `status: SyncStatus`

The current synchronization status, including:

- `connected`: Whether the client is currently connected
- `connecting`: Whether the client is attempting to connect
- `uploading`: Whether data is currently being uploaded
- `downloading`: Whether data is currently being downloaded
- `uploadError`: Error that occurred during upload, if any
- `downloadError`: Error that occurred during download, if any
- `anyError`: Any other error that occurred during sync operations

### SyncClientImpl Options

```typescript
{
  connectionRetryDelayMs: number;      // Delay before retrying failed connection attempts
  uploadRetryDelayMs: number;          // Delay before retrying failed upload operations
  debugMode?: boolean;                  // Enable debug logging
  storage: BucketStorage;              // Storage implementation
  systemDependencies: SystemDependencies; // System-level dependencies
}
```

### SyncOperationsHandler

```typescript
interface SyncOperationsHandler {
  processOperations(operations: ReadonlyArray<SyncOperation>): Promise<void>;
}
```

### Connector

```typescript
interface Connector {
  fetchCredentials(): Promise<PowerSyncCredentials | null>;
}
```

### SyncOperation

```typescript
type SyncOperation = {
  type: string; // Table/collection name
  id: string; // Row identifier
  op: 'PUT' | 'REMOVE'; // Operation type
  data: string | null; // Operation data (null for REMOVE)
};
```

## Integration Examples

### TanStack DB Integration

```typescript
import { syncClient } from './sync-client';
import { db } from './db';

const syncOperationsHandler: SyncOperationsHandler = {
  processOperations: async (operations) => {
    for (const operation of operations) {
      const table = db[operation.type];

      if (operation.op === 'PUT') {
        const data = JSON.parse(operation.data!);
        await table.upsert(data);
      } else if (operation.op === 'REMOVE') {
        await table.delete(operation.id);
      }
    }
  }
};
```

### Custom Database Integration

```typescript
const syncOperationsHandler: SyncOperationsHandler = {
  processOperations: async (operations) => {
    await db.transaction(async (tx) => {
      for (const operation of operations) {
        if (operation.op === 'PUT') {
          const data = JSON.parse(operation.data!);
          await tx.insert(operation.type).values(data).onConflictDoUpdate();
        } else if (operation.op === 'REMOVE') {
          await tx.delete(operation.type).where({ id: operation.id });
        }
      }
    });
  }
};
```

## System Dependencies

The SDK requires system-level dependencies for HTTP requests, streams, and cryptographic operations. The `DEFAULT_SYSTEM_DEPENDENCIES()` function provides a default implementation that uses browser/Node.js globals (`fetch`, `ReadableStream`, `TextDecoder`, `crypto`).

For custom environments (e.g., React Native), you can provide your own implementation:

```typescript
const systemDependencies: SystemDependencies = {
  fetch: customFetch,
  ReadableStream: customReadableStream,
  TextDecoder: customTextDecoder,
  crypto: customCrypto
};
```

## Current Limitations

⚠️ **This is an experimental package and is still under active development.**

The following features are planned but not yet fully implemented:

1. **Sync Status Indicators**: The sync status tracking is partially implemented but needs completion. Status updates for connection state, sync progress, and error reporting are not fully functional.

2. **CRUD Functionality**: Client-side CRUD operations (create, read, update, delete) that need to be uploaded to the server are not yet fully implemented. The `ps_crud` storage layer exists but is not complete.

3. **Sync Streams Support**: Support for sync streams is mentioned in the codebase but may need additional implementation work. The checkpoint structure includes streams, but full stream synchronization support may be pending.

## Known Limitations

The following features are not supported in the Lite SDK:

1. **Bucket Priority Sync Statuses**: The SDK does not support bucket priority sync statuses. All buckets are synced with equal priority.

2. **Download Progress Statuses**: The SDK does not provide download progress statuses. While the sync status tracks overall downloading state, granular progress information for individual downloads is not available.
