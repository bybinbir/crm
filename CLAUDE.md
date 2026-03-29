# CRM Analiz - Project Constitution

## Project Identity

**Name:** CRM Analiz Platform
**Version:** 0.1.0
**Type:** Analytics & Decision Support System
**Owner:** Internal Development Team
**Status:** Foundation Phase

## Mission

Build a production-grade, scalable analytics and decision support platform that analyzes ISSmanager CRM data to provide:

- Neighborhood-based customer quality scoring
- Personnel performance insights
- Executive decision support
- Financial analytics and reporting

This is NOT a replacement CRM. ISSmanager remains the system of record. We extract, normalize, score, and report.

## Product Truths

### Core Principles

1. **System of Record:** ISSmanager is the authoritative data source
2. **Our Role:** Analytics layer + Decision support + Reporting
3. **No Churn Metric:** Churn analysis is explicitly excluded from scope
4. **Geographic Granularity:** Customer quality scores are at neighborhood (mahalle) level, not district or city
5. **Dynamic Integration:** ISSmanager settings (API keys, endpoints) are configurable via dashboard, never hardcoded
6. **Premium Quality:** Apple-level design standards - clean, refined, no clutter

### Data Flow

```
ISSmanager → Extract → Normalize → Score → Analyze → Report → Decide
```

## Non-Negotiable Rules

### Security & Secrets

- ❌ NO real credentials, API keys, passwords, or URLs in repository
- ✅ ONLY placeholders in `.env.example` and documentation
- ✅ All secrets configurable via secure dashboard interface
- ✅ Encrypted storage for sensitive configuration
- ✅ Audit logging for all configuration changes

### Code Quality

- ✅ TypeScript strict mode mandatory
- ✅ No `any` types without explicit justification
- ✅ All functions and complex logic documented
- ✅ ESLint and Prettier rules enforced
- ✅ Import sorting and consistent file naming
- ❌ NO temporary hacks or quick fixes
- ❌ NO console.log in production code (use proper logging)

### Architecture

- ✅ Monorepo structure maintained
- ✅ Clear separation of concerns (web, api, packages)
- ✅ Shared types enforced across stack
- ✅ Database migrations versioned and reversible
- ✅ API versioning (currently v1)
- ❌ NO direct database access from web app
- ❌ NO business logic in components
- ❌ NO circular dependencies between packages

### Testing

- ✅ Unit tests for business logic
- ✅ Integration tests for API endpoints
- ✅ E2E tests for critical user flows
- ✅ Test coverage tracked and reported
- ❌ NO PR merge without passing tests

## Execution Mode

### No-Question / No-Approval Policy

Claude operates with **full autonomy** within these boundaries:

**✅ ALWAYS EXECUTE DIRECTLY:**

- File operations (Read, Write, Edit, Glob, Grep)
- Code writing and refactoring
- Test execution
- Local database operations (development only)
- Git operations on feature branches
- Package installation
- Build and lint operations
- Documentation updates

**⛔ ONLY STOP FOR:**

1. External API keys or secrets not in secure config
2. Production database destructive operations
3. Financial transactions or payment operations

**❌ FORBIDDEN PHRASES:**

- "Should I proceed?"
- "Do you want me to..."
- "Shall we..."
- "Would you like..."

**✅ CORRECT COMMUNICATION:**

- "Implementing X..."
- "Running Y script..."
- "Z completed, moving to W..."

### Workflow Protocol

1. **Read First:** Always read `CLAUDE.md` and `task_dash.md` before starting work
2. **Analyze Impact:** Assess what will change and potential side effects
3. **Execute:** Implement changes following all quality standards
4. **Test:** Verify changes work correctly
5. **Document:** Update relevant docs and task_dash.md
6. **Report:** Provide clear status with next steps

### Self-Correction Loop

After ANY correction from user:

1. Update `task_dash.md` with lesson learned
2. Add preventive rule to avoid same mistake
3. Iterate until error rate drops to zero
4. Review lessons at session start

## Architecture Principles

### Technology Stack

- **Build System:** Turborepo + pnpm workspace
- **Web:** Next.js 15 (App Router)
- **API:** NestJS
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL
- **Cache:** Redis
- **Styling:** Tailwind CSS
- **Testing:** Jest + Testing Library
- **CI/CD:** GitHub Actions
- **Deployment:** systemd

### Project Structure

```
crmanaliz/
├── apps/
│   ├── web/          # Next.js dashboard
│   └── api/          # NestJS backend
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── ui/           # Shared UI components
│   └── config/       # Shared configs (TS, ESLint)
├── docs/             # Documentation
└── scripts/          # Utility scripts
```

### Domain Structure

- **auth:** Authentication and authorization
- **integrations:** External system connectors (ISSmanager)
- **neighborhoods:** Geographic data and quality scoring
- **customers:** Customer data and insights
- **personnel:** Personnel performance tracking
- **finance:** Financial metrics and reporting
- **analytics:** Data analysis and scoring algorithms
- **reporting:** Report generation and distribution

### API Design

- RESTful endpoints under `/api/v1`
- Versioned for backward compatibility
- Proper HTTP status codes
- Consistent error response format
- Request validation with DTOs
- Response pagination for lists

## UI/UX Standards

### Design Philosophy

