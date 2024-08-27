import { ATTACHMENT_TABLE, AttachmentRecord } from '@powersync/attachments';
import { usePowerSync, useQuery } from '@powersync/react-native';
import { CameraCapturedPicture } from 'expo-camera';
import _ from 'lodash';
import * as React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, View, Text } from 'react-native';
import { FAB } from 'react-native-elements';
import { Stack, useLocalSearchParams } from 'expo-router';
import prompt from 'react-native-prompt-android';
import { TODOS_TABLE, TodoRecord, LISTS_TABLE } from '../../../../library/powersync/AppSchema';
import { useSystem } from '../../../../library/powersync/system';
import { TodoItemWidget } from '../../../../library/widgets/TodoItemWidget';

type TodoEntry = TodoRecord & Partial<Omit<AttachmentRecord, 'id'>> & { todo_id: string; attachment_id: string | null };

const toAttachmentRecord = _.memoize((entry: TodoEntry): AttachmentRecord | null => {
  return entry.attachment_id == null
    ? null
    : {
        id: entry.attachment_id,
        filename: entry.filename!,
        state: entry.state!,
        timestamp: entry.timestamp,
        local_uri: entry.local_uri,
        media_type: entry.media_type,
        size: entry.size
      };
});

const TodoView: React.FC = () => {
  const system = useSystem();
  const powerSync = usePowerSync();
  const params = useLocalSearchParams<{ id: string }>();
  const listID = params.id;

  const {
    data: [listRecord]
  } = useQuery<{ name: string }>(`SELECT name FROM ${LISTS_TABLE} WHERE id = ?`, [listID]);

  const { data: todos, isLoading } = useQuery<TodoEntry>(
    `
        SELECT
            ${TODOS_TABLE}.id AS todo_id,
            ${TODOS_TABLE}.*,
            ${ATTACHMENT_TABLE}.id AS attachment_id,
            ${ATTACHMENT_TABLE}.*
        FROM
            ${TODOS_TABLE}
        LEFT JOIN
            ${LISTS_TABLE} ON ${TODOS_TABLE}.list_id = ${LISTS_TABLE}.id
        LEFT JOIN
            ${ATTACHMENT_TABLE} ON ${TODOS_TABLE}.photo_id = ${ATTACHMENT_TABLE}.id
        WHERE
            ${TODOS_TABLE}.list_id = ?`,
    [listID]
  );

  const toggleCompletion = async (record: TodoRecord, completed: boolean) => {
    const updatedRecord = { ...record, completed: completed };
    if (completed) {
      const { userID } = await system.supabaseConnector.fetchCredentials();
      updatedRecord.completed_at = new Date().toISOString();
      updatedRecord.completed_by = userID;
    } else {
      updatedRecord.completed_at = null;
      updatedRecord.completed_by = null;
    }
    await system.powersync.execute(
      `UPDATE ${TODOS_TABLE}
            SET completed = ?,
                completed_at = ?,
                completed_by = ?
            WHERE id = ?`,
      [completed, updatedRecord.completed_at, updatedRecord.completed_by, record.id]
    );
  };

  const savePhoto = async (id: string, data: CameraCapturedPicture) => {
    // We are sure the base64 is not null, as we are using the base64 option in the CameraWidget
    const { id: photoId } = await system.attachmentQueue!.savePhoto(data.base64!);

    await system.powersync.execute(`UPDATE ${TODOS_TABLE} SET photo_id = ? WHERE id = ?`, [photoId, id]);
  };

  const createNewTodo = async (description: string) => {
    const { userID } = await system.supabaseConnector.fetchCredentials();

    await powerSync.execute(
      `INSERT INTO
              ${TODOS_TABLE}
                  (id, created_at, created_by, description, list_id)
              VALUES
                  (uuid(), datetime(), ?, ?, ?)`,
      [userID, description, listID!]
    );
  };

  const deleteTodo = async (id: string, photoRecord?: AttachmentRecord) => {
    await system.powersync.writeTransaction(async (tx) => {
      if (photoRecord != null) {
        await system.attachmentQueue?.delete(photoRecord, tx);
      }
      await tx.execute(`DELETE FROM ${TODOS_TABLE} WHERE id = ?`, [id]);
    });
  };

  if (isLoading) {
    <View>
      <Text>Loading...</Text>
    </View>;
  }

  if (listRecord == null) {
    return (
      <View>
        <Stack.Screen
          options={{
            title: 'List not found'
          }}
        />
        <Text>No matching List found, please navigate back...</Text>
      </View>
    );
  }

  return (
    <View style={{ flexGrow: 1 }}>
      <Stack.Screen
        options={{
          title: listRecord.name
        }}
      />
      <FAB
        style={{ zIndex: 99, bottom: 0 }}
        icon={{ name: 'add', color: 'white' }}
        size="small"
        placement="right"
        onPress={() => {
          prompt(
            'Add a new Todo',
            '',
            (text) => {
              if (!text) {
                return;
              }

              return createNewTodo(text);
            },
            { placeholder: 'Todo description', style: 'shimo' }
          );
        }}
      />
      <ScrollView style={{ maxHeight: '90%' }}>
        {todos.map((r) => {
          const record = { ...r, id: r.todo_id };
          const photoRecord = toAttachmentRecord(r);
          return (
            <TodoItemWidget
              key={r.todo_id}
              record={record}
              photoAttachment={photoRecord}
              onToggleCompletion={(completed) => toggleCompletion(record, completed)}
              onSavePhoto={(data) => savePhoto(r.todo_id, data)}
              onDelete={() => deleteTodo(r.todo_id, photoRecord ?? undefined)}
            />
          );
        })}
      </ScrollView>
      <StatusBar style={'light'} />
    </View>
  );
};

export default TodoView;
