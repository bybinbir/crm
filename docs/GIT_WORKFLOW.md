# Git Workflow

## Branch Strategy

### Main Branches

#### main

- **Purpose:** Production-ready code
- **Protection:** Protected, no direct commits
- **Merge:** Only from release/_ or hotfix/_
- **CI/CD:** Triggers production deployment
- **Tags:** All releases tagged (vX.Y.Z)

#### develop

- **Purpose:** Integration branch for next release
- **Protection:** Protected, no direct commits
- **Merge:** From feature/_, fix/_, refactor/\*
- **CI/CD:** Triggers staging deployment
- **State:** Always stable and deployable

### Supporting Branches

#### feature/\*

- **Purpose:** New features
- **Naming:** `feature/short-description`
- **Base:** develop
- **Merge to:** develop
- **Lifetime:** Until feature complete
- **Examples:**
  - `feature/neighborhood-scoring`
  - `feature/personnel-dashboard`
  - `feature/issmanager-sync`

#### fix/\*

- **Purpose:** Bug fixes
- **Naming:** `fix/short-description`
- **Base:** develop
- **Merge to:** develop
- **Lifetime:** Until fix verified
- **Examples:**
  - `fix/login-redirect`
  - `fix/api-cors-issue`
  - `fix/data-sync-error`

#### hotfix/\*

- **Purpose:** Urgent production fixes
- **Naming:** `hotfix/short-description`
- **Base:** main
- **Merge to:** main AND develop
- **Lifetime:** Immediately after fix
- **Examples:**
  - `hotfix/critical-auth-bug`
  - `hotfix/data-leak`

#### release/\*

- **Purpose:** Release preparation
- **Naming:** `release/vX.Y.Z`
- **Base:** develop
- **Merge to:** main AND develop
- **Lifetime:** Until release deployed
- **Examples:**
  - `release/v0.2.0`
  - `release/v1.0.0`

#### refactor/\*

- **Purpose:** Code improvements without functionality change
- **Naming:** `refactor/short-description`
- **Base:** develop
- **Merge to:** develop
- **Examples:**
  - `refactor/api-error-handling`
  - `refactor/type-definitions`

#### chore/\*

- **Purpose:** Maintenance tasks, dependency updates
- **Naming:** `chore/short-description`
- **Base:** develop
- **Merge to:** develop
- **Examples:**
  - `chore/update-dependencies`
  - `chore/improve-ci`

## Workflow Diagrams

### Feature Development Flow

```
develop
   │
   ├── feature/new-feature (create)
   │        │
   │        │ (commits)
   │        │
   │   ◄────┘ (PR + merge)
   │
   ▼
develop (updated)
```

### Hotfix Flow

```
main
   │
   ├── hotfix/critical-fix (create)
   │        │
   │        │ (commits)
   │        │
   ├────────┘ (merge to main)
   │
develop
   │
   └────────── (merge to develop)
```

### Release Flow

```
develop
   │
   ├── release/v1.0.0 (create)
   │        │
   │        │ (version bump, changelog)
   │        │
main ◄─────┘ (merge to main + tag)
   │
develop ◄────── (merge back to develop)
```

## Commit Convention

### Format

