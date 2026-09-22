# Production Readiness Audit — 2026-09-18

**Verdict: NOT READY for an unrestricted production release.**

The applications compile, their existing tests pass, and public-page browser/performance checks pass. However, this review confirmed registration-policy bypasses, unsafe student upload deletion, insufficient upload restrictions, unenforced server-side exam termination, assessment recovery failures, and deployment dependencies that escape the existing audit gate. These require remediation before release approval.

Audited revision: `0f838693f573539e07059bb5d59746e10632ea00`. The checkout initially contained 311 tracked files and was clean. This is a repository audit, not a penetration test or certification of the deployed services. Severity reflects the impact of the described scenario; a dependency advisory does not by itself prove exploitability.

## Today's Tasks

- Inventoried both Next.js applications, all API route authorization entry points, shared modules, Firestore rules/indexes, legacy Functions, migrations/bootstrap scripts, dependency lockfiles, CI, and deployment documentation.
- Traced registration/login/reset, enrollment selection and mutation, quizzes and grading, certificate issuance, student deletion, assignment uploads/downloads, and service-worker behavior.
- Ran secret/dependency checks, type checks, lint, application tests, Firestore emulator tests, legacy Functions checks, production builds, browser/accessibility checks, and Lighthouse.
- Executed ten additional local reproductions against actual TypeScript modules with in-memory service doubles, plus a Firestore-rules reproduction against the local demo emulator. No real accounts, enrollments, assignments, certificates, or cloud assets were changed.
- Created this report. Application source, rules, dependencies, and deployment configuration were not changed.

## Issue Analysis

### F01 — High: the dependency gate audits a different graph from Vercel

**References:** `student-website/vercel.json:3`, `admin-dashboard/vercel.json:3`, `.github/workflows/quality-gate.yml:30`, `package.json:20`, `package.json:131`; Student lockfile entries at `student-website/pnpm-lock.yaml:1990`, `:2536`, `:3296`; Admin entries at `admin-dashboard/pnpm-lock.yaml:2261`, `:2834`.

**Evidence:** Workspace audit reported **0 high/critical and 5 moderate**. Auditing with `pnpm --ignore-workspace audit --json` from each app reported **Student: 6 high / 6 moderate**, **Admin: 2 high / 1 moderate**. Vercel explicitly installs each app independently, while CI installs and audits the root workspace. Both app manifests match their local lockfile specifiers; the problem is the dependency resolutions and root-only overrides, not a current manifest mismatch.

**Impact:** CI can pass while a release uses packages below the audit's own high-severity threshold. The affected high-severity versions include `sharp@0.35.3`, `js-yaml@4.3.1`, and Student `fast-uri@3.1.5`. Their reported patched versions are respectively `>=0.35.4`, `>=4.3.2`, and `>=3.1.6`.

**Reachability limit:** Sharp is an optional Next.js dependency and both apps disable image optimization. `js-yaml` appears under ESLint, and additionally Student cosmiconfig; `fast-uri` appears under AJV. This audit did not demonstrate an exploitable application request path. The confirmed failure is release dependency policy and CI/deployment parity.

