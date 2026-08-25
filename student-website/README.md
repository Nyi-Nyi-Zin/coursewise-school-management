This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Production registration on Vercel

The `POST /api/register-student` route runs on Vercel and creates Firebase Authentication and Firestore records without Firebase Cloud Functions. Configure these environment variables in Vercel for Production and Preview deployments:

- `FIREBASE_SERVICE_ACCOUNT_JSON`: the complete service-account JSON for Firebase project `student-management-syste-e8dbb`.
- `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile secret key; keep this server-only.
- `SIGNUP_RATE_LIMIT_SALT`: a long, random secret used to hash visitor IP addresses for the registration rate limit.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: Cloudflare Turnstile site key for the registration form.

Also keep the existing `NEXT_PUBLIC_FIREBASE_*` variables and `NEXT_PUBLIC_ENABLE_FIREBASE=true`. Add the deployed Vercel hostname and localhost to the Turnstile widget's allowed hostnames.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
