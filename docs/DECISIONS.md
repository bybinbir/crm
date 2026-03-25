# Architecture Decision Records (ADRs)

## ADR Format

Each decision includes:

- **Date:** When decision was made
- **Status:** Proposed | Accepted | Deprecated | Superseded
- **Context:** Why we needed to make this decision
- **Decision:** What we decided
- **Consequences:** What becomes easier or harder

---

## ADR-001: Monorepo with Turborepo

**Date:** 2026-03-25
**Status:** Accepted

### Context

Need to manage multiple related packages (web, api, shared libraries) with:

- Consistent tooling
- Shared dependencies
- Coordinated releases
- Fast builds

### Decision

Use monorepo architecture with Turborepo and pnpm workspaces.

### Alternatives Considered

- **Nx:** More features but complex configuration
- **Lerna:** Older, less maintained
- **Separate repos:** Harder to coordinate

### Consequences

**Positive:**

- Single source of truth
- Shared code without publishing
- Coordinated versioning
- Build caching via Turborepo
- Consistent tooling

**Negative:**

- Slightly larger repository
- Learning curve for team
- Requires discipline in dependencies

---

## ADR-002: Next.js for Web Application

**Date:** 2026-03-25
**Status:** Accepted

### Context

Need a React framework with:

- Server-side rendering for performance
- Good developer experience
- Production-ready features
- Active maintenance

### Decision

Use Next.js 15 with App Router.

### Alternatives Considered

- **Create React App:** Deprecated, no SSR
- **Remix:** Less mature ecosystem
- **Vite + React Router:** More manual setup

### Consequences

**Positive:**

- Excellent performance (SSR, RSC)
- Built-in optimizations
- Great developer experience
- Large ecosystem
- Active development

**Negative:**

- Opinionated structure
- Learning curve for App Router
- Vendor lock-in (moderate)

---

## ADR-003: NestJS for API Backend

**Date:** 2026-03-25
**Status:** Accepted

### Context

Need a Node.js backend framework with:

- TypeScript first-class support
- Modular architecture
- Dependency injection
- Enterprise-grade patterns

### Decision

Use NestJS 10 for API backend.

### Alternatives Considered

- **Express:** Lower-level, less structure
- **Fastify:** Fast but less opinionated
- **Koa:** Minimal, requires more setup

### Consequences

**Positive:**

- Modular, scalable architecture
- Excellent TypeScript support
- Dependency injection
- Built-in testing utilities
- Large ecosystem

**Negative:**

- Slightly heavier than Express
- Decorator-heavy (personal preference)
- Learning curve

---

## ADR-004: PostgreSQL as Primary Database

**Date:** 2026-03-25
**Status:** Accepted

### Context

Need a database that:

- Handles relational data
- Supports complex queries
- Provides ACID guarantees
- Handles JSON data
- Scales well

### Decision

Use PostgreSQL 16+.

### Alternatives Considered

- **MySQL:** Less feature-rich
- **MongoDB:** Not relational, eventual consistency
- **SQLite:** Not suitable for production scale

### Consequences

**Positive:**

- Robust and reliable
- Excellent query performance
- JSON support (JSONB)
- Full-text search
- Strong community

**Negative:**

- More complex than NoSQL for simple cases
- Requires schema management
- Vertical scaling limits (addressed with read replicas)

---

## ADR-005: Redis for Caching and Sessions

**Date:** 2026-03-25
**Status:** Accepted

### Context

Need a fast cache and session store:

- Sub-millisecond access
- Session persistence
- Future job queue support

### Decision

Use Redis 7+ for caching and session management.

### Alternatives Considered

- **Memcached:** Less versatile data structures
- **In-memory cache:** Not persistent, doesn't scale
- **Database cache:** Too slow

### Consequences

**Positive:**

- Extremely fast
- Versatile (cache, sessions, queues)
- Proven at scale
- Simple to use

**Negative:**

- Another service to manage
- Memory-based (cost consideration)
- Requires cluster for HA

---

## ADR-006: TypeScript Strict Mode

**Date:** 2026-03-25
**Status:** Accepted

### Context

Need to maximize type safety and catch bugs early.

### Decision

Enable TypeScript strict mode across all packages.

### Alternatives Considered

- Loose TypeScript (easier migration)
- JavaScript (no types)

### Consequences

**Positive:**

- Catch errors at compile time
- Better IDE support
- Safer refactoring
- Self-documenting code

**Negative:**

- More verbose code in some cases
- Steeper learning curve
- Initial setup effort

---

## ADR-007: Tailwind CSS for Styling

**Date:** 2026-03-25
**Status:** Accepted

### Context

Need a styling solution that:

- Enables rapid development
- Provides consistency
- Produces small bundles
- Works well with components

### Decision

Use Tailwind CSS with custom design system.

### Alternatives Considered

