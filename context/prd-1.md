# Product Requirements Document: Obsidian MCP Server

## 1. Executive Summary

An MCP (Model Context Protocol) server that provides Claude with direct read access to Obsidian vault markdown files, eliminating manual copy-paste workflows for documentation and other files used for context engineering.

### Goals

- Enable seamless integration between Obsidian vaults and MCP clients (Claude Desktop, Claude Code, VS Code, etc.)
- Provide zero-friction access to vault content via natural language requests
- Maintain simplicity through filesystem-only approach (no Obsidian runtime dependencies)

### Non-Goals

- Writing/modifying vault files
- Real-time sync with Obsidian application
- Graph view or relationship mapping
- Plugin integration with Obsidian

### Architecture Overview

**System Type:** MCP Server distributed as npm package

**Key Architectural Decisions:**

- Direct filesystem access (no Obsidian process dependency)
- Stdio transport for local MCP client communication
- Read-only operations for safety
- Stateless request-response model
- Environment-based configuration

**Client Integration:**
MCP clients configure the server via their MCP host configuration, providing the vault path as an environment variable. The server exposes tools that clients can invoke to read vault content.

---

## 2. Core Features

### Feature 1: Environment Configuration & Vault Discovery

**Functional Description:**  
Server must locate and validate the Obsidian vault directory on startup using environment configuration.

**Technical Specification:**

- Read `OBSIDIAN_VAULT_PATH` environment variable
- Validate path exists and is readable
- Fail gracefully with clear error message if path invalid
- Support absolute paths (relative path support optional)

**BDD Scenarios:**

```gherkin
Scenario: Valid vault path configured
  Given the environment variable OBSIDIAN_VAULT_PATH is set to "/Users/john/Documents/Vault"
  And the path exists and contains markdown files
  When the MCP server initializes
  Then the server should start successfully
  And log the vault path being used

Scenario: Missing vault path configuration
  Given the environment variable OBSIDIAN_VAULT_PATH is not set
  When the MCP server initializes
  Then the server should fail to start
  And display error message "OBSIDIAN_VAULT_PATH environment variable is required"

Scenario: Invalid vault path
  Given the environment variable OBSIDIAN_VAULT_PATH is set to "/nonexistent/path"
  When the MCP server initializes
  Then the server should fail to start
  And display error message "Vault path does not exist: /nonexistent/path"

Scenario: Vault path is not readable
  Given the environment variable OBSIDIAN_VAULT_PATH points to a directory without read permissions
  When the MCP server initializes
  Then the server should fail to start
  And display error message indicating permission denied
```

**Acceptance Criteria:**

- [ ] Server reads OBSIDIAN_VAULT_PATH on startup
- [ ] Clear error messages for missing/invalid paths
- [ ] No silent failures during initialization
- [ ] Logs vault path for debugging

---

### Feature 2: Recursive File Discovery

**Functional Description:**  
Search the vault recursively to locate markdown files by name, supporting nested folder structures.

**Technical Specification:**

- Recursive directory traversal through vault filesystem
- Case-insensitive filename matching
- Search `.md` and `.markdown` files only
- Ignore hidden files/directories (starting with `.`)
- Return first matching file found
- Optional: Cache directory structure for performance

**BDD Scenarios:**

```gherkin
Scenario: Find file in root directory
  Given the vault contains a file "notes.md" in the root
  When searching for "notes"
  Then the file should be found
  And the full path should be "/vault/notes.md"

Scenario: Find file in nested directory
  Given the vault structure:
    /vault/projects/api/architecture.md
  When searching for "architecture"
  Then the file should be found
  And the full path should be "/vault/projects/api/architecture.md"

Scenario: Find file with .md extension specified
  Given the vault contains "readme.md"
  When searching for "readme.md"
  Then the file should be found

Scenario: Find file without extension
  Given the vault contains "readme.md"
  When searching for "readme"
  Then the file should be found

Scenario: Case-insensitive search
  Given the vault contains "UserStory.md"
  When searching for "userstory"
  Then the file should be found

Scenario: Ignore hidden directories
  Given the vault structure:
    /vault/.obsidian/config.json
    /vault/notes.md
  When searching for files
  Then ".obsidian" directory should be skipped
  And only "notes.md" should be discoverable

Scenario: File not found
  Given the vault does not contain "missing.md"
  When searching for "missing"
  Then no file should be found
  And appropriate error should be returned

Scenario: Multiple files with same name
  Given the vault structure:
    /vault/project-a/notes.md
    /vault/project-b/notes.md
  When searching for "notes"
  Then the first matching file found should be returned
  And a warning should be logged about duplicate filenames
```

