# StudiesMasters <-> Moodle — Enterprise SSO & Account Management

Single Sign-On plus **backend-authoritative account management** for the
StudiesMasters → Moodle integration. A student/teacher logged into StudiesMasters
clicks **Start class / Open class** and lands in Moodle already logged in — while
**MongoDB remains the single source of truth** for accounts, profiles, and
enrollments.

## Architecture at a glance

```
StudiesMasters (React)
      |  "Open class"  ->  GET /api/moodle/sso   (JWT)
      v
Node/Express backend ------- MongoDB (source of truth)
      |  mints minimal signed URL (identity + nonce + course)
      v
Moodle: sso.php (local plugin)
      |  1. verifies HMAC (shared secret) + timestamp
      |  2. calls back GET /api/moodle/sso/verify  -> nonce consumed, profile returned
      |  3. finds-or-creates user by STABLE username, sets session
      v
Moodle dashboard / course
```

Separately, the backend uses **Moodle REST Web Services** to create/update,
enroll/unenroll, suspend/reactivate and reconcile accounts — Moodle never decides
who exists; it only reflects what the backend pushes.

## How it works

### SSO (login handshake)
1. `GET /api/moodle/sso` (`routes/moodleRoutes.js`) -> `services/moodle/generateSSO.js`
   mints a **minimal, HMAC-signed, one-time** URL:
   ```
   username | email | timestamp | nonce | course
   ```
   - `username` = **stable** id derived from the immutable Mongo `_id`
     (`sm_s_<hex>` / `sm_t_<hex>`). **Never email** — email stays editable.
   - `nonce` = random one-time token stored in Redis (preferred) or MongoDB (TTL
     fallback). Reused nonces are rejected (replay protection).
