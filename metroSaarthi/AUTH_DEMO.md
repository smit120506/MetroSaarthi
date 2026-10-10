# MetroSaarthi demo authentication

MetroSaarthi currently has no trusted backend or identity provider. Authentication is therefore explicitly implemented as **hackathon demonstration mode**, not production security.

## Demo accounts

| Role | Identifier | Alternate ID | Password |
| --- | --- | --- | --- |
| Passenger | `passenger@demo.local` | `9000000001` | `Passenger@123` |
| Operator | `operator@demo.local` | `OP-DEMO-01` | `Operator@123` |

Passwords are not shown in the public application UI and are bundled only as PBKDF2-derived hashes. Passenger credentials cannot open operator routes.

## Session policy

- Sessions expire eight hours after authentication.
- The session payload is signed with a non-exportable Web Crypto HMAC key stored in a separate IndexedDB database.
- Refresh restores a valid signed session.
- New sign-in is blocked while offline.
- A previously verified, unexpired session may use the supported offline portal workflows.
- Logout removes the local session.

## Production requirement

Frontend-only authentication cannot provide a trusted authorization boundary. Production deployment requires a backend or trusted identity provider that:

1. Verifies credentials and account status server-side.
2. Issues short-lived, secure, HTTP-only sessions.
3. Enforces the operator role on every protected complaint read and mutation.
4. Supports revocation, password reset, audit logging, rate limiting, and MFA for operator accounts.
5. Returns only complaints the authenticated passenger is authorized to access.
