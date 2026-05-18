import { resolve } from 'node:path'
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'

const root = process.cwd()
const source = resolve(root, 'package.json')
const target = resolve(root, 'dist/package.json')
const pkgInfo = JSON.parse(readFileSync(source, 'utf8'))

// 1. Remove campos que não são necessários no pacote publicado
delete pkgInfo.scripts
delete pkgInfo.devDependencies

// 2. Ajusta os caminhos dos arquivos, pois o root do pacote agora será a pasta dist/
pkgInfo.main = 'index.umd.js'
pkgInfo.module = 'index.es.js'
pkgInfo.types = 'index.d.ts'
pkgInfo.exports = {
  '.': {
    import: './index.es.js',
    require: './index.umd.js',
    types: './index.d.ts',
  },
}

// 3. Salva o package.json modificado dentro da pasta dist/
writeFileSync(target, JSON.stringify(pkgInfo, null, 2))

// 4. Copia arquivos de metadados importantes para o NPM
copyFileSync(resolve(root, 'README.md'), resolve(root, 'dist/README.md'))
copyFileSync(resolve(root, 'LICENSE'), resolve(root, 'dist/LICENSE'))

console.log(
  '✅ Arquivo package.json mínimo e metadados preparados na pasta dist/',
)
