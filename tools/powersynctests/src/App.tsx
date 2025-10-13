/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */
import '@azure/core-asynciterator-polyfill';
import React from 'react';
import { SafeAreaView, ScrollView, StatusBar, useColorScheme } from 'react-native';

import { Colors } from 'react-native/Libraries/NewAppScreen';
import { rootSuite } from './mocha/MochaRNAdapter';
import { registerBaseTests } from './tests/queries.test';
import { SuitWidget } from './widgets/SuitWidget';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter
  };

  const [] = React.useState(registerBaseTests());
  /*
   * To keep the template simple and small we're adding padding to prevent view
   * from rendering under the System UI.
   * For bigger apps the reccomendation is to use `react-native-safe-area-context`:
   * https://github.com/AppAndFlow/react-native-safe-area-context
   *
   * You can read more about it here:
   * https://github.com/react-native-community/discussions-and-proposals/discussions/827
   */
  const safePadding = '5%';

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView style={backgroundStyle}>
        {/* <PowerSyncIndicator /> */}
        {rootSuite.suites.map((suite) => (
          <SuitWidget key={suite.title} suit={suite} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default App;
