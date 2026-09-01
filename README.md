# Done

A minimalist completed-task journal built with Next.js and MongoDB.

## Local development

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`
3. Add your MongoDB connection string to `MONGODB_URI`
4. Start the app: `npm run dev`

## Vercel

Import the repository into Vercel and add `MONGODB_URI` to the project environment variables. In MongoDB Atlas, allow network access from `0.0.0.0/0` because Vercel serverless outbound IP addresses can change. Use a dedicated database user with access limited to the application database.
