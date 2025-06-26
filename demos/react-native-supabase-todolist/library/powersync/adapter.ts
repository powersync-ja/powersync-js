import { getDylibPath, type DB } from '@op-engineering/op-sqlite';
import { OPSQLiteDBAdapter } from '@powersync/op-sqlite';
import * as FileSystem from 'expo-file-system';

export class ExpoAdapter extends OPSQLiteDBAdapter {
  public async loadPowerSyncExtension(DB: DB) {
    console.log('OVERRIDDEN LOAD');
    // if (Platform.OS === 'ios') {
    const libPath = getDylibPath('co.powersync.sqlitecore', 'powersync-sqlite-core');
    console.log('Bundled path', libPath);
    //   DB.loadExtension(libPath, 'sqlite3_powersync_init');
    // }

    //android arch64
    // const fileUrl =
    //   'https://www.dropbox.com/scl/fi/sst93bsf1ritnqoe3oe9w/libpowersync.so?rlkey=c34n51pb6y5065su6o0ixczc4&st=u76jpyp2&dl=1';
    // x64
    // const fileUrl =
    //   'https://www.dropbox.com/scl/fi/13ho6v2w6fau3eq8wujv3/libpowersync_x64-1.so?rlkey=02r25q59nax4hhzppuvregv9d&st=mfbwtz0q&dl=1';
    // ios slice
    //   'https://www.dropbox.com/scl/fi/d4v2xanai0q8yi4jb17b7/powersync-sqlite-core?rlkey=r0dy109laxuxgkcilbcwpc7t9&st=3sya938g&dl=1';
    // const fileName = 'libpowersync.so'; // no .dylib
    // bundled ios xcf
    const fileUrl =
      'https://www.dropbox.com/scl/fi/d4v2xanai0q8yi4jb17b7/powersync-sqlite-core?rlkey=r0dy109laxuxgkcilbcwpc7t9&st=xn3hfqx7&dl=1';

    const fileName = 'powersync-sqlite-core';
    // const uri = await this.downloadAndSaveFile(fileUrl, fileName);
    // const uri =
    //   'file:///Users/christiaanlandman/Library/Developer/CoreSimulator/Devices/2F1E3D3B-1A15-4D8C-9807-F9BB5DDF9B2C/data/Containers/Data/Application/809665CE-0CC3-465A-B6E7-F56B4FC5BE8E/Documents/powersync-sqlite-core';
    // const path = uri?.replace('file://', '');

    // const path =
    //   '/Users/christiaanlandman/Library/Developer/CoreSimulator/Devices/2F1E3D3B-1A15-4D8C-9807-F9BB5DDF9B2C/data/Containers/Data/Application/3FCF064A-2A10-40C1-B4FF-93202B873163/Documents/powersync-sqlite-core';
    // console.log('Loading extension', path);

    try {
      DB.loadExtension(
        '/Users/christiaanlandman/Library/Developer/CoreSimulator/Devices/2F1E3D3B-1A15-4D8C-9807-F9BB5DDF9B2C/data/Containers/Data/Application/809665CE-0CC3-465A-B6E7-F56B4FC5BE8E/Documents/powersync-sqlite-core',
        'sqlite3_powersync_init'
      );
      console.log('success');
    } catch (error) {
      console.error('Loading error:', error);
    }
  }

  private async downloadAndSaveFile(url: any, fileName: any) {
    try {
      console.log('Starting simple download...');

      const downloadDest = `${FileSystem.documentDirectory}${fileName}`;

      const { uri } = await FileSystem.downloadAsync(url, downloadDest);

      console.log('File downloaded to:', uri);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return uri;
    } catch (error) {
      console.error('Simple download error:', error);
    }
    return '';
  }
}