**Acceptance Criteria:**

- [ ] Searches all subdirectories recursively
- [ ] Handles both `.md` and `.markdown` extensions
- [ ] Case-insensitive matching works
- [ ] Hidden files/directories ignored
- [ ] Returns full absolute path to found file
- [ ] Performs adequately on vaults with 1000+ files

---

### Feature 3: Read File Content Tool

**Functional Description:**  
Primary MCP tool that reads and returns the full content of a specified markdown file.

**Technical Specification:**

- Tool name: `read_obsidian_file`
- Input: `{ filename: string }`
- Output: Raw markdown content as string
- Character encoding: UTF-8
- Handle frontmatter (YAML) preservation
- Maximum file size: 10MB (configurable)
- Error handling for unreadable files

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "filename": {
      "type": "string",
      "description": "Name of the markdown file (with or without .md extension). Example: 'user-story-1' or 'architecture.md'"
    }
  },
  "required": ["filename"]
}
```

**BDD Scenarios:**

```gherkin
Scenario: Read simple markdown file
  Given the vault contains "test.md" with content:
    """
    # Test Document
    This is a test.
    """
  When Claude calls read_obsidian_file with filename "test"
  Then the tool should return the full content
  And preserve all markdown formatting

Scenario: Read file with YAML frontmatter
  Given the vault contains "story.md" with content:
    """
    ---
    title: User Story 1
    tags: [feature, api]
    status: in-progress
    ---
    # User Story
    As a user...
    """
  When Claude calls read_obsidian_file with filename "story"
  Then the tool should return the full content including frontmatter
  And preserve YAML structure

Scenario: Read file with special characters
  Given the vault contains "special.md" with emoji, code blocks, and tables
  When Claude calls read_obsidian_file with filename "special"
  Then all special characters should be preserved
  And encoding should remain UTF-8

Scenario: Read large file
  Given the vault contains "large.md" with 5MB of content
  When Claude calls read_obsidian_file with filename "large"
  Then the file should be read successfully
  And return within 100ms

Scenario: File exceeds size limit
  Given the vault contains "huge.md" with 15MB of content
  And the file size limit is 10MB
  When Claude calls read_obsidian_file with filename "huge"
  Then the tool should return an error
  And error message should indicate "File exceeds size limit (15MB > 10MB)"

Scenario: File is not readable
  Given the vault contains "restricted.md" with no read permissions
  When Claude calls read_obsidian_file with filename "restricted"
  Then the tool should return an error
  And error message should indicate permission denied

Scenario: Filename with spaces
  Given the vault contains "My Notes.md"
  When Claude calls read_obsidian_file with filename "My Notes"
  Then the file should be found and content returned

Scenario: User requests non-existent file
  Given the vault does not contain "missing.md"
  When Claude calls read_obsidian_file with filename "missing"
  Then the tool should return error
  And error message should be "File not found: missing.md"
```

**Acceptance Criteria:**

- [ ] Successfully reads markdown files up to 10MB
- [ ] Preserves all formatting and special characters
- [ ] Returns UTF-8 encoded content
- [ ] Handles frontmatter correctly
- [ ] Provides clear error messages
- [ ] Response time < 100ms for typical files
- [ ] Works with filenames containing spaces and special characters

---

### Feature 4: Error Handling & User Feedback

**Functional Description:**  
Provide clear, actionable error messages for all failure scenarios.

**Technical Specification:**

- Distinguish between file not found, permission errors, and system errors
- Return errors in MCP-compliant format
- Include helpful context in error messages
- Log errors for debugging
- Never expose sensitive system paths in production errors (optional security hardening)

**BDD Scenarios:**

```gherkin
Scenario: Helpful error for file not found
  Given Claude requests a file "missing-doc"
  When the file does not exist in the vault
  Then return error with message:
    """
    File not found: missing-doc.md
    Searched in vault: /vault/path
    Tip: Check filename spelling or use list_files to see available files
    """

Scenario: Permission error clarity
  Given a file exists but is not readable
  When Claude attempts to read it
  Then return error with message:
    """
    Permission denied reading file: document.md
    Check file permissions in your vault directory
    """

