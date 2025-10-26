# Deploying Genkit as an MCP Server

This guide explains how to expose your Genkit flows as an MCP server that can be used by Claude Desktop and other MCP clients.

## Option 1: Expose as MCP Server (For Claude Desktop Integration)

### Install MCP SDK

```bash
npm install @modelcontextprotocol/sdk
```

### Configure Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac):

```json
{
  "mcpServers": {
    "genkit-flows": {
      "command": "node",
      "args": ["/Users/nikhilanand/Documents/GitHub/genkit/dist/mcp-server.js"],
      "env": {
        "GEMINI_API_KEY": "your-api-key-here",
        "ELEVENLABS_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Build and Test

```bash
npm run build
# Restart Claude Desktop to load the MCP server
```

Now Claude Desktop can use your Genkit flows as tools!

---

## Option 2: Deploy as HTTP Service (For API Access)

### Local Development

```bash
npm run dev          # Run server
npm run genkit       # Genkit Developer UI at http://localhost:4000
```

### Deploy to Cloud Run

```bash
# Build
npm run build

# Deploy
gcloud run deploy genkit-service \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your-key
```

### Call Flows via HTTP

```bash
# Call a flow
curl -X POST https://your-service.run.app/imageGenerationFlow \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A sunset over mountains"}'
```

---

## Option 3: Use Programmatically (Import as Library)

```typescript
import { veo31FastImageToVideoFlow } from './dist/index.js';

const result = await veo31FastImageToVideoFlow({
  imagePath: './my-image.png',
  prompt: 'Camera zooms in dramatically'
});

console.log('Video generated at:', result.videoPath);
```

---

## Comparison: MCP vs HTTP vs Library

| Method | Best For | Access Pattern |
|--------|----------|----------------|
| **MCP Server** | Claude Desktop integration | Tools in Claude UI |
| **HTTP Service** | Web/mobile apps, APIs | REST endpoints |
| **Library** | Node.js apps | Direct imports |

---

## Recommended Approach

For **AI agents** (like Claude Desktop): Use **MCP Server**
For **web applications**: Deploy as **HTTP Service**
For **Node.js integration**: Use as **Library**

---

## Next Steps

1. Choose deployment method above
2. Set environment variables (API keys)
3. Build: `npm run build`
4. Deploy or configure MCP
5. Test your flows!
