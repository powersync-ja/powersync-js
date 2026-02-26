import { usePowerSync, useQuery, ATTACHMENT_TABLE, attachmentFromSql, AttachmentRecord } from '@powersync/react-native';
import { CameraCapturedPicture } from 'expo-camera';
import _ from 'lodash';
import * as React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, View } from 'react-native';
import { FAB, Text } from '@rneui/themed';
import { Stack, useLocalSearchParams } from 'expo-router';
import prompt from 'react-native-prompt-android';
import { TODO_TABLE, TodoRecord, LIST_TABLE } from '../../../../library/powersync/AppSchema';
import { useSystem } from '../../../../library/powersync/system';
import { TodoItemWidget } from '../../../../library/widgets/TodoItemWidget';

type TodoEntry = TodoRecord & { todo_id: string; attachment_id: string | null };

const TodoView: React.FC = () => {
  const system = useSystem();
  const powerSync = usePowerSync();
  const params = useLocalSearchParams<{ id: string }>();
  const listID = params.id;

  const {
    data: [listRecord]
  } = useQuery<{ name: string }>(`SELECT name FROM ${LIST_TABLE} WHERE id = ?`, [listID]);

  const { data: todos, isLoading } = useQuery<TodoEntry>(
    `
        SELECT
            ${TODO_TABLE}.id AS todo_id,
            ${TODO_TABLE}.*,
            ${ATTACHMENT_TABLE}.id AS attachment_id,
            ${ATTACHMENT_TABLE}.*
        FROM
            ${TODO_TABLE}
        LEFT JOIN
            ${LIST_TABLE} ON ${TODO_TABLE}.list_id = ${LIST_TABLE}.id
        LEFT JOIN
            ${ATTACHMENT_TABLE} ON ${TODO_TABLE}.photo_id = ${ATTACHMENT_TABLE}.id
        WHERE
            ${TODO_TABLE}.list_id = ?`,
    [listID],
    { streams: [{ name: 'todos', parameters: { list_id: listID } }] }
  );

  const toggleCompletion = async (record: TodoRecord, completed: boolean) => {
    const updatedRecord = { ...record, completed: completed };
    if (completed) {
      const userID = await system.supabaseConnector.userId();
      updatedRecord.completed_at = new Date().toISOString();
      updatedRecord.completed_by = userID!;
    } else {
      updatedRecord.completed_at = null;
      updatedRecord.completed_by = null;
    }
    await system.powersync.execute(
      `UPDATE ${TODO_TABLE}
            SET completed = ?,
                completed_at = ?,
                completed_by = ?
            WHERE id = ?`,
      [completed, updatedRecord.completed_at, updatedRecord.completed_by, record.id]
    );
  };

  const savePhoto = async (id: string, data: CameraCapturedPicture) => {
    if (system.photoAttachmentQueue) {
      // We are sure the base64 is not null, as we are using the base64 option in the CameraWidget
      const { id: photoId } = await system.photoAttachmentQueue.saveFile({
        data: data.base64!,
        fileExtension: 'jpg',
        mediaType: 'image/jpeg'
      });

      await system.powersync.execute(`UPDATE ${TODO_TABLE} SET photo_id = ? WHERE id = ?`, [photoId, id]);
    }
  };

  const createNewTodo = async (description: string) => {
    const userID = await system.supabaseConnector.userId();

    await powerSync.execute(
      `INSERT INTO
              ${TODO_TABLE}
                  (id, created_at, created_by, description, list_id)
              VALUES
                  (uuid(), datetime(), ?, ?, ?)`,
      [userID, description, listID!]
    );
  };

  const deleteTodo = async (id: string, photoRecord?: AttachmentRecord) => {
    if (system.photoAttachmentQueue && photoRecord != null) {
      await system.photoAttachmentQueue.deleteFile({
        id: photoRecord.id,
        updateHook: async (tx) => {
          await tx.execute(`DELETE FROM ${TODO_TABLE} WHERE id = ?`, [id]);
        }
      });
    } else {
      await system.powersync.execute(`DELETE FROM ${TODO_TABLE} WHERE id = ?`, [id]);
    }
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
        color="#aa00ff"
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
          const photoRecord = attachmentFromSql(r);
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
