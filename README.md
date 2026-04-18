# FleetKeys Key Management System

**What Was Completed in Milestone 2 (So Far - 18.04.2026)**
Implemented backend CRUD module for keys using the existing architecture pattern:
DAO layer
Service layer
Controller layer
Route layer
Added secure API endpoints for key management:
GET /api/keys
GET /api/keys/:id
POST /api/keys (admin only)
PATCH /api/keys/:id (admin only)
DELETE /api/keys/:id (admin only)
Applied authentication and tenant scoping on key routes:
requireAuth
requireTenantContext
role checks with requireRole('admin') for write operations
Added request validation and status constraints for keys:
allowed statuses: available, checked_out, lost, maintenance
Integrated the new module into backend server routing (/api/keys).
Starting frontend for Web and Mobile APPS

**What is implemented**
Admin user management
Company admins can create users (staff) through backend admin endpoints.
New users are linked to the correct company in the database (company_users).
Role-based screen logic (data-driven)
The application resolves the logged-in user from the database and determines:
user role (admin or user)
company context
company business type (rent-a-car or hotel/motel)
Based on that context, the app can decide whether to show:
Admin web screen (for admin role)
User web screen (for user role)
Tenant-aware data isolation
Each user only accesses data from their own company.
The system fetches only the company-relevant records (including keys and related data), not global/shared data.
Core key management APIs (initial release scope)
Basic CRUD endpoints for keys are implemented and protected by auth + tenant + role checks.
Admins can create/update/delete keys; tenant users can read only their company keys.
Release scope note
Milestone 2 is intentionally an initial functional release:

Core features are working.
Some API flows are basic/partial.
Full end-to-end functionality (complete QR lifecycle + fully polished UI) is planned for next milestones.
