# FleetKeys Backend

## Setup

1. Copy `.env.example` to `.env`
2. Add real Supabase values:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
3. Install dependencies: `npm install`
4. Run server: `npm run dev`

## API

### `POST /api/auth/login`
Body:
```json
{
  "username": "user@email.com",
  "password": "secret"
}
```

### `POST /api/auth/logout`
Body:
```json
{
  "access_token": "jwt-token"
}
```

Note: `username` currently maps to Supabase email auth.
