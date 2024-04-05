import { Paragraph, YStack } from 'tamagui';

import { stringToRelativeDate } from '@/lib/date';
import { useAuth } from '@/providers/AuthProvider';

export function Message({ message }: { message: any }) {
  const { user } = useAuth();

  const sent = message.sender_id === user?.id;

  return (
    <YStack marginLeft={sent ? '$3' : '$9'} marginRight={sent ? '$9' : '$3'} marginTop="$3">
      <YStack
        backgroundColor={sent ? '$gray5' : '$blue5'}
        borderRadius="$3"
        paddingHorizontal="$2"
        paddingVertical="$2"
      >
        <Paragraph textAlign={sent ? 'left' : 'right'}>{message.content}</Paragraph>
      </YStack>
      <Paragraph color="$gray9" fontSize="$1" textAlign={sent ? 'left' : 'right'}>
        {stringToRelativeDate(message.created_at)}
      </Paragraph>
    </YStack>
  );
}
