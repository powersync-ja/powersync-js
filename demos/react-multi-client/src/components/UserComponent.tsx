import { PebbleBoxWidget } from '@/components/PebbleBoxWidget';
import { useConsoleLines } from '@/components/hooks/useConsoleLines';
import { useSystem, useTimedPowerSync } from '@/components/providers/SystemProvider';
import { MAX_PEBBLES, NUM_INIT_PEBBLES, PebbleDef, TABLE_NAME, randomPebbleShape } from '@/definitions/Schema';
import { useStatus } from '@powersync/react';
import React, { useCallback, useEffect, useMemo } from 'react';
import { LogDisplayWidget } from './LogDisplayWidget';
import { UserFacade } from './facades/UserFacade';

export interface UserComponentProps {
  leftSide?: boolean;
}

const UPLOADING_CSS_CLASS = 'user__writes--active';
const DOWNLOADING_CSS_CLASS = 'user__reads--active';
const TOGGLE_ONLINE_CSS_CLASS = 'toggle-button-green--on button-toggle--on';

enum ConnectionText {
  CONNECTING = 'Connecting...',
  CONNECTED = 'Connected',
  DISCONNECTED = 'Disconnected'
}

enum CrudVerb {
  CREATE = 'created',
  UPDATE = 'updated',
  DELETE = 'deleted'
}

const buildLog = (verb: CrudVerb, elapsedMs: number, num = 1) => {
  return `${num} row${num > 1 ? 's' : ''} ${verb}. Total time: ${elapsedMs} ms`;
};

