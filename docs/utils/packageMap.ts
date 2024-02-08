enum Packages {
  ReactNativeSdk = 'react-native-sdk',
  ReactSdk = 'react-sdk',
  CommonSdk = 'common-sdk',
  AttachmentsSdk = 'attachments-sdk',
  WebSdk = 'web-sdk'
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
    entryPoints: ['../packages/powersync-sdk-react-native/src/'],
    tsconfig: '../packages/powersync-sdk-react-native/tsconfig.json',
    id: Packages.ReactNativeSdk
  },
  [Packages.ReactSdk]: {
    name: 'React SDK',
    dirName: Packages.ReactSdk,
    entryPoints: ['../packages/powersync-react/src/index.ts'],
    tsconfig: '../packages/powersync-react/tsconfig.json',
    id: Packages.ReactSdk
  },
  [Packages.CommonSdk]: {
    name: 'Common SDK',
    dirName: Packages.CommonSdk,
    entryPoints: ['../packages/powersync-sdk-common/src/index.ts'],
    tsconfig: '../packages/powersync-sdk-common/tsconfig.json',
    id: Packages.CommonSdk
  },
  [Packages.AttachmentsSdk]: {
    name: 'Attachments SDK',
    dirName: Packages.AttachmentsSdk,
    entryPoints: ['../packages/powersync-attachments/src/index.ts'],
    tsconfig: '../packages/powersync-attachments/tsconfig.json',
    id: Packages.AttachmentsSdk
  },
  [Packages.WebSdk]: {
    name: 'Web SDK',
    dirName: Packages.WebSdk,
    entryPoints: ['../packages/powersync-sdk-web/src/index.ts'],
    tsconfig: '../packages/powersync-sdk-web/tsconfig.json',
    id: Packages.WebSdk
  }
};
