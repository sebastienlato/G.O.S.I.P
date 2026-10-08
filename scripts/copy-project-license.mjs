import { copyFile } from 'node:fs/promises'
await copyFile('LICENSE', 'public/LICENSE.txt')
await copyFile('NOTICE', 'public/NOTICE.txt')
