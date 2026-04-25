# FleetKeys Backend

## Setup

1. Copy `.env.example` to `.env`
2. Add Supabase values:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
3. Install dependencies: `npm install`
4. Run server: `npm start`

## Supabase foundation

Run SQL files in order from `docs/supabase/`:
1. `001_foundation.sql`
2. `002_profile_query.sql`
3. `003_add_position_to_company_users.sql`
4. `004_keys_and_events.sql`

## API

### `POST /api/auth/login`
Body:
```json
{
  "username": "user@email.com",
  "password": "secret",
  "client_type": "web_admin"
}
```

`client_type` values:
- `web_admin` -> only users with role `admin`
- `mobile_user` -> only users with role `user`

### `POST /api/auth/logout`
Body:
```json
{
  "access_token": "jwt-token"
}
```

## Protected routes and middleware

Routes under `/api/protected/*` require Bearer token + tenant context.

### `GET /api/protected/me`
Returns auth user + tenant context.

### `GET /api/protected/admin/me`
Requires role `admin`.

### `GET /api/protected/user/me`
Requires role `user`.

## Admin user management (DAO/Service/Controller/Route)

### `POST /api/admin/users`
Requires:
- Bearer token of admin user
- admin role in tenant context

Body:
```json
{
  "username": "new.user@email.com",
  "password": "strongpassword",
  "full_name": "New User",
  "position": "Receptionist"
}
```

Behavior:
- Creates Supabase auth user with `service_role`
- Inserts user into `company_users` with role `user`
- Enforces same `company_id` as current admin
- Rolls back auth user if DB insert fails

## Keys management

### `GET /api/keys`
List keys for tenant company. Supports optional `?status=available|checked_out|lost|maintenance`.

### `GET /api/keys/:keyId`
Get key by id in tenant company.

### `POST /api/keys` (admin)
Create new key.

Body:
```json
{
  "key_code": "RC-A17",
  "status": "available",
  "note": "Optional note"
}
```

### `PATCH /api/keys/:keyId` (admin)
Update key fields (`key_code`, `status`, `note`).

### `DELETE /api/keys/:keyId` (admin)
Delete key.

### `GET /api/keys/:keyId/events`
List taken/returned events for a key.

### `POST /api/keys/:keyId/events`
Insert `taken`/`returned` event and update key status accordingly.

### `POST /api/keys/scan`
QR scan flow endpoint (calls SQL function `scan_key_event`).

Body:
```json
{
  "qr_token": "fk_...",
  "action": "taken",
  "message": "Optional scan message"
}
```
