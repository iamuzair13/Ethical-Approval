# Environment variables (IREB)

## Authentication

| Variable | Purpose |
|----------|---------|
| `NEXTAUTH_URL` | Public app URL (must match dev server port, e.g. `http://localhost:3004`) |
| `NEXTAUTH_SECRET` | JWT signing secret (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google Web client ID for applicant sign-in (browser GIS) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional; documented for Google Cloud console |

## SAP OData (applicant sign-in)

| Variable | Service |
|----------|---------|
| `SAP_BASIC_AUTH_USERNAME` / `SAP_BASIC_AUTH_PASSWORD` | Student verification — `ZSTUDENTHMIS_SRV` |
| `SAP_EMP_BASIC_AUTH_USERNAME` / `SAP_EMP_BASIC_AUTH_PASSWORD` | Faculty/staff verification — `Z_EMP_INFO_API_SRV` |

Student emails (`*@student.uol.edu.pk`) use the student service. All other applicant emails use the employee service.

## Database

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |

## Email (optional)

See `.env.example` for `SMTP_*` and `IREB_PUBLIC_APP_URL`.
