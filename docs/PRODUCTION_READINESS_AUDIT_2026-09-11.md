# Production Readiness Audit — Admin and Student Portals

Date: 2026-09-11  
Staging verification updated: 2026-09-12  
Baseline: `main` at `0148fd226201112d1bacb5eb38242c335682ffc4`, plus the pre-existing uncommitted working tree supplied for this audit. The working tree was not committed or reset, so unrelated in-progress changes remain intact.

## Recommendation

**NO-GO until the exposed Firebase service-account key is revoked and replaced.**

The audited builds are deployed to both production aliases and the runtime gate passes: builds, lint, TypeScript, unit/integration tests, emulator-backed Firestore/Storage rules tests, cross-browser smoke/accessibility checks, anonymous API authorization checks, responsive checks, authenticated route/role-isolation smoke, and Lighthouse budgets all pass. Required security headers, private API caching, deferred login work, and both contrast fixes are live. During deployment hardening, the audit found that three `.env` files containing a Firebase service-account key were tracked in Git. They are now removed from tracking, explicitly excluded from Vercel uploads, and the admin server credential was moved to encrypted Vercel configuration; however, the historical key must be revoked and replaced before approval.

## Release-gate status

| Gate | Result | Evidence / note |
| --- | --- | --- |
| Critical/High findings | FAIL | PR-SEC-005 remains open until the historical Firebase service-account key is revoked and replaced. |
| Current-tree secret hygiene | PASS | `pnpm audit:secrets`: no tracked `.env` or service-account credential files. Historical exposure still requires rotation. |
| Admin + student production builds | PASS | Next.js 16.3.3; both route trees compiled and prerendered. |
| TypeScript | PASS | `pnpm check` |
| Lint | PASS | Both portal ESLint runs complete without warnings or errors. |
| Unit/integration | PASS | 93 tests: root 18, student 48, admin 27. One credential-dependent Firebase live-config test remains skipped. |
| Firestore + Storage rules | PASS / N/A live | `pnpm audit:rules`: 13/13 emulator tests. Audited Firestore rules were released to the live project on 2026-09-12. Firebase Storage is not initialized on that project, so its tested rules cannot be released; the portal uses Cloudinary for uploads. |
| Dependency High/Critical | PASS | `pnpm audit:deps`: 0 Critical, 0 High; 6 Moderate remain in the backlog after the second remediation pass. |
| Browser engine smoke | PASS | Chromium, Firefox, WebKit and mobile Chromium public checks pass on the promoted deployments. |
| Automated WCAG blocker scan | PASS | axe WCAG 2 A/AA, 2.1 AA and 2.2 AA tags; no Critical/Serious violations on public auth pages or the authenticated representative route. |
| Responsive pages | PASS | 360, 390, 768, 1024 and 1440px public checks pass; authenticated student routes pass at 390px. |
| Lighthouse lab budgets | PASS | Production median of three mobile-profile runs, isolated browser per portal; results below. |
| Authenticated production smoke | PASS | Admin and student protected routes plus both role-rejection directions pass. No data mutations were performed. |
| Production security headers/API cache | PASS | Required headers are live; anonymous protected API responses are 401 and `private, no-store`. |
| Runtime error scan | PASS | Vercel error-level logs reported no errors for either portal in the one-hour post-deploy window. |
| Field INP ≤ 200ms | DOCUMENTED EXCEPTION | Representative field telemetry is not available yet. Lab TBT is within the 600ms guard. |

## Lighthouse results

The checked-in gate requires performance ≥ 0.80, accessibility ≥ 0.90, best-practices ≥ 0.90, LCP ≤ 2.5s, CLS ≤ 0.1, and lab TBT ≤ 600ms. TBT is a lab guard, not a substitute for the required field INP measurement.

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Admin login | 0.91 | 1.00 | 1.00 | 1.00 | 1,878ms | 0 | 350ms |
| Student login | 0.86 | 1.00 | 1.00 | 1.00 | 1,698ms | 0 | 528ms |

Pre-promotion deployment comparison (2026-09-12):

| Page | Performance | Accessibility | Best practices | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Admin login | 0.85 | 0.96 | 1.00 | 1,699ms | 0 | 593ms |
| Student login | 0.58 | 1.00 | 1.00 | 8,360ms | 0 | 29ms |

The old student LCP regression was consistent with loading reCAPTCHA/auth-related work before user interaction. The promoted implementation defers that work and disables heavy auth-route prefetch.

Machine scheduling caused substantial single-run variance, so the script records the median of three valid runs. Each portal uses a fresh browser process to prevent prior trace heap/garbage collection from contaminating the next result. JSON evidence is generated under `artifacts/lighthouse/` and is intentionally git-ignored.

## Resolved findings

### PR-SEC-001 — Critical — vulnerable production dependencies

