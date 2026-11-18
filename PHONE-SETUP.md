# Getting the Tasting Ledger on your phone

## A. One-time: put it on GitHub (on the computer, ~3 minutes)

1. **Create the repository.** Go to https://github.com/new (signed in as HowlOfTheOwl).
   - Repository name: `tasting-ledger`
   - Public (GitHub Pages is free for public repos; there is no personal data in the code)
   - Do **not** add a README, .gitignore or license (the repo must be empty)
   - Click **Create repository**
2. **Turn on Pages.** In the new repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
   (Same setting as the gym-tracker repo.)
3. **Push the code.** Tell Claude "repo is created", or run in the project folder:
   ```
   git remote add origin https://github.com/HowlOfTheOwl/tasting-ledger.git
   git push -u origin main
   ```
4. **Wait for the deploy.** Repo → **Actions** tab: the "Deploy to GitHub Pages" run takes about 1 minute.
   When it is green, the app is live at **https://howloftheowl.github.io/tasting-ledger/**

## B. On the phone (Android, Chrome)

1. Open **https://howloftheowl.github.io/tasting-ledger/** in Chrome.
2. Menu **⋮ → Add to Home screen → Install**. The cheese wedge icon appears on your home screen.
3. Open it from the icon (not from Chrome): it runs full screen and works without reception.
4. Desk tab → **Protect my data** (if it says "Not yet"), so Android never clears it to save space.
5. When you are ready to use it for real: Cellar → **Clear examples**. The pumpkin round stays.

Updates: every push to `main` deploys a new version; the phone picks it up the next time you open the app online.

## C. Everyday use

- **At the counter:** big cheese button → photo of the front → photo of the price label (it shows the
  €/kg "Grundpreis") → overall verdict → save. Everything else is optional.
- **Taste it again later:** open the cheese → **Taste again**. Cheese changes in the fridge; the latest verdict counts.
- **Same cheese elsewhere:** open the cheese → **Bought it elsewhere**. The Ledger compares shops and €/kg.
- **Tasting rounds:** Rounds → **New round** (or "New round with this setup" under an old round's results).
  Pick cellar cheeses to use them as bites, switch on **Blind** if someone else serves.

## D. The appraiser (AI notes)

1. Desk → **Share request** → save it to Google Drive (or send it to yourself).
2. On the computer, put the file in this project folder, open the folder in Claude Code and say:
   *"Appraise appraisal-request-….json"* (Claude follows `APPRAISAL.md`).
3. Claude writes `appraisals/appraisal-result-….json`. Put it on Google Drive.
4. Phone: Desk → **Import appraisal result** → pick the file. Notes, €/kg, profile, passport and charts fill in.

## E. Backups

Data lives only on the phone. Desk → **Share backup** → Google Drive, every few weeks (photos included).
On a new phone: install the app, Desk → **Restore from a backup**.

## Testing on the home Wi-Fi without deploying

`node scripts/serve.mjs` prints a network address (http://192.168.…:5174). Open it on the phone.
Note: over plain http the app cannot be installed or work offline; that needs the GitHub Pages address.
