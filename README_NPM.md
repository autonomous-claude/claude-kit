# genkit-veo-mcp

MCP server that exposes Google's Veo 3.1 video generation, Imagen 4 image generation, and more through the Model Context Protocol.

## Features

- 🎬 **Veo 3.1 Video Generation**
  - Text to video
  - Image to video (animate images)
  - Video extension/continuation
  - Fast variants for rapid iteration

- 🎨 **Imagen 4 Image Generation**

- 🔊 **Text-to-Speech** (via ElevenLabs)

- 🐦 **Twitter/X Integration**

## Installation

### Use with npx (Recommended)

No installation needed! Add to your Claude Desktop config:

**Location:** `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "genkit-veo": {
      "command": "npx",
      "args": ["-y", "genkit-veo-mcp@latest"],
      "env": {
        "GEMINI_API_KEY": "your-gemini-api-key-here"
      }
    }
  }
}
```

### Global Installation

```bash
npm install -g genkit-veo-mcp
```

Then configure Claude Desktop:

```json
{
  "mcpServers": {
    "genkit-veo": {
      "command": "genkit-veo-mcp",
      "env": {
        "GEMINI_API_KEY": "your-gemini-api-key-here"
      }
    }
  }
}
```

## Environment Variables

Required:
- `GEMINI_API_KEY` - Your Google AI API key ([Get one here](https://aistudio.google.com/apikey))

Optional:
- `ELEVENLABS_API_KEY` - For text-to-speech features
- `TWITTER_*` - For Twitter integration features

## Available Tools

Once configured, Claude Desktop will have access to these tools:

### `generate_image`
Generate images using Imagen 4.

**Parameters:**
- `prompt` (string, required) - Detailed description of the image

**Example:**
```
Generate an image of a sunset over mountains with dramatic clouds
```

### `text_to_speech`
Convert text to natural speech using ElevenLabs.

**Parameters:**
- `text` (string, required) - Text to convert
- `voice_id` (string, optional) - ElevenLabs voice ID

### `veo31_fast_image_to_video`
Animate static images using Veo 3.1 Fast.

**Parameters:**
- `imagePath` (string, required) - Path to input image
- `prompt` (string, required) - How the image should animate
- `aspectRatio` (string, optional) - "16:9" or "9:16"

**Example:**
```
Animate /path/to/photo.jpg with the prompt "Camera slowly zooms in while subject blinks naturally"
```

### `veo31_video_extension`
Extend and continue existing videos.

**Parameters:**
- `videoUrl` (string, required) - Google API URL from previous generation
- `prompt` (string, required) - How to continue the video
- `aspectRatio` (string, optional) - "16:9" or "9:16"

**Example:**
```
Extend the video with "Character turns and walks toward the mountains in the distance"
```

## Usage Example in Claude Desktop

After configuration, you can ask Claude:

> "Generate an image of a futuristic city at night"

> "Animate this image with a slow camera zoom: /Users/me/photo.jpg"

> "Generate a video of a drone flying over a beach at sunset"

Claude will automatically use the appropriate MCP tool!

## Output Location

Generated files are saved to:
- Images: `./output/*.png`
- Videos: `./output/*.mp4`
- Audio: `./output/*.mp3`

## Advanced Usage

### Chaining Operations

You can chain video operations:

1. Generate image → Get image path
2. Animate image → Get video URL
3. Extend video → Get extended video

Example conversation:
```
You: Generate an image of a robot
Claude: [uses generate_image, saves to output/image_123.png]

You: Animate that image with the robot waving
Claude: [uses veo31_fast_image_to_video with the image path]

You: Now extend that video with the robot walking away
Claude: [uses veo31_video_extension with the videoUrl from step 2]
```

## Development

Want to modify or extend this MCP server?

```bash
git clone https://github.com/yourusername/genkit-veo-mcp
cd genkit-veo-mcp
npm install
npm run build
npm run mcp  # Test locally
```

## Requirements

- Node.js 18+
- Google AI API key with Gemini/Veo/Imagen access
- (Optional) ElevenLabs API key for TTS

## License

ISC

## Links

- [Genkit Documentation](https://firebase.google.com/docs/genkit)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Desktop](https://claude.ai/download)

## Support

Issues and PRs welcome at [GitHub repository URL]
