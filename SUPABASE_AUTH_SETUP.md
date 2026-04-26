# Supabase & Google Auth Setup Guide 🔐

This guide explains how to configure **Supabase** and **Google OAuth** for ResumeSailor.

---

## 1. Supabase Project Setup

1.  **Create Project**: Go to [database.new](https://database.new) and create a new project.
2.  **Run Schema**:
    *   Open the **SQL Editor** in your Supabase dashboard.
    *   Copy the contents of `supabase/schema.sql` from this repository.
    *   Paste and **Run** the script to initialize your tables and security policies.

## 2. Google OAuth Configuration

To enable "Sign in with Google", you need credentials from the Google Cloud Console.

1.  **Google Cloud Console**: Go to [console.cloud.google.com](https://console.cloud.google.com/).
2.  **Create Project**: Create a new project for "ResumeSailor".
3.  **OAuth Consent Screen**:
    *   Configure as **External**.
    *   Add your support email and developer contact info.
    *   Add the `.../auth/userinfo.email` and `.../auth/userinfo.profile` scopes.
4.  **Create Credentials**:
    *   Go to **Credentials** → **Create Credentials** → **OAuth client ID**.
    *   Select **Web application**.
    *   **Authorized Redirect URIs**: Add your Supabase Auth callback URL.
        *   Format: `https://<YOUR_PROJECT_ID>.supabase.co/auth/v1/callback`
        *   You can find this in Supabase under **Authentication** → **Providers** → **Google**.
5.  **Copy Credentials**: Save your **Client ID** and **Client Secret**.

## 3. Enable Google Provider in Supabase

1.  Go to **Authentication** → **Providers** → **Google** in Supabase.
2.  Toggle **Enable Google-Enabled**.
3.  Paste the **Client ID** and **Client Secret** from the previous step.
4.  Click **Save**.

## 4. Local Environment Variables

1.  Open `frontend/.env.local` in your code editor.
2.  Add your Supabase project details (find these in **Settings** → **API**):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 5. Verify the Flow

1.  Start the frontend: `cd frontend && npm run dev`.
2.  Open `http://localhost:3000`.
3.  Click **Sign In** or **Try It Free with Google**.
4.  After a successful login, you should be automatically redirected to `/dashboard`.
5.  Check the **users** table in Supabase to see your new user record.

---

> [!IMPORTANT]
> **Authentication Guards**: The app is configured with route guards in `_app.js`. 
> - Unauthenticated users are redirected to the landing page.
> - Authenticated users are redirected to the dashboard.
> - Ensure your `NEXT_PUBLIC_SUPABASE_URL` is correct, or the app will fall back to a "stub" mode for preview only.
