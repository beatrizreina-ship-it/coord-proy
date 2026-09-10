<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/8d0dae7a-0082-4681-bcb5-f92b9c2f8615

## Setup Supabase

This app uses Supabase for database and realtime syncing.

1. Create a Supabase project at [supabase.com](https://supabase.com/).
2. Run the SQL script found in `supabase_schema.sql` in your Supabase project's SQL Editor to create the necessary tables.
3. Open the `.env` file and replace `YOUR_ANON_KEY_HERE` with your actual Supabase `anon` public key (found in Project Settings -> API).

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
