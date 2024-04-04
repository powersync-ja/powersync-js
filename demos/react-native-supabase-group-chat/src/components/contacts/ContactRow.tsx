import { Trash2 } from '@tamagui/lucide-icons';
import { Link } from 'expo-router';
import { ListItem } from 'tamagui';

import { SwipeableRow } from '../list/SwipeableRow';
import { ProfileIcon } from '../profiles/ProfileIcon';

export function ContactRow({
  item,
  handleDeleteContact
}: {
  item: { id: string; name: string; handle: string; profile_id: string };
  handleDeleteContact: (id: string) => void;
}) {
  return (
    <SwipeableRow
      rightActions={[
        {
          text: <Trash2 color="white" />,
          color: '$red10',
          onPress: () => {
            handleDeleteContact(item.id);
          }
        }
      ]}
    >
      <Link href={`/(app)/(chats)/c/${item.profile_id}`}>
        <ListItem title={item.name} subTitle={`@${item.handle}`} icon={<ProfileIcon handle={item.handle ?? ''} />} />
      </Link>
    </SwipeableRow>
  );
}
