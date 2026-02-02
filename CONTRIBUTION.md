# Contribution Guidelines

Thanks for your interest in contributing to Voxora! Please read these guidelines before opening an issue or pull request.

## Getting started

- Follow the Quick start guide in README to set up Docker services and run the apps.
- Use Node.js >= 18 and npm 10+.
- Copy `.env.development` to `.env` in `apps/api` and `apps/web` (adjust as needed).

## Project structure

- `apps/web`: Next.js 15 React 19 app (UI, pages, components)
- `apps/api`: Express + Socket.IO backend (routes, sockets, models)
- `packages/*`: shared configs (ESLint, TS)
- `docker/`: local dev services

## Development workflow

1. Fork the repo and create a feature branch from `main`.
2. Keep changes focused and small. One PR per logical change.
3. Write clear commit messages (Conventional Commits encouraged):
   - feat: add X
   - fix: correct Y
   - docs: update Z
4. Ensure code builds, lints, and types check:

```bash
npm i
```

5. Verify the apps run locally:

```bash
npm run dev:full
```

6. Add/update minimal tests where appropriate (if/when test harness exists).

## Style and quality

- Run `npm run format` before pushing.
- Follow existing patterns, naming, and folder structure.
- Validate API changes with helpful error handling and input validation.
- Avoid committing `.env` files, build artifacts, or large assets.

## Security & secrets

- Never commit secrets. Use environment variables.
- Disclose security issues privately (do not open public issues).

## License

By contributing, you agree that your contributions will be licensed under the repository’s license (see `LICENSE`).

## Contributor Agreement

By submitting a pull request (PR) to this repository, you agree that:
1. Your contributions will be licensed under the Voxora Custom License v1.0.
2. You do not gain any ownership, equity, or legal rights in Voxora the company.
3. The copyright for your contributions is granted to Voxora under the terms of the license.


## PR checklist

- [ ] Small, focused changes with a clear description
- [ ] Lint/typecheck/build pass
- [ ] Local smoke test completed
- [ ] Docs/README updated if behavior changes
