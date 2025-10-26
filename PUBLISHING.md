# Publishing genkit-veo-mcp to npm

## Setup

1. **Update package.json** (already done)
   - Name: `genkit-veo-mcp`
   - Bin entry points to `dist/mcp-server.js`
   - Keywords for discoverability

2. **Build the project**
   ```bash
   npm run build
   ```

3. **Test locally**
   ```bash
   # Test the MCP server directly
   npm run mcp

   # Or test with npx (using local package)
   npx .
   ```

## Publish to npm

### First Time Setup

```bash
# Login to npm
npm login

# Verify you're logged in
npm whoami
```

### Publish

```bash
# Make sure everything is built
npm run build

# Publish to npm
npm publish
```

### Update Later

```bash
# Bump version
npm version patch  # or minor, or major

# Rebuild
npm run build

# Publish
npm publish
```

## Usage After Publishing

Users can then add it to their Claude Desktop config:

```json
{
  "mcpServers": {
    "genkit-veo": {
      "command": "npx",
      "args": ["-y", "genkit-veo-mcp@latest"],
      "env": {
        "GEMINI_API_KEY": "your-api-key",
        "ELEVENLABS_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Files to Include/Exclude

**Include** (automatically via `files` field in package.json):
- `dist/` - Built JavaScript
- `README.md`
- `LICENSE`
- `package.json`

**Exclude** (via `.npmignore`):
- `src/` - TypeScript source (users don't need it)
- `node_modules/`
- `.env`
- `test-input-files/`
- Development files

## Package Scope

Choose one:

### Option 1: Unscoped (public)
- Name: `genkit-veo-mcp`
- Anyone can install
- Free

### Option 2: Scoped (your namespace)
- Name: `@yourusername/genkit-veo-mcp`
- More professional
- Still free for public packages

## Pre-publish Checklist

- [ ] `npm run build` succeeds
- [ ] Update version in package.json
- [ ] Test MCP server runs: `npm run mcp`
- [ ] README.md is complete
- [ ] LICENSE file exists
- [ ] .npmignore configured
- [ ] Secrets removed from code
- [ ] Environment variables documented

## Post-publish

1. Tag the release in git:
   ```bash
   git tag v1.0.0
   git push --tags
   ```

2. Test installation:
   ```bash
   npx genkit-veo-mcp@latest
   ```

3. Update README with npm badge:
   ```markdown
   ![npm version](https://img.shields.io/npm/v/genkit-veo-mcp)
   ```
