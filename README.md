FleetKeys — Key Management System
A multi-tenant system for managing physical keys (rent-a-car and hotel/motel) with a backend API, a web admin panel, and a mobile app for QR-based scanning/actions.
**DEPLOYED APP: https://monkfish-app-6gvye.ondigitalocean.app/
BACKEND: https://coral-app-zk7m2.ondigitalocean.app**

**FleetKeys 1.0.0**


Status / Version
Current stable version: 1.0.0 (Git tag: 1.0.0)
Current milestone: Milestone 3
Table of contents
What is FleetKeys
Key features
Architecture & modules
Tech stack
Repository structure
Running locally
Backend (API)
Web (admin)
Mobile (Flutter)
API overview
Tests
Database / Supabase
Milestone 3 (delivered)
Contributing
License
What is FleetKeys
FleetKeys solves a common real-world problem: tracking and controlling physical keys (e.g. vehicle keys, room keys):

each tenant (company) has its own users and keys (data isolation),
admin users manage keys and employees,
mobile users scan a QR and perform actions (e.g. take/return a key),
the web admin panel provides an overview and activity/history.
Key features
Multi-tenant + role-based security
Tenant context is loaded from company_users (Supabase) and applied to protected routes.
Role guard (admin / user) restricts sensitive operations.
Key management
Key CRUD (admin-only for create/update/delete).
Statuses: available, checked_out, lost, maintenance.
Per-key event history (taken / returned).
QR + deep link flow
Deep link format: fleetkeys://key-scan?...
Scan endpoint: POST /api/keys/scan (calls Supabase RPC scan_key_event).
Web admin panel
Admin login.
Dashboard (summary + recent activity).
Employee management (CRUD).
Keys management + QR display + history.
Profile (name/position) and password change.
Architecture & modules
Backend: Node.js + Express API, Supabase for auth + database.
Web: static HTML/CSS/JS admin panel (jQuery + SPApp router).
Mobile: Flutter app (QR scanner + deep links + API client).
E2E tests: Playwright (repo-level tests/).
ER diagram (if up-to-date in the repo):

ER Diagram

Tech stack
Backend: Node.js, Express, Supabase JS SDK
Database/Auth: Supabase (Postgres + Auth + RPC)
Web: HTML/CSS/JS, jQuery, SPApp
Mobile: Flutter/Dart (e.g. mobile_scanner, app_links, http, shared_preferences)
Tests: Playwright
Repository structure

Plain Text

.
├── backend/               # Express API + Supabase integration
├── web/                   # Web admin panel (static)
├── mobile/                # Flutter app
├── tests/                 # Playwright tests (E2E)
├── ER-Diagram.png         # Database ER diagram
└── README.md              # (this file)
Running locally
Backend (API)
See: backend/README.md

Install:

Bash

cd backend
npm install
Configure:

Bash

cp .env.example .env
Fill in:

SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
Start:

Bash

npm run dev
# or
npm start
Default: http://localhost:4000
Health: GET /api/health

Web (admin)
The web app is static (folder web/). Important: the backend base URL is currently hard-coded here:

web/assets/js/custom.js:


JavaScript

const backendBaseUrl = 'https://coral-app-zk7m2.ondigitalocean.app';
For local development, change it to:


JavaScript

const backendBaseUrl = 'http://127.0.0.1:4000';
Then serve the web/ folder (example):


Bash

