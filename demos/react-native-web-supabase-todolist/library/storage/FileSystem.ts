import * as ExpoFileSystem from 'expo-file-system';
import { Platform } from 'react-native';

class WebFileSystem {
  static documentDirectory = '';

  static async getInfoAsync(...args: any[]): Promise<ExpoFileSystem.FileInfo> {
    return {
      exists: false,
      isDirectory: false,
      uri: ''
    };
  }

  static async writeAsStringAsync(...args: any[]): Promise<void> {
    // No operation, mock implementation
  }

  static async readAsStringAsync(...args: any[]): Promise<string> {
    return ''; // Return an empty string as mock data
  }

  static async deleteAsync(...args: any[]): Promise<void> {
    // No operation, mock implementation
  }

  static async makeDirectoryAsync(...args: any[]): Promise<void> {
    // No operation, mock implementation
  }

  static async copyAsync(...args: any[]): Promise<void> {
    // No operation, mock implementation
  }
}

const isWeb = Platform.OS === 'web';
export const FileSystem = isWeb ? WebFileSystem : ExpoFileSystem;
