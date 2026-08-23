# Teza Tech Lab — Feature Expansion Assessment and Firebase Roadmap

## Executive assessment

The requested Education Management System feature set is **compatible with the current Teza Tech Lab architecture**. The platform already has two separate Next.js websites, Firebase Email/Password Authentication, Firestore role-based access control, dynamic courses and batches, private student records, and Vercel deployments. The expansion should be delivered in controlled phases so that existing batch isolation and student-data privacy are preserved.

The current codebase already covers most day-to-day learning workflows. The highest-value missing capabilities are a consolidated gradebook and progress model, certificates, exportable reports, in-app and browser notifications, audit evidence, analytics, PWA/offline support, theme switching, and localization. The latest synchronized code also contains a responsive-design setting that is currently disabled; this should be corrected before positioning the product as mobile/tablet responsive.

> **Security principle:** Any feature that writes student grades, certificate issuance, audit evidence, or system-wide notifications must retain the existing `auth.uid`, role, course, and batch-boundary checks. Client-only convenience implementations must not be used where a tamper-resistant server-side record is required.

## Current capability mapping

| Requested capability | Current Teza Tech Lab status | Implementation note |
|---|---|---|
| Courses and batches | Available | Admin course/batch manager and enrollment context are implemented. |
| Student enrollment and management | Available | Student profiles, Firebase accounts, batch assignment, and role boundaries are available. |
| Announcements | Available | Admin publishing and student visibility are implemented. |
| Lessons and assignments | Available | Both portals contain lesson and assignment modules; current assignments support briefs, due dates, and submission instructions. |
| Quizzes | Available with a deployment dependency | Quiz UI, scheduling fields, question/answer-key separation, and trusted callable scoring are implemented. Production scoring requires the deferred Cloud Functions deployment. |
| Attendance | Available | The underlying module, batch scoping, and private student visibility exist. The latest Admin navigation currently hides the Attendance link and should expose it again. |
| Student progress monitoring | Partial | Quiz attempts, attendance, assignments, and enrollment data exist, but there is no unified progress model or dashboard calculation. |
| Grade and result management | Partial | Quiz scores are present. A subject/course gradebook, grading policy, term result, and report-card model are missing. |
| Certificates | Missing | Requires certificate data, a template/numbering policy, issue/revoke flow, secure verification, and downloadable output. |
| PDF, Excel, CSV exports | Missing | CSV can be built in the Admin Website; Excel/PDF report generation needs protected data selection and export templates. |
| Admin and student notifications | Partial | The Student UI contains a notification affordance but no persisted notification center or browser-push delivery. |
| Audit logs and activity tracking | Missing | Must be server-trusted; client-generated audit history alone is not sufficient. |
| Traffic analytics | Missing | Can use Vercel Analytics or Firebase/Google Analytics, subject to the selected provider configuration. |
| Data-growth monitoring and charts | Missing | Needs an aggregate metrics model and an Admin analytics dashboard. |
| PWA installation | Missing | Requires web manifest, icons, service worker, install prompt, and cache strategy. |
| Offline support | Missing | Firestore web persistence can support cached data and queued writes, but must be opt-in for sensitive school accounts. [3] |
| Dark/light mode | Missing | A theme token system and user preference field are needed. |
| Burmese/English localization | Missing | Requires translation resources, locale preference, and date/number formatting rules. |
| Mobile/tablet responsiveness | Needs correction | The latest shared display setting currently forces a desktop-width viewport and disables mobile-responsive rendering; restore responsive mode before release. |

## Firebase architecture and deployment implications

Most requested features can use Firestore collections protected by the existing role and batch rules. The following table distinguishes client-safe features from features that need a trusted server boundary.

| Feature family | Recommended Firebase design | Billing/deployment implication |
|---|---|---|
| Gradebook and progress | `gradeCategories`, `gradeItems`, `gradeRecords`, and batch-scoped progress summaries; admins write, students read only their own records | Firestore rules/indexes plus UI; no Cloud Functions required for an initial implementation. |
| Certificates | `certificates` collection with immutable issue number, verification code, status, and recipient snapshot | Secure PDF issuance and verification should use callable Functions; Functions deployment requires the Blaze plan. [1] [2] |
| CSV/Excel/PDF reports | Admin-scoped Firestore queries and report templates; export access must be checked by role and course/batch scope | CSV may begin client-side. Large reports, scheduled reports, and secure file generation should use Functions/Storage. |
| In-app notifications | `notifications/{id}` plus recipient, course, batch, and read-state fields | Firestore-only for in-app notifications; no Functions needed initially. |
| Browser push notifications | Firebase Cloud Messaging installation IDs, VAPID key, service worker, consent UX, and an admin sending workflow | FCM requires HTTPS, VAPID credentials, and a service worker. [4] Sending individualized notifications safely should use trusted server code. |
| Audit logs | Append-only `auditLogs` entries written by trusted operations | Requires callable Functions or Firestore triggers to avoid client-side tampering; therefore needs Blaze for deployment. [1] |
| Analytics and growth charts | Vercel/Firebase analytics plus Firestore aggregate metrics | Basic traffic analytics can be configured independently. Trusted aggregates and scheduled rollups are best implemented with Functions. |
| PWA and offline | Web manifest, service worker, cache policy, offline indicator, and opt-in Firestore persistent cache | No Functions required. The UI must warn users that browser persistence retains cached data on the device. [3] |