export const UserComponent: React.FC<UserComponentProps> = (props) => {
  // Wraps all operations against the powersync instance with a timer
  const powersync = useTimedPowerSync();
  const connector = useSystem();
  const status = useStatus();
  const userID = connector.currentSession?.user.id;

  const [connecting, setConnecting] = React.useState(true);
  const localStorageKey = useMemo(() => `${powersync.localKey}`, []);

  const { logs, addLog } = useConsoleLines();

  useEffect(() => {
    const onStorage = async (e: StorageEvent) => {
      // Only listen to events from this user side
      if (e.key === localStorageKey) {
        // We toggle the localStorage key to trigger the event from another tab
        // ann then check if we need to also connect
        if (!!e.oldValue && !e.newValue) {
          if (!connecting && !status.connected) {
            setConnecting(true);
            await powersync.connect(connector);
          }
        }
      }
    };

    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, [connecting, status.connected]);

  useEffect(() => {
    if (!connecting) {
      return;
    }
    addLog(ConnectionText.CONNECTING);
  }, [connecting]);

  useEffect(() => {
    setConnecting(false);
    if (status.connected) {
      addLog(ConnectionText.CONNECTED, true);
    } else if (!connecting) {
      addLog(ConnectionText.DISCONNECTED, false);
    }
  }, [status.connected]);

  useEffect(() => {
    (async () => {
      if (props.leftSide) {
        const isInitialized = await powersync.getOptional('SELECT * FROM settings WHERE initialized = ?', [1]);
        if (!!isInitialized) {
          console.log('Already initialized');
          return;
        }
        // Only clear and init DB if we have not been initialized yet
        await powersync.execute(`DELETE FROM ${TABLE_NAME}`);
        await powersync.writeTransaction(async (tx) => {
          for (let i = 0; i < NUM_INIT_PEBBLES; i++) {
            await tx.execute(`INSERT INTO ${TABLE_NAME} (id, user_id, shape) VALUES (uuid(), ?, ?)`, [
              userID,
              randomPebbleShape()
            ]);
          }
          await tx.execute('INSERT into settings (id, initialized) VALUES (uuid(), ?)', [1]);
        });
      }
    })();
  }, [userID]);

  const checkMaxPebbles = async () => {
    // Deletes any pebble if we have more than MAX_PEBBLES,
    // this is caused by creating pebbles while pebbles are added to the internal DB by PowerSync sync
    await powersync.execute(`DELETE FROM ${TABLE_NAME}
                                  WHERE id NOT IN (
                                    SELECT id
                                    FROM ${TABLE_NAME}
                                    ORDER BY shape ASC
                                    LIMIT ${MAX_PEBBLES}
                                  )`);
  };

  const handleTelemetry = useCallback(
    async (operation: string) => {
      await powersync.execute(
        `INSERT INTO operations (id, created_at, user_id, operation) VALUES (uuid(), datetime(), ?, ?)`,
        [userID, operation]
      );
    },
    [userID]
  );

  const handleCreate = useCallback(async () => {
    const { count } = await powersync.get<{ count: number }>(`SELECT COUNT(*) as count FROM ${TABLE_NAME}`, []);

    if (count >= MAX_PEBBLES) {
      return;
    }

    const { elapsedTime } = await powersync.timedExecute(
      `INSERT INTO ${TABLE_NAME} (id, created_at, user_id, shape) VALUES (uuid(), datetime(), ?, ?)`,
      [userID, randomPebbleShape()]
    );

    handleTelemetry(CrudVerb.CREATE);
    addLog(buildLog(CrudVerb.CREATE, elapsedTime));
  }, [userID]);

  const handleUpdate = useCallback(async () => {
    await checkMaxPebbles();
    const setOfPebbles = await powersync.getAll<PebbleDef>(
      `SELECT id FROM ${TABLE_NAME} ORDER BY RANDOM() LIMIT 3`,
      []
    );

    if (setOfPebbles.length == 0) {
      return;
    }
    const { elapsedTime } = await powersync.timedWriteTransaction(async (tx) => {
      setOfPebbles.forEach((pebble) => {
        tx.execute(`UPDATE ${TABLE_NAME} SET shape = ? WHERE id = ?`, [randomPebbleShape(), pebble.id]);
      });
    });

    handleTelemetry(CrudVerb.UPDATE);
    addLog(buildLog(CrudVerb.UPDATE, elapsedTime, setOfPebbles.length));
  }, [userID]);

  const handleDelete = useCallback(async () => {
    await checkMaxPebbles();

    const { elapsedTime } = await powersync.timedExecute(
      // Delete the right-most pebble ordered by shape
      `
      DELETE FROM ${TABLE_NAME} 
      WHERE id = (
        SELECT id 
        FROM ${TABLE_NAME} 
        ORDER BY shape DESC
        LIMIT 1
      )`
    );

    handleTelemetry(CrudVerb.DELETE);
    addLog(buildLog(CrudVerb.DELETE, elapsedTime));
  }, [userID]);

  const toggleOnline = useCallback(async () => {
    if (connecting) {
      return;
    }
    if (status.connected) {
      await powersync.disconnect();
    } else {
      setConnecting(true);
      await powersync.connect(connector);
    }
  }, [status.connected, connecting]);

  if (!userID) {
    return null;
  }

  const showOnline = status.connected || connecting;

  const className = useMemo(() => {
    return [
      status.dataFlowStatus.downloading ? DOWNLOADING_CSS_CLASS : '',
      status.dataFlowStatus.uploading ? UPLOADING_CSS_CLASS : '',
      showOnline ? TOGGLE_ONLINE_CSS_CLASS : ''
    ]
      .join(' ')
      .trim();
  }, [status.dataFlowStatus.downloading, status.dataFlowStatus.uploading, showOnline]);

  return (
    <div className={className}>
      <UserFacade
        leftSide={props.leftSide}
        onlineSync={connecting}
        online={showOnline}
        offline={!showOnline}
        readsFalse={true}
        writesFalse={true}
        content={<PebbleBoxWidget />}
        logText={<LogDisplayWidget lines={logs} />}
        onlineOfflineToggle={{ onClick: () => toggleOnline() }}
        buttonCreate={{ onClick: () => handleCreate() }}
        buttonUpdate={{ onClick: () => handleUpdate() }}
        buttonDelete={{ onClick: () => handleDelete() }}
      />
    </div>
  );
};
