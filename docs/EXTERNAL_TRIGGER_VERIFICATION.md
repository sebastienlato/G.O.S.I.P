# External trigger repair and observation — 2026-10-10

**Updated result (D76): repaired; one actual external publication verified at 16:41 UTC.** Cloudflare version `dedb6954` logged `dispatch-accepted` at 16:41:06.458. [GitHub run 38068660754](https://github.com/sebastienlato/G.O.S.I.P/actions/runs/38068660754) records external-input `workflow_dispatch`, successful build/deploy/cleanup and zero artifacts. Matching HTTPS release built 16:41:35.017, source `0e4c78b`; eight mirrors and original slow-source times intact, same two-capture hash. Site 12,566,438 bytes before stamp. Sustained 15-minute publication remains unverified.

The controlled local workerd diagnostic showed the real production blocker: `redirect: 'error'` throws before fetching. Both requests now use `manual` and reject redirects without following them. The pinned stable runtime also rejects the exported string CRON, so that constant is now internal. This second issue must not be misrepresented as proven production startup failure: the later Observability history shows all four earlier Cron invocations returned `request-failed`, and the repaired 16:26 invocation correctly returned `recent-publication`. The old Cron Events table was incomplete evidence. No token replacement was needed.

Real-runtime regression tests cover startup, successful dispatch, recent-publication skip, and rejected redirects before/after authorization. 282 tests and root/Pages builds pass; audit zero. Development-only Miniflare uses its documented test API baseline; no new production service. Production compatibility date, free plan, secret scope/expiry, cron, closed HTTP routes and storage settings are unchanged. The disabled dashboard manual-test control was not bypassed; local mocked diagnostics were followed by a genuine scheduled publication. Live log stream stopped after verification. One recovery run is not a cadence SLA.

## Original bounded observation (historical)

**Result: configured, but external operation/cadence was not verified.** Owner confirmed `gosip-publish-trigger`, token expires January 8, 2027; Worker cutoff `2027-01-08T00:00:00Z`. No token value was read. Read-only dashboard inspection confirmed encrypted secret, expiry, disabled production/preview URLs, no custom routes/domains/bindings and disabled Logs/Traces/Issues. Active version `8f347e23` visibly contains the reviewed scheduled handler, fixed destination and corrected decoder; no editor problems. The persisted schedule displays minutes 11, 26, 41 and 56. Configuration alone is not execution evidence.

Observed baseline 15:24:22 UTC through final 16:16:12 UTC, with checks approximately every five minutes. Four target slots span three full 15-minute intervals. No manual dispatch, code push or Worker/trigger change was made during that window.

| Target UTC (Toronto) | Cloudflare Cron execution | GitHub external dispatch/run | Build/deploy/cleanup | New live publication |
| --- | --- | --- | --- | --- |
| 15:26 (11:26) | Not recorded in dashboard | No run observed | No run to verify | None |
| 15:41 (11:41) | Not recorded in dashboard | No run observed | No run to verify | None |
| 15:56 (11:56) | Not recorded in dashboard | No run observed | No run to verify | None |
| 16:11 (12:11) | Not recorded in dashboard | No run observed by 16:16 | No run to verify | None |

Cron history remained empty, including after its stated 30-minute initial reporting allowance. This does not establish whether the scheduler failed to invoke or the handler returned without dispatch; the precise cause remains unknown. No accepted dispatch, workflow guard skip, external build or publication was observed. Do not credit a manual/push recovery or a historical GitHub schedule as external evidence.

Throughout observation, HTTPS release stayed `ab9a3ba97011307e35a013ba33f658cd254d7289`, **push** run [38061719826](https://github.com/sebastienlato/G.O.S.I.P/actions/runs/38061719826), built 14:58:38.470 UTC. At close it was about 78 minutes old. Eight embedded/index health mirrors agreed, with original attempt/retrieval retained; their stored last-success `ok` status does not override age-based UI staleness. Fast sources were retrieved 14:58:33; reports/OONI/PortWatch 13:59:14. No provider failure was relabelled or retry forced.

Two history captures remained immutable (254,728 bytes); capture-array SHA-256 `6fbe9eefdfd52ee5802a810d128d0e57f84cd85571ab7270a19f77b05ab1fcfa` matched every observation. Zero repository artifacts throughout. The unchanged strict scheduled-source verifier actually failed `Live release was not published by schedule`; this is not a passing scheduled-source check.

Next diagnostic, separately from this observation: one controlled scheduled-handler test with live outcome inspection could distinguish configuration, release fetch and GitHub authorization from a cron-registration issue. It has not been executed here; no token recreation, paid plan or new service is requested. The bounded monitor ends after this report. No Phase 22 work started.

Configured-status copy and matching assertion passed 278 unit/core tests, root/Pages builds/typecheck and 50 repository-path browser tests, preserving D74. Local candidate 12,560,574 bytes, below 24.75 MB envelope / 25 MB cap. A subsequent code-push deployment only publishes this truthful status and must not be counted in the external observation. See PROJECT_STATE for its separate release evidence. Detailed timestamped observations remain ignored under `.phase21-evidence/external/`; no data commits.

Post-observation status publication: code `6f072d1d3f215bb914cf896166a933a7c6baca4c`, [push run38067050490](https://github.com/sebastienlato/G.O.S.I.P/actions/runs/38067050490), built16:17:54.983UTC. Actual HTTPS SHA/event/run agree; build/deploy/cleanup success and zero artifacts. Site12,564,552bytes including136-byte stamp. Six due sources refreshed16:17:48; OONI/PortWatch kept13:59:14, all eight mirrors agree and immutable history hash unchanged. Browser confirms configured/unverified copy and preserved archived view. The bounded monitor is paused; no further recurring checks. A later docs-only commit records this evidence; it does not replace deployed code or prove external cadence.
