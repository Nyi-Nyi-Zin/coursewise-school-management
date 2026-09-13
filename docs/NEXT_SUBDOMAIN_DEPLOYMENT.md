# Archived Firebase Hosting Website Notes

Teza Tech Lab no longer uses Firebase Hosting for the Student Website or Admin Website. The active web deployment path is **Vercel**, using two independent Next.js projects:

| Website | Repository root directory | Recommended production subdomain |
|---|---|---|
| Student Website | `student-website/` | `student.<your-domain>` |
| Admin Website | `admin-dashboard/` | `admin.<your-domain>` |

Follow [Vercel Deployment](./VERCEL_DEPLOYMENT.md) for the complete project setup, Firebase environment variables, and custom-domain mapping procedure.

The repository `firebase.json` remains active only for Firebase Firestore Rules and indexes deployment. Files and images use Cloudinary. The legacy `functions/` source is retained as migration history and is not part of production deployment. Website and backend Route Handler deployments run on Vercel.
