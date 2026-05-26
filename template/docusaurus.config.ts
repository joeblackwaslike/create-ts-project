import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: '__PROJECT_NAME__',
  tagline: '__DESCRIPTION__',
  favicon: 'img/logo.svg',

  url: 'https://__GITHUB_HANDLE__.github.io',
  baseUrl: '/__PROJECT_NAME__/',
  organizationName: '__GITHUB_HANDLE__',
  projectName: '__PROJECT_NAME__',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    [
      'docusaurus-plugin-typedoc',
      {
        entryPoints: ['./src/index.ts'],
        tsconfig: './tsconfig.json',
        out: 'api',
        sidebar: {
          categoryLabel: 'API Reference',
        },
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/__GITHUB_HANDLE__/__PROJECT_NAME__/edit/main/',
          routeBasePath: '/',
        },
        blog: false,
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: '__PROJECT_NAME__',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'mainSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/__GITHUB_HANDLE__/__PROJECT_NAME__',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © __YEAR__ __AUTHOR__. Built with <a href="https://docusaurus.io">Docusaurus</a>.`,
    },
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    // Algolia DocSearch — apply at https://docsearch.algolia.com/apply/
    // algolia: {
    //   appId: 'YOUR_APP_ID',
    //   apiKey: 'YOUR_SEARCH_API_KEY',
    //   indexName: '__PROJECT_SLUG__',
    // },
  } satisfies Preset.ThemeConfig,
};

export default config;
