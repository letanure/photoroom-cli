# Release Process

This project uses automated changelog generation and GitHub releases based on conventional commits.

## Local Release Commands

```bash
# Automatic release (determines version bump from commits)
npm run release

# Specific version bumps
npm run release:patch    # 1.0.0 → 1.0.1
npm run release:minor    # 1.0.0 → 1.1.0  
npm run release:major    # 1.0.0 → 2.0.0

# Dry run to see what would be released
npm run release:dry-run
```

## GitHub Actions

### Automatic Releases
- **Trigger**: Every push to `main` branch
- **Conditions**: 
  - Commit message doesn't contain `chore(release)`
  - Files changed are not just CHANGELOG.md or package.json
- **Process**:
  1. Runs linting and type checking
  2. Builds the project
  3. Analyzes commit messages since last release
  4. Bumps version in package.json
  5. Updates CHANGELOG.md
  6. Creates git tag
  7. Pushes changes
  8. Creates GitHub release

### Manual Releases
- **Trigger**: Manual workflow dispatch in GitHub Actions
- **Options**:
  - Release type: patch/minor/major
  - Dry run option
- **Use case**: When you want to force a specific version bump

## Commit Message Format

Use conventional commits for automatic changelog generation:

```bash
# Features (minor version bump)
feat: add named API key management
feat(api): support multiple environments

# Bug fixes (patch version bump)  
fix: resolve API key validation issue
fix(cli): handle empty config gracefully

# Breaking changes (major version bump)
feat!: redesign API key management interface
BREAKING CHANGE: old config format no longer supported

# Other types (no version bump)
docs: update README with new features
style: clean up emoji usage in UI
refactor: simplify API key resolution logic
chore: update dependencies
```

## Changelog

The changelog is automatically generated from commit messages and includes:

- **Features**: New functionality
- **Bug Fixes**: Resolved issues  
- **Performance Improvements**: Performance enhancements
- **Code Refactoring**: Code improvements without functional changes
- **Documentation**: Documentation updates
- **Styles**: UI/formatting changes
- **Tests**: Test additions/modifications
- **Chores**: Maintenance tasks

## GitHub Release Notes

Each GitHub release includes:
- Release title with version tag
- Extracted changelog section for that version
- Direct links to commits and comparisons
- Downloadable assets (if any)

## Manual Release Process

If you need to release manually without GitHub Actions:

1. Make sure all changes are committed
2. Run `npm run release:dry-run` to preview
3. Run the appropriate release command
4. Push the changes: `git push --follow-tags origin main`
5. The GitHub Action will create the GitHub release automatically