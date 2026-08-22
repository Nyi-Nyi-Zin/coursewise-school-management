# Firebase Web Configuration Template

Use the Firebase Web App values from **Firebase Console → Project settings → Your apps → SDK setup and configuration**. Set the variables in both Vercel projects rather than committing local environment files. The Student Website and Admin Website share one Firebase project and must receive the same values.

| Variable | Used by | Source in Firebase Console |
|---|---|---|
| `NEXT_PUBLIC_ENABLE_FIREBASE` | Enables Firebase instead of demo-safe mode | Literal value `true` after all values below are supplied |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Browser Firebase initialization | Web App configuration |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Authentication client | Web App configuration |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firestore and Functions client | Web App configuration |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase client configuration | Web App configuration |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase client configuration | Web App configuration |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app identification | Web App configuration |

The values are consumed by `student-website/src/lib/firebase.ts` and `admin-dashboard/src/lib/firebase.ts`. The `NEXT_PUBLIC_` prefix is required for browser-side configuration in Next.js. Do **not** place an Admin SDK private key, service-account JSON, or other privileged credential in a `NEXT_PUBLIC_*` variable. Trusted quiz scoring and administrator reset-link generation belong in the deployed callable Functions.[1]

## References

[1]: https://firebase.google.com/docs/web/learn-more "Firebase Web: Learn more about configuration"
