# Coursewise Replatforming Architecture

The project now contains a dedicated **Next.js administrator dashboard** and a dedicated **Next.js student website**. The earlier generic web client remains in the repository as an implementation reference; the application folders below are the forward architecture.

| Path | Stack | Purpose |
|---|---|---|
| `admin-dashboard/` | Next.js 16.3.1, TypeScript, Tailwind, Firebase client and Admin SDK server boundaries | Administration workspace plus authenticated backend routes for account and password-reset administration |
| `student-website/` | Next.js 16.3.1, TypeScript, Tailwind, Firebase client and Admin SDK server boundaries | Mobile-first portal plus authenticated backend routes for registration and trusted quiz workflows |
| `firebase/` | Firebase CLI configuration | Firestore role-based security rules and required query indexes |

The Next.js dashboard is build-validated and supports creating, editing, and deleting records in offline-ready local state before Firebase settings are connected.

For the account-specific final step, follow `docs/FIREBASE_HANDOFF.md`. It contains the exact Firebase setup path, the security rules, and the cross-application data contract.
