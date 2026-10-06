# ADL Patient Portal — Prototype

Clickable prototype of the Advanced Dental Lounge patient app and practice dashboard.
Plain HTML/CSS/JS, no build step. All data is sample data; nothing is saved or sent anywhere.

## Files
- `index.html` — page shell (desktop shows the phone frame + a Patient / Practice switch)
- `styles.css` — all styling (blue on white, Apple-style)
- `data.js` — sample patient "Sarah Mitchell" (dates are relative to today, so it never goes stale)
- `app.js` — patient app
- `dashboard.js` — practice dashboard
- `assets/` — ADL mark in blue and white, plus the app icon

## Deploy to Vercel
Option A, drag and drop: go to vercel.com/new, choose to deploy without Git, and drag this folder in.

Option B, CLI (from inside this folder):

    npx vercel        # first time: answer the prompts, framework = "Other"
    npx vercel --prod # publish to the production URL

No build command and no output directory are needed.

## On a phone
Opening the link on a phone shows the app full screen. In Safari, Share → Add to Home Screen
installs it with the ADL icon so it feels like a real app.
