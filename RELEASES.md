# 🚀 Release & Changelog System

This project has a complete automated release system with changelog generation and GitHub releases.

## 📋 Available Commands

```bash
# Quick release commands
npm run release              # Auto-detect version bump from commits
npm run release:patch        # 1.0.0 → 1.0.1 (bug fixes)
npm run release:minor        # 1.0.0 → 1.1.0 (new features)
npm run release:major        # 1.0.0 → 2.0.0 (breaking changes)
npm run release:dry-run      # Preview what would be released

# Interactive release script
./scripts/release.sh [patch|minor|major]
```

## 🔄 Automated GitHub Workflow

### Automatic Releases (on push to main)
- **Triggers**: Every push to `main` branch (except release commits)
- **Process**: 
  1. ✅ Runs linting & type checking
  2. 🏗️ Builds the project
  3. 📊 Analyzes commits for version bump
  4. 📝 Updates CHANGELOG.md
  5. 🔖 Creates git tag
  6. 📤 Pushes changes
  7. 🎯 Creates GitHub release

### Manual Releases (GitHub Actions)
- **Trigger**: Manual workflow dispatch
- **Options**: patch/minor/major + dry-run mode
- **Use**: When you want to force a specific version

## 📝 Commit Message Format

Use conventional commits for automatic changelog generation:

```bash
# New features (minor bump)
feat: add named API key management
feat(ui): improve error messages

# Bug fixes (patch bump) 
fix: resolve API key validation
fix(config): handle empty config files

# Breaking changes (major bump)
feat!: redesign API structure
BREAKING CHANGE: config format changed

# Other types (no version bump)
docs: update README
style: remove excessive emojis
refactor: simplify key resolution
chore: update dependencies
test: add unit tests
perf: optimize API calls
```

## 📊 Generated Changelog

Automatically categorizes commits into:

- **Features** - New functionality
- **Bug Fixes** - Issue resolutions  
- **Performance Improvements** - Optimizations
- **Code Refactoring** - Code improvements
- **Documentation** - Doc updates
- **Styles** - UI/formatting changes
- **Tests** - Test modifications
- **Chores** - Maintenance tasks

## 🎯 GitHub Releases

Each release includes:
- 📋 Release notes from CHANGELOG.md
- 🔗 Links to commits and comparisons
- 📁 Source code downloads
- 🏷️ Semantic version tags

## 🛠️ Local Development Workflow

1. **Make changes** with conventional commits
2. **Test release**: `npm run release:dry-run`
3. **Create release**: `npm run release` or `./scripts/release.sh`
4. **Push**: `git push --follow-tags origin main`
5. **GitHub Actions** creates the GitHub release automatically

## 🔧 Configuration Files

- **`.versionrc.json`** - standard-version config
- **`.github/workflows/release.yml`** - Automatic releases
- **`.github/workflows/manual-release.yml`** - Manual releases
- **`scripts/release.sh`** - Interactive release script

## 📦 Package.json Updates

The system automatically:
- ✅ Bumps version number
- ✅ Updates package-lock.json
- ✅ Maintains package metadata
- ✅ Keeps git repository links current

## 🚨 Important Notes

- Never manually edit `CHANGELOG.md` - it's auto-generated
- Always use conventional commit messages
- Test with `--dry-run` before actual releases
- GitHub Actions need `GITHUB_TOKEN` permissions (auto-provided)
- Releases require clean git working directory