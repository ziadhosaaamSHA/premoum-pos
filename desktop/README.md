# Premium POS Desktop

The desktop build wraps the existing Next.js app in Electron and starts the app locally.

## Runtime Flow

- The packaged app starts a local Next standalone server on `127.0.0.1`.
- The app uses PostgreSQL through Prisma, the same as the web deployment.
- On launch, Electron checks the configured `DATABASE_URL`, runs Prisma migrations, then opens the POS UI.
- If the database is already configured, the app can launch offline.
- If the database is missing or unreachable, the setup window opens. First setup requires a reachable PostgreSQL database.
- If internet is available in a packaged build, the app checks GitHub Releases for updates and asks before downloading. If offline, it skips update checks and launches the installed version.

## Local Development

```bash
npm run desktop:dev
```

## Build Installers

```bash
npm run desktop:dist:mac
npm run desktop:dist:win
```

Artifacts are written to `dist/desktop`.

## Database Setup

The default desktop database URL is:

```text
postgresql://127.0.0.1:5432/premium_pos?schema=public
```

For a different local or remote PostgreSQL instance, set `PREMIUM_POS_DATABASE_URL` before launching or enter the URL in the setup window.

The current implementation does not silently install PostgreSQL with administrator privileges. If PostgreSQL is not present, the setup screen opens the official PostgreSQL download page. Once PostgreSQL is installed and the database URL works, the app stores the URL and works offline afterward.