- Affected: both portals and the shared application.
- Evidence: the baseline dependency audit reported 5 Critical and 56 High paths, including the installed Next.js line.
- Impact: known remotely exploitable or high-impact dependency vulnerabilities could reach deployed code or build infrastructure.
- Resolution: upgraded both Next.js applications to 16.3.3 and updated/remediated affected direct and transitive packages with constrained overrides. Current result is 0 Critical / 0 High.
- Regression: `pnpm audit:deps`.

### PR-SEC-002 — High — active legacy students could be denied by rules evaluation

- Affected: Firestore student reads for profiles created before `isActive` existed.
- Reproduction: evaluate `isActive != false` against a student profile with no `isActive` property.
- Impact: the expression can evaluate as a rules error and deny valid access, causing a production availability and migration regression.
- Resolution: use `data.get('isActive', true) != false`, preserving explicit deactivation while treating legacy profiles as active.
- Regression: emulator-backed legacy-profile coverage in `firebase/firestore.rules.test.ts`.

### PR-SEC-003 — High — direct Storage writes bypassed the one-photo profile workflow

- Affected: `/avatars/{userId}/{fileName}`.
- Reproduction: an authenticated student could upload additional files directly to Storage without using portal workflow state.
- Impact: bypass of upload lifecycle and one-photo policy; potential storage abuse.
- Resolution: Firebase avatar mutations are administrator-only with image MIME and <5MiB validation. Current portal uploads use the separately configured Cloudinary workflow.
- Regression: negative student write plus admin MIME/size cases in `firebase/storage.rules.test.ts`.

### PR-PERF-001 — High — auth pages eagerly loaded protected-portal and third-party code

- Affected: admin `/login`, student `/login`.
- Evidence: initial admin Lighthouse was performance 0.61, LCP 3.8s and TBT 1.83s; the student trace loaded Firebase/reCAPTCHA work before interaction.
- Impact: slow sign-in rendering and long main-thread blocking on representative mobile conditions.
- Resolution: moved data/auth providers to protected layouts, separated lightweight Firebase configuration checks, deferred auth SDK work until submit, disabled heavy auth-route link prefetch, and load reCAPTCHA only when an action needs it.
- Regression: `pnpm audit:lighthouse`; current median results meet the budgets above.

### PR-A11Y-001 — High release blocker — insufficient admin brand contrast

- Affected: admin `/login` and the matching reset-password brand treatment.
- Evidence: axe reported 3.0:1 for 10px bold `#66a08f` text on white; WCAG AA required 4.5:1.
- Impact: low-vision users may not perceive the label reliably.
- Resolution: removed the 60% opacity modifier and retained the full emerald foreground.
- Regression: axe scan runs in Chromium, Firefox, WebKit and mobile Chromium.

### PR-SEC-004 — Medium — missing baseline browser and API cache headers

- Affected: both portals.
- Impact: weaker clickjacking, MIME-sniffing, referrer, browser-feature and sensitive-response cache posture.
- Resolution: added HSTS, `DENY` framing, `nosniff`, strict-origin referrer policy, same-origin opener policy, restrictive permissions policy, and private/no-store API responses.
- Regression: Playwright asserts representative headers and API no-store behavior.

### PR-REL-001 — Medium — duplicate submissions and hard navigation in critical mutations

- Affected: authentication and quiz retake/submit paths.
- Impact: repeated clicks or retries could create overlapping mutations; hard reloads discarded recoverable state and added unnecessary network work.
- Resolution: single-flight mutation guards, stable submit callbacks, safe feedback, and in-place quiz retake reset/refetch behavior.
- Regression: existing admin/student component and workflow tests, including assessment-runner coverage.

### PR-SEC-005 — Critical — Firebase service-account key tracked in Git

- Affected: repository history, both Vercel project source bundles before the final clean deployments, and any Firebase resources accessible to the service account.
- Evidence: `.env`, `admin-dashboard/.env`, and `student-website/.env` were tracked at the audit baseline and contained the same service-account private key.
- Impact: anyone with repository/history access could impersonate the service account until the key is revoked; merely deleting the current files does not invalidate historical copies.
- Remediation completed: removed all three files from Git tracking while preserving ignored local copies; added `.env` rules to `.gitignore`; added `.vercelignore`; moved the admin credential to encrypted Vercel Production configuration; rebuilt both portals with no `.env` file detected by the remote builder.
- Required closure: revoke the exposed key in Google Cloud IAM, create a replacement with least privilege, update both Vercel projects, redeploy, then purge or rewrite repository history according to the team's incident procedure. Rotation is intentionally not claimed by this audit because Google Cloud IAM access was not supplied.
- Regression: secret scanning in CI plus a repository assertion that `.env` files are not tracked.

## Production deployment evidence

Promoted on 2026-09-12 from the audited working tree at baseline commit `0148fd226201112d1bacb5eb38242c335682ffc4` plus the documented uncommitted fixes:

