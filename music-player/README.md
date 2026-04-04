# D&D Music Master

Desktop music player for Dungeon Masters with scene management, overlays, and soundboard.

## Installation

1. Install Node.js (v18+)
2. Run: `npm install`
3. Run: `npm start`

## Features

- **Scenes**: Switch between different musical atmospheres instantly
- **Main Track**: Primary background music with auto-fade transitions
- **Overlays**: Stack ambient sounds (rain, crowd, fire) on top
- **Soundboard**: Quick-access buttons for sound effects
- **YouTube**: Optional YouTube track integration
- **Volume Control**: Independent volume for each audio layer

## Usage

1. Click **+ Add** in Scenes panel to create your first scene
2. Browse for MP3/WAV files on your computer
3. Add overlays (ambient sounds) to each scene
4. Create soundboard buttons for quick SFX
5. Click any scene to switch instantly with smooth crossfade
6. Use **Save Config** to persist your setup

## File Structure

- `main.js` - Electron main process
- `renderer.js` - UI logic and audio playback
- `index.html` - Application layout
- `styles.css` - Theming
- `scenes.json` - Your saved configuration

## Tips

- Keep main tracks loopable for seamless ambience
- Use overlays for environmental sounds (wind, water, crowd)
- Soundboard is perfect for one-shot effects (door slam, sword hit)
- YouTube integration works but may have autoplay restrictions
