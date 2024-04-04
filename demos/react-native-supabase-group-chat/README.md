# PowerChat - Demo app for the PowerSync React Native Client SDK

This is a demo app built to showcase how to use PowerSync to built an offline-first React Native app. The app is built with Expo/React Native, and uses Supabase as the backend. The following video gives an overview of the implemented functionality:

<https://github.com/journeyapps/powersync-supabase-react-native-group-chat-demo/assets/91166910/f93c484a-437a-44b3-95ab-f5864a99ca1f>

Here are some steps to keep in mind when building/deploying your own version of this app:

1. Deploy a Supabase backend based on the configuration and migrations contained in the [supabase](./supabase) folder. The API URL and public API Key from your Supabase project need to be replaced in the [.env](./.env) file.

2. Create a PowerSync instance using the [PowerSync dashboard](https://powersync.journeyapps.com/) and connect the instance to your Supabase backend. Copy the Sync Rules from the [sync-rules.yml](./sync-rules.yml) of this repository into the sync-rules.yaml within the PowerSync dashboard. Copy the PowerSync instance URL from the dashboard and replace it in the [.env](./.env) file.

3. Create an Expo project and replace the EAS project id in the [.env](./.env) file.

> Please note: If you leave the values within the [.env](./.env) file as they are (none of them are sensitive secret's btw), you can try the app with the demo backend without spinning up your own Supabase backend and PowerSync instance (as long at the demo backend is around, at least).

Here are some helpful links:

- [PowerSync Website](https://www.powersync.com/)
- [PowerSync Docs](https://docs.powersync.com/)
- [PowerSync React Native Client SDK Reference](https://docs.powersync.com/client-sdk-references/react-native-and-expo)
- [Supabase Docs](https://supabase.com/docs)
- [Expo Docs](https://docs.expo.dev/)
