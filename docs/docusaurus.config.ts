import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const PROJECT_NAME = 'powersync-react-native-sdk'

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
  baseUrl: `/${PROJECT_NAME}/`,
  trailingSlash: false,
  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'powersync-ja',
  projectName: PROJECT_NAME,

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
          // editUrl:
          //   'https://github.com/powersync-ja/powersync-react-native-sdk',
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
    image: 'https://assets-global.website-files.com/651d89402147985dc475ff48/65577a5d2602b4209f37f936_powersync-website-meta-img.png',
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
          href: 'https://github.com/powersync-ja',
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
              html: `
              <div style="display: flex; align-items: center;">
                <a href="https://discord.gg/powersync" target="_blank" style="margin-right:8px">
                  <img src="/${PROJECT_NAME}/img/discord.svg" loading="lazy" alt="" height="24">
                </a>
                <a href="https://twitter.com/powersync_" target="_blank" style="margin-right:8px">
                  <img src="/${PROJECT_NAME}/img/x.svg" loading="lazy" alt="" height="20">
                </a>
                <a href="https://www.youtube.com/@powersync_" target="_blank" style="margin-right:8px">
                  <img src="/${PROJECT_NAME}/img/youtube.svg" loading="lazy" width="32" height="28" alt="">
                </a>
                <a href="https://www.linkedin.com/showcase/journeyapps-powersync/" target="_blank" style="margin-right:8px">
                  <img src="/${PROJECT_NAME}/img/linkedin.svg" loading="lazy" alt="" height="24">
                </a>
              </div>
              `
            }
          ],
        },
        {
          title: 'More',
          items: [
            {
              html: `
              <div style="display: flex; align-items: center;">
                <a href="https://github.com/powersync-ja" target="_blank" style="margin-right:8px">
                  <img src="/${PROJECT_NAME}/img/github.svg" loading="lazy" alt="" height="24">
                </a>
                <a href="https://www.powersync.com/" target="_blank" style="margin-right:8px">
                  <img src="/${PROJECT_NAME}/img/web.svg" loading="lazy" alt="" height="30">
                </a>
              </div>
            `}
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Journey Mobile, Inc.`,
    },
    // algolia: {
    //   appId: '8U0Z3F95NH',
    //   // Public API key: it is safe to commit it
    //   apiKey: '45caa5b7ec2fd9e5f3dbfe8b3c661c04',
    //   indexName: 'powersync-react-native-sdk-react-native-sdk',
    //   contextualSearch: false,
    // },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