npx serve web
and open the printed URL (e.g. http://localhost:3000).

Mobile (Flutter)
See: mobile/README.md


Bash

cd mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:4000
API overview
All routes except /api/auth/login and /api/auth/refresh require Authorization: Bearer <token>.
Most routes also require tenant context (loaded on the backend from company_users).

Auth
POST /api/auth/login (body: username, password, client_type)
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/change-password
PATCH /api/auth/profile
Admin users (admin-only)
GET /api/admin/users
POST /api/admin/users
PUT /api/admin/users/:companyUserId
DELETE /api/admin/users/:companyUserId
Keys (tenant-scoped)
GET /api/keys
GET /api/keys/dashboard
GET /api/keys/:keyId
POST /api/keys (admin)
PATCH /api/keys/:keyId (admin)
DELETE /api/keys/:keyId (admin)
GET /api/keys/:keyId/events
POST /api/keys/:keyId/events
POST /api/keys/scan (QR flow)
Tests

Bash

npm install
npm test
Note: the Playwright config expects tests/support/start-test-server.js. If that file is currently commented out, the test server will not start until the comment block is removed.

Database / Supabase
FleetKeys uses Supabase for:

Authentication (Supabase Auth)
Postgres database (companies, company_users, keys, key_events, …)
RPC functions (e.g. scan_key_event)
Currently included SQL change:

backend/docs/supabase/005_add_phone_to_company_users.sql
Milestone 3 (delivered)
Milestone 3 focuses on a usable end-to-end flow:

Web admin panel: dashboard + keys management + event history
Employee management (CRUD) + phone field on company_users
Profile and password change
Keys API expanded: dashboard, events, scan
Mobile groundwork for QR/deep link flow (configured dependencies + API base URL)
Contributing
PRs are welcome. Suggested flow:

Create a feature branch
Add tests where it makes sense
Explain the change in the PR (what + why)
License
The repository currently does not include a LICENSE file. If you want, tell me which license you prefer (MIT / Apache-2.0 / ISC, etc.) and I can add it and align metadata in package.json.


FleetKeys Backend
Backend service for FleetKeys (Express API + Supabase Auth/Postgres).

Local setup
Copy .env.example to .env
Add Supabase values:
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
Install dependencies: npm install
Run server:
dev (watch): npm run dev
prod: npm start
Default port: 4000 (via the PORT env var).

Supabase foundation
In docs/supabase/ you can find SQL changes meant to be run in the Supabase SQL editor (or via a migrations pipeline).

Currently included:

005_add_phone_to_company_users.sql
Note: the backend expects tables such as company_users, keys, key_events, and the RPC function scan_key_event to exist. If your initial schema/migrations are missing, they should be added to the repo or documented.

API
POST /api/auth/login
Body:


JSON

{
  "username": "user@email.com",
  "password": "secret",
  "client_type": "web_admin"
}
client_type values:

web_admin -> only users with role admin
mobile_user -> only users with role user
POST /api/auth/logout
Body:


JSON

{
  "access_token": "jwt-token"
}
Auth profile / password
PATCH /api/auth/profile (Bearer + tenant context) — update full_name / position
POST /api/auth/change-password (Bearer) — body: current_password, new_password
Protected routes and middleware
Routes under /api/protected/* require Bearer token + tenant context.

GET /api/protected/me
Returns auth user + tenant context.

GET /api/protected/admin/me
Requires role admin.

GET /api/protected/user/me
Requires role user.

Admin user management (DAO/Service/Controller/Route)
POST /api/admin/users
Requires:

Bearer token of admin user
admin role in tenant context
Body:


JSON

{
  "username": "new.user@email.com",
  "password": "strongpassword",
  "full_name": "New User",
  "position": "Receptionist",
  "phone": "+3876xxxxxxx"
}
Behavior:

Creates Supabase auth user with service_role
Inserts user into company_users with role user
Enforces same company_id as current admin
Rolls back auth user if DB insert fails
Keys management
GET /api/keys
List keys for tenant company. Supports optional ?status=available|checked_out|lost|maintenance.

GET /api/keys/dashboard
Dashboard summary + recent events (tenant scope).

GET /api/keys/:keyId
Get key by id in tenant company.

POST /api/keys (admin)
Create new key.

Body:


JSON

{
  "key_code": "RC-A17",
  "status": "available",
  "note": "Optional note"
}
PATCH /api/keys/:keyId (admin)
Update key fields (key_code, status, note).

DELETE /api/keys/:keyId (admin)
Delete key.

GET /api/keys/:keyId/events
List taken/returned events for a key.

POST /api/keys/:keyId/events
Insert taken/returned event and update key status accordingly.

POST /api/keys/scan
QR scan flow endpoint (calls SQL function scan_key_event).

Body:


JSON

{
  "qr_token": "fk_...",
  "action": "taken",
  "message": "Optional scan message"
}

FleetKeys Mobile (Flutter)
Mobile client for the FleetKeys system. The app is primarily intended for the “user” role (employees) and focuses on the QR/deep-link flow (scanner + actions on keys).

Prerequisites
Flutter SDK (see pubspec.yaml, currently: Dart ^3.9.2)
A running FleetKeys backend (local or deployed)
Configure API base URL
Set the API base URL via --dart-define:


Bash

1
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:4000
Code: lib/config/api_config.dart.

Run

Bash

1
2
flutter pub get
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:4000
Features (high-level)
Login and session persistence (tokens)
QR scanning (e.g. deep link fleetkeys://key-scan?...)
Calling backend endpoints for scan/event flow
Note: the web admin panel generates deep links and a QR code for a key; the mobile app opens them and triggers the appropriate flow.
