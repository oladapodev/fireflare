import { defineConfig } from 'vitepress';

const apiBase = 'https://spindle-api.oladapo.workers.dev';
const dashboardUrl = `${apiBase}/request-access`;

export default defineConfig({
  title: 'Spindle API',
  description: 'Cloudflare-native web extraction, search, mapping, crawling, and monitoring API.',
  base: '/fireflare/',
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['meta', { name: 'theme-color', content: '#f97316' }],
  ],
  themeConfig: {
    logo: { text: 'S' },
    siteTitle: 'Spindle API',
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'API Reference', link: '/api-reference' },
      { text: 'Examples', link: '/examples' },
      { text: 'Get API Key', link: dashboardUrl },
    ],
    sidebar: [
      {
        text: 'Start',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Auth and Errors', link: '/auth-and-errors' },
          { text: 'Examples', link: '/examples' },
        ],
      },
      {
        text: 'API Reference',
        items: [
          { text: 'All Endpoints', link: '/api-reference' },
          { text: 'Scrape', link: '/scrape' },
          { text: 'Extract', link: '/extract' },
          { text: 'Search', link: '/search' },
          { text: 'Map', link: '/map' },
          { text: 'Crawl', link: '/crawl' },
          { text: 'Batch Scrape', link: '/batch-scrape' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/oladapodev/fireflare' },
    ],
    search: {
      provider: 'local',
    },
    editLink: {
      pattern: 'https://github.com/oladapodev/fireflare/edit/main/docs/:path',
      text: 'Edit this page',
    },
    footer: {
      message: `OpenAPI: ${apiBase}/openapi.json`,
      copyright: 'Built on Cloudflare Workers.',
    },
  },
});
