import { initializeBackgroundTask } from '@/library/utils';
import { LIST_TABLE, ListRecord } from '@/powersync/AppSchema';
import { useSystem } from '@/powersync/SystemContext';
import { useQuery, useStatus } from '@powersync/react-native';
import * as TaskManager from "expo-task-manager";
import React, { useEffect } from 'react';
import { FlatList, SafeAreaView, Text, View } from 'react-native';

TaskManager.getRegisteredTasksAsync().then((tasks) => {
  console.log("Number of tasks registered:", tasks.length);
});

// Declare a variable to store the resolver function
let resolver: (() => void) | null;

// Create a promise and store its resolve function for later
const promise = new Promise<void>((resolve) => {
  resolver = resolve;
});

// Pass the promise to the background task, it will wait until the promise resolves
initializeBackgroundTask(promise);

export default function HomeScreen() {
  const system = useSystem();
  const status = useStatus();

  useEffect(() => {
    resolver?.();
  }, []);

  const { data: listRecords } = useQuery<ListRecord>(`
    SELECT * FROM ${LIST_TABLE}
  `);

  // Calculate sync percentage
  const downloadProgress = status.downloadProgress;
  const syncPercentage = downloadProgress?.downloadedFraction
    ? Math.round(downloadProgress.downloadedFraction * 100)
    : null;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
          Lists
        </Text>

        {/* Sync Progress Indicator */}
        {status.dataFlowStatus?.downloading && downloadProgress && (
          <View style={{
            marginBottom: 20,
            padding: 15,
            backgroundColor: '#e3f2fd',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#2196f3'
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: '#1976d2',
              marginBottom: 5
            }}>
              Syncing...
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#1976d2'
            }}>
              {syncPercentage !== null ? `${syncPercentage}% complete` : 'Syncing...'}
            </Text>
            {downloadProgress && (
              <Text style={{
                fontSize: 12,
                color: '#1976d2',
                marginTop: 2
              }}>
                Downloaded {downloadProgress.downloadedOperations} out of {downloadProgress.totalOperations}
              </Text>
            )}

            {/* Progress Bar */}
            {downloadProgress && downloadProgress.totalOperations > 0 && (
              <View style={{
                marginTop: 10,
                height: 8,
                backgroundColor: '#bbdefb',
                borderRadius: 4,
                overflow: 'hidden'
              }}>
                <View style={{
                  height: '100%',
                  backgroundColor: '#2196f3',
                  width: `${(downloadProgress.downloadedOperations / downloadProgress.totalOperations) * 100}%`,
                  borderRadius: 4
                }} />
              </View>
            )}
          </View>
        )}

        <FlatList
          data={listRecords}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={{ color: '#999', fontStyle: 'italic' }}>No lists found</Text>
          }
          renderItem={({ item: list }) => (
            <View style={{
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 8,
              padding: 15,
              backgroundColor: '#f9f9f9'
            }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>
                {list.name}
              </Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}