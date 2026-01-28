import type { Nuxt } from 'nuxt/schema'
import { createResolver } from '@nuxt/kit'

export function setupDevToolsUI(nuxt: Nuxt) {
  const port = nuxt.options.devServer?.port || 3000
  const DEVTOOLS_UI_ROUTE = `http://localhost:${port}/__powersync-inspector`
  

  // Devtools requires a URL starting with http:// or https:// to recognize it as an image otherwise it will be inferred as an Iconify icon
  const iconUrl = `http://localhost:${port}/assets/powersync-icon.svg`

  nuxt.hook('devtools:customTabs', (tabs: any[]) => {
    tabs.push({
      // unique identifier
      name: 'powersync-inspector',
      // title to display in the tab
      title: 'Powersync Inspector',
      // any icon from Iconify, or a URL to an image
      // Using HTTP URL so devtools recognizes it as an image URL
      icon: iconUrl,
      // iframe view
      view: {
        type: 'iframe',
        src: DEVTOOLS_UI_ROUTE,
      },
    })
  })
}
