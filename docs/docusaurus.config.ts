import { themes as prismThemes } from 'prism-react-renderer';
import type { TypeDocOptionMap } from 'typedoc';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type { PluginOptions } from 'docusaurus-plugin-typedoc';
import { DOC_FOLDER, packageMap } from './utils/packageMap';
import 'dotenv/config';

const PROJECT_NAME = process.env.GH_PROJECT_NAME;

const plugins = Object.entries(packageMap).map(([id, config]) => [
  'docusaurus-plugin-typedoc',
  {
    id,
    excludeExternals: true,
    entryPoints: config.entryPoints,
    tsconfig: config.tsconfig,
    out: `${DOC_FOLDER}/${config.dirName}`,
    parametersFormat: 'table',
    propertiesFormat: 'table',
    enumMembersFormat: 'table',
    excludeProtected: true,
    excludePrivate: true,
    indexFormat: 'table',
    disableSources: true,
    expandObjects: true,
    useCodeBlocks: true,
    typeDeclarationFormat: 'table',
    membersWithOwnFile: ['Class', 'Enum', 'Function'],
    textContentMappings: {
      'title.memberPage': '{name}'
    }
  } as Partial<PluginOptions | TypeDocOptionMap>
]);

const config: Config = {
  title: 'PowerSync JS SDK Docs',
  favicon: 'img/powersync-favicon.png',
  markdown: {
    format: 'detect'
  },

  // Set the production url of your site here
  url: process.env.GH_URL,
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: `/${PROJECT_NAME}/`,
  trailingSlash: false,
  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: process.env.GH_ORG,
  projectName: PROJECT_NAME,

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en']
  },
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts'
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          // editUrl:
          //   'https://github.com/powersync-ja/powersync-react-native-sdk',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css'
        }
      } satisfies Preset.Options
    ]
  ],
  plugins,
  themeConfig: {
    image: process.env.META_LOGO_URL,
    navbar: {
      title: 'API Reference for PowerSync JS SDKs',
      logo: {
        alt: 'PowerSync Logo',
        src: 'img/powersync-logo.png',
        href: '/react-native-sdk'
      },
      items: [
        {
          href: 'https://github.com/powersync-ja',
          label: 'GitHub',
          position: 'right'
        }
      ]
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
          ]
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
            `
            }
          ]
        }
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Journey Mobile, Inc.`
    },
    algolia: {
      appId: process.env.ALGOLIA_APP_ID,
      apiKey: process.env.ALGOLIA_API_KEY,
      indexName: 'powersync-react-native-sdk-react-native-sdk',
      contextualSearch: false
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula
    },
    future: {
      experimental_faster: true,
    },
  } satisfies Preset.ThemeConfig
};

export default config;