- **CSS Modules:** More boilerplate
- **Styled Components:** Runtime overhead
- **Vanilla CSS:** Harder to maintain

### Consequences

**Positive:**

- Fast development
- Consistent design system
- Small production bundles
- No naming conflicts

**Negative:**

- Long className strings
- Learning curve for utility classes
- Requires purging in production

---

## ADR-008: Changesets for Versioning

**Date:** 2026-03-25
**Status:** Accepted

### Context

Need semantic versioning and changelog management for monorepo.

### Decision

Use Changesets for versioning and releases.

### Alternatives Considered

- **Lerna:** Less actively maintained
- **Manual versioning:** Error-prone
- **semantic-release:** More complex setup

### Consequences

**Positive:**

- Clear versioning workflow
- Automatic changelog
- Monorepo support
- Active maintenance

**Negative:**

- Extra step in workflow
- Requires discipline
- Learning curve

---

## ADR-009: Conventional Commits

**Date:** 2026-03-25
**Status:** Accepted

### Context

Need standardized commit messages for:

- Clear history
- Automatic changelog
- Semantic versioning

### Decision

Enforce Conventional Commits via commitlint.

### Alternatives Considered

- Free-form commits (no standard)
- Custom format (reinventing wheel)

### Consequences

**Positive:**

- Clear commit history
- Enables automation
- Industry standard
- Better collaboration

**Negative:**

- Learning curve
- Rejected commits if wrong format
- Feels restrictive initially

---

## ADR-010: ISSmanager as System of Record

**Date:** 2026-03-25
**Status:** Accepted

### Context

Define relationship between CRM Analiz and ISSmanager.

### Decision

ISSmanager remains the system of record. CRM Analiz is an analytics layer.

### Consequences

**Positive:**

- Clear responsibilities
- No data duplication issues
- ISSmanager owns CRM data
- Focused scope

**Negative:**

- Dependency on ISSmanager availability
- Sync delays possible
- Cannot fix ISSmanager data issues

---

## ADR-011: No Churn Metric

**Date:** 2026-03-25
**Status:** Accepted

### Context

Decide whether to include churn analysis.

### Decision

Explicitly exclude churn metric from platform.

### Rationale

- Not requested in requirements
- Different definition across contexts
- Can add later if needed
- Focus on requested metrics

### Consequences

**Positive:**

- Clearer scope
- Less complexity
- Faster initial delivery

**Negative:**

- May need to add later
- Some might expect it

---

## ADR-012: Neighborhood-Level Scoring

**Date:** 2026-03-25
**Status:** Accepted

### Context

Define geographic granularity for customer quality scoring.

### Decision

Use neighborhood (mahalle) level, not district or city.

### Rationale

- Explicitly stated in requirements
- More actionable insights
- Better segmentation

### Consequences

**Positive:**

- Fine-grained analysis
- Actionable insights
- Better targeting

**Negative:**

- More data to manage
- Requires accurate geo data
- Privacy considerations

---

## ADR-013: Dashboard-Configurable Integrations

**Date:** 2026-03-25
**Status:** Accepted

### Context

Decide how to manage ISSmanager API credentials.

### Decision

Make integration settings configurable via secure dashboard interface.

### Alternatives Considered

- **Hardcoded:** Insecure, inflexible
- **Config files:** Still requires deployment
- **Environment variables only:** Not user-friendly

### Consequences

**Positive:**

- Flexibility for users
- No code changes needed
- Secure credential storage
- Audit trail

**Negative:**

- More complex implementation
- Need secure config storage
- UI for configuration needed

---

## ADR-014: Husky + lint-staged for Quality

**Date:** 2026-03-25
**Status:** Accepted

### Context

Need to enforce code quality before commits.

### Decision

Use Husky for git hooks and lint-staged for pre-commit checks.

### Consequences

**Positive:**

- Automatic quality checks
- Prevents bad commits
- Consistent code style

**Negative:**

- Slower commits
- Can be bypassed (--no-verify)
- Setup complexity

---

## ADR-015: Docker for Local Development

**Date:** 2026-03-25
**Status:** Accepted

### Context

Need consistent development environment across team.

### Decision

Provide Docker Compose setup for PostgreSQL, Redis, and optional full stack.

### Alternatives Considered

- **Local installation only:** Inconsistent across machines
- **Docker only:** Forces everyone to use Docker

### Consequences

**Positive:**

- Consistent environment
- Easy setup
- Matches production closer

**Negative:**

- Requires Docker installation
- Some prefer local services
- Slight performance overhead on some systems

---

## Future Decisions

### To Be Decided

- **ORM:** Likely Prisma (ADR pending Phase 2)
- **Testing Strategy:** E2E tool (Playwright vs Cypress)
- **Deployment Platform:** Cloud provider selection
- **Monitoring:** Observability stack
- **CI/CD:** Deployment automation details

---

**Last Updated:** 2026-03-25
**Version:** 0.1.0
