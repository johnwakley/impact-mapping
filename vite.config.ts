import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const SINGLE_FILE = process.env.SINGLE_FILE === '1'

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Fold the built CSS and JS back into index.html so the whole app is one file
 * you can double-click, email, or drop on a share. Vite has no built-in for
 * this, and the community plugin is another dependency for ~40 lines of string
 * work on a bundle we already control.
 */
function inlineIntoHtml(): Plugin {
  return {
    name: 'impact-mapping:single-file',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const htmlName = Object.keys(bundle).find((name) => name.endsWith('.html'))
      const html = htmlName ? bundle[htmlName] : undefined
      if (!html || html.type !== 'asset') return

      let source = String(html.source)

      for (const [name, output] of Object.entries(bundle)) {
        if (name === htmlName) continue

        if (output.type === 'chunk' && output.isEntry) {
          const code = output.code.replace(/<\/script>/gi, '<\\/script>')
          const tag = new RegExp(
            `<script[^>]*src="[^"]*${escapeForRegExp(name)}"[^>]*></script>`,
          )
          // Replace via a function: bundled code is full of `$`, which the
          // string form of `replace` would eat as a substitution pattern.
          source = source.replace(tag, () => `<script type="module">\n${code}\n</script>`)
          delete bundle[name]
        } else if (output.type === 'asset' && name.endsWith('.css')) {
          const css = String(output.source).replace(/<\/style>/gi, '<\\/style>')
          const tag = new RegExp(`<link[^>]*href="[^"]*${escapeForRegExp(name)}"[^>]*>`)
          source = source.replace(tag, () => `<style>\n${css}\n</style>`)
          delete bundle[name]
        }
      }

      html.source = source
    },
  }
}

export default defineConfig({
  // Relative so the build works from a subpath (project pages, a folder on a
  // share) and from file://, not just from a domain root.
  base: './',

  plugins: [react(), ...(SINGLE_FILE ? [inlineIntoHtml()] : [])],

  build: SINGLE_FILE
    ? {
        outDir: 'dist-single',
        assetsInlineLimit: Number.MAX_SAFE_INTEGER,
        cssCodeSplit: false,
        modulePreload: false,
        rollupOptions: { output: { codeSplitting: false } },
      }
    : {},

  // Off the default 5173/5174 so this does not fight other local apps, and
  // strict so a clash fails loudly instead of silently moving the port.
  server: { port: 5180, strictPort: true, open: false },
  preview: { port: 5181, strictPort: true },
})