Scenario: Vault configuration error
  Given OBSIDIAN_VAULT_PATH is not set
  When server starts
  Then display clear setup instructions

Scenario: Graceful handling of corrupted files
  Given a file contains invalid UTF-8 sequences
  When Claude attempts to read it
  Then return partial content with warning
  Or return clear error about encoding issues
```

**Acceptance Criteria:**

- [ ] All error messages are actionable
- [ ] Errors distinguish between user error and system error
- [ ] No stack traces exposed to end users
- [ ] Errors logged with appropriate severity
- [ ] Helpful tips included where relevant

---

## 3. Future Features (Phase 2)

### Feature 5: List Files Tool (Optional)

**Functional Description:**  
Enumerate all markdown files in the vault with their paths.

**Tool Specification:**

- Tool name: `list_obsidian_files`
- Input: `{ pattern?: string, limit?: number }`
- Output: Array of `{ filename: string, path: string, size: number }`

**BDD Scenarios:**

```gherkin
Scenario: List all files
  Given the vault contains 50 markdown files
  When Claude calls list_obsidian_files with no parameters
  Then return array of all 50 files
  And include relative paths from vault root
  And include file sizes

Scenario: List with filename pattern
  Given the vault contains files: "story-1.md", "story-2.md", "notes.md"
  When Claude calls list_obsidian_files with pattern "story"
  Then return only ["story-1.md", "story-2.md"]

Scenario: Respect limit parameter
  Given the vault contains 100 files
  When Claude calls list_obsidian_files with limit 20
  Then return maximum 20 files
```

---

### Feature 6: Search by Frontmatter Tags (Optional)

**Functional Description:**  
Find files matching specific frontmatter tags.

**Tool Specification:**

- Tool name: `search_by_tags`
- Input: `{ tags: string[], matchAll?: boolean }`
- Output: Array of matching filenames

**BDD Scenarios:**

```gherkin
Scenario: Find files with specific tag
  Given files with frontmatter:
    story-1.md: tags: [feature, api]
    story-2.md: tags: [bug, ui]
    story-3.md: tags: [feature, ui]
  When Claude searches for tag "feature"
  Then return ["story-1.md", "story-3.md"]

Scenario: Match all tags (AND logic)
  Given the same files as above
  When Claude searches for tags ["feature", "ui"] with matchAll: true
  Then return ["story-3.md"]

Scenario: Match any tag (OR logic)
  Given the same files as above
  When Claude searches for tags ["feature", "ui"] with matchAll: false
  Then return ["story-1.md", "story-2.md", "story-3.md"]
```

---

### Feature 7: Full-Text Content Search (Optional)

**Functional Description:**  
Search within file content for specific text patterns.

**Tool Specification:**

- Tool name: `search_content`
- Input: `{ query: string, caseSensitive?: boolean }`
- Output: Array of `{ filename: string, matches: number, excerpt: string }`

**BDD Scenarios:**

```gherkin
Scenario: Simple text search
  Given files contain various mentions of "authentication"
  When Claude searches for "authentication"
  Then return all files containing the term
  And include excerpt showing context around match

Scenario: Case-insensitive search
  Given a file contains "Authentication" and "AUTHENTICATION"
  When Claude searches for "authentication" with caseSensitive: false
  Then both variations should be found
```

---

### Feature 8: Backlink Discovery (Optional)

**Functional Description:**  
Find files that link to a given note (Obsidian wiki-links format).

**Tool Specification:**

- Tool name: `get_backlinks`
- Input: `{ filename: string }`
- Output: Array of filenames containing links to target file

**BDD Scenarios:**

```gherkin
Scenario: Find wiki-style backlinks
  Given files contain:
    doc-a.md: "See [[doc-b]] for details"
    doc-c.md: "Related: [[doc-b]]"
  When Claude calls get_backlinks for "doc-b"
  Then return ["doc-a.md", "doc-c.md"]

Scenario: Find markdown-style links
  Given a file contains: "[link](doc-b.md)"
  When searching backlinks for "doc-b"
  Then this file should be included in results
