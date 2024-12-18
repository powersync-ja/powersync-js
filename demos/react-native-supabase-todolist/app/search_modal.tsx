import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SearchBarWidget } from '../library/widgets/SearchBarWidget';

export default function Modal() {
  return (
    <View style={styles.container}>
      <SearchBarWidget />
      <StatusBar style={'light'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
