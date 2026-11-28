# NetMedika API

FastAPI backend for NetMedika - Online Medicine Order App.

## Configuration

Application configuration is defined in `backend/core/settings.py`. Settings
are validated when the app starts and read from environment variables or a
`backend/.env` file. Alembic uses the same validated `DATABASE_URL` and sync
driver as the application. Relative SQLite paths resolve from the backend
directory, regardless of the command's working directory.
`backend/core/config.py` remains as a compatibility import for older code.

## Database migrations

After deploying backend changes that alter the user model, apply pending
migrations before starting the API:

```bash
cd backend
alembic upgrade head
```

The phone number profile field is added by migration
`ab83d9c2e108_add_phone_number_to_users.py`. Existing user rows are preserved
because the new column is nullable.

The `ca72bd1e9c10_add_user_active_status.py` migration adds account blocking
support. Apply it before using the admin user management actions.

The `d39fa81c6b20_add_notifications.py` migration adds persistent in-app
notifications. New orders create notifications for active administrators.

Admin provisioning and customer order notification emails require SMTP settings
in `backend/.env`:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=mailer@example.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=mailer@example.com
SMTP_STARTTLS=true
SMTP_USE_SSL=false
```

With these settings, the backend emails generated admin credentials, confirms
new customer orders, and notifies customers when orders are marked completed.
Without `SMTP_HOST` and `SMTP_FROM_EMAIL`, admin creation is rejected; orders
still succeed and the backend logs that the email notification was skipped.

## Image storage

Order prescriptions and profile avatars are stored in the Supabase Storage
bucket named `uploads`. The orders table stores the prescription object's path
inside that bucket, not its contents or a signed URL. Configure these values in
the FastAPI Cloud backend environment and in `backend/.env` for local development:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
# Use the current secret key, or the legacy service-role key below.
SUPABASE_SECRET_KEY=your-server-only-secret-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
SUPABASE_STORAGE_BUCKET=uploads
SUPABASE_SIGNED_URL_EXPIRY_SECONDS=3600
```

Keep the bucket private and keep the secret or service-role key server-side.
The API accepts either `SUPABASE_SECRET_KEY` or the legacy
`SUPABASE_SERVICE_ROLE_KEY` and prefers `SUPABASE_SECRET_KEY` when both are set.
All uploaded images go to this bucket; the API stores only object paths in the
database and returns short-lived signed URLs from authorized app endpoints.
Uploads fail clearly when Storage is not configured.

## Authentication

Email and password authentication is available at `/api/v1/auth/register` and
`/api/v1/auth/login`. Registration accepts optional `profile_picture` and
`address` fields. Authenticated user responses include those fields.

Google and Apple sign-in accept a provider-issued OpenID Connect `id_token`:

```json
POST /api/v1/auth/google
{ "id_token": "<Google ID token>" }

POST /api/v1/auth/apple
{ "id_token": "<Apple identity token>" }
```

Both endpoints return the same user and session token shape as password login.
Set `GOOGLE_CLIENT_ID` and `APPLE_CLIENT_ID` to the expected token audiences;
leave either unset to disable that provider. Each setting accepts one client ID
or a comma-separated list when the app uses different client IDs across
platforms. The server validates signatures, issuer, audience, and verified
email before creating or signing into a customer account. A social account has
no password until the user sets one through a separate account recovery flow.
