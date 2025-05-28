/**
 * @format
 */

import {Buffer} from '@craftzdog/react-native-buffer';
import {AppRegistry} from 'react-native';
import 'react-native-get-random-values';
import {name as appName} from './app.json';
import App from './src/App';

global.Buffer = Buffer;
global.process.cwd = () => '';

AppRegistry.registerComponent(appName, () => App);