Firebase documents state that Cloud Functions can be emulated on any Firebase project but require the **Blaze pricing plan** for deployment. [1] The current project therefore correctly keeps trusted quiz scoring, administrator-created password reset links, certificate generation, protected audit logs, and server-initiated notifications deferred until billing is intentionally enabled. The Blaze plan supplies a no-cost usage quota but links a billing account; budget alerts and spend caps should be configured before deployment. [2]

## Recommended implementation order

### Phase A — Release quality and existing-data improvements

First, re-enable genuine responsive mobile/tablet behavior, restore the Admin Attendance navigation item, and complete the latest portal UX regression review. Next, add the unified progress/grade data model and its Admin gradebook plus Student results view. These steps leverage current Firestore data and improve the features students and administrators already use.

| Work item | Deliverable | Cloud Functions required |
|---|---|---|
| Responsive correction | Mobile/tablet layout enabled, tested on portal routes | No |
| Attendance navigation | Visible Admin Attendance item with existing course/batch filters | No |
| Gradebook and progress | Grade categories, items, records, term summary, Student results dashboard | No for initial version |
| In-app notification center | Admin compose, recipient scope, Student unread/read inbox | No for in-app delivery |
| Theme and localization foundation | Dark/light preference and Burmese/English translation framework | No |

### Phase B — Documents, reports, and operational visibility

The next phase should add certificate records, a downloadable certificate view, CSV exports, report templates, basic chart widgets, and traffic analytics configuration. Certificate records can be prepared without server deployment, but final trusted PDF issuance should wait for the server-side phase.

| Work item | Deliverable | Cloud Functions required |
|---|---|---|
| Certificate registry | Issue/revoke states, unique verification codes, Student certificate list | No for registry; yes for trusted final PDF issuance |
| Export center | Batch-scoped CSV exports, printable result/attendance reports | No for basic CSV; recommended for heavy PDF/Excel generation |
| Charts and monitoring | Enrollment, attendance, quiz, assignment, and grade charts | No for direct dashboards; recommended for durable aggregates |
| Traffic analytics | Vercel or Firebase/Google Analytics dashboard integration | Provider configuration required |
| PWA and offline | Installable portal, safe cache policy, offline notice, opt-in Firestore persistence | No |

### Phase C — Trusted automation and push delivery

After the project owner elects to use Blaze, deploy the existing callable Functions and add the new protected server operations. This is the appropriate time for trusted quiz scoring, secure certificate PDF generation, tamper-resistant audit logs, scheduled rollups, and targeted FCM notifications.

| Work item | Deliverable | Prerequisite |
|---|---|---|
| Existing callable Functions | Trusted quiz scoring, admin password-reset link, admin student account creation | Blaze plan and Functions deployment |
| Certificate PDF signing | Server-generated certificate output and verification endpoint | Blaze plan, storage policy, certificate template |
| Audit logs | Trusted create/update/delete event trail | Blaze plan |
| Browser push delivery | FCM send functions, device registration, targeted notices | Blaze plan, VAPID key, service worker, consent UX |
| Scheduled summaries | Attendance/grade reminders and data-growth snapshots | Blaze plan and scheduled functions |

## Delivery decision required

The platform can support the full requested feature set, but it should not be added as one unprioritized change. The recommended starting scope is **Phase A**: responsive correction, Attendance navigation, gradebook/progress, in-app notifications, and theme/localization foundation. This phase produces immediately visible value without changing the current billing decision.

After Phase A, the next decision is whether to proceed with document/report features under Phase B or to enable Blaze and unlock the trusted automation under Phase C.

## References

[1]: https://firebase.google.com/docs/functions/get-started "Firebase — Get started with Cloud Functions"
[2]: https://firebase.google.com/docs/projects/billing/firebase-pricing-plans "Firebase — Pricing plans"
[3]: https://firebase.google.com/docs/firestore/manage-data/enable-offline "Firebase — Access data offline"
[4]: https://firebase.google.com/docs/cloud-messaging/web/get-started "Firebase — Get started with Cloud Messaging in Web apps"
