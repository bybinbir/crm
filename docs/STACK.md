# Technology Stack

## Overview

CRM Analiz Platform uses modern, production-grade technologies chosen for reliability, developer experience, and long-term maintainability.

## Stack Summary

| Layer               | Technology   | Version | Purpose                                 |
| ------------------- | ------------ | ------- | --------------------------------------- |
| **Build System**    | Turborepo    | 2.3+    | Monorepo build orchestration            |
| **Package Manager** | pnpm         | 9.15+   | Fast, disk-efficient package management |
| **Language**        | TypeScript   | 5.7+    | Type-safe JavaScript                    |
| **Web Framework**   | Next.js      | 15.1+   | React framework with SSR                |
| **API Framework**   | NestJS       | 10.4+   | Node.js backend framework               |
| **UI Library**      | React        | 18.3+   | Component-based UI                      |
| **Styling**         | Tailwind CSS | 3.4+    | Utility-first CSS                       |
| **Database**        | PostgreSQL   | 16+     | Relational database                     |
| **Cache**           | Redis        | 7+      | In-memory data store                    |
| **Testing**         | Jest         | 29+     | JavaScript testing                      |
| **Linting**         | ESLint       | 9.18+   | Code quality                            |
| **Formatting**      | Prettier     | 3.4+    | Code formatting                         |
| **Deployment**      | systemd      | -       | Native process management               |

## Detailed Stack

### Build & Development Tools

#### Turborepo

- **Version:** 2.3.5
- **Purpose:** Monorepo build orchestration and caching
- **Why:**
  - Intelligent build caching
  - Parallel task execution
  - Simple configuration
  - Better performance than alternatives

**Configuration:** `turbo.json`

#### pnpm

- **Version:** 9.15.4
- **Purpose:** Package manager
- **Why:**
  - Faster than npm/yarn
  - Efficient disk usage (content-addressable storage)
  - Built-in workspace support
  - Strict dependency resolution

**Configuration:** `pnpm-workspace.yaml`

#### TypeScript

- **Version:** 5.7.3
- **Purpose:** Type-safe JavaScript
- **Why:**
  - Catch errors at compile time
  - Excellent IDE support
  - Better refactoring
  - Industry standard

**Modes:**

- Strict mode enabled
- No implicit any
- Strict null checks
- No unused locals/params

**Configuration:** `packages/config/tsconfig.*.json`

### Frontend Stack

#### Next.js

- **Version:** 15.1.6
- **Purpose:** React framework
- **Why:**
  - App Router (modern routing)
  - React Server Components
  - Built-in optimization
  - Excellent DX
  - Production-ready

**Key Features Used:**

- App Router
- Server-side rendering (SSR)
- API routes (minimal, mostly for BFF)
- Image optimization
- Font optimization

**Configuration:** `apps/web/next.config.ts`

#### React

- **Version:** 18.3.1
- **Purpose:** UI library
- **Why:**
  - Component-based architecture
  - Large ecosystem
  - Industry standard
  - Server Components support

#### Tailwind CSS

- **Version:** 3.4.17
- **Purpose:** Styling
- **Why:**
  - Utility-first approach
  - Rapid development
  - Consistent design system
  - Small production bundle
  - No CSS naming issues

**Configuration:** `apps/web/tailwind.config.ts`

### Backend Stack

#### NestJS

- **Version:** 10.4.15
- **Purpose:** Node.js backend framework
- **Why:**
  - Enterprise-grade architecture
  - Modular design
  - Dependency injection
  - TypeScript-first
  - Excellent documentation
  - Built-in testing support

**Key Modules Used:**

- @nestjs/core - Core framework
- @nestjs/common - Common utilities
- @nestjs/config - Configuration management
- @nestjs/platform-express - Express adapter

**Configuration:** `apps/api/nest-cli.json`

#### PostgreSQL

- **Version:** 16+
- **Purpose:** Primary database
- **Why:**
  - ACID compliance
  - Robust and reliable
  - JSON/JSONB support
  - Full-text search
  - Excellent performance
  - Rich ecosystem

**Future ORM:** Prisma (to be added)

#### Redis

- **Version:** 7+
- **Purpose:** Caching and sessions
- **Why:**
  - Extremely fast (in-memory)
  - Versatile data structures
  - Pub/sub support
  - Session storage
  - Job queues (future)

### Quality & Testing

