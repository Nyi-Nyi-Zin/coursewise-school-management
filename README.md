# Teza Tech Lab Learning Platform

Teza Tech Lab is a course-based school management and learning platform composed of two independent web applications: an administrator dashboard and a student portal. Both applications share one Firebase project, a common data model, role-aware access controls, and trusted server-side workflows.

The platform supports the path from course and batch setup through enrollment, lesson delivery, assignments, assessments, progress tracking, and certificate issuance.

## Applications

| Application | Directory | Local command | Purpose |
|---|---|---|---|
| Admin Dashboard | `admin-dashboard/` | `pnpm admin:dev` | Manage academic content, students, assessments, submissions, certificates, and media |
| Student Website | `student-website/` | `pnpm student:web:dev` | Access learning content, submit work, take assessments, track results, and receive certificates |

Both applications use the Next.js App Router and are designed for separate Vercel projects, normally at `admin.<domain>` and `student.<domain>`.

## Technology Stack

- Next.js 16, React 19, and TypeScript
- Tailwind CSS and reusable UI primitives
- Firebase Authentication and Cloud Firestore
- Firebase Admin SDK in protected Next.js Route Handlers
- TanStack Query for client-side server state
- Cloudinary for signed media and assignment-file uploads
- Vitest, Testing Library, Playwright, and Firebase Emulator tests
- Vercel for independent Admin and Student deployments

## Implemented Features

### Authentication and Access Control

- Separate administrator and student login experiences
- Student self-registration with Firebase Email/Password Authentication
- Student email-verification enforcement
- Forgot-password and reset-password flows
- Administrator-assisted student password reset and password assignment
- Role gates for administrator and student areas
- Student account activation and deactivation
- Firebase ID-token authentication for protected backend requests
- Revoked-token checks for privileged operations
- Persistent sessions and protected navigation

### Courses, Batches, and Enrollments

- Unlimited course and batch creation and management
- Course-to-batch relationships and activation controls
- Student profile and Firebase account creation
- Student assignment to a course and batch
- Enrollment movement and removal
- Course/batch filtering across administrator modules
- An “All course–batch pairs” view for quizzes, attendance, and quiz attempts
- Student isolation by authenticated user, active enrollment, course, and batch

### Administrator Overview

- Summary cards for students, lessons, quizzes, and announcements
- Course and batch statistics
- Recent activity and upcoming academic work
- Student-performance and quiz-score summaries
- Responsive administrator workspace

### Student Management

- Searchable student directory
- Identity, email, student code, profile photo, enrollment, and account-status management
- Edit, activate, deactivate, verify, and delete workflows
- Detailed per-student results and progress view
- Lesson, chapter-quiz, final-exam, and certificate status
- Individual student password actions

### Announcements

- Create, edit, publish, unpublish, order, and delete announcements
- Optional Cloudinary banner images
- Course/batch-aware records
- Student dashboard announcement carousel
- Published-content filtering

### Lessons and Progress

- Create, edit, publish, unpublish, order, and delete lessons
- Course and batch assignment
- Lesson thumbnails and video, Telegram, PDF, and external links
- Student lesson catalog and detail pages
- Per-student lesson completion tracking
- Progress-aware final-exam eligibility

### Assignments

- Create, edit, publish, unpublish, and delete assignments
- Course/batch scope, due dates, resources, and submission instructions
- Student search, filtering, sorting, and progress summary
- Text, project-link, and file submissions
- Submission updates before review
- Signed Cloudinary uploads for documents and images up to the configured limit
- Authenticated, short-lived assignment-file downloads
- Administrator submission review, score, and written feedback
- Student pending, reviewed, needs-submission, and upcoming views

### Quizzes and Final Exams

- Chapter quizzes and final exams
- Multiple-choice and multiple-select questions
- Separate public questions and private answer keys
- Question creation, editing, ordering, and deletion
- Publish state and opening/closing schedules
- Configurable duration, marks, pass percentage, question draw count, retakes, and cooldown
- Randomized final-exam questions and option order
- Authenticated server-side scoring
- Idempotent assessment sessions and attempt counters
- Chapter-answer checking with feedback and explanations
- Final-exam answer concealment
- Timer-based automatic submission
- Best/latest scores, attempt counts, and remaining attempts
- Chapter-completion prerequisites for final exams
- Integrity warnings for tab changes, focus loss, print, copy, context menu, and common screenshot shortcuts
- Automatic submission after the integrity-warning threshold
- Best-effort screenshot clipboard clearing where the browser permits it
- Administrator attempt review by one course/batch or all pairs

> A browser cannot completely prevent operating-system screenshots, mobile hardware-button screenshots, screen recording, or photographs from another device. The platform provides browser-level concealment, event recording, and automatic enforcement.

### Attendance

- Attendance by student, course, batch, and date
- Present, Absent, Late, and Excused statuses
- Optional notes, editing, and course/batch filtering
- Private student attendance history and summary
- Firestore isolation between students

