# Qismat

Website and admin panel for Qismat, the free prize-draw app. Next.js static export, Firebase (project `prizemoney-6d1a7`) for data and admin sign-in.

- `/` the public site, `/privacy`, `/terms`
- `/admin` the admin panel (only accounts listed in Firestore `admins/{uid}` get in)

## Run locally

```bash
cp .env.local.example .env.local   # fill in the Firebase web app values
npm install
npm run dev                        # http://localhost:3000
```

## Deploy to Hostinger

1. Set `NEXT_PUBLIC_SITE_URL` in `.env.local` to the real domain, e.g. `https://qismat.pk`.
2. Build: `npm run build`. The whole site lands in `out/`, including `.htaccess` and `404.html`.
3. In Hostinger File Manager, open `public_html`, delete the default files, and upload the **contents** of `out/` (not the folder itself). Zipping the contents of `out/` and using Extract works too.
4. Turn on SSL for the domain in hPanel. `.htaccess` then forces HTTPS, drops `www.`, serves the branded 404 page and sets caching.
5. In Firebase console → Authentication → Settings → Authorized domains, add the domain so admin sign-in works.

Files starting with a dot are hidden in File Manager by default; check `.htaccess` was uploaded.