#### ESLint

- **Version:** 9.18.0
- **Purpose:** Code linting
- **Plugins:**
  - @typescript-eslint
  - eslint-plugin-import
  - eslint-config-next (for web)

**Configuration:** `packages/config/eslint-base.js`

#### Prettier

- **Version:** 3.4.2
- **Purpose:** Code formatting
- **Rules:**
  - Semi-colons: required
  - Quotes: single
  - Trailing comma: es5
  - Print width: 80
  - Tab width: 2

**Configuration:** `.prettierrc.json`

#### Jest

- **Version:** 29.7.0
- **Purpose:** Testing framework
- **Extensions:**
  - ts-jest - TypeScript support
  - @testing-library/react - React testing
  - @testing-library/jest-dom - DOM matchers
  - supertest - API testing

**Configuration:** `package.json` (jest section)

#### Husky

- **Version:** 9.1.7
- **Purpose:** Git hooks
- **Hooks:**
  - pre-commit: lint-staged
  - commit-msg: commitlint

#### lint-staged

- **Version:** 15.3.0
- **Purpose:** Run linters on staged files
- **Tasks:**
  - ESLint fix
  - Prettier format

**Configuration:** `.lintstagedrc.json`

#### commitlint

- **Version:** 19.6.0
- **Purpose:** Enforce commit message convention
- **Standard:** Conventional Commits

**Configuration:** `commitlint.config.js`

### Versioning & Release

#### Changesets

- **Version:** 2.27.11
- **Purpose:** Semantic versioning and changelog
- **Why:**
  - Modern alternative to Lerna
  - Clear versioning workflow
  - Automatic changelog generation
  - Monorepo support

**Configuration:** `.changeset/config.json`

### DevOps

#### systemd

- **Purpose:** Native process management for production
- **Services:**
  - `crm-analiz-api.service` - API server
  - `crm-analiz-web.service` - Web application

#### GitHub Actions

- **Purpose:** CI/CD
- **Workflows:**
  - CI: Lint, typecheck, test, build
  - Future: CD, deploy, release

**Configuration:** `.github/workflows/ci.yml`

### IDE Support

#### VS Code

- **Extensions:**
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - EditorConfig
  - GitLens
  - Error Lens
  - Jest Runner

**Configuration:**

- `.vscode/settings.json`
- `.vscode/extensions.json`
- `.editorconfig`

## Future Additions

### Planned (Phase 2)

- **Prisma** - Database ORM
- **Zod** - Runtime type validation
- **React Hook Form** - Form management
- **TanStack Query** - Data fetching
- **Recharts** - Data visualization
- **date-fns** - Date manipulation

### Considered (Phase 3+)

- **Playwright** - E2E testing
- **Storybook** - Component documentation
- **Sentry** - Error tracking
- **Grafana** - Metrics dashboard
- **RabbitMQ** - Message queue
- **Minio** - Object storage

## Version Management

### Update Strategy

- **Patch versions:** Update freely (bug fixes)
- **Minor versions:** Update with testing (new features)
- **Major versions:** Careful evaluation (breaking changes)

### Update Frequency

- Monthly dependency review
- Security patches immediately
- Framework updates quarterly

## Performance Considerations

### Build Performance

- Turborepo caching
- Parallel builds
- Incremental compilation
- pnpm linking

### Runtime Performance

- Next.js optimizations
- Redis caching
- Database indexing
- Query optimization

### Bundle Size

- Tree shaking
- Code splitting
- Dynamic imports
- Image optimization

## Security Updates

### Monitoring

- Dependabot alerts (GitHub)
- `pnpm audit` regular runs
- Security advisories subscription

### Response

- Critical: Immediate patch
- High: Within 24 hours
- Medium: Within 1 week
- Low: Next sprint

## Compatibility Matrix

| Stack | Node.js | pnpm  | TypeScript |
| ----- | ------- | ----- | ---------- |
| 0.1.0 | 20+     | 9.15+ | 5.7+       |

### Browser Support

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- Mobile: iOS 14+, Android 10+

## References

- [Next.js Docs](https://nextjs.org/docs)
- [NestJS Docs](https://docs.nestjs.com)
- [Turborepo Docs](https://turbo.build/repo/docs)
- [pnpm Docs](https://pnpm.io)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

**Last Updated:** 2026-03-25
**Version:** 0.1.0