The attendance route and module are implemented. Its main administrator navigation entry is currently hidden in the latest UI configuration and can be restored when needed.

### Certificates

- Automatic, duplicate-safe issuance after a qualifying final-exam pass
- Administrator certificate registry and manual issuance
- Unique serial IDs and verification codes
- Classic and modern templates
- Student certificate gallery and printable presentation
- Student, course, batch, assessment, and result snapshots

### Media and Uploads

- Server-signed Cloudinary upload endpoints
- Upload-folder allow-lists
- Profile, announcement, and lesson images
- Authenticated assignment-file delivery
- Administrator media-library route and backend
- No Firebase Storage dependency

### Student Experience and PWA

- Mobile-first portal with desktop and bottom navigation
- Dashboard identity card, announcements, quick links, and upcoming work
- Lessons, assignments, quizzes, attendance, certificates, and profile pages
- Enrollment-aware content
- Search, filters, sorting, pagination, and complete UI states
- Profile editing and photo upload
- Web-app manifests and service-worker registration
- Responsive phone, tablet, and desktop layouts

### Security and Data Integrity

- Firestore Rules for role, ownership, enrollment, course, and batch boundaries
- Private quiz answer keys and server-trusted grading
- Server-only writes for scores, summaries, counters, and certificates
- No-store controls for private API responses
- Frame denial, content-type, referrer, HSTS, and Permissions Policy headers
- Server-only Firebase Admin and Cloudinary secrets
- File type, size, folder, and download-access validation
- Secret-hygiene and dependency auditing

### Testing and Quality

- Business-logic and data-contract unit tests
- React component and integration tests
- Authentication and recovery tests
- Course/batch isolation tests
- Assessment scoring, timeout, retake, and integrity tests
- Assignment and certificate tests
- Firestore Rules emulator tests
- Playwright end-to-end checks and Lighthouse tooling
- TypeScript, ESLint, build, audit, and production quality-gate commands

## Architecture

```text
Administrator Browser                    Student Browser
        |                                      |
        v                                      v
admin-dashboard/                         student-website/
        |                                      |
        +---------- Firebase Auth -------------+
        +---------- Cloud Firestore -----------+
        +---------- Cloudinary ----------------+
        |                                      |
        v                                      v
Authenticated Next.js Route Handlers
        |
        +-- Firebase Admin SDK
        +-- Assessment sessions and trusted grading
        +-- Account administration
        +-- Certificate issuance
        +-- Signed uploads and protected downloads
```

The frontends share data contracts but are independently built and deployed. Direct Firestore access is constrained by Security Rules; sensitive operations run through authenticated server routes.

## Repository Structure

```text
.
├── admin-dashboard/       Administrator Next.js application
├── student-website/       Student Next.js application
├── firebase/              Firestore Rules, indexes, and Rules tests
├── shared/                Shared validation and business logic
├── e2e/                   Playwright end-to-end tests
├── scripts/               Auditing, migration, and validation scripts
├── docs/                  Deployment, Firebase, and security documentation
├── functions/             Legacy/reference Firebase Functions code
└── package.json           Workspace commands and quality gate
```

The two Next.js websites are the active products. The former root runtime and Flutter student application are not part of the current product path.

## Local Development

Requirements: Node.js 20+, pnpm 10, a Firebase project for live data, and a Cloudinary environment for uploads.

```bash
pnpm install
pnpm admin:dev
pnpm student:web:dev
```

Run the Admin and Student commands in separate terminals when testing both roles.

## Environment Variables

Configure these separately in `admin-dashboard/.env.local` and `student-website/.env.local`, then add the corresponding values to both Vercel projects.

