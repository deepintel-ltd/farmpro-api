# 📦 Contracts Publishing Guide

This guide explains how to build, validate, and publish the FarmPro API contracts package from the main repository without needing to `cd` into the contracts folder.

## 🚀 Quick Start

### Basic Commands

```bash
# Build contracts
npm run contracts:build

# Validate contracts
npm run contracts:validate

# Publish to GitHub (creates tag and pushes)
npm run contracts:publish:github

# Publish to NPM
npm run contracts:publish:npm

# Full publish (version bump + build + validate + github + npm)
npm run contracts:publish:all
```

### Advanced Publishing

```bash
# Using the Node.js script
node scripts/publish-contracts.js [command] [options]

# Using the shell script
./scripts/publish-contracts.sh [command] [options]
```

## 📋 Available Commands

### Basic Scripts (npm run)

| Command | Description |
|---------|-------------|
| `contracts:install` | Install contracts dependencies |
| `contracts:build` | Build contracts package |
| `contracts:build:watch` | Build contracts in watch mode |
| `contracts:clean` | Clean contracts build artifacts |
| `contracts:type-check` | Run TypeScript type checking |
| `contracts:type-check:strict` | Run strict TypeScript type checking |
| `contracts:lint` | Lint contracts code |
| `contracts:lint:fix` | Fix linting issues |
| `contracts:test:types` | Run type safety tests |
| `contracts:test:runtime` | Run runtime validation tests |
| `contracts:validate` | Run all validation checks |
| `contracts:prepublish` | Prepare for publishing |
| `contracts:publish` | Publish to NPM |
| `contracts:version` | Update package version |
| `contracts:all` | Install + build + validate |

### Publishing Scripts (npm run)

| Command | Description |
|---------|-------------|
| `contracts:publish:build` | Build contracts only |
| `contracts:publish:validate` | Validate contracts only |
| `contracts:publish:version` | Update version (patch) |
| `contracts:publish:github` | Publish to GitHub only |
| `contracts:publish:npm` | Publish to NPM only |
| `contracts:publish:all` | Full publish workflow |

### Advanced Script Commands

| Command | Description | Options |
|---------|-------------|---------|
| `build` | Build contracts package only | - |
| `validate` | Validate contracts package only | - |
| `version` | Update package version | `patch`, `minor`, `major` |
| `github` | Publish to GitHub (create tag and push) | - |
| `npm` | Publish to NPM registry | - |
| `all` | Full publish workflow | `patch`, `minor`, `major` |

## 🔄 Publishing Workflows

### 1. Development Workflow

```bash
# Make changes to contracts
# ...

# Build and validate
npm run contracts:build
npm run contracts:validate

# Test locally
npm run contracts:test:types
npm run contracts:test:runtime
```

### 2. Version Bump Workflow

```bash
# Bump patch version (1.0.0 -> 1.0.1)
npm run contracts:publish:version

# Bump minor version (1.0.0 -> 1.1.0)
node scripts/publish-contracts.js version minor

# Bump major version (1.0.0 -> 2.0.0)
node scripts/publish-contracts.js version major
```

### 3. GitHub Publishing Workflow

```bash
# Publish to GitHub (creates tag and pushes)
npm run contracts:publish:github

# This will:
# 1. Check git status
# 2. Build contracts
# 3. Validate contracts
# 4. Commit version changes
# 5. Create git tag (contracts-v1.0.1)
# 6. Push to GitHub
```

### 4. NPM Publishing Workflow

```bash
# Publish to NPM
npm run contracts:publish:npm

# This will:
# 1. Build contracts
# 2. Validate contracts
# 3. Publish to NPM registry
```

### 5. Full Publishing Workflow

```bash
# Complete publish workflow
npm run contracts:publish:all

# Or with specific version bump
node scripts/publish-contracts.js all minor

# This will:
# 1. Check git status
# 2. Update version
# 3. Build contracts
# 4. Validate contracts
# 5. Commit and tag changes
# 6. Push to GitHub
# 7. Publish to NPM
```

## 🛠️ Script Details

### Node.js Script (`scripts/publish-contracts.js`)

