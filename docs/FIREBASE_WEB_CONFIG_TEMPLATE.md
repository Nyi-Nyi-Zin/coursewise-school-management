# Firebase Web Configuration Template

Use the Firebase Web App values from **Firebase Console → Project settings → Your apps → SDK setup and configuration**. Set the variables in both Vercel projects rather than committing local environment files. The Student Website and Admin Website share one Firebase project and must receive the same values.

| Variable | Used by | Source in Firebase Console |
|---|---|---|
| `NEXT_PUBLIC_ENABLE_FIREBASE` | Enables Firebase instead of demo-safe mode | Literal value `true` after all values below are supplied |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Browser Firebase initialization | Web App configuration |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Authentication client | Web App configuration |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firestore client | Web App configuration |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase client configuration | Web App configuration |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase client configuration | Web App configuration |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app identification | Web App configuration |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Browser Cloudinary upload destination | Cloudinary product environment |
| `CLOUDINARY_API_KEY` | Server-side Cloudinary API key used to sign uploads | Cloudinary API access |
| `CLOUDINARY_API_SECRET` | Server-side Cloudinary API secret; never expose to the browser | Cloudinary API access |

The values are consumed by `student-website/src/lib/firebase.ts` and `admin-dashboard/src/lib/firebase.ts`. The `NEXT_PUBLIC_` prefix is required for browser-side configuration in Next.js. Do **not** place an Admin SDK private key, service-account JSON, or other privileged credential in a `NEXT_PUBLIC_*` variable. Add the complete service-account JSON separately as the server-only `FIREBASE_SERVICE_ACCOUNT_JSON` in both Vercel projects; authenticated Next.js backend routes use it for trusted quiz scoring and administrator account operations.[1]

## Uploads

Avatars, banners, and lesson thumbnails (UI/product images) use Cloudinary. Assignment submissions and lesson documents/large media use Firebase Storage with the rules from `firebase/storage.rules`. Do not create or expose an unsigned upload preset for those uploads; add the Cloudinary cloud name to both websites and add `CLOUDINARY_API_KEY` plus `CLOUDINARY_API_SECRET` as server-only variables to both Vercel projects. The backend signs short-lived uploads and accepts only the fixed `coursewise` folders for each upload type.

## References

[1]: https://firebase.google.com/docs/web/learn-more "Firebase Web: Learn more about configuration"
