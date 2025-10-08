# obsidian-mcp

MCP Server for context engineering with local Obsidian vaults.

## Prerequisites

- Python 3.12 or newer
- [`uv`](https://docs.astral.sh/uv/) for dependency and virtual environment management

## Setup

Clone the repository and install dependencies into the automatically managed virtual environment:

```bash
git clone https://github.com/benwilkes9/obsidian-mcp.git
cd obsidian-mcp
uv sync
```

`uv sync` resolves the lockfile (if present) or the `[project]` section in `pyproject.toml`, creates a `.venv`, and installs everything declared there.

## Running the app

Use `uv run` to execute the project with all synced dependencies available on the `PYTHONPATH`:

```bash
uv run python main.py
```

`uv run` ensures the virtual environment is activated for the duration of the command.

## Managing dependencies

- Add a runtime dependency:

	```bash
	uv add <package-name>
	```

- Add a development-only dependency:

	```bash
	uv add --dev <package-name>
	```

- Upgrade dependencies to their latest allowed versions:

	```bash
	uv lock --upgrade
	uv sync
	```

## Testing and quality

This project uses `ruff` for linting and formatting, `pyright` for type checking, and `pytest` for testing. Pre-commit hooks and GitHub Actions enforce these checks.

### Formatting

Format code with ruff:

```bash
uv run ruff format .
```

### Linting

Check for linting issues:

```bash
uv run ruff check .
```

Auto-fix linting issues:

```bash
uv run ruff check --fix .
```

### Type checking

Run type checks with pyright:

```bash
uv run pyright
```

### Testing

Run tests with pytest:

```bash
uv run pytest
```

### Pre-commit hooks

Pre-commit hooks automatically run ruff formatting, linting, pyright type checking, and pytest before each commit.

Install the hooks (done automatically after `uv sync`):

```bash
uv run pre-commit install
```

Run hooks manually on all files:

```bash
uv run pre-commit run --all-files
```

### Continuous Integration

GitHub Actions runs all quality checks (formatting, linting, type checking, and tests) on every push and pull request to the `main` branch. See `.github/workflows/ci.yml` for details.

### Branch Protection

To enforce code quality, configure branch protection rules on GitHub:

1. Go to your repository's Settings → Branches
2. Add a branch protection rule for `main`
3. Enable:
   - "Require a pull request before merging"
   - "Require status checks to pass before merging"
   - Select the "lint-and-test" CI check
   - "Do not allow bypassing the above settings"

## Project layout

- `main.py` – entry point script that currently prints a greeting
- `pyproject.toml` – project metadata and dependency declarations for `uv`
