# Clean Agent — A Lovely Touch of Clean, LLC

A cleaning guide and a live chat agent for **A Lovely Touch of Clean, LLC**, a home and office cleaning company in Phoenix, Arizona. This is a separate project from the main site at https://lovelytouchcleaning.com.

- **`index.html` — the Clean Agent (the engine).** Visitors describe their home, office or move. Claude answers from the guide below, asks one question at a time when it needs more, and recommends a service with the price picture and a concrete next step: call or text 480-246-7507. The three cards beside the chat fill with the top match, a scored shortlist and the service's details.
- **`guide.html` — the cleaning guide (the GUB).** Every service, the rates, how booking works, the trust and safety promises and where the team works.

Both pages read the same file, **`data/gub.json`**. Edit that one file and the guide, the cards and the agent's answers all change together.

## Start here: GitHub Desktop

This folder is already a Git repository on branch `main`, with no commits yet, so your first commit is made under your own GitHub account.

1. **Unzip** `lovely-touch-clean-agent.zip` (right-click → **Extract All** on Windows), then move the `lovely-touch-clean-agent` folder to where you keep your projects.
2. GitHub Desktop → **File → Add local repository…** → choose the `lovely-touch-clean-agent` folder → **Add repository**. There's no "create a repository" step; it opens straight away.
3. All the files show under **Changes**. In the summary box at the bottom left, type `Initial commit`, then click **Commit to main**.
4. Click **Publish repository**, leave **Keep this code private** ticked, then click **Publish repository**.
5. On GitHub, open **Settings → Advanced Security**:
   - next to **Secret Protection**, click **Enable**;
   - next to **Push protection**, click **Enable**.

   For private repos, GitHub may offer these only on some plans. If the buttons aren't there, that's why.

Later updates arrive as changed files only, at the same paths. Drop them into this folder, replacing the old ones, then commit and push from GitHub Desktop.

## Put it online (Vercel)

1. Create a dedicated key for this project in the Claude Console, inside its own workspace, with a monthly spend limit and spend alerts.
2. Vercel → **Add New… → Project** → import the repo. Framework preset **Other**, no build command.
3. **Settings → Environment Variables:**
   - `ANTHROPIC_API_KEY` for **Production** only.
   - Optionally `ANTHROPIC_MODEL`; it defaults to `claude-sonnet-5-5`.
   - Give Preview a separate low-limit key, or none.
4. **Deployments → Redeploy.** Environment variables only apply to new deployments.
5. **Firewall → Rules → Add rule:**
   - If request path equals `/api/chat`, then **Rate limit**.
   - Fixed window, 20 requests per 60 seconds, keyed by IP, action **Deny** (429).

## What's in the folder

```
lovely-touch-clean-agent/
├── index.html        Clean Agent (engine), the landing page
├── guide.html        Cleaning guide (GUB)
├── data/gub.json     All business content: services, rates, booking, trust
├── api/chat.js       Server function: holds the API key, talks to Claude
├── css/engine.css    Agent styles (condensed layout)
├── css/guide.css     Guide styles
├── js/engine.js      Agent behavior: chat, MATCH lines, cards
├── js/guide.js       Renders the guide from data/gub.json
├── js/prefs.js       Theme toggle and text-size selector (both pages)
├── vercel.json       Security headers, function settings
├── .env.example      Names of the environment variables (no values)
├── .gitattributes    Keeps line endings consistent on Windows and Mac
└── .gitignore
```

No build step and no dependencies.

## What works and what doesn't

Works once deployed with a key:

- A real conversation that ends in a specific recommendation and next step.
- Price math from the real rates ($80 first hour, $25 each hour after).
- Light/dark theme and four text sizes on both pages, remembered between visits.
- **Voice input.** Tap the microphone and speak; the words land in the box to check before sending.
  - It uses the browser's built-in speech recognition, so it works in Chrome, Edge and Safari. Where a browser doesn't support it, the button hides itself.
  - Depending on the browser, speech may be turned into text on the browser maker's servers (Google for Chrome, Apple for Safari). The page says so in its notes.
  - The first tap asks the visitor for microphone permission.
  - `vercel.json` allows the microphone for this site only (`microphone=(self)`). Other sites embedding it can't use it.

The conversation is kept only in the visitor's browser tab (sessionStorage) and is gone when the tab closes.

It does not and cannot:

- book a date, check a calendar, send a text or email, or take payment;
- save chat history to an account.

Each of those would need a bigger build with server-side checks. Booking happens by phone, text or email.

**The chat won't answer until `ANTHROPIC_API_KEY` is set in Vercel.** Until then it shows a plain "not set up yet" message with the phone number.

## Look at it on your computer

The pages load `data/gub.json`, which browsers block when a file is opened by double-clicking. Run a tiny local server from inside the folder instead (Python comes with Mac and most Windows setups):

```
python -m http.server 8000
```

Then open http://localhost:8000/guide.html. The chat only answers on Vercel (or with `vercel dev` and a `.env.local` file).

## Security notes

- The API key lives only in Vercel's environment variables and is read by `api/chat.js`. The browser only ever calls `/api/chat`.
- `/api/chat` limits what it will accept:
  - POST with JSON only, bodies up to 32 KB, up to 24 messages of up to 2,000 characters each;
  - only user and assistant turns are forwarded;
  - the server alone sets the model, token limit and instructions.
- **Origin check:** requests from other websites get a 403. This blocks other websites, not scripts or tools. That's why the Vercel rate-limit rule and the Console spend limit still matter.
- **Rate limits:** there's a built-in limit of 30 messages per 10 minutes per visitor, per server instance. The Vercel rule is the real one.
- **Errors:**
  - They are generic and never expose keys or settings.
  - Logs record status codes only.
  - Calls to Claude time out after 25 seconds, before the function's 30-second limit.
- **Pages:**
  - Every reply is shown as plain text, never as HTML.
  - No analytics or third-party scripts; only Google Fonts.
  - `vercel.json` sets a strict Content-Security-Policy. The one inline script (theme restore) is allowed by its hash.
  - **If you edit that inline script in either page, update the `sha256-` value in `vercel.json` to match**, or the theme will stop restoring before the page paints.

## Editing the business content

Everything lives in `data/gub.json`.

- Each entry has `id`, `kind` (`service` or `info`), `title`, `summary`, `body`, `tags` and `details`.
- `tags` help the server pick the most relevant entries for each conversation.
- Services are what the agent can recommend.

Commit and push; Vercel redeploys on its own.

## Things to confirm with Dawn

- **Hours** aren't published anywhere reliable, so the agent never states them and asks people to call or text.
- **Her main site's "Free estimate" form doesn't save requests yet**, so this agent sends people to call or text instead.
