# obsidian-mcp

MCP Server for context engineering with local Obsidian vaults.

## Prerequisites

- Node.js 18 or newer
- npm (comes with Node.js)

## Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/benwilkes9/obsidian-mcp.git
cd obsidian-mcp
npm install
```

## Building

Build the TypeScript source to JavaScript:

```bash
npm run build
```

For development with automatic rebuilding:

```bash
npm run watch
```

## Running the app

After building, run the server:

```bash
node dist/cli.js
```

Or use MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/cli.js
```

## Managing dependencies

- Add a runtime dependency:

  ```bash
  npm install <package-name>
  ```

- Add a development-only dependency:

  ```bash
  npm install --save-dev <package-name>
  ```

- Update dependencies:

  ```bash
  npm update
  ```

## Testing and quality

This project uses `prettier` for formatting, `eslint` for linting, TypeScript for type checking, and `jest` for testing. GitHub Actions enforces these checks.

### Formatting

Format code with prettier:

```bash
npm run format
```

Check formatting without making changes:

```bash
npm run format:check
```

### Linting

Check for linting issues:

```bash
npm run lint
```

### Type checking

Run type checks with TypeScript:

```bash
npm run typecheck
```

### Testing

Run tests with jest:

```bash
npm test                    # Run all tests
npm test -- --watch         # Run tests in watch mode
npm run test:coverage       # Run tests with coverage report
npm run test:coverage:watch # Run tests with coverage in watch mode
```

Coverage reports are generated in the `coverage/` directory with HTML reports viewable at `coverage/index.html`.

### Continuous Integration

GitHub Actions runs multiple checks in parallel on every push and pull request:

**Security scans:**

- **GitGuardian** - Detects hardcoded secrets and credentials
- **Semgrep** - Finds security vulnerabilities and bug patterns

**Code quality:**

- **Prettier** - Formatting check
- **ESLint** - Linting
- **TypeScript** - Type checking
- **Jest** - Tests with coverage
- **Build** - Compilation check

See [.github/workflows/ci.yml](.github/workflows/ci.yml) for details.

### Secret Scanning

This project uses [GitGuardian](https://www.gitguardian.com/) to prevent secrets from being committed.

Dashboard: https://dashboard.gitguardian.com/

**Local setup (optional but recommended):**

See https://github.com/GitGuardian/ggshield

If ggshield is not installed, the pre-commit hook will skip secret scanning locally but will still run in CI.

### Static Analysis with Semgrep

Semgrep automatically scans for security vulnerabilities and bug patterns in CI. It's configured with:

- **Auto-detection**: Uses community rules for TypeScript/Node.js
- **Custom rules** for MCP servers (see [.semgrep.yml](.semgrep.yml)):

**Local scanning (optional):**

```bash
# Run scan
semgrep scan --config auto

# Or use custom rules only
semgrep scan --config .semgrep.yml
```

Findings appear in GitHub's Security tab under "Code scanning alerts" when running in CI.

### Pre-commit Hooks

Husky runs the following checks before each commit:

1. **ggshield secret scan**: Scans for API keys, tokens, and other secrets
2. **lint-staged**: Formats and lints only changed files
3. **test:coverage**: Runs all tests with coverage to ensure code quality

If any check fails, the commit will be blocked until issues are resolved.

## Project layout

- `src/cli.ts` – CLI entry point for the MCP server
- `src/server.ts` – main server class (can be imported as a library)
- `src/__tests__/` – test files
- `package.json` – project metadata and dependency declarations
- `tsconfig.json` – TypeScript compiler configuration
- `.prettierrc` – code formatting configuration
- `eslint.config.js` – linting configuration
- `jest.config.js` – testing configuration
