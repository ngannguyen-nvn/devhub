const esbuild = require('esbuild')
const path = require('path')

const production = process.argv.includes('--production')
const watch = process.argv.includes('--watch')

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',
  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started')
    })
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`)
        console.error(`    ${location.file}:${location.line}:${location.column}:`)
      })
      console.log('[watch] build finished')
    })
  },
}

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: [
      'vscode',
      'better-sqlite3',
      'dockerode',
      'cpu-features',
      'ssh2',
    ],
    nodePaths: [
      path.resolve(__dirname, '../../node_modules'),
      path.resolve(__dirname, 'node_modules'),
    ],
    logLevel: 'info',
    plugins: [
      esbuildProblemMatcherPlugin,
      {
        name: 'native-node-modules',
        setup(build) {
          // Mark .node files as external
          build.onResolve({ filter: /\.node$/ }, args => ({
            path: args.path,
            external: true,
          }))
        },
      },
      {
        name: 'resolve-workspace-packages',
        setup(build) {
          // Resolve @devhub/core to the actual package in the workspace
          build.onResolve({ filter: /@devhub\/core/ }, args => {
            const corePath = path.resolve(__dirname, '../../packages/core/src/index.ts')
            return { path: corePath }
          })
        },
      },
    ],
  })

  if (watch) {
    await ctx.watch()
  } else {
    await ctx.rebuild()
    await ctx.dispose()
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
