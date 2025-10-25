# Veo Video Generation Flows

Comprehensive video generation flows using Google's latest **Veo 3.1** and **Veo 3.1 Fast** models.

## Available Models

All flows in this module use the **latest Veo models** (v1.21.0):

- **veo-3.1-generate-preview**: High-quality video generation
- **veo-3.1-fast-generate-preview**: Faster video generation for quick iterations
- **veo-3.0-generate-001**: Stable Veo 3.0 model
- **veo-3.0-fast-generate-001**: Stable Veo 3.0 fast variant
- **veo-2.0-generate-001**: Legacy Veo 2.0 model

## Available Flows

### 1. `veo31TextToVideoFlow` - High-Quality Text-to-Video

Generate high-quality videos from text descriptions using Veo 3.1.

**Use cases:**
- Detailed cinematic scenes
- High-quality marketing content
- Complex visual narratives

**Input Schema:**
```typescript
{
  prompt: string;                                    // Detailed scene description
  negativePrompt?: string;                           // Things to avoid
  aspectRatio?: "9:16" | "16:9";                     // Default: "16:9"
  personGeneration?: "dont_allow" | "allow_adult" | "allow_all"; // Default: "allow_all"
  durationSeconds?: number;                          // 5-8 seconds, Default: 8
  enhancePrompt?: boolean;                           // Auto-enhance prompt, Default: true
}
```

**Example:**
```typescript
const result = await veo31TextToVideoFlow({
  prompt: "A majestic dragon soaring over a mystical forest at dawn, cinematic lighting, 4K quality",
  aspectRatio: "16:9",
  durationSeconds: 8,
  enhancePrompt: true
});
```

---

### 2. `veo31FastTextToVideoFlow` - Fast Text-to-Video

Generate videos quickly using Veo 3.1 Fast for rapid iterations.

**Use cases:**
- Quick previews and iterations
- Prototyping video concepts
- Faster turnaround projects

**Input Schema:**
```typescript
{
  prompt: string;                                    // Scene description
  aspectRatio?: "9:16" | "16:9";                     // Default: "16:9"
  personGeneration?: "dont_allow" | "allow_adult" | "allow_all"; // Default: "allow_all"
}
```

**Example:**
```typescript
const result = await veo31FastTextToVideoFlow({
  prompt: "A sleek sports car driving through a neon-lit city at night",
  aspectRatio: "16:9"
});
```

---

### 3. `veo31ImageToVideoFlow` - Image-to-Video (Animate Images)

Bring static images to life by animating them with Veo 3.1.

**Use cases:**
- Animating photos
- Making product images dynamic
- Creating motion from still art
- Adding life to illustrations

**Input Schema:**
```typescript
{
  imagePath: string;                                 // Path to input image file
  prompt: string;                                    // How the image should animate
  aspectRatio?: "9:16" | "16:9";                     // Default: "16:9" (match image!)
  personGeneration?: "dont_allow" | "allow_adult" | "allow_all"; // Default: "allow_all"
  durationSeconds?: number;                          // 5-8 seconds, Default: 6
}
```

**Example:**
```typescript
const result = await veo31ImageToVideoFlow({
  imagePath: "./test-input-files/landscape.jpg",
  prompt: "The clouds slowly drift across the sky, water gently ripples",
  aspectRatio: "16:9",
  durationSeconds: 6
});
```

**Important Notes:**
- Image aspect ratio should match the specified `aspectRatio` parameter
- Supported formats: JPG, PNG, WebP
- The image acts as the first/reference frame for the video

---

### 4. `veo31VideoToVideoFlow` - Video Extension/Continuation

Extend and continue existing videos with new sequences using Veo 3.1.

**Use cases:**
- Continuing video narratives
- Extending video sequences
- Adding follow-up action to existing clips
- Creating longer video stories

**Input Schema:**
```typescript
{
  videoUrl: string;                                  // URL of input video (Google API format)
  prompt: string;                                    // How to continue/extend the video
  aspectRatio?: "9:16" | "16:9";                     // Default: "16:9"
  personGeneration?: "dont_allow" | "allow_adult" | "allow_all"; // Default: "allow_all"
}
```

