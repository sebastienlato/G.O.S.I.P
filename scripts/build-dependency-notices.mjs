import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'))
const sections = [
  'GOSIP bundled production dependency notices\nGenerated from package-lock.json and installed license files.\nOriginal GOSIP software remains UNLICENSED. These licenses apply only to their named dependencies.',
]
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path || entry.dev) continue
  const pkg = JSON.parse(readFileSync(join(path, 'package.json'), 'utf8'))
  const licenses = readdirSync(path).filter((name) =>
    /^(licen[sc]e|copying|notice)(\.|$)/i.test(name),
  )
  if (!licenses.length && pkg.name === 'murmurhash-js')
    licenses.push('README.md')
  if (!licenses.length) throw new Error(`Missing license text for ${pkg.name}`)
  sections.push(
    `${pkg.name} ${entry.version}\nDeclared license: ${pkg.license ?? entry.license ?? 'see text'}\n${licenses.map((file) => readFileSync(join(path, file), 'utf8')).join('\n\n')}`,
  )
}
writeFileSync(
  'public/dependency-notices.txt',
  sections.join('\n\n----------------------------------------\n\n') + '\n',
)
