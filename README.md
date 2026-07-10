# EventNetwork AI

SvelteKit starter with:

- Supabase Google login
- Tailwind CSS
- shadcn-style Svelte UI primitives
- Lucide icons
- Fireworks AI SDK route for text generation

## Environment

Copy `.env.example` to `.env` and fill in:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` if you later add server-side admin features
- `FIREWORKS_API_KEY`
- `FIREWORKS_MODEL` if you want a different model

## Run

```bash
npm install
npm run dev
```

## What I need from you

- A Supabase project URL and anon key
- Google OAuth enabled in Supabase
- A Fireworks API key
- The Fireworks model you want to use, if not the default
