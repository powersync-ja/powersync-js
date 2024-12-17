import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Input, ListItem, Text } from '@rneui/themed';
import React, { useState } from 'react';
import { router } from 'expo-router';

export interface AutocompleteWidgetProps {
  origValue: string;
  label?: string;
  data: any[];
  onChange: (value: string) => void;
  //   origOnChange: (value: string) => void;
  icon?: string;
  style?: object;
  menuStyle?: object;
  right?: object;
  left?: object;
}

export const Autocomplete: React.FC<AutocompleteWidgetProps> = ({
  origValue,
  label,
  data,
  onChange,
  //   origOnChange,
  icon,
  style,
  menuStyle,
  right,
  left
}) => {
  const [value, setValue] = useState(origValue);
  const [menuVisible, setMenuVisible] = useState(false);
  const [filteredData, setFilteredData] = useState<any[]>([]);

  const filterData = (text: string) => {
    return data.filter((val: any) => val?.toLowerCase()?.indexOf(text?.toLowerCase()) > -1);
  };
  return (
    <View style={{ flexDirection: 'column', flex: 1, flexGrow: 1 }}>
      <View style={{ flexDirection: 'row', flex: 0 }}>
        <Input
          onFocus={() => {
            if (value.length === 0) {
              setMenuVisible(true);
            }
          }}
          onBlur={() => setMenuVisible(false)}
          label={label}
          // right={right}
          // left={left}
          //   style={styles.input}
          onChangeText={(text) => {
            //   origOnChange(text);
            onChange(text);
            //   if (text && text.length > 0) {
            //     setFilteredData(filterData(text));
            //   } else if (text && text.length === 0) {
            //     setFilteredData(data);
            //   }
            setMenuVisible(true);
            setValue(text);
          }}
          // value={value}
        />
      </View>
      {menuVisible && (
        <View
          style={{
            flex: 2,
            flexGrow: 1,
            flexDirection: 'column'
          }}>
          {data.map((val, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                router.push({
                  pathname: 'views/todos/edit/[id]',
                  params: { id: val.id }
                });
              }}>
              <Card style={{ display: 'flex', width: '100%' }}>
                {val.listName && <Text style={{ fontSize: 18 }}>{val.listName}</Text>}
                {val.todoName && (
                  <Text style={{ fontSize: 14 }}>
                    {'\u2022'} {val.todoName}
                  </Text>
                )}
              </Card>
            </TouchableOpacity>
            // <ListItem
            //   //   key={i}
            //   style={[{ width: '100%' }]}
            //   //   icon={icon}
            //   onPress={() => {
            //     setValue(val);
            //     setMenuVisible(false);
            //   }}
            //   // title={datum}
            // >
            //   <ListItem.Content>
            //     <ListItem.Title>{val}</ListItem.Title>
            //   </ListItem.Content>
            // </ListItem>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    flexDirection: 'row',
    flex: 1,
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start'
  }
});
