# Production codebase review — 2026-09-12

Follow-up: [မြန်မာလို live data နှင့် cloud controls စစ်ဆေးမှု](PRODUCTION_FOLLOWUP_REVIEW_MY_2026-09-12.md) records subsequent executed checks for R7–R12. It confirms live stale enrollment references, both outdated app lockfiles, no managed Firestore backups/schedules, disabled PITR/deletion protection, and no Google Cloud alert policies/uptime checks/notification channels. It also records Cloudinary/Vercel access limits. Those newer findings supersede the corresponding "not verified" statements below.

## Decision

**NO-GO for release approval.** Builds pass, but assignment integrity, assessment lifecycle, and authentication enforcement need changes. Historical credential rotation also remains unverified.

Baseline: commit `30ad033` plus eight pre-existing modified admin UI files. This review preserves those changes and makes no application changes, deployments, live data mutations, or IAM changes. The earlier audit is historical evidence, not proof of today's deployed state.

## Scope and validation

Reviewed repository structure, both Next.js apps, API authorization, registration/password flows, quiz grading/session persistence, Firestore/Storage rules, enrollment and assignment persistence, certificate workflows, uploads, service workers, build/deployment configuration, tests, and operational documentation. This is a risk-focused repository-wide review, not a claim that every UI line or every production workflow was executed.

| Check run this session | Result |
|---|---|
| Admin production build | PASS, Next.js 16.3.3, includes application TypeScript |
| Student production build | PASS, Next.js 16.3.3, includes application TypeScript |
| Both ESLint commands | PASS |
| `pnpm check` | PASS, but root tsconfig covers legacy paths/shared code, not both apps |
| `pnpm test` | 80 passed: student 48, admin 32; live-config test skipped; 13 emulator tests skipped in this command |
| `pnpm audit:rules` | PASS, emulator command exit 0 against demo-coursewise-audit |
| `pnpm audit:secrets` | PASS for tracked current files only |
| `pnpm audit --json` | 0 critical, 0 high, 5 moderate; exit 1 because moderate findings exist |
| Browser E2E / Lighthouse / live authenticated mutations | NOT rerun in this review |
| IAM key revocation, cloud presets, deployed rules/indexes, backups | NOT verified against cloud accounts |

Existing passing tests do not disprove the static findings below. Reproduction scenarios below are code-derived unless explicitly identified as executed checks.

## Release blockers

### R1 — Critical conditional: previously exposed Firebase service-account key

Evidence: `docs/PRODUCTION_READINESS_AUDIT_2026-09-11.md`, PR-SEC-005, records the same private key in three formerly tracked environment files. Current secret-hygiene passes but cannot prove historical keys were revoked. Do not interpret this as evidence the old key is still active; its current status is unknown.

Required: verify the exposed key is disabled/deleted in IAM; replace credentials in both deployments if not already done; redeploy and verify privileged APIs; record closure without copying secrets. Review historical distribution and service-account permissions. Current file deletion alone is not closure.

### R2 — High: students can create their own assignment grades

Evidence: `firebase/firestore.rules:177`, especially create permission at line 179; `admin-dashboard/src/lib/assignment-service.ts` reads `score` and `feedback` directly; `student-website/src/lib/student-repository.ts` also trusts those fields.

An active enrolled student can directly create an assignment submission with valid ownership/scope plus arbitrary `score`, `feedback`, and timestamps. The create rule has no allowed-field list, grade-field exclusion, content validation, or server timestamp constraint. Those supplied grade fields are displayed as results. The student can also delete an already graded submission and create another one.

Required: allow-list student writable fields, reject grading fields on create, require server timestamps, validate response size/types, and decide whether reviewed submissions may be deleted. Keep grade changes administrator-only. Add emulator cases for forged grades, invalid timestamps, and deleting reviewed submissions. Define deadline and duplicate-submission policy explicitly; neither is enforced here.

### R3 — High: final-exam auto-submit fails with unanswered questions

Evidence: `student-website/src/lib/assessment-backend.ts:317`; `student-website/src/components/assessment-runner.tsx:117`.

Timer expiry and the third integrity warning invoke submission, but the backend rejects any final exam with an unanswered question. The UI sets `autoSubmitRef` before the request and does not reset it on failure. After the grace interval, the backend rejects submission as expired as well.

Required: server-controlled terminal submission that grades unanswered questions as incorrect; retry-safe finalization; recoverable UI on transient failures. Test timeout with zero/some answers, third warning with partial answers, and network failure at expiry.

### R4 — High: abandoning an expired exam bypasses attempt/cooldown accounting

