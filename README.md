# Register frontend app

[![CI](https://github.com/tir-lavigny/register-app/actions/workflows/ci.yml/badge.svg)](https://github.com/tir-lavigny/register-app/actions/workflows/ci.yml) [![Deploy](https://github.com/tir-lavigny/register-app/actions/workflows/deploy.yml/badge.svg)](https://github.com/tir-lavigny/register-app/actions/workflows/deploy.yml)

## CI/CD Pipeline

### Branch model

```
push to main → CI → auto-create dev tag → auto-deploy to staging
release tag → deploy to production
```

| Trigger                  | Environment | URL                                     |
| ------------------------ | ----------- | --------------------------------------- |
| Push to `main` (dev tag) | Staging     | https://staging.register.tir-lavigny.ch |
| Release tag `v*`         | Production  | https://register.tir-lavigny.ch         |

### Workflows

#### CI (`ci.yml`)

**Trigger:** Push to `main`, PRs, manual dispatch.

**Steps:** Lint → Format check → Type-check → Test with coverage → Build

#### Dev Tag (`dev-tag.yml`)

**Trigger:** After CI passes on `main`, or manual dispatch.

**Flow:**

1. Waits for CI to pass on `main`
2. Calculates dev version from latest release tag + commit count
3. Creates and pushes tag (e.g. `v1.2.3-dev.5`)

**Version calculation:**

- Latest tag: `v1.2.3` → 5 commits since → `v1.2.3-dev.5`
- No tags yet → `v0.0.0-dev.12`

#### Deploy (`deploy.yml`)

**Trigger:** Tag push (`v*`) or manual dispatch (enter any tag).

**Flow:**

1. Detects environment from tag name (`-dev` = staging, else production)
2. Writes `.env` with correct `VITE_API_BASE_URL` and `VITE_APP_ENV`
3. Builds static assets
4. Rsyncs `dist/` to server

**Concurrency:** Only one deploy at a time.

**GitHub environments:** Dev tags show as "staging", release tags as "production".

#### Release (`release.yml`)

**Trigger:** Manual dispatch with version input (e.g. `1.2.3`).

**Flow:**

1. Validates version format
2. Creates annotated tag
3. Creates GitHub Release with auto-generated notes

Tag push triggers `deploy.yml` → production deploy.

### Deploy a specific tag

From GitHub Actions → Deploy → Run workflow → enter tag (e.g. `v1.2.3-dev.5`).

### Staging banner

Staging builds show a yellow "STAGING" bar at the top. Controlled by `VITE_APP_ENV` env variable baked in at build time.

### Required secrets

| Secret                      | Purpose                                   |
| --------------------------- | ----------------------------------------- |
| `VITE_API_BASE_URL`         | Production API URL                        |
| `STAGING_VITE_API_BASE_URL` | Staging API URL                           |
| `SSH_PRIVATE_KEY`           | VPS SSH key                               |
| `SSH_HOST`                  | VPS hostname/IP                           |
| `SSH_USER`                  | VPS SSH user                              |
| `SSH_TARGET_PATH`           | Production directory on VPS               |
| `SSH_STAGING_TARGET_PATH`   | Staging directory on VPS                  |
| `APP_CLIENT_ID`             | GitHub App client ID (for tag creation)   |
| `APP_PRIVATE_KEY`           | GitHub App private key (for tag creation) |
