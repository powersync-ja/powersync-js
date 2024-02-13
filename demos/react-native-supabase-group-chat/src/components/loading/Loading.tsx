import { Spinner, Text, YStack } from "tamagui";

export function Loading({ message }: { message?: string }) {
  message ??= "Loading";

  return (
    <YStack fullscreen justifyContent="center">
      <Spinner />
      <Text textAlign="center" marginTop="$6">
        {message} …
      </Text>
    </YStack>
  );
}
