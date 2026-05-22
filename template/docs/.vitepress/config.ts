import { defineConfig } from 'vitepress';

export default defineConfig({
  title: '__PROJECT_NAME__',
  description: '__DESCRIPTION__',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/__GITHUB_HANDLE__/__PROJECT_NAME__' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © __YEAR__ __AUTHOR__',
    },
  },
});
