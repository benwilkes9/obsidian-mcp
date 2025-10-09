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

GitHub Actions runs all quality checks (formatting, linting, type checking, tests, and build) on every push and pull request to a branch. See `.github/workflows/ci.yml` for details.

### Pre-commit Hooks

Husky runs the following checks before each commit:

- **lint-staged**: Formats and lints only changed files
- **test:coverage**: Runs all tests with coverage to ensure code quality

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