**Example:**
```typescript
const result = await veo31VideoToVideoFlow({
  videoUrl: "https://generativelanguage.googleapis.com/v1beta/files/...",
  prompt: "The character turns around and walks toward the distant mountains",
  aspectRatio: "16:9"
});
```

**Important Notes:**
- Input video must be a Google API URL (use `videoUrl` from previous generation)
- Best used for narrative continuation and sequence extension

---

### 5. `veo31FastImageToVideoFlow` - Fast Image Animation

Quick image-to-video generation using Veo 3.1 Fast.

**Use cases:**
- Rapid image animation prototyping
- Quick content creation
- Fast turnaround projects

**Input Schema:**
```typescript
{
  imagePath: string;                                 // Path to input image
  prompt: string;                                    // How the image should animate
  aspectRatio?: "9:16" | "16:9";                     // Default: "16:9"
  personGeneration?: "dont_allow" | "allow_adult";   // Default: "allow_adult"
}
```

---

### 6. `veo31FastVideoToVideoFlow` - Fast Video Extension

Quick video continuation using Veo 3.1 Fast.

**Use cases:**
- Rapid video sequence extensions
- Quick prototyping of video continuations
- Fast iteration on video narratives

**Input Schema:**
```typescript
{
  videoUrl: string;                                  // URL of input video (Google API format)
  prompt: string;                                    // How to continue/extend the video
  aspectRatio?: "9:16" | "16:9";                     // Default: "16:9"
  personGeneration?: "dont_allow" | "allow_adult";   // Default: "allow_adult"
}
```

---

### 7. `veoVideoFlow` - Default Flow (Fast Variant)

The default flow that uses `veo31FastTextToVideoFlow` for quick iterations.

**Example:**
```typescript
const result = await veoVideoFlow({
  prompt: "A peaceful zen garden with falling cherry blossoms"
});
```

---

## Configuration Options

### Aspect Ratios
- **`16:9`**: Landscape (YouTube, presentations, widescreen)
- **`9:16`**: Portrait (TikTok, Instagram Stories, mobile)

### Person Generation
- **`dont_allow`**: No people or faces in the video
- **`allow_adult`**: Allow adults, but not children
- **`allow_all`**: Allow all people (default)

### Duration
- Range: **5-8 seconds**
- Default: **8 seconds** (standard), **6 seconds** (image-to-video)
- Note: Some models may have fixed durations

### Prompt Enhancement
- When enabled (default), Genkit automatically enhances your prompt for better results
- Can be disabled for more control: `enhancePrompt: false`

---

## Output Format

All flows return:
```typescript
{
  videoPath?: string;    // Path to generated MP4 file in ./output/
  videoUrl?: string;     // Original Google API URL (for reuse in video extension)
  traceId?: string;      // Operation ID for debugging
  error?: string;        // Error message if generation failed
}
```

**Chaining Video Operations:**

You can chain operations by using the `videoUrl` from one flow as input to video extension flows:

```typescript
// Step 1: Generate video from image
const animated = await veo31FastImageToVideoFlow({
  imagePath: "./agent-banner.png",
  prompt: "Camera zooms in on the glowing AI agent"
});

// Step 2: Extend the video
const extended = await veo31VideoToVideoFlow({
  videoUrl: animated.videoUrl, // Use the Google API URL
  prompt: "Agent turns and walks into the digital landscape"
});
```

---

## Long-Running Operations

Video generation is **asynchronous** and uses **long-running operations**:

1. Generation starts and returns an operation ID
2. Flow automatically polls every 3-5 seconds for completion
3. Once complete, the video is downloaded to `./output/`
4. Total time varies: 30 seconds to several minutes

Console logs show progress:
```
Starting Veo 3.1 text-to-video generation...
Video generation started. Polling for completion...
Operation ID: operations/abc123...
Operation status: In Progress
Operation status: In Progress
Operation status: Done
Video successfully generated: ./output/veo31_1234567890.mp4
```

