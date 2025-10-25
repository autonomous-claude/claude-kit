# Genkit AI Video Generation Pipeline

An AI-powered video generation system using Genkit, Google AI (Imagen 4 + Gemini), ElevenLabs text-to-speech, and Twitter/X integration. Create complete videos from text prompts with automated voiceovers and social media posting.

## Features

### Core Flows

1. **Image Generation** - Generate high-quality images using Google's Imagen 4 Ultra
2. **Text to Speech** - Convert text to professional voiceovers using ElevenLabs
3. **Post Tweet** - Share content on Twitter/X

### Complete Workflow

4. **Video with Voiceover** - End-to-end AI video pipeline:
   - 🎨 Generate image with Imagen 4 Ultra (16:9, 2K resolution)
   - 🎙️ Create voiceover with ElevenLabs TTS
   - 🎬 Combine into MP4 video with FFmpeg
   - 🐦 Optional Twitter/X posting

## Prerequisites

- Node.js 18+
- **FFmpeg** ([Download](https://ffmpeg.org/download.html))
- [Google AI Studio API key](https://aistudio.google.com/apikey)
- [ElevenLabs API key](https://elevenlabs.io/)
- [Twitter/X API credentials](https://developer.twitter.com/)
- Python with `uvx` (`pip install uvx`)

## Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys
```

### Environment Variables

```bash
# Google AI
GOOGLE_GENAI_API_KEY=your_google_api_key

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_MCP_OUTPUT_MODE=files
ELEVENLABS_MCP_BASE_PATH=/path/to/output

# Twitter/X
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_SECRET=your_twitter_access_secret
TWITTER_MCP_PATH=/path/to/x-mcp-server/build/index.js
```

## Usage

### Development Mode

```bash
npm run dev
```

### Genkit Developer UI

```bash
npm run genkit
# Opens at http://localhost:4000
```

### Production Build

```bash
npm run build
npm start
```

## Available Flows

### 1. Image Generation Flow

Generate images using Imagen 4 Ultra.

**Input:**
```json
{
  "prompt": "A serene mountain landscape at sunset"
}
```

**Output:**
```json
{
  "imageUrl": "data:image/jpeg;base64,...",
  "prompt": "A serene mountain landscape at sunset"
}
```

### 2. Text to Speech Flow

Convert text to speech using ElevenLabs.

**Input:**
```json
{
  "text": "Hello, this is a test",
  "voice_id": "SOYHLrjzK2X1ezoPC6cr"
}
```

**Output:** Status message with file path

### 3. Post Tweet Flow

Post to Twitter/X.

**Input:**
```json
{
  "tweetContent": "Just built something cool!"
}
```

**Output:** Tweet status

### 4. Video with Voiceover Flow

**Complete AI video generation pipeline** - the main workflow.

**Input:**
```json
{
  "imagePrompt": "A futuristic city at night with neon lights",
  "ttsScript": "Welcome to the future of AI-generated content.",
  "postOnX": false
}
```

**Output:**
```json
{
  "imageUrl": "data:image/jpeg;base64,...",
  "audioPath": "/path/to/output/tts_*.mp3",
  "videoPath": "/path/to/output/video_*.mp4",
  "tweetStatus": "Posted successfully",
  "error": null
}
```

**Example:**
```bash
genkit flow:run videoWithVoiceoverFlow '{
  "imagePrompt": "A peaceful forest with morning light",
  "ttsScript": "Nature meets technology in this AI creation.",
  "postOnX": false
}'
```

**Technical Details:**
- Image: Imagen 4 Ultra, 2K, 16:9 aspect ratio
- Audio: ElevenLabs eleven_multilingual_v2, voice ID SOYHLrjzK2X1ezoPC6cr
- Video: H.264 codec, AAC audio, duration matches audio
- Output: All files saved to `./output/`

## MCP Integration

This project uses Model Context Protocol (MCP) servers:

### ElevenLabs MCP
- Text-to-speech with multiple voices
- Voice cloning
- Audio isolation
- Installed via: `uvx elevenlabs-mcp`

### Twitter/X MCP
- Post tweets
- Read timeline
- Search and user data
- Custom server installation required

### Configuration

MCP servers are configured in `src/index.ts`:

```typescript
const mcpHost = createMcpHost({
  name: "myMcpServers",
  mcpServers: {
    elevenlabs: {
      command: "uvx",
      args: ["elevenlabs-mcp"],
      env: {
        ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
        ELEVENLABS_MCP_OUTPUT_MODE: "files",
        ELEVENLABS_MCP_BASE_PATH: path.join(process.cwd(), "output"),
      },
    },
    twitter: {
      command: "node",
      args: [process.env.TWITTER_MCP_PATH],
      env: {
        TWITTER_API_KEY: process.env.TWITTER_API_KEY,
        TWITTER_API_SECRET: process.env.TWITTER_API_SECRET,
        TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
        TWITTER_ACCESS_SECRET: process.env.TWITTER_ACCESS_SECRET,
      },
    },
  },
});
```

## Troubleshooting

### MCP Connection Issues

**ElevenLabs:**
```bash
# Verify uvx installation
which uvx
pip install uvx

# Test manually
uvx elevenlabs-mcp
```

**Twitter:**
```bash
# Verify server path
ls -la /path/to/x-mcp-server/build/index.js
node /path/to/x-mcp-server/build/index.js
```

### FFmpeg Issues

```bash
# Verify FFmpeg is installed
ffmpeg -version

# Install on macOS
brew install ffmpeg

# Install on Ubuntu
sudo apt install ffmpeg
```

### Video Duration Mismatch

If video is shorter than audio, check FFmpeg options in `src/index.ts`:
- `-loop 1` loops the static image
- `-framerate 1` sets image framerate
- `-shortest` matches video to audio duration

## Project Structure

```
agent-claude-genkit/
├── src/
│   └── index.ts          # All flows and MCP configuration
├── output/               # Generated files (images, audio, videos)
├── .env                  # API keys (not committed)
├── .env.example          # Example environment variables
├── package.json
└── tsconfig.json
```

## Resources

- [Genkit Documentation](https://firebase.google.com/docs/genkit)
- [Genkit MCP Guide](https://firebase.google.com/docs/genkit/model-context-protocol)
- [ElevenLabs MCP Server](https://github.com/elevenlabs/elevenlabs-mcp)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Google AI Studio](https://aistudio.google.com/)
- [ElevenLabs API Docs](https://elevenlabs.io/docs)

## License

ISC