Following [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type       | Purpose                 | Example                                       |
| ---------- | ----------------------- | --------------------------------------------- |
| `feat`     | New feature             | `feat(auth): add JWT refresh token`           |
| `fix`      | Bug fix                 | `fix(api): resolve CORS issue`                |
| `docs`     | Documentation           | `docs(readme): update setup instructions`     |
| `style`    | Code style (formatting) | `style(web): fix indentation`                 |
| `refactor` | Code refactoring        | `refactor(analytics): simplify scoring logic` |
| `perf`     | Performance improvement | `perf(db): add index to queries`              |
| `test`     | Tests                   | `test(api): add integration tests`            |
| `build`    | Build system            | `build(deps): update Next.js to 15.1`         |
| `ci`       | CI/CD                   | `ci(actions): add deployment workflow`        |
| `chore`    | Maintenance             | `chore(deps): update dependencies`            |
| `revert`   | Revert commit           | `revert: revert "feat(auth): add OAuth"`      |

### Scope

Scope indicates the area affected:

- `auth` - Authentication
- `api` - API backend
- `web` - Web frontend
- `ui` - UI components
- `types` - Type definitions
- `config` - Configuration
- `db` - Database
- `integrations` - External integrations
- `neighborhoods` - Neighborhoods domain
- `customers` - Customers domain
- `personnel` - Personnel domain
- `analytics` - Analytics domain
- `reporting` - Reporting domain

### Subject

- Use imperative, present tense: "add" not "added" or "adds"
- Don't capitalize first letter
- No period (.) at the end
- Limit to 50 characters

### Body

- Optional, provide context
- Explain WHY, not WHAT (code shows what)
- Wrap at 72 characters
- Separate from subject with blank line

### Footer

- Optional
- Reference issues: `Closes #123`
- Breaking changes: `BREAKING CHANGE: description`

### Examples

**Simple commit:**

```
feat(auth): add password reset flow
```

**With body:**

```
feat(neighborhoods): add quality score caching

Implement Redis caching for neighborhood quality scores to improve
dashboard load time. Cache expires after 1 hour.

Closes #45
```

**Breaking change:**

```
refactor(api): change response format

BREAKING CHANGE: API responses now use standardized format with
success/error wrapper. Update all clients accordingly.

Before: { data: [...] }
After: { success: true, data: [...] }
```

## Pull Request Process

### 1. Create Feature Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-feature
```

### 2. Work & Commit

```bash
# Make changes
git add .
git commit -m "feat(scope): description"

# Push regularly
git push origin feature/my-feature
```

### 3. Create Pull Request

**PR Title:** Same as first commit (conventional format)

**PR Description Template:**

```markdown
## Summary

Brief description of changes

## Changes

- Change 1
- Change 2
- Change 3

## Testing

How to test these changes

## Screenshots (if UI changes)

[Add screenshots]

## Checklist

- [ ] Tests passing
- [ ] Documentation updated
- [ ] No lint errors
- [ ] Types checked
- [ ] Changeset added (if needed)
```

### 4. Code Review

- At least 1 approval required
- All CI checks must pass
- Address review comments
- Update PR as needed

### 5. Merge

- Use "Squash and merge" for clean history
- Delete branch after merge

## Git Commands Reference

### Common Operations

```bash
# Start new feature
git checkout develop
git pull origin develop
git checkout -b feature/feature-name

# Regular commits
git add .
git commit -m "feat(scope): description"
git push origin feature/feature-name

# Update from develop
git checkout develop
git pull origin develop
git checkout feature/feature-name
git merge develop

# Finish feature (via PR)
# After PR merged:
git checkout develop
git pull origin develop
git branch -d feature/feature-name

# Create release
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0
# Update version, changelog
git commit -m "chore(release): prepare v1.0.0"
git push origin release/v1.0.0
# Create PR to main

# Tag release (after merge to main)
git checkout main
git pull origin main
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### Useful Git Commands

```bash
# Check status
git status

# View commit history
git log --oneline --graph --all

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Amend last commit
git commit --amend

# Interactive rebase (clean history)
git rebase -i HEAD~3

# Stash changes
git stash
git stash pop

# View diff
git diff
git diff --staged
```

## Branch Protection Rules

### main Branch

- ✅ Require pull request before merging
- ✅ Require approvals: 1
- ✅ Require status checks to pass
  - CI/CD pipeline
  - All tests
  - Lint
  - Type check
- ✅ Require branches to be up to date
- ✅ Require linear history
- ❌ Allow force pushes: Never
- ❌ Allow deletions: Never

### develop Branch

- ✅ Require pull request before merging
- ✅ Require approvals: 1
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ❌ Allow force pushes: Never
- ❌ Allow deletions: Never

## Versioning

See [Semantic Versioning](https://semver.org/) for version number rules.

### Version Format: X.Y.Z

- **X (Major):** Breaking changes
- **Y (Minor):** New features (backward compatible)
- **Z (Patch):** Bug fixes (backward compatible)

### Changesets Workflow

```bash
# After making changes, create changeset
pnpm changeset

# Answer prompts:
# - Which packages changed? (select affected packages)
# - What type of change? (patch/minor/major)
# - Summary of changes

# Commit changeset
git add .changeset/*
git commit -m "chore: add changeset"

# When ready to release (on release branch)
pnpm changeset version  # Updates versions, CHANGELOG
pnpm install            # Update lockfile
git add .
git commit -m "chore(release): version packages"

# After merge to main
git tag vX.Y.Z
git push origin vX.Y.Z
```

## Best Practices

### Do's ✅

- **Write clear commit messages** - Future you will thank you
- **Commit often** - Small, logical commits are better
- **Pull before push** - Stay up to date
- **Review your own changes** - Before creating PR
- **Keep PRs focused** - One feature/fix per PR
- **Update documentation** - Code + docs together
- **Write tests** - For new features and fixes
- **Respond to reviews** - Timely and professionally

### Don'ts ❌

- **Don't commit secrets** - Never, ever
- **Don't commit large files** - Use Git LFS if needed
- **Don't force push** - Unless you know what you're doing
- **Don't work on main/develop** - Always use feature branches
- **Don't merge without review** - Get approval first
- **Don't leave PRs open** - Review and merge or close
- **Don't ignore CI failures** - Fix them

## Troubleshooting

### Merge Conflicts

```bash
# Update your branch
git checkout develop
git pull origin develop
git checkout feature/my-feature
git merge develop

# Resolve conflicts in files
# After resolving:
git add .
git commit -m "chore: resolve merge conflicts"
git push
```

### Accidentally Committed to Wrong Branch

```bash
# If not pushed yet
git reset --soft HEAD~1  # Undo commit, keep changes
git stash                # Stash changes
git checkout correct-branch
git stash pop            # Apply changes
git add .
git commit -m "..."

# If already pushed
# Create new branch from correct base
# Cherry-pick commits
```

### Need to Update PR

```bash
# Make changes
git add .
git commit -m "fix: address review comments"
git push origin feature/my-feature
# PR automatically updates
```

---

**Last Updated:** 2026-03-25
**Version:** 0.1.0
