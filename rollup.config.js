import { terser } from 'rollup-plugin-terser'
import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
import ramda from 'rollup-plugin-ramda'
import fs from 'fs'

const getDate = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1)
  const day = (d.getDate() < 10 ? '0' : '') + d.getDate()
  return `${year}-${month}-${day}`
}

const config = JSON.parse(fs.readFileSync('package.json'))
const banner = `// ${config.name} - created by ${config.author} - ${config.license} licence - last built on ${getDate()}`

export default [{
  input: 'src/index.js',
  output: {
    file: 'dist/audioparam-getvalueattime.min.js',
    format: 'iife',
    sourcemap: false
  },
  plugins: [
    resolve({
      mainFields: ['jsnext', 'main']
    }),
    commonjs({
      namedExports: {
        'node_modules/ramda/index.js': Object.keys(require('ramda'))
      }
    }),
    ramda(),
    babel(),
    terser({
      mangle: false,
      output: {
        preamble: banner
      }
    })
  ]
}]
