import { Plus } from '@tamagui/lucide-icons';
import { ListItem, Text } from 'tamagui';

import { ProfileIcon } from '../profiles/ProfileIcon';

export function ProfileRow({
  item,
  handleAddContact
}: {
  item: { id: string; name: string; handle: string };
  handleAddContact: (id: string, name: string, handle: string) => void;
}) {
  return (
    <ListItem
      title={<Text color="$gray9">{item.name}</Text>}
      subTitle={<Text color="$gray9">@{item.handle}</Text>}
      icon={<ProfileIcon handle={item.handle ?? ''} create={true} />}
      iconAfter={<Plus size="$1.5" color="$gray9" />}
      onPress={() => handleAddContact(item.id, item.name, item.handle)}
    />
  );
}
