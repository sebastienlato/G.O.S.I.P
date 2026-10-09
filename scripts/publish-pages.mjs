// Legacy branch publishing is retired. Deploy only through the bounded Actions workflow.
import { execFileSync } from 'node:child_process'
const remote = execFileSync('git', ['remote', 'get-url', 'origin'], {
  encoding: 'utf8',
}).trim()
if (remote !== 'https://github.com/sebastienlato/G.O.S.I.P.git')
  throw new Error('Unexpected remote')
execFileSync('gh', ['workflow', 'run', 'publish-live.yml', '--ref', 'main'], {
  stdio: 'inherit',
})
console.log(
  'Deployment requested. Check Actions and verify the live release; dispatch is not deployment success.',
)