| Portal | Production URL | Vercel deployment | Framework | Status |
| --- | --- | --- | --- | --- |
| Admin | `https://teza-tech-lab-admin.vercel.app` | `dpl_4rYizdbDgU82zbaiEFPUkp3ySuKv` | Next.js 16.3.3 | Ready and promoted |
| Student | `https://teza-tech-lab-student.vercel.app` | `dpl_2Xvy1ixQkJ9yM4LLxT6tAL64UjuD` | Next.js 16.3.3 | Ready and promoted |

The final remote builds did not detect or upload repository `.env` files. Post-promotion Chromium authenticated tests passed 8/8; Firefox, WebKit and mobile Chromium applicable public tests passed 10/10 with 14 intentional account-throttling skips. Firestore rules were released as ruleset `924bf0a5-8e60-445e-90b6-557d8c7e9783`.

## Security review observations

- Server API handlers verify Firebase ID tokens and check role/student state; anonymous negative requests return 401.
- Firestore rules deny direct student quiz-question reads and constrain course/batch/student access. Quiz answers and grading remain server-mediated.
- Service workers cache shell assets/network navigations and do not intentionally cache protected API data; API responses additionally send `no-store`.
- Disposable login credentials were not written to source, reports, or retained browser traces. PR-SEC-005 documents the pre-existing tracked server credential without reproducing its value.

## Medium/Low backlog

1. **Rotate the exposed service-account key (Critical, release blocker):** revoke the historical key, update both Vercel projects with a least-privilege replacement, redeploy, and complete repository-history remediation.
2. **Data-mutating staging coverage (Medium):** authenticated navigation and role isolation pass. Course/batch/enrollment mutations, submissions, quiz lifecycle, attendance, certificates and password administration were intentionally not run against the supplied existing records.
3. **Firebase Storage initialization (Medium):** Firestore rules are live. Firebase Storage is not initialized on the project, so Storage rule deployment returned `NOT_FOUND`; initialize it only if the product moves away from the current Cloudinary upload workflow.
4. **Cloudinary preset controls (Medium):** confirm the deployed unsigned preset restricts MIME/format, maximum bytes, folder/path, transformations and abuse quota. The Firebase Storage tests do not validate Cloudinary account-side policy.
5. **Content Security Policy (Medium):** add a nonce-based CSP after enumerating Next.js, Firebase, Cloudinary and reCAPTCHA origins in staging. A guessed production CSP was not shipped because it could block sign-in/reset flows.
6. **Field performance (Medium, release blocker):** capture INP/LCP/CLS through staging Speed Insights or equivalent. Required target: INP ≤ 200ms, LCP ≤ 2.5s, CLS ≤ 0.1.
7. **Moderate dependency advisories (Medium):** 6 transitive/tooling findings remain across OpenTelemetry, csv-parse, esbuild, stream-json and uuid paths. Vitest was upgraded to 4.1.11 and the test suite passes. Do not expose development servers to untrusted networks.
8. **Real-device assistive/browser validation (Medium):** complete keyboard, focus restoration, zoom/reflow, reduced motion, VoiceOver/Safari and TalkBack checks on authenticated flows. Automated axe does not prove full WCAG 2.2 AA conformance.
9. **Failure-state staging drills (Medium):** verify slow/offline/retry, token expiry, deep-link refresh and partial backend outage behavior using live-like Firebase and Cloudinary configuration.
10. **Java toolchain (Low):** Firebase CLI 14 runs on JDK 17 but warns that CLI 15 will require JDK 21. Upgrade CI Java before adopting Firebase CLI 15.

## Repeatable commands

```sh
pnpm audit:deps
pnpm audit:secrets
pnpm admin:lint
pnpm --filter student-website run lint
pnpm check
pnpm test
pnpm audit:rules
pnpm admin:build
pnpm student:web:build
pnpm test:e2e
pnpm audit:lighthouse
```

`pnpm quality:gate` composes the repository-owned automated checks. For already-running or staging deployments, set `PLAYWRIGHT_EXTERNAL_SERVERS=true`, `ADMIN_BASE_URL`, and `STUDENT_BASE_URL`; supply disposable account values only through process environment variables. The Lighthouse command also accepts the two base URLs for direct staging measurement. Account credentials are not stored by the repository.

## Staging completion checklist

- Revoke the exposed Firebase service-account key, replace it in both Vercel projects, redeploy, and complete the repository-history incident procedure.
- Confirm test emails, uploads and records are disposable and isolated from production data before running mutation flows.
- Complete manual keyboard/screen-reader checks and the data-mutating workflow matrix.
- Validate Cloudinary restrictions, password-reset email links and expired-session behavior.
- Record field Core Web Vitals and retire the temporary INP exception.
- Update the recommendation from NO-GO to GO only after PR-SEC-005 is closed.
