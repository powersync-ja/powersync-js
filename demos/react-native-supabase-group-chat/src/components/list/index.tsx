import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { Separator, Text } from 'tamagui';
import { type JSX } from 'react';

export function List<T>({
  data,
  renderItem,
  placeholder,
  extraData,
  numColumns
}: {
  data?: readonly T[] | null;
  renderItem?: ListRenderItem<T> | null;
  placeholder?: JSX.Element | string;
  extraData?: any;
  numColumns?: number;
}) {
  placeholder ??= 'No data';
  if (typeof placeholder === 'string') {
    placeholder = (
      <Text padding="$3" textAlign="center">
        {placeholder}
      </Text>
    );
  }

  return (
    <FlashList
      ListEmptyComponent={placeholder}
      data={data}
      extraData={extraData}
      renderItem={renderItem}
      ItemSeparatorComponent={() => <Separator />}
      numColumns={numColumns}
      /* refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
      } */
    />
  );
}