- **Minimalism:** Remove unnecessary elements
- **Clarity:** Every element has clear purpose
- **Consistency:** Uniform patterns throughout
- **Responsiveness:** Works on all screen sizes
- **Accessibility:** WCAG 2.1 AA compliance

### Component Guidelines

- Reusable components in `packages/ui`
- Props properly typed with TypeScript
- Variants for different contexts
- Consistent spacing and sizing scale
- Dark mode support ready

### Color Palette

- Primary: Blue (#2563eb family)
- Success: Green
- Warning: Yellow
- Danger: Red
- Neutral: Gray scale
- No unnecessary colors

## Git Workflow

### Branch Strategy

- **main:** Production-ready code
- **develop:** Integration branch
- **feature/\*:** New features
- **fix/\*:** Bug fixes
- **refactor/\*:** Code improvements
- **chore/\*:** Maintenance tasks
- **hotfix/\*:** Urgent production fixes
- **release/\*:** Release preparation

### Branch Rules

- ❌ NO direct commits to main or develop
- ✅ All changes via pull requests
- ✅ PR requires passing CI checks
- ✅ Code review before merge
- ✅ Squash merge for clean history

### Commit Convention

Follow Conventional Commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

**Examples:**

```
feat(auth): add JWT token refresh mechanism
fix(api): resolve CORS issue for external requests
docs(readme): update installation instructions
refactor(neighborhoods): optimize quality scoring algorithm
```

### Commit Rules

- ✅ Clear, descriptive subjects
- ✅ Present tense ("add" not "added")
- ✅ No period at end of subject
- ✅ Body explains why, not what
- ✅ Reference issues/tickets in footer

## Versioning Rules

### Semantic Versioning

Follow SemVer: `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes
- **MINOR:** New features (backward compatible)
- **PATCH:** Bug fixes (backward compatible)

### Version Management

- Managed via Changesets
- Version bumps documented in CHANGELOG.md
- Git tags: `vX.Y.Z` format
- All packages versioned together in monorepo

### Release Process

1. Create changeset for changes
2. Run `pnpm changeset version`
3. Update CHANGELOG.md
4. Create release branch
5. PR to main with version bump
6. Tag release after merge
7. Deploy to production

## Documentation Rules

### What to Document

- ✅ Architecture decisions (ADRs)
- ✅ API endpoints and contracts
- ✅ Environment setup
- ✅ Deployment procedures
- ✅ Database schema changes
- ✅ Integration guides
- ✅ Troubleshooting guides

### Documentation Standards

- Keep README.md updated
- Document in code (TSDoc comments)
- Update docs/ when architecture changes
- Include examples in documentation
- Version documentation with code

### File Locations

- `README.md` - Project overview and quick start
- `docs/ARCHITECTURE.md` - System architecture
- `docs/STACK.md` - Technology stack details
- `docs/GIT_WORKFLOW.md` - Git and branch strategy
- `docs/SECURITY.md` - Security guidelines
- `docs/ENVIRONMENT.md` - Environment setup
- `docs/DECISIONS.md` - Architecture decision records

## Testing Rules

### Test Coverage

- ✅ Minimum 80% coverage for critical paths
- ✅ All business logic unit tested
- ✅ All API endpoints integration tested
- ✅ Critical user flows E2E tested

### Test Structure

```typescript
describe('Feature/Component', () => {
  describe('specific scenario', () => {
    it('should behave as expected', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### Test Principles

- Tests should be fast
- Tests should be isolated
- Tests should be deterministic
- Mock external dependencies
- Test behavior, not implementation

## Release Rules

### Pre-Release Checklist

- [ ] All tests passing
- [ ] Linting clean
- [ ] Type checking clean
- [ ] Build successful
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped
- [ ] Security scan passed
- [ ] Performance benchmarks acceptable

### Release Types

- **Patch:** Bug fixes, minor updates
- **Minor:** New features, non-breaking changes
- **Major:** Breaking changes, major refactors

### Release Communication

- Tag releases in Git
- Generate release notes
- Notify stakeholders
- Update production environment
- Monitor post-deployment

## Reporting Format

### Status Reports Include

1. **Summary:** Brief overview of work done
2. **Changes:** List of files/features modified
3. **Tests:** Test results and coverage
4. **Issues:** Problems encountered and solutions
5. **Next Steps:** Recommended next actions
6. **Blockers:** Any impediments identified

### Task Dashboard Updates

- Update `task_dash.md` after every session
- Log all architectural decisions
- Track risks and technical debt
- Document assumptions made
- List deferred items with reasoning

## Done Criteria

### Feature is Done When

- ✅ Code written and reviewed
- ✅ Tests written and passing
- ✅ Documentation updated
- ✅ Linting and type checking clean
- ✅ PR approved and merged
- ✅ Deployed to appropriate environment
- ✅ Verified in target environment

### Sprint is Done When

- ✅ All planned features complete
- ✅ All bugs resolved or deferred
- ✅ All tests passing
- ✅ Documentation current
- ✅ Demo prepared
- ✅ Retrospective conducted

---

## Enforcement

This document is the **single source of truth** for how work is done on CRM Analiz Platform.

**When in doubt:**

1. Read CLAUDE.md
2. Read task_dash.md
3. Make the most professional, production-grade decision
4. Document the decision
5. Execute without asking permission
6. Report results clearly

**Remember:** Long-term clean architecture > short-term hacks. Always.
