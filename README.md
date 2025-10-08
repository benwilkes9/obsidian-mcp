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

Run your test suite (assuming `pytest` or similar is configured) through `uv` so the virtual environment is automatically managed:

```bash
uv run pytest
```

If you add linters or formatters (for example, `ruff` or `black`), invoke them the same way:

```bash
uv run ruff check
uv run ruff format
```

## Project layout

- `main.py` – entry point script that currently prints a greeting
- `pyproject.toml` – project metadata and dependency declarations for `uv`
