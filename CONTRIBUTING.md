# Contributing

## Workflow (GitHub Flow)

1. `main` is always deployable. Never commit to it directly.
2. Create a short-lived branch from `main`:

   | Prefix      | Use for                                 |
   | ----------- | --------------------------------------- |
   | `feat/`     | New functionality                       |
   | `fix/`      | Bug fixes                               |
   | `chore/`    | Tooling, dependencies, configuration    |
   | `docs/`     | Documentation only                      |
   | `refactor/` | Code changes that don't alter behaviour |
   | `test/`     | Adding or improving tests               |

   Example: `feat/product-catalog`.

3. Make small, focused commits (see below).
4. Open a pull request to `main`. Lint, type checks and tests must pass.
5. Merge, delete the branch, deploy.

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <summary in the imperative, lower case>

<optional body: what and why, wrapped at 72 characters>
```

- **Types**: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`, `ci`, `build`
- **Scopes**: `web`, `api`, `shared`, or omit for repo-wide changes

Examples:

```
feat(api): add product listing endpoint
fix(web): show error state when the cart fails to load
chore: upgrade turborepo
```

## Before opening a pull request

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Architecture decisions

Significant technical decisions are recorded as ADRs in [`docs/adr`](docs/adr). Add one when
you introduce a new dependency with wide impact, change a convention, or pick between
competing approaches.
