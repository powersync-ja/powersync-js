import React from 'react';
import { Text, TextInput, TextInputProps, StyleSheet, View } from 'react-native';

export interface TextInputWidgetProps extends TextInputProps {
  label?: string;
}

export const TextInputWidget: React.FC<TextInputWidgetProps> = (props) => {
  const { label, ...inputProps } = props;
  return (
    <View>
      {label ? <Text>{props.label}</Text> : null}
      <TextInput {...inputProps} style={{ ...styles.input }} />
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10
  }
});
