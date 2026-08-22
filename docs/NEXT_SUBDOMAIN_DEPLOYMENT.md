# Archived Firebase Hosting Website Notes

Teza Tech Lab no longer uses Firebase Hosting for the Student Website or Admin Website. The active web deployment path is **Vercel**, using two independent Next.js projects:

| Website | Repository root directory | Recommended production subdomain |
|---|---|---|
| Student Website | `student-website/` | `student.<your-domain>` |
| Admin Website | `admin-dashboard/` | `admin.<your-domain>` |

Follow [Vercel Deployment](./VERCEL_DEPLOYMENT.md) for the complete project setup, Firebase environment variables, and custom-domain mapping procedure.

The repository `firebase.json`, `firebase/firestore.rules`, and `functions/` remain active **only** for Firebase Firestore Rules, indexes, and Cloud Functions deployment. They do not configure website hosting.
