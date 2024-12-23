export const DOC_FOLDER = 'docs';

enum Packages {
  ReactNativeSdk = 'react-native-sdk',
  ReactSdk = 'react-sdk',
  VueSdk = 'vue-sdk',
  AttachmentsSdk = 'attachments-sdk',
  WebSdk = 'web-sdk',
  TanstackReactQuerySdk = 'tanstack-react-query-sdk'
}

interface Package {
  name: string;
  dirName: Packages;
  entryPoints: string[];
  tsconfig: string;
  id: Packages;
}

type PackageMap = {
  [key in Packages]: Package;
};

export const packageMap: PackageMap = {
  [Packages.ReactNativeSdk]: {
    name: 'React Native SDK',
    dirName: Packages.ReactNativeSdk,
    entryPoints: ['../packages/react-native/src/'],
    tsconfig: '../packages/react-native/tsconfig.json',
    id: Packages.ReactNativeSdk
  },
  [Packages.WebSdk]: {
    name: 'Web SDK',
    dirName: Packages.WebSdk,
    entryPoints: ['../packages/web/src/index.ts'],
    tsconfig: '../packages/web/tsconfig.json',
    id: Packages.WebSdk
  },
  [Packages.ReactSdk]: {
    name: 'React Hooks',
    dirName: Packages.ReactSdk,
    entryPoints: ['../packages/react/src/index.ts'],
    tsconfig: '../packages/react/tsconfig.json',
    id: Packages.ReactSdk
  },
  [Packages.TanstackReactQuerySdk]: {
    name: 'Tanstack React Query Hooks',
    dirName: Packages.TanstackReactQuerySdk,
    entryPoints: ['../packages/tanstack-react-query/src/index.ts'],
    tsconfig: '../packages/tanstack-react-query/tsconfig.json',
    id: Packages.TanstackReactQuerySdk
  },
  [Packages.VueSdk]: {
    name: 'Vue Composables',
    dirName: Packages.VueSdk,
    entryPoints: ['../packages/vue/src/index.ts'],
    tsconfig: '../packages/vue/tsconfig.json',
    id: Packages.VueSdk
  },
  [Packages.AttachmentsSdk]: {
    name: 'Attachments SDK',
    dirName: Packages.AttachmentsSdk,
    entryPoints: ['../packages/attachments/src/index.ts'],
    tsconfig: '../packages/attachments/tsconfig.json',
    id: Packages.AttachmentsSdk
  }
};
