import { View, StyleSheet } from 'react-native';
import { Input, ListItem } from '@rneui/themed';
import React, { useState } from 'react';
import { IconNode } from '@rneui/base';

export interface AutocompleteWidgetProps {
  data: any[];
  onChange: (value: string) => void;
  placeholder?: string;
  onPress: (id: string) => void;
  leftIcon?: IconNode;
}

export const Autocomplete: React.FC<AutocompleteWidgetProps> = ({ data, onChange, placeholder, onPress, leftIcon }) => {
  const [value, setValue] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Input
          onFocus={() => {
            if (value?.length === 0) {
              setMenuVisible(true);
            }
          }}
          leftIcon={leftIcon}
          placeholder={placeholder}
          onBlur={() => setMenuVisible(false)}
          underlineColorAndroid={'transparent'}
          inputContainerStyle={{ borderBottomWidth: 0 }}
          onChangeText={(text) => {
            onChange(text);
            setMenuVisible(true);
            setValue(text);
          }}
          containerStyle={{
            borderColor: 'black',
            borderWidth: 1,
            borderRadius: 4,
            height: 48,
            backgroundColor: 'white'
          }}
        />
      </View>
      {menuVisible && (
        <View style={styles.menuContainer}>
          {data.map((val, index) => (
            <ListItem
              bottomDivider
              key={index}
              onPress={() => {
                setMenuVisible(false);
                onPress(val.id);
              }}
              style={{ paddingBottom: 8 }}>
              <ListItem.Content>
                {val.listName && (
                  <ListItem.Title style={{ fontSize: 18, color: 'black' }}>{val.listName}</ListItem.Title>
                )}
                {val.todoName && (
                  <ListItem.Subtitle style={{ fontSize: 14, color: 'grey' }}>
                    {'\u2022'} {val.todoName}
                  </ListItem.Subtitle>
                )}
              </ListItem.Content>
              <ListItem.Chevron />
            </ListItem>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    flex: 1,
    flexGrow: 1,
    marginHorizontal: 8
  },
  inputContainer: {
    flexDirection: 'row',
    flex: 0,
    marginVertical: 8
  },
  menuContainer: {
    flex: 2,
    flexGrow: 1,
    flexDirection: 'column'
  }
});
