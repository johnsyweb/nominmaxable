# nominmaxable

Small static site that reads the public parkrun events GeoJSON, caches it in your browser for seven days, and reports the **longest** and **shortest** `EventLongName` values (by JavaScript string length after trimming) **per event series** and **per country**, plus **global** extremes within each series.

Deployed at [johnsy.com/nominmaxable](https://www.johnsy.com/nominmaxable/).

## Requirements

- [pnpm](https://pnpm.io/) (see `packageManager` in `package.json`)

## Scripts

| Script            | Purpose                                  |
| ----------------- | ---------------------------------------- |
| `pnpm dev`        | Local development server                 |
| `pnpm build`      | Production build to `dist/`              |
| `pnpm preview`    | Preview the production build             |
| `pnpm test:run`   | Unit tests (Vitest, Node environment)    |
| `pnpm lint`       | ESLint                                   |
| `pnpm typecheck`  | TypeScript `--noEmit`                    |
| `pnpm format`     | Prettier write                           |
| `pnpm format:check` | Prettier check                        |
| `pnpm precommit`  | Format check, lint, typecheck, build, tests |

## Data and caching

- Source: `https://images.parkrun.com/events.json`
- Cached under the key `parkrun.nominmaxable.events` with a versioned wrapper `{ v, fetchedAt, body }` where `body` is the raw response text.
- If the cache is older than seven days, the app fetches again on load. If a refresh fails but a previous payload exists, stale data is shown with a warning.

## Licence

MIT. Not affiliated with parkrun Limited.