Evidence: `student-website/src/lib/assessment-backend.ts:212` through session creation at line 238; counters are incremented only during submission.

Start an exam, let expiry plus the 120-second grace pass without submitting, then call start again. The old active session is overwritten with a fresh draw and fresh timer. No attempt was consumed and no failed-attempt cooldown was created. This permits repeated question-bank exposure and evasion of retake policy while the assessment window remains open.

Required: count/reserve attempts transactionally at start, or finalize expired sessions before allowing another start; enforce cooldown and limits for abandoned sessions. Test repeated abandoned attempts and concurrent starts.

### R5 — High: email verification and custom auth checks are not an authoritative boundary

Evidence: `student-website/src/lib/auth-service.ts` checks verification only in `loginStudent`; `student-website/src/lib/server-api.ts` and `firebase/firestore.rules:9` check role/active state but not verified email. `student-auth-provider.tsx` also accepts a student profile without verification. `firebase/firestore.rules:45` permits owner-created student profiles including arbitrary student IDs and emails.

A token for an unverified self-registered user satisfies server/rules checks wherever that user otherwise has permission. Direct Firebase authentication also bypasses the separate `/api/register-student` PUT reCAPTCHA/rate-limit preflight. If direct email/password account creation remains enabled in the Firebase project, a client can create an Auth account and then create the allowed student profile without the numbered-profile registration route. Enrollment is still required for protected course data; this is not arbitrary enrollment or admin escalation.

Required: enforce `requiresEmailVerification` with the verified token claim in both API guards and Firestore rules, preserving deliberately exempt admin-created/legacy users. Restrict student profile creation to trusted provisioning and verify Firebase account-creation/password-abuse controls. Do not describe client preflight as a mandatory Firebase Auth control.

Firebase's direct REST sign-up/sign-in capability is documented in the [Firebase Auth REST reference](https://firebase.google.com/docs/reference/rest/auth). Whether project-side controls block direct signup was not tested live.

### R6 — High: mutable assessment definitions and non-atomic sessions can change grading

Evidence: `student-website/src/lib/assessment-backend.ts`, `loadAssessmentContext`, `startAssessment`, `checkChapterAnswer`, and `submitAssessment`; `admin-dashboard/src/lib/firebase-quiz-workflows.ts` permits editing/deleting questions.

Sessions store question IDs and option orders, but not immutable question/key versions. Submission reloads the current question bank and answer keys. Editing options/keys during an attempt changes grading; deleting a selected question can break session rendering or remove marks from the grading denominator. Start performs read-then-set outside a transaction, so simultaneous requests can return different shuffles while only the last session survives. Chapter checking likewise reads and writes answers outside a transaction, allowing competing first answers to overwrite the intended first choice.

Required: immutable assessment versions/snapshots, unique attempt-session IDs, transactional start/check transitions, and version validation inside submission transactions. Add tests for two-tab starts, concurrent chapter answers, and edits/deletes during an active exam.

## Additional code findings

### R7 — Medium: student progress endpoint mixes lesson batches

`admin-dashboard/src/app/api/students/route.ts:59` queries lessons by course and publication only; line 60 queries progress by student/course only. The response labels one selected batch but totals lessons from other batches in that course. Add the selected `batchId` to both queries and test a course with two batches. This is an administrator reporting correctness issue, not a cross-student disclosure to students.

### R8 — Medium: deleting/relinking parent records leaves inconsistent enrollments

`admin-dashboard/src/lib/course-batch-service.ts` deletes course/batch documents without checking dependent enrollments/content. `linkBatchToCourse` changes the parent without migrating dependent records. `updateEnrollmentBatch` does not verify the destination batch belongs to the enrollment's course. Rules authorize admins but do not enforce these relationships.

Use archive/restrict-delete semantics for referenced records, validate destination relationships transactionally, and define a migration for relinking populated batches. Test parent deletion, cross-course transfer, and concurrent enrollment changes. `saveEnrollmentStatus` also leaves discovery arrays and selected-profile fields untouched; synchronize them or document and consistently handle inactive entries.

### R9 — Medium: unsigned uploads require externally verified controls

`student-website/src/lib/cloudinary-upload-service.ts` exposes the unsigned preset and sends avatar/assignment uploads directly; size checks run in the browser and assignment uploads use `/auto/upload`. The repository cannot establish effective provider-side format/size/quota/privacy limits or enforce one upload per account. The profile rule limits assigning a photo URL once, not the number of Cloudinary uploads.

