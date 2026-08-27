# StudiesMasters <-> Moodle SSO

Single Sign-On that lets a student/teacher logged into **StudiesMasters** click
**Start class / Open class** and land already logged into your Moodle LMS
(`lms.studiesmasters.com`), with their account provisioned into Moodle's MariaDB.

## How it works

```
Student logs into StudiesMasters → clicks "Open class"
        │  (frontend dashboard button)
        ▼
GET /api/moodle/sso  (StudiesMasters Node backend, Bearer JWT required)
        │  returns { url: "https://lms.studiesmasters.com/local/studiesmasters_sso/sso.php?username=&email=&timestamp=&course=&signature=" }
        ▼
Frontend opens that URL in a new tab
        ▼
sso.php (Moodle server) verifies the HMAC signature + expiry,
        then finds/creates the user in mdl_user and logs them in
        ▼
Redirect to the Moodle course / dashboard
```

### Signed URL format (must match both sides exactly)

Query params produced by the backend and verified by the Moodle plugin (this is
the wire contract of the **live** plugin on `lms.studiesmasters.com`):

| Param | Value |
|-------|-------|
| `username`  | `strtolower(trim(email))` — used as the stable Moodle username |
| `email`     | `trim(email)` (NOT lowercased) |
| `timestamp` | epoch seconds (10 digits; ±300s tolerance) |
| `course`    | positive integer Moodle course id, or `0` for dashboard |
| `signature` | `strtolower(hex( HMAC_SHA256( payload, MOODLE_SSO_SECRET ) ))` |
| `firstname`, `lastname`, `role` | optional |

The signed payload is:

```
username|email|timestamp|course
```

using the normalized, exactly-as-sent values (`payload = username + "|" + email + "|" + timestamp + "|" + course`).

The plugin verifies the signature with a timing-safe compare and rejects
expired tokens.

No password is synced or sent — the signed HMAC URL replaces the password. This
avoids bcrypt hash-format mismatches and never stores plaintext/password copies.



## Files in this repo

- `Studiesmasters-backend/routes/moodleRoutes.js` — SSO endpoints (student + teacher)
- `Studiesmasters-backend/server.js` — mounts `/api/moodle`
- `studiesmasters-frontend/src/components/student-dashboard.jsx` — "Open class" button
- `studiesmasters-frontend/src/components/teacher-dashboard.jsx` — "Start class" button
- `moodle-sso/local/studiesmasters_sso/` — Moodle local plugin (copy to Moodle server)

## Setup

### 1. StudiesMasters backend (already done in code)
Your `.env` must contain:
```env
MOODLE_SSO_SECRET=<a long random string shared with Moodle>
MOODLE_BASE_URL=https://lms.studiesmasters.com
MOODLE_SSO_PATH=/local/studiesmasters_sso/sso.php
```

### 2. Moodle server — install the plugin
1. Copy the folder `moodle-sso/local/studiesmasters_sso` into
   `your-moodle-dir/local/studiesmasters_sso` on the Moodle server.
2. As a Moodle admin, visit **Site administration → Notifications** to run the
   plugin upgrade.
3. Go to **Site administration → Plugins → Local plugins → StudiesMasters SSO**
   and paste the **same** `MOODLE_SSO_SECRET` into *Shared SSO secret*.
4. (Optional) Set the *Default course ID* to send users straight into a course.

The shared secret must be **identical** on both the Node backend and Moodle, or
the handshake is rejected.

### 3. Test
Log into StudiesMasters as a student, click **Open class** → you should land in
Moodle, logged in, with an account row created in `mdl_user`.