- **Features**: Full-featured publishing script with colored output
- **Dependencies**: Node.js built-in modules only
- **Cross-platform**: Works on Windows, macOS, Linux

### Shell Script (`scripts/publish-contracts.sh`)

- **Features**: Lightweight shell script
- **Dependencies**: Bash, git, npm
- **Platform**: Unix-like systems (macOS, Linux)

## 📁 File Structure

```
farmpro-api/
├── contracts/                 # Contracts package
│   ├── package.json          # Contracts package config
│   ├── tsconfig.json         # TypeScript config
│   ├── tsup.config.ts        # Build config
│   ├── *.ts                  # Contract files
│   └── dist/                 # Built files (ignored by git)
├── scripts/
│   ├── publish-contracts.js  # Node.js publishing script
│   └── publish-contracts.sh  # Shell publishing script
├── package.json              # Main package with contracts scripts
└── CONTRACTS_PUBLISHING.md   # This guide
```

## 🔧 Configuration

### Contracts Package Configuration

The contracts package is configured in `contracts/package.json`:

```json
{
  "name": "@deepintel-ltd/farmpro-api-contracts",
  "version": "1.0.0",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./schemas": {
      "import": "./dist/schemas.mjs",
      "require": "./dist/schemas.js"
    },
    "./contracts": {
      "import": "./dist/contracts.mjs",
      "require": "./dist/contracts.js"
    }
  }
}
```

### Git Configuration

The main repository's `.gitignore` excludes:
- `contracts/node_modules/`
- `contracts/dist/`

The contracts folder has its own `.gitignore` for additional exclusions.

## 🚨 Troubleshooting

### Common Issues

1. **Git working directory not clean**
   ```bash
   # Commit or stash changes first
   git add .
   git commit -m "Your changes"
   # Then run publishing commands
   ```

2. **NPM authentication required**
   ```bash
   # Login to NPM first
   npm login
   # Then run publishing commands
   ```

3. **TypeScript errors**
   ```bash
   # Check for type errors
   npm run contracts:type-check:strict
   # Fix errors before publishing
   ```

4. **Build failures**
   ```bash
   # Clean and rebuild
   npm run contracts:clean
   npm run contracts:build
   ```

### Debug Mode

Run scripts with debug output:

```bash
# Enable debug logging
DEBUG=1 node scripts/publish-contracts.js build

# Or with shell script
DEBUG=1 ./scripts/publish-contracts.sh build
```

## 📚 Examples

### Example 1: Quick Patch Release

```bash
# Make a small fix to contracts
# ...

# Quick patch release
npm run contracts:publish:all
```

### Example 2: Minor Version Release

```bash
# Add new contract features
# ...

# Minor version release
node scripts/publish-contracts.js all minor
```

### Example 3: Major Version Release

```bash
# Breaking changes to contracts
# ...

# Major version release
node scripts/publish-contracts.js all major
```

### Example 4: GitHub Only Release

```bash
# Publish to GitHub without NPM
npm run contracts:publish:github
```

### Example 5: NPM Only Release

```bash
# Publish to NPM without GitHub
npm run contracts:publish:npm
```

## 🎯 Best Practices

1. **Always validate before publishing**
   ```bash
   npm run contracts:validate
   ```

2. **Test locally first**
   ```bash
   npm run contracts:build
   npm run contracts:test:types
   npm run contracts:test:runtime
   ```

3. **Use semantic versioning**
   - `patch`: Bug fixes (1.0.0 -> 1.0.1)
   - `minor`: New features (1.0.0 -> 1.1.0)
   - `major`: Breaking changes (1.0.0 -> 2.0.0)

4. **Keep git clean**
   - Commit changes before publishing
   - Use meaningful commit messages

5. **Document changes**
   - Update CHANGELOG.md in contracts folder
   - Update README.md if needed

## 🔗 Related Files

- `contracts/README.md` - Contracts package documentation
- `contracts/CHANGELOG.md` - Version history
- `contracts/package.json` - Package configuration
- `contracts/tsconfig.json` - TypeScript configuration
- `contracts/tsup.config.ts` - Build configuration