```

---

## 4. Technical Architecture

### MCP Server Architecture

**Communication:**

- Protocol: MCP (Model Context Protocol)
- Transport: Stdio for local execution
- Message format: JSON-RPC style requests/responses

**Lifecycle:**

1. MCP client launches server process
2. Server reads environment configuration
3. Server validates vault path
4. Server registers available tools
5. Server enters request-response loop
6. Client invokes tools as needed
7. Server remains active until client terminates connection

**Tool Registration:**

- Phase 1: `read_obsidian_file`
- Phase 2: Additional tools as defined in Features 5-8

### Performance Requirements

- Server startup: < 200ms
- File read operations: < 100ms (for typical files < 1MB)
- Memory footprint: < 100MB baseline
- Support vaults up to 10,000 files

### Platform Compatibility

**Runtime Environment:**

- Node.js runtime (modern LTS versions)
- Cross-platform: macOS, Linux, Windows (optional)

**MCP Compatibility:**

- Implements MCP specification
- Compatible with standard MCP clients

**Dependencies:**

- MCP SDK for server implementation
- Standard filesystem APIs
- YAML frontmatter parser (for Phase 2 features)

### Security Considerations

- **Read-only access:** No write, delete, or modify capabilities
- **Path confinement:** Operations restricted to configured vault directory
- **Input validation:** All tool parameters validated before use
- **File size limits:** Prevent memory exhaustion attacks
- **No path traversal:** Reject requests attempting to access parent directories

---

## 5. Distribution Strategy

### Package Distribution

**Format:** npm package for easy installation and updates

**Installation Methods:**

- Direct npm install (for development)
- npx execution (for zero-install usage)
- Package can be scoped or unscoped

**MCP Client Configuration:**
Clients configure the server in their MCP host configuration file, specifying:

- Command/binary to execute
- Vault path via environment variable
- Optional: Additional configuration parameters

### Release Management

**Quality Gates:**

- All tests passing
- Documentation complete
- Semantic versioning
- Changelog maintained

**Distribution Channels:**

- npm registry
- GitHub releases
- Documentation site

---

## 6. Success Metrics

### Functionality

- [ ] Successfully reads 99%+ of valid markdown files
- [ ] Handles files up to 10MB without errors
- [ ] Zero crashes on malformed input

### Performance

- [ ] File reads complete within 100ms for 95% of requests
- [ ] Server startup under 200ms
- [ ] Memory stable under continuous usage

### Usability

- [ ] Setup completed in < 5 minutes
- [ ] Clear error messages for all failure cases
- [ ] Works with existing Obsidian vaults without modification

---

## 7. Development Phases

### Phase 1: MVP (Current Scope)

- Environment configuration
- Recursive file discovery
- `read_obsidian_file` tool
- Error handling
- Build and distribution setup

### Phase 2: Enhanced Features (Future)

- `list_obsidian_files` tool
- `search_by_tags` tool
- `search_content` tool
- `get_backlinks` tool
- Performance optimizations (caching)

---

## 8. Appendix: Example Usage Flows

### Flow 1: Reading a User Story

```
User: "Read the user story for authentication feature"
Claude: [calls read_obsidian_file with filename="authentication-story"]
Claude: "Based on the user story in your vault, here's the implementation plan..."
```

### Flow 2: Implementing from Documentation

```
User: "Implement the API endpoint described in api-design doc"
Claude: [calls read_obsidian_file with filename="api-design"]
Claude: [generates code based on specifications in the document]
```

### Flow 3: Error Recovery

```
User: "Read the project spec"
Claude: [calls read_obsidian_file with filename="project-spec"]
MCP: [returns error: "File not found: project-spec.md"]
Claude: "I couldn't find 'project-spec.md' in your vault. Could you provide the exact filename? Or I can list available files if helpful."
```

### Flow 4: MCP Client Integration

**Client Configuration Example:**

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "npx",
      "args": ["-y", "obsidian-mcp"],
      "env": {
        "OBSIDIAN_VAULT_PATH": "/Users/username/Documents/Vault"
      }
    }
  }
}
```

**Runtime Flow:**

1. Client launches server via npx
2. Server initializes with vault path
3. Client queries available tools
4. User makes request requiring vault content
5. Client invokes `read_obsidian_file` tool
6. Server searches vault and returns content
7. Client provides content to user/LLM

---

## Document History

| Version | Date       | Author  | Changes                                              |
| ------- | ---------- | ------- | ---------------------------------------------------- |
| 1.0     | 2025-10-19 | Initial | First draft with core features and BDD scenarios     |
| 1.1     | 2025-10-19 | Revised | Architecture focus, removed implementation specifics |
