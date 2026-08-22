# Teza Tech Lab Next.js Subdomain Deployment

The active Teza Tech Lab delivery now contains **two independent web applications**. The original Flutter app remains unchanged in `student-app/` as an archived repository reference. The Next.js Student Website lives in `student-website/`, and the Next.js Admin Website lives in `admin-dashboard/`.

| Application | Repository folder | Production subdomain | Build command | Output folder |
|---|---|---|---|---|
| Student Website | `student-website/` | `student.<your-domain>` | `pnpm student:web:build` | `student-website/out` |
| Admin Website | `admin-dashboard/` | `admin.<your-domain>` | `pnpm admin:build` | `admin-dashboard/out` |

Both websites are static Next.js exports, so they can be deployed independently to Firebase Hosting, Vercel, Netlify, or an equivalent static host. They use the same Firebase project but do not share a runtime or a deployment directory.

> The existing domain should be configured only after each site is live on its temporary hosting address. Point the `student` and `admin` DNS records to their respective hosting deployments. The archived Flutter folder has no production DNS role.

## Firebase configuration

Copy `.env.example` to the environment configuration in each website deployment. Set `NEXT_PUBLIC_ENABLE_FIREBASE=true` only with the complete Firebase web configuration available. Without it, the Student Website stays in safe demo mode and the Admin Website retains its offline-ready workspace.

Email/Password must be enabled in Firebase Authentication. Assign Firebase custom claim `role: "admin"` for administrator identities and `role: "student"` for student identities. The Student Website blocks admin accounts from the student portal when Firebase mode is active.

## Firebase Hosting targets

The repository `firebase.json` contains separate `admin` and `student` Hosting targets. After selecting the Firebase project, map targets and deploy each site independently:

```bash
firebase target:apply hosting admin <admin-site-id>
firebase target:apply hosting student <student-site-id>
pnpm admin:build
firebase deploy --only hosting:admin
pnpm student:web:build
firebase deploy --only hosting:student
```

The first command creates the host mapping and requires a Firebase account with access to the project. The existing shared domain can then attach `admin.<your-domain>` to the admin Hosting site and `student.<your-domain>` to the student Hosting site.