Verify the deployed preset, upload quotas, acceptable file types, and access policy for student submissions. Prefer authenticated, scoped signed uploads if per-user authorization is required; signing alone does not make delivered files private. See [Cloudinary's unsigned-upload security guidance](https://support.cloudinary.com/hc/en-us/articles/360018796451-What-are-the-security-considerations-for-unsigned-uploads). No live upload abuse test was performed.

### R10 — Medium: production dependency installation differs from the audited workspace

Both `vercel.json` files install with `--ignore-workspace --no-frozen-lockfile`. Root dependency overrides/audit are therefore not sufficient evidence for the isolated production resolution, and deployment may update package resolution. Use an agreed workspace or isolated lockfile strategy with frozen installs, audit the actual deployed dependency graph, and pin the package manager/runtime. Avoid treating root audit success as proof for a separately resolved build.

### R11 — Medium: critical mutations are missing from the release test gate

There is no checked-in `.github/workflows` pipeline. `quality:gate` is a manual command; existing E2E authenticated checks skip without credentials and primarily navigate routes. Existing rules tests passed despite R2/R5; assessment backend lifecycle regressions above are not covered. Root `pnpm check` targets retired `client/server` paths plus shared code. Root `build` builds only admin.

Add CI enforcement for both applications, explicit app TypeScript checks, security regression tests, and isolated staging tests for enrollment, submissions, grading, certificates and password administration. Require credentials for a designated staging gate rather than silently treating skipped auth tests as release coverage. CI/platform branch protection may exist externally, but was not verified.

### R12 — Medium: scaling and operations need explicit launch evidence

Several paginated screens still read entire collections before slicing: `loadBatchesPage`, `loadAllBatchesPage`, and `loadEnrollmentsPage` in `course-batch-service.ts`. Student catalog pagination scans all course quiz metadata and all student summaries per request. `/api/students` lists all profiles and performs Auth lookups; certificate and assignment lists are also unbounded.

Choose a supported initial data/concurrency budget, measure it with realistic fixtures, then introduce query-level pagination/aggregates where needed. Confirm backups and a restore drill, billing/read/upload alerts, error monitoring, retention/deletion policy, and rollback ownership. These cloud controls are unknown, not proven absent. Registration rate-limit documents store numeric expiration fields but no cleanup implementation was found; verify cleanup/TTL strategy before accumulating long-term records.

## Lower-priority hardening and product decisions

- Both apps include baseline headers and API `private, no-store`; no CSP is configured. Add a tested policy with required Firebase/reCAPTCHA/Cloudinary origins.
- Student API guard converts backend credential/database outages into 401 session errors; distinguish service outages from invalid authentication as the admin guard already does for initialization.
- Student password admin endpoints accept any UID/email after admin authorization, without checking target student role. All admins already have broad authority, so this is a target-validation/product boundary issue, not student privilege escalation.
- Manual certificate duplicate checking uses query-then-write, so concurrent requests may reuse a serial; use a transactional unique serial reservation. Decide whether public certificate verification is required; no dedicated public verification route was found.
- Course-wide quiz summaries/session IDs omit batch scope. Confirm whether completion/retake limits should carry across batches; otherwise scope the persistence keys and migrate old records.
- Firebase config absence enables demo/offline behavior instead of failing the production build. Add environment validation so a misconfigured deployment cannot appear healthy with demo content.
- Retired Vite/root dependencies and the excluded `functions/` package remain. `firebase.json` does not configure Functions; root workspace checks do not validate that package. Archive/remove obsolete paths or explicitly maintain them. README version/test claims have drifted from today's results.
- Five moderate advisories remain in the root audit; review actual affected runtime/tooling paths rather than blindly overriding incompatible major versions.
- Service worker reviewed here caches only the offline page and falls back on navigation failure; no intentional authenticated API response cache was found.

## Concrete release sequence

1. Close historical IAM key exposure with evidence.
2. Fix R2–R6 and add targeted negative/concurrency/expiry tests.
3. Correct batch progress and parent/enrollment invariants; settle upload privacy and preset controls.
4. Make deployment installs reproducible and enforce both-app CI/staging checks.
5. On isolated staging data, complete signup → verification → enrollment → lesson → assignment → quiz timeout/retake → certificate → password reset/deactivation flows. Test two students in different batches and two concurrent browser sessions.
6. Verify deployed environments, Firebase rules/indexes, authorized auth/reset domains, Cloudinary controls, monitoring, backup restore, and rollback. Rerun browser/mobile/accessibility/performance checks on the exact release candidate.

Release approval should reference the final commit and deployment IDs and record any accepted residual risks. The previous report's production smoke/performance results must not be relabeled as fresh results for this working tree.
