# First Administrator Bootstrap

The deployed Admin Website only grants access to Firebase users whose matching Firestore profile has `role: "admin"`. This prevents an unauthenticated visitor—or a student—from promoting themselves through the browser.

## One-time setup

1. On the Student Website, register a dedicated administrator email address through the normal email/password registration form. This safely creates the Firebase Authentication user and a matching `users/{uid}` profile with `role: "student"`.
2. In Firebase Console, open **Authentication → Users**, find that email address, and copy its UID.
3. Open **Firestore Database → Data → users → {uid}**. Change only the `role` field from `student` to `admin`. Keep the user document ID equal to the Firebase Authentication UID.
4. Sign out of the Student Website, then open `https://teza-tech-lab-admin.vercel.app/login` and sign in with the dedicated administrator account.

> Do not create an administrator by changing Firestore Security Rules or by exposing an in-browser “make admin” button. The deployed rules intentionally allow a new user to create only their own `student` profile; role promotion must remain a trusted Firebase Console or Admin SDK operation.

## Trusted command-line alternative

The repository includes `functions/scripts/bootstrap-first-admin.mjs` for a controlled, auditable first-admin promotion. It requires an existing Firebase Authentication account, an explicit `--confirm` switch, and a service-account JSON belonging to `student-management-syste-e8dbb`. It does not create an account and does not modify the deployed Firestore Rules.

```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{"project_id":"student-management-syste-e8dbb",...}' \
  pnpm --dir functions run bootstrap:first-admin -- admin@example.com --confirm
```

Keep the service-account JSON only in the terminal session that runs this command. Do not place it in a Vercel variable, a browser-facing `NEXT_PUBLIC_*` variable, or a committed file. Run `pnpm --dir functions run bootstrap:first-admin -- --help` to review the command without making any change.

## Ongoing administration

To grant another staff member administrator access, repeat steps 1–3 for their own dedicated account. To remove access, change their `role` to `student` or disable/delete the Firebase Authentication user. Never share a single administrator password.