---

## Usage in Genkit Developer UI

1. Start the Genkit UI:
   ```bash
   npm run genkit
   ```

2. Navigate to the Flows tab

3. Select a Veo flow from the list:
   - `veo31TextToVideoFlow`
   - `veo31FastTextToVideoFlow`
   - `veo31ImageToVideoFlow`
   - `veo31VideoToVideoFlow`

4. Fill in the input fields

5. Click "Run" and wait for completion

6. Generated videos are saved to `./output/` directory

---

## Programmatic Usage

```typescript
import {
  veo31TextToVideoFlow,
  veo31FastTextToVideoFlow,
  veo31ImageToVideoFlow,
  veo31VideoToVideoFlow,
} from './src/index';

// Text-to-video
const result1 = await veo31TextToVideoFlow({
  prompt: "A serene mountain landscape at sunset with dramatic clouds",
  aspectRatio: "16:9",
  durationSeconds: 8
});

// Image-to-video
const result2 = await veo31ImageToVideoFlow({
  imagePath: "./my-photo.jpg",
  prompt: "Make the subject smile and blink naturally",
  durationSeconds: 6
});
```

---

## Tips for Best Results

### Prompt Writing
- **Be specific**: Include details about lighting, camera angles, movement
- **Use cinematic language**: "tracking shot", "slow motion", "aerial view"
- **Describe motion**: What should move and how
- **Set the mood**: Lighting conditions, time of day, weather

### Good Prompts
✅ "Cinematic aerial shot of a winding river through autumn forest, golden hour lighting, camera slowly pans right"

✅ "Close-up of raindrops falling on a window, bokeh lights in background, shallow depth of field"

✅ "Time-lapse of clouds moving over a city skyline at sunset, dramatic lighting"

### Avoid
❌ "A video of a car" (too vague)
❌ "Make something cool" (no direction)

### Model Selection
- Use **Veo 3.1** for final production, marketing, high-quality content
- Use **Veo 3.1 Fast** for prototyping, testing, quick iterations
- Use **Image-to-Video** when you have a specific starting composition
- Use **Video Extension** to continue and extend video narratives

---

## Error Handling

All flows include comprehensive error handling:

```typescript
const result = await veo31TextToVideoFlow({ prompt: "..." });

if (result.error) {
  console.error("Generation failed:", result.error);
} else {
  console.log("Video saved to:", result.videoPath);
}
```

Common errors:
- Missing API key
- Invalid image/video paths
- Network timeouts
- API quota limits

---

## File Locations

Generated videos are saved to:
```
./output/
  ├── veo31_1234567890.mp4           # Veo 3.1 standard (text-to-video)
  ├── veo31fast_1234567890.mp4       # Veo 3.1 Fast (text-to-video)
  ├── veo31_i2v_1234567890.mp4       # Image-to-video
  ├── veo31fast_i2v_1234567890.mp4   # Fast image-to-video
  ├── veo31_extend_1234567890.mp4    # Video extension
  └── veo31fast_extend_1234567890.mp4 # Fast video extension
```

---

## Requirements

- **Node.js** 18+
- **API Key**: `GEMINI_API_KEY` or `GOOGLE_API_KEY` in `.env`
- **Package Version**: `@genkit-ai/google-genai@1.21.0` or later
- **Disk Space**: ~50-100MB per generated video

---

## Version History

### v1.21.0 (Current)
- ✨ Added Veo 3.1 and Veo 3.1 Fast models
- ✨ Added video extension/continuation support (all flows return `videoUrl`)
- ✨ Comprehensive flows for text-to-video, image-to-video, and video extension
- ✨ Improved error handling and progress tracking

---

## Additional Resources

- [Genkit Documentation](https://genkit.dev/docs)
- [Veo API Documentation](https://ai.google.dev/gemini-api/docs/video)
- [Google AI Studio](https://aistudio.google.com)

---

**Built with Genkit** 🚀