```env
NEXT_PUBLIC_ENABLE_FIREBASE=true
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_SERVICE_ACCOUNT_JSON=

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Never expose `FIREBASE_SERVICE_ACCOUNT_JSON` or `CLOUDINARY_API_SECRET` through a `NEXT_PUBLIC_` variable, and never commit real environment files. See [`docs/FIREBASE_WEB_CONFIG_TEMPLATE.md`](docs/FIREBASE_WEB_CONFIG_TEMPLATE.md) and [`docs/FIREBASE_HANDOFF.md`](docs/FIREBASE_HANDOFF.md).

## Commands

| Command | Purpose |
|---|---|
| `pnpm test` | Run repository, Student, and Admin Vitest suites |
| `pnpm check` | Run workspace TypeScript checks |
| `pnpm admin:lint` | Lint the Admin Dashboard |
| `pnpm admin:build` | Build the Admin Dashboard |
| `pnpm student:web:build` | Build the Student Website |
| `pnpm audit:rules` | Test Firestore Rules in the emulator |
| `pnpm test:e2e` | Run Playwright tests |
| `pnpm audit:deps` | Audit high-severity dependency issues |
| `pnpm audit:secrets` | Check repository secret hygiene |
| `pnpm quality:gate` | Run the complete production validation pipeline |

## Deployment

Create two Vercel projects from the same repository:

| Project | Root directory | Suggested domain |
|---|---|---|
| Teza Tech Lab Admin | `admin-dashboard` | `admin.<your-domain>` |
| Teza Tech Lab Student | `student-website` | `student.<your-domain>` |

Before production use:

1. Enable Firebase Email/Password Authentication.
2. Add deployed domains to Firebase authorized domains.
3. Configure Firebase browser values, Firebase Admin credentials, and Cloudinary credentials.
4. Deploy `firebase/firestore.rules` and `firebase/firestore.indexes.json`.
5. Bootstrap the first administrator account and role.
6. Verify registration, email verification, enrollment, lessons, assignments, assessments, certificates, and password recovery with staging data.

See [`docs/VERCEL_DEPLOYMENT.md`](docs/VERCEL_DEPLOYMENT.md), [`docs/NEXT_SUBDOMAIN_DEPLOYMENT.md`](docs/NEXT_SUBDOMAIN_DEPLOYMENT.md), and [`docs/FIRST_ADMIN_BOOTSTRAP.md`](docs/FIRST_ADMIN_BOOTSTRAP.md).

## Potential Next Features

These features fit the current architecture but are not complete unless stated otherwise.

### High Priority

- Restore Attendance and Settings in the main administrator navigation
- Unified gradebook for assignments, quizzes, exams, weighted categories, and term results
- Report cards and consolidated student transcripts
- CSV, Excel, and PDF exports
- Trusted audit logs for accounts, enrollments, content, grades, and certificates
- Scheduled Firestore backups, point-in-time recovery, deletion protection, uptime checks, and alerts
- Server-side pagination and search for large collections
- Complete staging coverage for end-to-end CRUD and student lifecycle workflows

### Communication

- Persisted in-app notifications with read/unread state
- Course, batch, and individual messaging
- Firebase Cloud Messaging browser push notifications
- Transactional email for enrollment, deadlines, feedback, exams, and certificates
- Automated reminders for incomplete or overdue work

### Academic Management

- Weighted grading policies and term configuration
- Essay and short-answer quiz questions with manual grading
- Reusable question pools, tags, difficulty, and imports
- Assignment rubrics, late rules, and deadline extensions
- Attendance percentages and absence alerts
- Subjects, instructors, classrooms, semesters, and schedules
- Learning paths, prerequisites, and drip release
- Public certificate verification, revocation, and signed PDFs

### Analytics and Reports

- Enrollment, retention, attendance, completion, and pass-rate dashboards
- Course and batch comparisons
- Question-level assessment analytics
- Assignment turnaround and overdue-work reports
- Student risk indicators and intervention notes
- Privacy-conscious traffic analytics
- Scheduled management reports

### User Experience

- Burmese and English localization
- Dark and light themes
- Accessibility preferences
- Academic calendar views
- Global search
- Bulk student import and bulk actions
- Improved PWA install/update experience
- Carefully scoped offline reading and queued writes with a sensitive-data cache policy

### Integrations and Operations

- Google Calendar and video-conferencing integrations
- Transactional email providers
- Payments and subscriptions for commercial courses
- Google or Microsoft sign-in
- Webhooks and APIs for CRM, accounting, and reporting
- Background jobs for reminders, aggregates, and cleanup
- API rate limiting and abuse protection
- Centralized logs, traces, error monitoring, and alerts
- Automated migrations and data-integrity checks
- Visual-regression, accessibility, load, and security testing
- Optional multi-school tenancy

## Recommended Roadmap

1. **Operational readiness:** restore hidden navigation, add backups, monitoring, audit logs, pagination, and complete staging verification.
2. **Academic management:** add the gradebook, grading policies, report cards, exports, rubrics, and attendance analytics.
3. **Communication:** add in-app notifications, push, email, reminders, calendar features, and localization.
4. **Scale and integrations:** add aggregate analytics, background workflows, external integrations, observability, and optional multi-tenancy.

## Documentation

- [`docs/FIREBASE_HANDOFF.md`](docs/FIREBASE_HANDOFF.md) — Firebase activation and production handoff
- [`docs/FIREBASE_WEB_CONFIG_TEMPLATE.md`](docs/FIREBASE_WEB_CONFIG_TEMPLATE.md) — environment variables
- [`docs/COURSE_BATCH_DATA_MODEL.md`](docs/COURSE_BATCH_DATA_MODEL.md) — data boundaries
- [`docs/VERCEL_DEPLOYMENT.md`](docs/VERCEL_DEPLOYMENT.md) — deployment guide
- [`docs/NEXT_SUBDOMAIN_DEPLOYMENT.md`](docs/NEXT_SUBDOMAIN_DEPLOYMENT.md) — subdomain setup
- [`docs/FIRST_ADMIN_BOOTSTRAP.md`](docs/FIRST_ADMIN_BOOTSTRAP.md) — first administrator setup
- [`docs/PRODUCTION_CODEBASE_REVIEW_2026-09-12.md`](docs/PRODUCTION_CODEBASE_REVIEW_2026-09-12.md) — production review

## License

This repository is licensed under the MIT License.
