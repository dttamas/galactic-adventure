# Galactic Spacefarer Adventure

[![CI](https://github.com/dttamas/galactic-adventure/actions/workflows/ci.yml/badge.svg)](https://github.com/dttamas/galactic-adventure/actions/workflows/ci.yml)

A SAP CAP (Node.js, TypeScript) service with a Fiori Elements List Report and Object Page for managing spacefarers. Built as the SAP BTP Full Stack assessment.

## Assessment tasks

| Task                                          | Where                                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Data model (Spacefarer, Department, Position) | `db/schema.cds`, seed data in `db/data/`                                                                           |
| Service with CRUD                             | `srv/galactic-service.cds`, wired in `srv/galactic-service.ts`                                                     |
| Before CREATE: defaults and validation        | `srv/handlers/candidate.ts`, rules in `srv/lib/rules.ts`                                                           |
| After CREATE: welcome email                   | `srv/handlers/welcome.ts`, `srv/lib/notifier.ts`                                                                   |
| List Report                                   | `app/spacefarers/annotations.cds`, labels and value helps in `app/common.cds`                                      |
| Object Page with editing (draft)              | `app/spacefarers/annotations.cds`, `@odata.draft.enabled` in `srv/galactic-service.cds`                            |
| SQLite for local development                  | `@cap-js/sqlite`, in-memory database seeded from `db/data/`                                                        |
| Authorized users only, planet isolation       | `@requires` and `@restrict` in `srv/galactic-service.cds`, `srv/handlers/planet-guard.ts`, users in `package.json` |

## Getting started

Needs Node.js 22.13 or later and pnpm.

```sh
pnpm install
pnpm run watch
```

Open <http://localhost:4004/galactic.spacefarers/index.html> and log in with a mock user. The password is the user name.

`pnpm start` is for the built app: run `pnpm run build`, then `pnpm start` in `gen/srv`. From the project root it would skip the TypeScript handlers, so use `pnpm run watch` for development.

| User    | Sees                 |
| ------- | -------------------- |
| `alice` | Planet X spacefarers |
| `bob`   | Planet Y spacefarers |
| `admin` | all spacefarers      |

## Tests

`pnpm run check` runs `cds lint`, ESLint, the Prettier check, `tsc` and the Vitest suite (unit tests plus `cds.test` integration tests against the in-memory database).

The OPA tests for the Fiori app run in the browser while `pnpm run watch` is running: <http://localhost:4004/galactic.spacefarers/test/integration/opaTests.qunit.html>.

## Project structure

- `db/` data model and CSV seed data
- `srv/` service definition; `handlers/` holds the event handlers, `lib/` the pure rules and the notifier
- `app/` Fiori Elements app (`app/spacefarers/`) and its annotations
- `_i18n/` UI labels (`i18n.properties`) and runtime and email texts (`messages.properties`)
- `test/` Vitest tests

## Notes and limitations

- Mocked auth is for development only. Production expects XSUAA and does not start without it.
- The welcome email is only logged by default. It is sent over SMTP when `SMTP_HOST` is set (`SMTP_PORT`, `SMTP_FROM` optional).
- Images are stored as relative paths, so they show as placeholders in the FLP sandbox. In production they would be `LargeBinary @Core.MediaType` fields.
- TypeScript is pinned to 6.0 until typescript-eslint supports 7.
