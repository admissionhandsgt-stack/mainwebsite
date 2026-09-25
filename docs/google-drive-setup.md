# Connecting Google Drive to the document vault

Fifteen minutes, once. Everything after this is done from **Admin → Documents**.

## What this does

Every document a candidate uploads is copied into a Drive folder named after
them:

```
AdmissionHands — Candidate Documents/
  └── Rahul Sharma · +919876543210 · PG rank 12450/
        ├── NEET PG admit card.pdf
        ├── Valid photo ID.jpg
        └── MBBS marksheets.pdf
```

Files are named by **what the document is**, not what the student called it, so
the folder reads as the counselling checklist rather than as
`IMG_20260925_114233.jpg` fourteen times over.

**Drive is a mirror, not the storage.** The documents live on our own server and
that copy is the one the site serves. If Drive is down, the token expires or the
account fills up, uploads keep working and the failures queue up for retry. This
is deliberate: if Drive were the only copy, one outage would mean a student's
certificate is simply gone.

## Which Google account

Either a normal Gmail account or a Google Workspace one. **Not a service
account** — since June 2023 those have a 0 GB Drive quota and cannot own a file
at all, so every upload would fail with `storageQuotaExceeded`.

Whatever you pick owns the files and spends its own storage:

| Account | Storage | Notes |
|---|---|---|
| Personal Gmail | 15 GB, shared with Gmail and Photos | Free. Fine for a season of documents — they are certificates, not video |
| Google Workspace | Whatever the plan gives | Also lets you move the folder into a Shared Drive later, which this already supports |

A dedicated Gmail account for this (rather than someone's personal one) is worth
the two minutes: the documents are not mixed into anybody's private Drive, and
handing the work over later does not mean handing over a personal login.

## Step 1 — Create a Google Cloud project

1. Go to <https://console.cloud.google.com/>, signed in as the account that
   should own the documents.
2. Top bar → project dropdown → **New Project**. Name it `AdmissionHands`.
   **Create**, then make sure it is selected.

## Step 2 — Turn on the Drive API

1. Search **Google Drive API** in the console search bar and open it.
2. **Enable**.

## Step 3 — Set up the consent screen

1. **APIs & Services → OAuth consent screen**.
2. User type **External**. **Create**.
3. Fill in:
   - App name: `AdmissionHands Documents`
   - User support email: your address
   - Developer contact: the same
4. Save and continue through Scopes (add nothing) and Test users.
5. **Back on the OAuth consent screen, press `PUBLISH APP`.**

> **Do not skip publishing.** While the app is in *Testing*, Google expires the
> refresh token after **seven days** and the mirror silently stops. Published, it
> lasts until somebody revokes it.
>
> Google will not ask you to verify the app, because the only scope used is
> `drive.file` — which lets this app touch *only the files it created itself*
> and nothing else already in the Drive. That is also why it is safe to point at
> an account with other things in it.

## Step 4 — Create the OAuth client

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**. Name: `AdmissionHands server`.
3. Under **Authorised redirect URIs**, add both of these exactly:

   ```
   https://admin.admissionhands.com/api/admin/google/callback
   http://localhost:3000/api/admin/google/callback
   ```

4. **Create**. Copy the **Client ID** and **Client secret**.

## Step 5 — Connect it

1. Open **<https://admin.admissionhands.com/admin/documents>** and sign in.
2. In the *Google Drive mirror* panel, paste the client ID and secret, then
   **Save credentials**.
3. Press **Connect Google account**, choose the account, and allow access.
4. You should come back to a green **Connected**, and the folder is created
   immediately — press **Open the folder in Drive** to see it.

## Afterwards

- **Waiting / Failed** counts on that panel show anything that has not made it
  across. **Sync what is waiting** retries them.
- **Disconnect** stops copying new documents. It does **not** delete anything
  already in Drive — those are your files.
- If the panel shows a token error, press **Connect Google account** again.
  That is what a revoked or expired token looks like, and reconnecting fixes it.

## What to watch

- **Storage.** A personal account's 15 GB is shared with Gmail and Photos. Ten
  MB per candidate across a thousand candidates is 10 GB, so keep an eye on it
  or use an account that is not also somebody's inbox.
- **Who can see the folder.** Anyone you share the Drive folder with can read
  every candidate's documents, and Drive sharing is outside this application's
  control. The site's own copy stays limited to the candidate and signed-in
  staff; the Drive copy is only as private as you keep it.
- **Deleting.** Removing a document from the candidate's account removes it from
  Drive too. Deleting it *in Drive* does not remove it from the vault — the
  site's copy is the record.
