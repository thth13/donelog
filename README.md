# Done

A minimalist completed-task journal built with Next.js and MongoDB.

## Local development

1. Install dependencies: `npm install`
2. Create `.env.local` and add your MongoDB connection string as `MONGODB_URI`
3. Run `npm run auth:init` once against the database used by the app
4. Save the secret from `.donelog-owner-key.json` in a password manager
5. Start the app: `npm run dev`

## Accounts

Guests see a one-section landing page with a button that opens a secret-key sign-in modal. Its Register link opens `/register`: enter a username, then save the secret key shown in the next step. Save the key, then enter the journal. Returning users sign in with the key alone. Names are case-insensitive and unique; `thth13` is reserved for the original owner.

`npm run auth:init` creates `thth13` before public registration is enabled and assigns every task without an owner, including archived and mock entries, to it. The script is safe to rerun: existing keys, owners, and task dates are preserved. It writes the first owner's key to `.donelog-owner-key.json` with owner-only filesystem permissions. This file is ignored by Git; keep a private backup. Run this command against the production database before deploying this change there.

Random 256-bit secret keys and separate 30-day session tokens are stored as SHA-256 hashes for authentication. New sessions also retain an AES-256-GCM encrypted copy of the secret key, encrypted using a key derived from the raw HttpOnly session cookie. This supports Copy secret key in the account menu without plaintext secret storage in the database. Sessions created before this feature require one sign-out/sign-in to enable copying. Sessions use an HttpOnly, SameSite=Lax cookie (Secure in production) and are revoked on sign-out. All task endpoints require a session and filter by its owner. Mutation requests also require a matching Origin; clients send `X-Donelog-User` to prevent stale tabs from saving another account's queue.

Pending browser entries are scoped to the account ID and survive sign-out. Only `thth13` imports the old unscoped browser queue. Signing in as another user never transfers those entries. Email registration, key recovery, and JWT are not implemented yet.

## Vercel

Import the repository into Vercel and add `MONGODB_URI` to the project environment variables. In MongoDB Atlas, allow network access from `0.0.0.0/0` because Vercel serverless outbound IP addresses can change. Use a dedicated database user with access limited to the application database.