2. Frontend opens the URL.
3. `sso.php` verifies the HMAC + timestamp, then calls
   `GET /api/moodle/sso/verify` (configured via the plugin's *backend verify URL*)
   where the nonce is atomically consumed and the authoritative profile is loaded
   fresh from Mongo (`services/moodle/verifySSO.js`).
4. Moodle finds-or-creates the user (stable username) and logs them in.

### Account management (backend is the only authority)
All lifecycle operations go through `services/moodle/*`:
- `createUser.js`, `updateUser.js` – provisioning & profile updates
- `enrollUser.js`, `unenrollUser.js` – course enrollment sync
- `suspendUser.js` – suspend / reactivate
- `syncProfile.js` – full idempotent re-sync
- `courseMapper.js` – subject/package/curriculum -> Moodle course id mapping
- `queue.js` + `worker.js` – durable job queue (retries, backoff, dead-letter)
- `reconciliation.js` – periodic MongoDB ↔ Moodle consistency repair
- `autosync.js` – automatic sync on student changes (opt-in)
- `audit.js` + `metrics.js` – full audit trail + health/monitoring

## Secure by default
- `MOODLE_DRY_RUN=true` (default) -> runs fully offline; set `MOODLE_WS_ENABLED=true`
  + `MOODLE_WS_TOKEN` to go live.
- One-time nonces prevent replay; timestamps are freshness-checked; signatures are
  timing-safe and support **secret rotation** (`MOODLE_SSO_ACTIVE_ID` /
  `MOODLE_SSO_SECRETS`).
- Rate limiting on all Moodle endpoints; admin endpoints JWT-gated.

## Files
- `Studiesmasters-backend/routes/moodleRoutes.js` — HTTP surface (SSO + admin API)
- `Studiesmasters-backend/services/moodle/` — service layer (see above)
- `Studiesmasters-backend/models/{MoodleLink,SsoNonce,SyncJob,MoodleAuditLog,CourseMapping}.js`
- `studiesmasters-frontend/src/components/*dashboard.jsx` — "Open class"/"Start class" buttons
- `moodle-sso/local/studiesmasters_sso/` — Moodle local plugin (copy to Moodle server)

## Virtual Classroom (removed from Moodle)

The **StudiesMasters Virtual Classroom** local plugin and its `/my/` dashboard
block have been taken down. Nothing virtual-class related is shipped to Moodle
anymore:

- `local/studiesmasters_virtualclass` — the launcher page at
  `/local/studiesmasters_virtualclass/index.php` plus its nav-drawer entry
  (registered from `lib.php`).
- `blocks/studiesmasters_virtualclass` — the "Upcoming virtual classes" block.
- `cli/add_studiesmasters_dashboard_block.php` — the bulk dashboard installer.

**To remove it from a live Moodle server:**

1. On the server, delete `<moodle>/local/studiesmasters_virtualclass` and
   `<moodle>/blocks/studiesmasters_virtualclass` (and
   `<moodle>/cli/add_studiesmasters_dashboard_block.php` if you copied it).
2. Remove the block from every dashboard, or re-run the installer you used
   before with `--remove` (do this in step 1, before deleting the file).
3. Run **Site administration -> Notifications** so Moodle drops both plugins.

Only the SSO plugin (`local/studiesmasters_sso`) remains on the Moodle side.
The StudiesMasters **web** virtual classroom is unaffected — it is served by the
React front end and the `/api/moodle/vclass/*` backend endpoints, which are
untouched.

### Why one user sees classes and another does not

The block/page never looks users up by name. The Moodle username IS the
identity (`sm_s_<hex>` / `sm_t_<hex>`, derived from the immutable Mongo `_id`),
and the backend resolves it in two gates:

| Gate | Check | Failure symptom |
|------|-------|-----------------|
| 1. Identity | `MoodleLink.findOne({ moodleUsername })` | `unknown_user` — **no** classes at all |
| 2. Entitlement | membership of a `ClassGroup` | resolves fine, but an empty timetable |

Both look identical in the browser ("no classes"), which is why this was hard
to diagnose. Two notes that catch people out:

- **Logging into Moodle successfully does not mean the link exists.** SSO
  creates the Moodle user independently of `MoodleLink`, so a user can reach
  `/my/` normally and still have no virtual-class data.
- **A paid subscription is not a class seat.** A teaching group is separate
  from payment enrolments, so a paying student who was never added to a
  `ClassGroup.students` array correctly sees nothing.

`verifyClassRequest` now self-heals a missing `MoodleLink` (the id in the
username is authoritative, so the link is re-derived and created idempotently),
and the page/block show an explicit "account not linked" message instead of
implying an empty timetable.

To investigate a specific user:

```
node scripts/diagnose-vclass-user.js "Williams Mensah"   # read-only, names the failing gate
node scripts/fix-vclass-link.js --name="Williams Mensah" # dry-run repair
node scripts/fix-vclass-link.js --name="Williams Mensah" --apply
```

Gate 2 (class-group membership) is deliberately NOT automated — who is in
which classroom is a staffing decision, so it is reported, never guessed.

1. **Backend `.env`** — see `.env.example`: share `MOODLE_SSO_SECRET` with the
   plugin; set the Moodle base URL. Optional sync: `REDIS_URL`, `MOODLE_WS_*`.
2. **Moodle** — copy `moodle-sso/local/studiesmasters_sso/` into
   `your-moodle-dir/local/studiesmasters_sso`, run **Site administration ->
   Notifications** to upgrade, then set *Shared SSO secret* and *backend verify URL*.
3. **Custom profile fields** (optional) — create `curriculum`, `grade`, `package`,
   `subjects` under **Site administration -> Users -> Accounts -> User profile fields**.
4. **Test** — `cd Studiesmasters-backend && node scripts/sso-self-test.js`.

> **Backwards compatibility note:** the wire contract changed from the old
> profile-heavy payload to the minimal identity+nonce payload. Both the plugin
> and the backend must be upgraded together so the handshake stays in sync.