**Acceptance:** Audit and build the same isolated dependency graphs used by deployment, remediate high advisories or document reviewed reachability exceptions, and make either app-local high-advisory result fail CI. Validate clean frozen installs, not only workspace builds. Advisory references: [Sharp](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c), [js-yaml](https://github.com/advisories/GHSA-2883-xcg3-v3hh), [fast-uri example](https://github.com/advisories/GHSA-5jgf-p345-68v8).

### F02 — High: student provisioning remains possible outside the protected registration route

**References:** `firebase/firestore.rules:9`, `firebase/firestore.rules:46`, `student-website/src/app/api/register-student/route.ts:138`, `student-website/src/lib/auth-service.ts:41`, `student-website/src/lib/auth-service.ts:64`.

**Evidence:** The demo emulator accepted a verified Auth identity creating `users/<own uid>` with `role: student`, an arbitrarily chosen `studentId`, and arbitrary timestamp strings. No registration route, CAPTCHA, rate-limit transaction, or student-counter transaction was involved. Missing `isActive` defaults to active. An attempted role change to admin was denied.

**Impact:** The protected registration route is not the sole provisioning boundary. With ordinary Firebase email/password signup enabled, a client can obtain and verify an Auth identity directly, then create a profile and choose a duplicate or misleading student number. Enrollment and admin privileges are still separately protected; this is not an admin escalation or automatic access to paid/enrolled content.

Login and reset CAPTCHA/rate limiting also run as independent browser preflight requests, followed by direct Firebase SDK calls. A custom client can omit that preflight. Firebase's own throttling or provider-side protections may still apply, but this repository cannot establish them. Firebase documents direct signup, login, and reset operations in its [Auth REST API](https://firebase.google.com/docs/reference/rest/auth).

**Acceptance:** Make profile creation and student numbering authoritative in trusted backend code; deny ordinary client profile creation. Test verified direct-client creation, duplicate student numbers, and malformed timestamps. Enforce anti-abuse requirements at the actual identity operation/provider boundary, and document/test provider configuration instead of counting a browser preflight as mandatory protection.

### F03 — High: a student can delete a reviewed assignment's file

**References:** `student-website/src/app/api/uploads/cloudinary-signature/route.ts:71`, `student-website/src/lib/cloudinary-server.ts:45`, `firebase/firestore.rules:206`.

**Evidence:** Calling the actual DELETE handler with a referenced, reviewed asset returned HTTP 200 and invoked `destroyPrivateAsset`. Its only asset authorization check is the student's folder prefix. It never checks whether a submission references the asset or whether work is reviewed.

**Impact:** A student can remove grading evidence even though Firestore prevents deletion of the reviewed submission document. The document remains, with a broken download. This reproduction mocked Cloudinary; no actual file was deleted.

**Acceptance:** Restrict cleanup to server-tracked pending/unattached uploads, with an atomic transition that prevents attachment/deletion races. Reject deletion of every asset already referenced by a submission, including reviewed work; allow legitimate abandoned-upload cleanup. Test wrong-owner, referenced, reviewed, replayed, and simultaneous attach/delete cases.

### F04 — High: student upload restrictions do not constrain the uploaded bytes

**References:** `student-website/src/app/api/uploads/cloudinary-signature/route.ts:39`, `:62`, `student-website/src/lib/cloudinary-server.ts:25`, `student-website/src/lib/cloudinary-upload-service.ts:57`.

**Evidence:** The handler validates client-reported size/MIME, then signs folder/public ID/timestamp/delivery type. The resulting parameters contain no upload preset, format restriction, or size restriction. Avatar signatures are even broader, signing only folder and timestamp.

**Impact:** A modified client can claim an allowed small file and use the signature for different bytes, subject to Cloudinary's own account limits. This weakens type/size policy and exposes storage/processing quotas to abuse. The signature also does not bind `resource_type`. These are protocol-level conclusions supported by Cloudinary's [signature documentation](https://cloudinary.com/documentation/authentication_signatures); no live upload abuse was attempted.

**Acceptance:** Bind an enforced signed preset or validate uploads through trusted server processing, verify uploaded asset metadata before attachment, and add issuance quotas. Test real provider rejection of oversized/disallowed content and resource-type substitution in a disposable environment. Cloudinary documents preset size constraints in [upload presets](https://cloudinary.com/documentation/upload_presets). Admin uploads already name a preset; its deployed configuration remains unverified.

### F05 — High: three recorded exam violations do not terminate the server session

**References:** `student-website/src/lib/assessment-backend.ts:421`, `:436`, `:348`; `student-website/src/components/assessment-runner.tsx:145`; `student-website/src/lib/assessment-backend.test.ts:296`.

**Evidence:** After three successful integrity calls, the stored session remained `active`. A later correct answer submission passed and could issue a certificate. The server only returns `shouldSubmit: true`; the browser performs the actual submission. The existing test asserts that flag, not a terminal session transition.

**Impact:** A client can ignore the instruction and continue answering after the server has already recorded the terminal warning threshold. Browser event detection itself is inherently best effort, but enforcing a threshold already recorded by the server can be authoritative.

**Acceptance:** Persist terminal state transactionally at the threshold and reject later answer changes. Define and implement the score policy using answers captured before termination. Test concurrent integrity/submission calls, ignored client responses, repeated violations, and idempotent finalization; ensure only one attempt/certificate can result.

### F06 — Medium: course-wide quizzes reject valid secondary enrollments

**References:** `student-website/src/lib/assessment-backend.ts:162`, `:170`; `student-website/src/components/course-batch-selector.tsx:64`; `student-website/src/lib/student-repository.ts:347`.

**Evidence:** A student with an active enrollment in a quiz's course received HTTP 403 when their profile's default course pointed elsewhere. Course-wide quizzes resolve enrollment from `users.activeCourseId/activeBatchId`; the selector persists its choice only locally. Starting the assessment sends no selected course/batch.

**Impact:** A quiz can be visible in the catalog but inaccessible. With several batches in the same course, selection and recorded attempt/certificate scope can diverge.

**Acceptance:** Carry the intended enrollment scope through start/session requests, validate it against authoritative active enrollment, and retain it through checking, submission, and results. Test two courses, two batches in one course, a changed default, and enrollment removal during a session.

### F07 — Medium: interrupted assessment sessions lack a complete recovery path

**References:** `student-website/src/lib/assessment-backend.ts:238`, `:244`, `:280`, `:487`; `student-website/src/lib/student-repository.ts:347`; `student-website/src/app/(portal)/quizzes/page.tsx:245`.

**Evidence:** An untimed chapter session has no expiry. Starting again without the original sessionStorage token returns 409 indefinitely. A separate reproduction reserved the only allowed attempt, after which the catalog marked it ineligible with zero remaining attempts even though the backend could resume it with the correct token.

**Impact:** Closing a tab, switching devices, losing storage, or navigating back to the catalog can block legitimate completion. The UI does not distinguish an active reserved attempt from exhausted completed attempts.

**Acceptance:** Provide an authenticated recovery/takeover mechanism with explicit concurrency handling, retain reserved-attempt accounting, and expose a Resume action independently of remaining new attempts. Test token loss, tab close, reload, device change, and the final allowed attempt; untimed sessions must not permanently strand students.

### F08 — Medium: concurrent manual issuance duplicates certificate serials

**References:** `admin-dashboard/src/app/api/certificates/route.ts:98`, `:101`, `:125`.

**Evidence:** Two concurrent calls with the same serial both returned 201 and created separate records in the in-memory reproduction. The duplicate query and random-document write are outside a transaction or uniqueness reservation.

**Impact:** Separate administrators, retries, or concurrent requests can produce ambiguous serial identities. Automatic exam certificate document IDs are deterministic; this finding concerns manual issuance.

**Acceptance:** Reserve normalized serials with a deterministic key and transaction/create precondition. Concurrent duplicate requests must yield one certificate, with a documented idempotent response or conflict for the other. Test collisions with automatic issuance as well.

### F09 — Medium: partial student deletion cannot be retried through the API

**References:** `admin-dashboard/src/app/api/students/route.ts:179`, `:190`, `:194`; `admin-dashboard/src/lib/course-batch-service.ts:230`.

**Evidence:** Simulating an Auth deletion outage produced 500 after the profile was deleted. The next identical call returned 404 before attempting Auth deletion again. The endpoint also leaves enrollments and their denormalized memberships untouched; enrollment cleanup expects a student document that may no longer exist.

**Impact:** The account is blocked by the missing profile, but Auth identity and enrollment records can remain orphaned. Email reuse and administrative cleanup may require manual repair.

**Acceptance:** Use a durable deletion state/job or an idempotent coordinated workflow, deny access immediately, and allow cleanup to resume after each failure boundary. Preserve historical academic records according to an explicit retention policy while removing active memberships. Inject failures between profile, Auth, and enrollment operations and prove safe retry.

### F10 — Medium: student backend outages are misreported as invalid sessions

**References:** `student-website/src/lib/server-api.ts:18`, `:30`; compare `admin-dashboard/src/lib/server-api.ts:18`.

**Evidence:** A mocked server-credential initialization failure was converted into HTTP 401 with the expired-session message. Firestore profile-read failures fall into the same catch.

**Impact:** Valid students are told to sign in again during credential/configuration or database outages. The conversion also bypasses the generic unexpected-error logger, reducing diagnostic visibility.

**Acceptance:** Separate configuration/database failure handling from token verification. Return a sanitized 503/500 and log the operational cause; reserve 401 for invalid authentication and 403 for permission failures. Test invalid tokens, revoked tokens, missing credentials, and database unavailability independently.

### F11 — Medium: email-action return links accept arbitrary HTTPS origins

**References:** `shared/email-action-url.ts:7`, `:16`; `student-website/src/app/(auth)/auth/action/page.tsx:38`, `:120`.

**Evidence:** `resolveEmailActionReturnUrl('https://attacker.example/anything')` returned `https://attacker.example/login`. The action page renders this link after invalid as well as successful action processing.

**Impact:** A crafted action URL can display the application's branding and a Back to login link to an external imitation login page. This is a user-click phishing path, not an automatic redirect or proof of account compromise. Restricting the path and removing query parameters does not validate the destination origin.

**Acceptance:** Allow only configured Admin/Student origins, with localhost exceptions limited to development. Test legitimate cross-portal links and reject arbitrary domains, userinfo, protocol-relative URLs, and unsupported schemes.

### F12 — Medium: enrollment transactions use stale membership snapshots

**References:** `admin-dashboard/src/lib/course-batch-service.ts:121`, `:131`, `:197`, `:207`, `:303`, `:309`, `:316`.

**Evidence:** Status changes, deletion, and batch moves fetch active enrollments before starting their transaction. A transaction retry continues using that old list. The batch-move existence guard also checks `.exists` rather than calling `.exists()` on Web SDK snapshots, so missing records do not trigger that guard.

**Impact:** Concurrent enrollment changes can overwrite profile enrollment lists or remove course-discovery membership despite another active enrollment. Stale move requests can continue with a missing source/student. This finding is established by source inspection; an actual Firestore conflict schedule was not exercised.

**Acceptance:** Read all authoritative membership state in a retry-consistent trusted transaction, or derive updates from a transactional per-student membership record. Correct snapshot method calls. Test simultaneous enroll/deactivate/move/delete, missing source records, and transaction retries against an emulator, asserting profile, enrollment, lock, course, and batch consistency.

### Additional production gaps and lower-priority work

| Area and reference | Confirmed limitation | Acceptance / verification needed |
| --- | --- | --- |
| Scale: `admin-dashboard/src/app/api/students/route.ts:21`, `admin-dashboard/src/lib/assignment-service.ts:86`, `student-website/src/lib/assessment-backend.ts:491` | Student directory and assignment review read entire collections; the paged quiz API still scans all matching metadata and summaries before slicing. | Bound reads with server pagination/appropriate aggregates; benchmark representative enrollments and record counts. No load/cost test was performed. |
| CI coverage: `.github/workflows/quality-gate.yml:102`, `playwright.config.ts:31`, `e2e/production-readiness.spec.ts:83` | Default browser checks use Firebase-disabled dev servers, while authenticated checks skip without credentials. Tests navigate authenticated routes but do not complete grading/upload/enrollment workflows. CI does not invoke Lighthouse. | Add disposable integrated workflow coverage and a release job that fails when required authenticated coverage is skipped; test built artifacts and run performance budgets. |
| SEO gate: `scripts/run-lighthouse-audit.mjs:55` | SEO is measured but has no failing threshold. Both login pages scored 100 in this run. | Define and enforce the intended SEO threshold, or document that SEO is informational. |
| Operations: `README.md:303`, `README.md:357` | Backups, audit logs, monitoring, and pagination are documented as follow-up work. Repository code does not prove deployed operational controls. | Supply current backup/restore evidence, alerts, ownership, retention policy, and rollback procedure. |
| Error recovery / headers: both `src/app` trees and `next.config.ts:3` | No custom `error.tsx`/`global-error.tsx` or CSP was found. Existing baseline security headers are present. | Add useful error recovery and evaluate a CSP against Firebase, Cloudinary, and CAPTCHA. Absence alone is not evidence of an exploitable XSS path. |
| Legacy utilities: `docs/FIREBASE_HANDOFF.md:60`, `functions/src/index.ts:138`, `student-website/src/lib/quiz-backend.ts:252`, `scripts/migrate-assessment-security.mjs:13` | Functions and the old quiz backend are not called by current app routes. Legacy migration rejects multiple active enrollments, which the current product supports. Bootstrap utility uses a fixed project ID. | Archive/label obsolete code, update migration/bootstrap assumptions before reuse, and verify no old callable deployments remain live. Do not deploy legacy Functions as an audit fix. |

## Root Cause

The principal causes are enforcement at incomplete boundaries and inconsistent sources of truth:

1. Deployment resolves dependencies independently from the workspace that CI audits.
2. Registration and upload UI checks are treated as authoritative even though other client/provider paths remain available.
3. Assessment UI state, server session state, enrollment selection, and reserved-attempt counts are not modeled consistently through recovery and termination.
4. Cross-service deletion and serial uniqueness use multi-step operations without durable retry or atomic reservation.
5. Existing tests validate selected happy paths and returned flags; they do not cover several hostile-client, concurrent, interrupted, or partial-failure scenarios reproduced here.

There are also effective protections worth retaining: every protected Next.js API entry point calls an authentication guard; both guards check revoked ID tokens; student APIs check role/activity/verified email; Firestore denies cross-student records and direct answer-bank reads in tested scenarios; grading uses server-side answer keys and frozen question snapshots; ordinary repeated final submissions are idempotent; API responses have no-store headers; assignment downloads are authenticated and short-lived; service workers cache only the offline fallback, not private API data.

## Completed Fixes

**No application fixes were made.** The authorized deliverable was an audit. This report records the remediation work, rather than implying the findings have been resolved.

Local audit evidence was generated under ignored `tmp/`, `playwright-report/`, `test-results/`, and `artifacts/lighthouse/`. The local reproduction scripts are `tmp/production-audit-repro.mjs` and `tmp/production-audit-rules.mjs`; they are diagnostic artifacts, not new production tests. The first uses actual modules with service doubles and does not reproduce full Firestore transaction semantics. The second requires a loopback emulator and was run against `demo-coursewise-audit`.

Remediation order:

1. Close F02–F05 security/integrity gaps and fix F01 release dependency parity.
2. Repair assessment scope/recovery, certificate uniqueness, student deletion, and enrollment consistency (F06–F09, F12).
3. Correct operational error classification and email return-origin validation (F10–F11).
4. Add the acceptance tests above, rerun the deployment-equivalent gates, and complete the cloud/staging evidence below before reconsidering release approval.

## Validation

Environment: Windows, Node `v24.20.0`, pnpm `10.4.1`, Java `17.0.20.1`. CI and legacy Functions specify Node 22; local success is not a Node 22/Linux clean-install result. The Firebase CLI warned that its next major version requires Java 21; the installed emulator completed successfully.

| Check | Status | Evidence / limit |
| --- | --- | --- |
| `pnpm audit:secrets` | Passed | No tracked environment/service-account credential files detected by the existing scanner. Does not prove history is clean or exposed keys were revoked. |
| `pnpm audit:deps` | Passed at configured threshold | Workspace: 0 high, 0 critical, 5 moderate. Four advisory records span five affected instances. |
| Student isolated lockfile audit | Failed release criterion | 6 high, 6 moderate; no critical. See F01. JSON extraction itself completed; severity assessment is separate from the wrapper's exit status. |
| Admin isolated lockfile audit | Failed release criterion | 2 high, 1 moderate; no critical. See F01. |
| App manifest/local-lockfile comparison | Passed | Both apps' dependency specifiers match their local lockfiles. No isolated dependency installation was performed. |
| `pnpm check` | Passed | Root TypeScript plus both app checks, including Student Next route type generation. |
| Admin / Student lint | Passed | Both ESLint commands completed without reported violations. |
| `pnpm test` | Passed, with skips | Student: 74 passed / 1 live-config test skipped; Admin: 34 passed. Root's 13 emulator tests skip without emulator env and were run separately below. |
| `pnpm audit:rules` | Passed | All 13 Firestore emulator tests; demo project, exit 0. Negative-test permission errors are expected. |
| Functions typecheck / build | Passed | `pnpm --dir functions run lint` and `build`; Node-version warning. Legacy package, not an active production dependency. |
| `pnpm admin:build` | Passed | Next.js 16.3.3 optimized production build. |
| `pnpm student:web:build` | Passed | Next.js 16.3.3 optimized production build. |
| Playwright against local production builds | Passed, with skips | 14 passed / 18 skipped, 1.8 minutes. Chromium, Firefox, WebKit, mobile Chromium. External-server mode on ports 3300/3301; no staging credentials supplied. |
| Authenticated staging workflows | Skipped | 16 credential-dependent browser cases; two other skips intentionally avoid duplicate viewport tests. No real registration, email send, grading, upload, or admin mutation executed. |
| Visual / console check | Passed | Both login pages rendered; no captured page/console errors or framework overlays. Screenshots inspected. `agent-browser` was unavailable and its package lookup stalled; installed Playwright supplied equivalent browser evidence. |
| Local module reproductions | Passed as defect confirmations | Ten assertions reproduced the behaviors described above. They are not evidence the defects are fixed. |
| Additional rules reproduction | Passed as defect confirmation | Self-created numbered student profile accepted; admin role escalation denied. |
| `pnpm audit:lighthouse` | Passed | Login pages only; median of three valid measurements per page. Values below. |
| `git diff --check` | Passed | No application diff was introduced. |

| Lighthouse target | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Admin login | 89 | 100 | 100 | 100 | 2,201 ms | 0 | 393 ms |
| Student login | 85 | 100 | 100 | 100 | 2,381 ms | 0 | 526 ms |

Configured enforced budgets: performance >=80, accessibility/best practices >=90, LCP <=2,500 ms, CLS <=0.1, TBT <=600 ms. SEO is informational in the current script. Login scores do not establish authenticated-dashboard performance, field INP, network reliability, or behavior with large production datasets. The measurements were collected on 2026-09-18 at approximately 16:21 UTC.

### Remaining cloud and release evidence

- Current Vercel environment values, deployment build logs/revision, Firebase project alignment, authorized domains, email action templates, CAPTCHA domain/provider enforcement, and Cloudinary preset settings were not inspected live.
- Deployment of the reviewed Firestore rules/indexes, absence of old callable Functions, backup/PITR configuration, restore drills, monitoring, and rollback readiness remain unverified.
- Earlier audit notes mention credential exposure. Current secret hygiene passes, but this audit did not verify revocation/rotation or Git history cleanup. Treat those as unresolved evidence requirements, not a claim that a credential is currently valid or compromised.
- No authenticated integrated workflow, real upload rejection test, concurrency/load benchmark, production database migration, deployment, or real-user data inspection occurred.

**Release exit criteria:** resolve all High findings and the Medium defects affecting intended launch workflows; pass deployment-equivalent clean installs/builds/audits; add and pass the specified failure/concurrency tests; demonstrate authenticated integrated workflows with disposable data; and provide the operational/cloud evidence above. Current test success does not override the confirmed defects.
