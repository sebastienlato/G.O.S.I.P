# Phase 10 web beta — 2026-10-08

**Deployed and verified:** [GOSIP web beta](https://sebastienlato.github.io/G.O.S.I.P/) · [lightweight list](https://sebastienlato.github.io/G.O.S.I.P/?view=list). Owner explicitly authorized final publication after checks and delegated the original license decision. The existing repository remains PUBLIC; no visibility/account/domain/billing changes.

- Release source: `aeb99878722e0ef3281970397f360a046258ee2a`; published static branch: `6bac523599f604fd3e7c2f6e7e4b3bed083b494d`.
- GitHub Pages built-in run [37859757329](https://github.com/sebastienlato/G.O.S.I.P/actions/runs/37859757329) succeeded, Pages API `built`, `gh-pages:/`, HTTPS enforced, no custom domain. Initially Pages returned 404; publishing the gh-pages branch activated it, and the subsequent create request returned 409/already enabled. Readback confirmed the exact intended configuration; nothing was overwritten.
- Actual HTTPS desktop/mobile smoke passed: source SHA from release.json, HTTP 200/non-HTML report/license/icon files, report query reload, static and interactive maps, provider guards, privacy, production CSP/no-referrer and layout, with no external requests. Live screenshots inspected. Initial image assertion ran before download completion; corrected to await image completion, rerun passed. Script: `node scripts/verify-live-pages.mjs <actual-Pages-URL> <release-source-SHA>`.
- Actual response has HSTS; no frame-ancestors, nosniff or Permissions-Policy header observed. Meta CSP remains the app policy. GitHub controls host headers/cache (observed max-age=600); publication/withdrawal may take time to propagate.
- Built-in Pages deployment created one ~795 KB temporary artifact, observed expiry after one day. No custom artifact/cache workflow or retention increase was added. Only the included Pages path is used; no billable resources were provisioned.

## Verified $0 path and limits

[GitHub Pages overview](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) confirms public repositories are eligible on GitHub Free, project sites use the included `github.io/<repository>/` address, and visitor IP addresses are logged for security. GOSIP is a static educational explorer with free/account-free core access, no transactions or commercial SaaS service.

[Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) rechecked: site ≤1 GB, soft bandwidth 100 GB/month, ordinary builds ≤10/hour, deployment timeout 10 minutes. GitHub can rate-limit (429) or withdraw service. These are not guaranteed capacity or an app-controlled hard bandwidth cap. No reliable global usage meter exists in this static client. At limits, reduce downloads (list/static entry), stop releases or unpublish; never buy capacity, a CDN, paid hosting or an upgrade.

[Publishing from a branch](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) supports prebuilt output with `.nojekyll`; GitHub still runs its built-in Pages deployment. [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) confirms standard Pages runners are free; larger runners are chargeable and storage/caches have separate limits. This repository adds no custom workflow, larger runner, cache, artifact upload or quota setting. Build locally, use only the built-in public-repository Pages path, and stop if eligibility changes or any payment requirement appears. No billing settings are needed or altered. No automatic upgrade path is configured.

## Reviewable release

- ~2.81 MB complete static output (2,806,658 bytes before the small release manifest); local release check rejects ≥10 MB, well below the host site limit. Lazy MapLibre remains the largest asset. List/static avoids engine JS/CSS/worker/geography.
- Repository base `/G.O.S.I.P/` covers entry assets, favicon, worker, interactive/static geography, report originals/correction evidence and every license/notice. Query-based share/history links preserve the path. Arbitrary subroutes are not supported; missing files return 404, not an SPA copy.
- Canonical report schema remains `/reports/<validated-id>.txt`; no arbitrary URL or deployment-prefix acceptance was introduced.
- Apache-2.0 for original code/docs/fixtures; Copyright 2026 GOSIP contributors. LICENSE/NOTICE and contribution guidance added after owner delegation; third-party/source rights remain separate.
- Public source requests/cache restore remain disabled, with official provider links and explicit simulation recovery. No new data permission or real-time public coverage is claimed.
- CSP/no-referrer/noscript preserved. Meta CSP cannot set `frame-ancestors` or protect direct text responses. No custom response-header support is configured on Pages; anti-embedding, nosniff and Permissions-Policy are not claimed.
- 182 core tests, 126 root production desktop/mobile Chromium regressions, 14 strict-static repository-path public-host checks passed. Screenshots inspected. Tests use fictional payloads/local assets; actual live-host smoke checks also passed. No full WCAG/security/screen-reader/Safari/Firefox audit.
- Node 26.8.1 `npm ci`, strict typecheck and both production builds pass; audit reports zero known advisories at install. Documented lazy-map chunk warning remains non-failing.

## Release procedure

1. Check official terms/eligibility above, exact authorized remote, public visibility and Pages settings before each release. Stop on a different custom domain/source, private repository, billing requirement or missing authorization. Never silently reconfigure another site.
2. Run `npm ci`, `npm test`, `npm run test:e2e`, `npm run test:beta`; inspect relevant screenshots. Commit/push source to existing `origin/main` and verify clean status. Tests write historical screenshots; preserve originals when only test capture noise changed them.
3. `npm run release:pages` checks clean/pushed main and public visibility, rebuilds/verifies `dist/`, and writes `release.json` with the exact source SHA. It does not publish. Review the candidate. `node scripts/preview-pages.mjs` serves the exact path on loopback port 4173.
4. After final owner hosting authorization, run `npm run release:pages -- --publish`. It appends static output to `gh-pages` using a separate index, verifies the remote SHA and never force-pushes. Re-running after concurrent branch updates must be deliberate.
5. For first setup only, enable Pages on this repository from `gh-pages` at `/` (legacy branch publishing); no custom domain or custom workflow. Use the existing authenticated Pages API or repository Settings → Pages. Enforce HTTPS. Obtain the actual URL from Pages status; never infer successful publication from a branch push.
6. Wait for built status and matching deployment commit. Verify release SHA, HTTP asset/report/license responses, query-link reload, CSP/referrer, map/list/static, desktop/mobile and no external data traffic on the actual URL. Record results and limitations, then commit/push final documentation.

Rollback uses a new reviewed static commit containing a previous good release, retaining history. For unsafe content, traffic/terms problems or a billing requirement, [unpublish Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/unpublishing-a-github-pages-site) without deleting the repository; do not pay to preserve uptime. No background monitoring service or schedule is installed.
