# FleetKeys Key Management System

FleetKeys is a multi-tenant key management system for rent-a-car and hotel/motel businesses, with backend, web, and mobile clients.

## Milestone 2 Status

Milestone 2 is completed as an initial functional release.

- GitHub repository: <https://github.com/imrankocan2273/FleetKeys---Key-Management-System>
- Release/Version: `0.1.1` (2026-05-05)

## Implemented in Milestone 2

ADMIN LOGIN CREDENTIALS: imrankocan2273@gmail.com 12345678
USER LOGIN : YOU CAN CREATE YOURSELF OR USE test.test@gmail.com testtest
### Backend architecture
- DAO layer
- Service layer
- Controller layer
- Route layer

### Key management API (secured)
- `GET /api/keys`
- `GET /api/keys/:id`
- `POST /api/keys` (admin only)
- `PATCH /api/keys/:id` (admin only)
- `DELETE /api/keys/:id` (admin only)

### Security and tenant isolation
- `requireAuth` middleware
- `requireTenantContext` middleware
- `requireRole('admin')` for write operations
- Company-scoped data access (tenant isolation)

### Validation and business rules
- Allowed key statuses: `available`, `checked_out`, `lost`, `maintenance`
- Key routes integrated under `/api/keys`

### User and role flows
- Admin user creation via backend endpoints
- New users linked to correct company via `company_users`
- Role-based behavior (`admin` / `user`)
- Business-type-aware flow (`rent-a-car` / `hotel-motel`)

### Frontend progress
- Initial web and mobile frontend integration started
- Backend API consumption implemented in core flows

## Release Scope Note

This is an initial release aligned with Milestone 2 requirements:

- Core features are working
- Some flows are intentionally partial/basic
- Full QR lifecycle and fully polished UI are planned for next milestones
