import type { Nuxt } from 'nuxt/schema'

export function setupDevToolsUI(nuxt: Nuxt) {
  const port = nuxt.options.devServer?.port || 3000
  const DEVTOOLS_UI_ROUTE = `http://localhost:${port}/__powersync-inspector`

  nuxt.hook('devtools:customTabs', (tabs) => {
    tabs.push({
      // unique identifier
      name: 'powersync-inspector',
      // title to display in the tab
      title: 'Powersync Inspector',
      // any icon from Iconify, or a URL to an image
      icon: 'https://cdn.prod.website-files.com/67eea61902e19994e7054ea0/67f910109a12edc930f8ffb6_powersync-icon.svg',
      // iframe view
      view: {
        type: 'iframe',
        src: DEVTOOLS_UI_ROUTE,
      },
    })
  })
}
