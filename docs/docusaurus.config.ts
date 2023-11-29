import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'React Native SDK Docs',
  favicon: 'img/powersync-favicon.png',
  markdown: {
    format: 'detect'
  },

  // Set the production url of your site here
  url: 'https://powersync-ja.github.io/',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/powersync-react-native-sdk/',
  trailingSlash: false,
  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'powersync-ja',
  projectName: 'powersync-react-native-sdk',


  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/powersync-ja/powersync-react-native-sdk',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      'docusaurus-plugin-typedoc',

      // Plugin / TypeDoc options
      {
        id: 'react-native-sdk',
        entryPoints: ["../packages/powersync-sdk-react-native/src/index.ts"],
        excludeExternals: true,
        out: 'react-native-sdk',
        tsconfig: "../packages/powersync-sdk-react-native/tsconfig.json",
      },
    ],
    [
      'docusaurus-plugin-typedoc',
      {
        id: 'react-sdk',
        excludeExternals: true,
        entryPoints: ['../packages/powersync-react/src/index.ts'],
        tsconfig: '../packages/powersync-react/tsconfig.json',
        out: 'react-sdk',
      },
    ],
    [
      'docusaurus-plugin-typedoc',
      {
        id: 'common-sdk',
        excludeExternals: true,
        entryPoints: ['../packages/powersync-sdk-common/src/index.ts'],
        tsconfig: '../packages/powersync-sdk-common/tsconfig.json',
        out: 'common-sdk',
      },
    ],
    [
      'docusaurus-plugin-typedoc',
      {
        id: 'attachments-sdk',
        excludeExternals: true,
        entryPoints: ['../packages/powersync-attachments/src/index.ts'],
        tsconfig: '../packages/powersync-attachments/tsconfig.json',
        out: 'attachments-sdk',
      },
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: 'PowerSync React Native SDK',
      logo: {
        alt: 'PowerSync Logo',
        src: 'img/powersync-logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/facebook/docusaurus',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'light',
      links: [
        {
          title: 'Community',
          items: [
            {
              label: 'Discord',
              href: 'https://discordapp.com/invite/docusaurus',
            },
            {
              label: 'X',
              href: 'https://twitter.com/powersync_',
            },
            {
              label: 'LinkedIn',
              href: 'https://www.linkedin.com/showcase/journeyapps-powersync/',
            },
            {
              label: 'YouTube',
              href: 'https://www.youtube.com/@powersync_',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Website',
              href: 'https://www.powersync.com/',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/powersync-ja/',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Journey Mobile, Inc.





      `,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
