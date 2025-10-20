# obsidian-mcp

A Model Context Protocol (MCP) server that provides AI assistants with secure, read-only access to your local Obsidian vault. Enable Claude and other MCP clients to read and reference your knowledge base directly.

## Usage

### Installation

No installation required! Use npx to run directly:

```bash
npx -y obsidian-mcp
```

Or install globally:

```bash
npm install -g obsidian-mcp
```

### Configuration

The server requires the `OBSIDIAN_VAULT_PATH` environment variable pointing to your Obsidian vault directory.

#### Claude Desktop

Add to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "npx",
      "args": ["-y", "obsidian-mcp"],
      "env": {
        "OBSIDIAN_VAULT_PATH": "/absolute/path/to/your/vault"
      }
    }
  }
}
```

#### Other MCP Clients

For other MCP clients (Claude Code, VS Code, etc.), configure with:

- **Command:** `npx`
- **Args:** `["-y", "obsidian-mcp"]`
- **Environment:** `OBSIDIAN_VAULT_PATH=/path/to/vault`

### Available Tools

#### `read_obsidian_file`

Reads the contents of a markdown file from your Obsidian vault.

**Parameters:**

- `filename` (string, required): Name of the markdown file (with or without `.md` extension)

**Example usage in Claude:**

```
"Read the file called 'project-notes' from my Obsidian vault"
"Show me the contents of architecture.md"
```

**Returns:** The full content of the markdown file, including frontmatter if present.

**Notes:**

- Searches recursively through all subdirectories in your vault
- Case-insensitive filename matching
- Ignores hidden directories (starting with `.`)
- Maximum file size: 10MB

### Troubleshooting

#### Server won't start

**Error: "OBSIDIAN_VAULT_PATH environment variable is required"**

- Make sure you've set the `OBSIDIAN_VAULT_PATH` in your MCP client configuration
- The path must be absolute, not relative

**Error: "Vault path does not exist"**

- Verify the path points to your actual Obsidian vault directory
- Check for typos in the path
- Ensure you're using an absolute path

#### File not found errors

**Error: "File not found: example.md"**

- Check the filename spelling
- The file must have a `.md` or `.markdown` extension
- Hidden files (starting with `.`) are not searchable
- Files in `.obsidian` directory are ignored

#### Permission errors

**Error: "Permission denied"**

- Ensure the vault directory has read permissions
- On macOS/Linux, check with: `ls -la /path/to/vault`
- The server only needs read access (no write permissions required)

---

## Development

This section is for contributors working on the obsidian-mcp codebase.

### Prerequisites

- Node.js 18 or newer
- npm (comes with Node.js)

### Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/benwilkes9/obsidian-mcp.git
cd obsidian-mcp
npm install
```

### Building

Build the TypeScript source to JavaScript:

```bash
npm run build
```

For development with automatic rebuilding:

```bash
npm run watch
```

### Testing Locally

#### Using MCP Inspector (Recommended)

```bash
npm run build
OBSIDIAN_VAULT_PATH=/path/to/vault npx @modelcontextprotocol/inspector node dist/cli.js
```

The MCP Inspector provides a web UI for testing tools interactively.

#### Direct Execution

```bash
npm run build
OBSIDIAN_VAULT_PATH=/path/to/vault node dist/cli.js
```

#### Configure MCP Client for Local Development

To use your local development version in an MCP client, point to the built `dist/cli.js` file:

```json
{
  "mcpServers": {
    "obsidian-dev": {
      "command": "node",
      "args": ["/absolute/path/to/obsidian-mcp/dist/cli.js"],
      "env": {
        "OBSIDIAN_VAULT_PATH": "/absolute/path/to/your/vault"
      }
    }
  }
}
```

**Note:** Rebuild (`npm run build`) after changes, or use `npm run watch` for automatic rebuilding.

### Code Quality

#### Testing

Run tests with Jest:

```bash
npm test                    # Run all tests
npm test -- --watch         # Run tests in watch mode
npm run test:coverage       # Run tests with coverage report
npm run test:coverage:watch # Run tests with coverage in watch mode
```

Coverage reports are generated in the `coverage/` directory with HTML reports viewable at `coverage/index.html`.

#### Formatting

Format code with Prettier:

```bash
npm run format              # Format all files
npm run format:check        # Check formatting without changes
```

#### Linting

Check for linting issues with ESLint:

```bash
npm run lint
```

#### Type Checking

Run TypeScript type checks:

```bash
npm run typecheck
```

#### Managing Dependencies

```bash
npm install <package-name>          # Add runtime dependency
npm install --save-dev <package-name> # Add dev dependency
npm update                          # Update all dependencies
```

### Pre-commit Hooks

Husky runs the following checks before each commit:

1. **ggshield secret scan**: Scans for API keys, tokens, and other secrets (optional, skips if not installed)
2. **lint-staged**: Auto-formats and lints staged files
3. **typecheck**: TypeScript type checking on all files
4. **test:coverage**: Runs all tests with coverage

If any check fails, the commit will be blocked until issues are resolved.

### Continuous Integration

GitHub Actions runs multiple checks on every push and pull request:

**Stage 1 - Fundamental Checks** (must pass before Stage 2):

- **GitGuardian** - Secret scanning (fails build if secrets detected)
- **Prettier** - Formatting check
- **ESLint** - Linting
- **TypeScript** - Type checking
- **Jest** - Tests with coverage
- **Build** - Compilation check

**Stage 2 - Deep Analysis** (runs after Stage 1 passes):

- **Semgrep** - Security vulnerabilities and bug patterns
- **SonarCloud** - Code quality, bugs, and coverage analysis

See [.github/workflows/ci.yml](.github/workflows/ci.yml) for details.

#### Security Scanning

**GitGuardian** prevents secrets from being committed. [Learn more](https://github.com/GitGuardian/ggshield)

**Semgrep** scans for security vulnerabilities with custom rules for MCP servers (see [.semgrep.yml](.semgrep.yml)):

```bash
# Run locally (optional)
semgrep scan --config auto           # Community rules
semgrep scan --config .semgrep.yml   # Custom rules only
```

**SonarCloud** analyzes code quality, reliability, security, coverage, and duplications. Results appear in:

- Dashboard: Quality gate status and metrics
- Pull requests: Inline comments for new issues
- Security tab: Vulnerability findings

### Project Structure

```
src/
├── cli.ts              # CLI entry point
├── server.ts           # ObsidianMCPServer class (importable library)
├── tools/              # Tool definitions organized by feature
│   ├── index.ts        # Tool registry
│   ├── types.ts        # Shared interfaces
│   └── */              # Individual tool implementations
├── config/             # Configuration and validation
├── services/           # Core services (vault discovery, file reading)
└── __tests__/          # Test files and utilities
```

Key configuration files:

- `package.json` – Project metadata and dependencies
- `tsconfig.json` – TypeScript compiler configuration
- `.prettierrc` – Code formatting rules
- `eslint.config.js` – Linting rules
- `jest.config.js` – Testing configuration

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on:

- Architecture patterns (ES modules, MCP protocols)
- Adding new tools
- Testing requirements
- Commit message format (Conventional Commits)
- PR workflow

## License

MIT
