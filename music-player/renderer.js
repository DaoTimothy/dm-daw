// Application State
const state = {
    scenes: [],
    soundboard: [],
    currentScene: null,
    currentSceneIndex: -1,
    mainAudio: null,
    overlayAudios: new Map(),
    soundEffects: new Map(),
    editingSceneId: null,
    editingSoundId: null,
    youtubeModalCallback: null,
    progressInterval: null,
    currentConfigPath: null,  // Track current config file path
    currentConfigName: 'scenes.json'  // Display name
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfiguration();
    setupEventListeners();
    renderScenes();
    renderSoundboard();
    startProgressTracking();
    updateConfigDisplay();
});

// Load configuration from default file
async function loadConfiguration() {
    try {
        const config = await window.electronAPI.loadScenes();
        state.scenes = config.scenes || [];
        state.soundboard = config.soundboard || [];
        state.currentConfigPath = null;
        state.currentConfigName = 'scenes.json';
    } catch (err) {
        console.error('Failed to load config:', err);
    }
}

// Save configuration
async function saveConfiguration() {
    try {
        const data = {
            scenes: state.scenes,
            soundboard: state.soundboard
        };

        if (state.currentConfigPath) {
            // Save to specific file
            const success = await window.electronAPI.saveConfigToPath(data, state.currentConfigPath);
            if (success) {
                alert('Configuration saved to ' + state.currentConfigName);
            } else {
                alert('Error saving configuration');
            }
        } else {
            // Save to default scenes.json
            await window.electronAPI.saveScenes(data);
            alert('Configuration saved to scenes.json');
        }
    } catch (err) {
        console.error('Failed to save config:', err);
        alert('Error saving configuration');
    }
}

// Open specific config file
async function openConfigFile() {
    try {
        const result = await window.electronAPI.openConfigFile();

        if (!result) return;  // User cancelled

        state.scenes = result.data.scenes || [];
        state.soundboard = result.data.soundboard || [];
        state.currentConfigPath = result.filePath;
        state.currentConfigName = result.filePath.split(/[\\/]/).pop();

        // Clear current scene if it was playing
        if (state.mainAudio) {
            state.mainAudio.pause();
            state.mainAudio = null;
        }
        state.overlayAudios.forEach(audio => audio.pause());
        state.overlayAudios.clear();
        state.currentScene = null;

        renderScenes();
        renderSoundboard();
        updateConfigDisplay();

        alert('Configuration loaded from ' + state.currentConfigName);
    } catch (err) {
        console.error('Failed to open config:', err);
        alert('Error loading configuration file');
    }
}

// Save config to new file
async function saveConfigAs() {
    try {
        const data = {
            scenes: state.scenes,
            soundboard: state.soundboard
        };

        const filePath = await window.electronAPI.saveConfigFileAs(data);

        if (filePath) {
            state.currentConfigPath = filePath;
            state.currentConfigName = filePath.split(/[\\/]/).pop();
            updateConfigDisplay();
            alert('Configuration saved to ' + state.currentConfigName);
        }
    } catch (err) {
        console.error('Failed to save config as:', err);
        alert('Error saving configuration file');
    }
}

// Update config name display
function updateConfigDisplay() {
    document.getElementById('currentConfigName').textContent = state.currentConfigName;
}

// Event Listeners Setup
function setupEventListeners() {
    // Header controls
    document.getElementById('openConfig').addEventListener('click', openConfigFile);
    document.getElementById('saveConfig').addEventListener('click', saveConfiguration);
    document.getElementById('saveConfigAs').addEventListener('click', saveConfigAs);

    // Main track controls
    document.getElementById('mainPlay').addEventListener('click', () => playMainTrack());
    document.getElementById('mainPause').addEventListener('click', () => pauseMainTrack());
    document.getElementById('mainStop').addEventListener('click', () => stopMainTrack());
    document.getElementById('mainVolume').addEventListener('input', (e) => {
        const vol = e.target.value;
        document.getElementById('mainVolumeValue').textContent = vol + '%';
        if (state.mainAudio) state.mainAudio.volume = vol / 100;
        // Save volume to current scene
        if (state.currentScene) {
            state.currentScene.mainVolume = parseInt(vol);
            const idx = state.scenes.findIndex(s => s.id === state.currentScene.id);
            if (idx !== -1) state.scenes[idx].mainVolume = parseInt(vol);
        }
    });

    // Loop toggle
    document.getElementById('mainLoop').addEventListener('change', (e) => {
        if (state.mainAudio) state.mainAudio.loop = e.target.checked;
    });

    // Progress bar seeking
    document.querySelector('.progress-bar').addEventListener('click', (e) => {
        if (!state.mainAudio || !state.mainAudio.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        state.mainAudio.currentTime = percent * state.mainAudio.duration;
    });

    // Scene management
    document.getElementById('addScene').addEventListener('click', () => openSceneModal());
    document.getElementById('editScene').addEventListener('click', () => {
        if (state.currentScene) openSceneModal(state.currentScene.id);
    });
    document.getElementById('nextScene').addEventListener('click', () => nextScene());
    document.getElementById('saveScene').addEventListener('click', saveScene);
    document.getElementById('cancelScene').addEventListener('click', closeSceneModal);
    document.getElementById('browseMainTrack').addEventListener('click', async () => {
        const path = await window.electronAPI.selectAudioFile();
        if (path) document.getElementById('sceneMainTrack').value = path;
    });
    document.getElementById('youtubeMainTrack').addEventListener('click', () => {
        openYoutubeModal((url) => {
            document.getElementById('sceneMainTrack').value = url;
        });
    });
    document.getElementById('sceneMainVolume').addEventListener('input', (e) => {
        document.getElementById('sceneMainVolumeValue').textContent = e.target.value + '%';
    });
    document.getElementById('addOverlay').addEventListener('click', addOverlayToModal);

    // Soundboard management
    document.getElementById('addSound').addEventListener('click', () => openSoundModal());
    document.getElementById('saveSound').addEventListener('click', saveSound);
    document.getElementById('deleteSound').addEventListener('click', deleteSound);
    document.getElementById('cancelSound').addEventListener('click', closeSoundModal);
    document.getElementById('browseSoundPath').addEventListener('click', async () => {
        const path = await window.electronAPI.selectAudioFile();
        if (path) document.getElementById('soundPath').value = path;
    });
    document.getElementById('youtubeSoundPath').addEventListener('click', () => {
        openYoutubeModal((url) => {
            document.getElementById('soundPath').value = url;
        });
    });

    // YouTube modal
    document.getElementById('confirmYoutube').addEventListener('click', confirmYoutubeUrl);
    document.getElementById('cancelYoutube').addEventListener('click', closeYoutubeModal);
}

// Progress tracking
function startProgressTracking() {
    state.progressInterval = setInterval(() => {
        if (state.mainAudio && !state.mainAudio.paused) {
            updateProgress();
        }
    }, 100);
}

function updateProgress() {
    if (!state.mainAudio) return;

    const current = state.mainAudio.currentTime;
    const duration = state.mainAudio.duration || 0;
    const percent = duration > 0 ? (current / duration) * 100 : 0;

    document.getElementById('mainProgress').style.width = percent + '%';
    document.getElementById('mainTime').textContent = 
        `${formatTime(current)} / ${formatTime(duration)}`;
}

function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Main Track Functions
function playMainTrack() {
    if (!state.mainAudio) {
        alert('No main track loaded. Select a scene first.');
        return;
    }
    state.mainAudio.play().catch(err => console.error('Play error:', err));
}

function pauseMainTrack() {
    if (state.mainAudio) state.mainAudio.pause();
}

function stopMainTrack() {
    if (state.mainAudio) {
        state.mainAudio.pause();
        state.mainAudio.currentTime = 0;
    }
}

async function loadMainTrack(path, savedVolume = 70) {
    if (state.mainAudio) {
        state.mainAudio.pause();
        state.mainAudio = null;
    }

    let audioPath = path;
    let displayName = path.split(/[\\/]/).pop();

    // Check if it's a YouTube URL
    if (isYouTubeUrl(path)) {
        displayName = '🎬 Loading YouTube...';
        document.getElementById('mainTrackName').textContent = displayName;

        try {
            const result = await window.electronAPI.getYouTubeStream(path);
            
            if (!result.success) {
                alert('Error loading YouTube: ' + result.error);
                document.getElementById('mainTrackName').textContent = 'Error loading YouTube';
                return;
            }

            audioPath = result.url;
            displayName = result.title || 'YouTube Audio';
        } catch (err) {
            console.error('YouTube stream error:', err);
            alert('Failed to load YouTube audio: ' + err.message);
            document.getElementById('mainTrackName').textContent = 'Error loading YouTube';
            return;
        }
    }

    // Create audio element with proper attributes
    state.mainAudio = new Audio();
    state.mainAudio.crossOrigin = 'anonymous';
    state.mainAudio.src = audioPath;
    state.mainAudio.loop = document.getElementById('mainLoop').checked;

    // Add error handling
    state.mainAudio.addEventListener('error', (e) => {
        console.error('Audio load error:', e, 'URL:', audioPath);
        document.getElementById('mainTrackName').textContent = 'Error loading audio';
    });

    state.mainAudio.addEventListener('loadstart', () => {
        console.log('Audio loading started');
    });

    state.mainAudio.addEventListener('canplay', () => {
        console.log('Audio ready to play, duration:', state.mainAudio.duration);
    });

    // Restore saved volume or use default
    const volumeToUse = savedVolume || 70;
    state.mainAudio.volume = volumeToUse / 100;
    document.getElementById('mainVolume').value = volumeToUse;
    document.getElementById('mainVolumeValue').textContent = volumeToUse + '%';

    document.getElementById('mainTrackName').textContent = displayName;

    // Reset progress
    document.getElementById('mainProgress').style.width = '0%';
    document.getElementById('mainTime').textContent = '0:00 / 0:00';
}

// Overlay Functions
async function loadOverlays(overlays) {
    // Clear existing overlays
    state.overlayAudios.forEach(audio => audio.pause());
    state.overlayAudios.clear();

    const container = document.getElementById('overlaysList');
    container.innerHTML = '';

    if (!overlays || overlays.length === 0) {
        container.innerHTML = '<p style="color: #888;">No overlays for this scene</p>';
        return;
    }

    for (let index = 0; index < overlays.length; index++) {
        const overlay = overlays[index];
        let audioPath = overlay.path;
        let displayName = overlay.name || overlay.path.split(/[\\/]/).pop();

        // Handle YouTube URLs for overlays
        if (isYouTubeUrl(overlay.path)) {
            try {
                const result = await window.electronAPI.getYouTubeStream(overlay.path);
                if (result.success) {
                    audioPath = result.url;
                    displayName = overlay.name || result.title;
                } else {
                    console.error('Failed to load YouTube overlay:', result.error);
                    displayName = `${overlay.name || 'Overlay'} (Error)`;
                }
            } catch (err) {
                console.error('YouTube overlay error:', err);
                displayName = `${overlay.name || 'Overlay'} (Error)`;
            }
        }

        const audio = new Audio(audioPath);
        audio.crossOrigin = 'anonymous';
        audio.loop = true;
        // Restore saved volume or use default
        const savedVol = overlay.volume !== undefined ? overlay.volume : 50;
        audio.volume = savedVol / 100;
        
        // Add error handling
        audio.addEventListener('error', (e) => {
            console.error('Overlay load error:', e, 'Path:', audioPath);
        });
        
        state.overlayAudios.set(index, audio);

        const div = document.createElement('div');
        div.className = 'overlay-item';

        div.innerHTML = `
            <div class="overlay-name">${displayName}</div>
            <div class="overlay-controls">
                <button class="btn btn-icon btn-small overlay-play" data-index="${index}">▶️</button>
                <button class="btn btn-icon btn-small overlay-pause" data-index="${index}">⏸️</button>
                <label class="loop-toggle" style="margin:0;">
                    <input type="checkbox" class="overlay-loop" data-index="${index}" checked>
                    <span>Loop</span>
                </label>
                <label style="margin:0;">Vol: <input type="range" class="overlay-volume" data-index="${index}" min="0" max="100" value="${savedVol}"></label>
            </div>
            <div class="progress-bar overlay-progress">
                <div class="progress-fill overlay-progress-${index}"></div>
            </div>
            <div class="overlay-time overlay-time-${index}">0:00 / 0:00</div>
        `;

        container.appendChild(div);

        // Track overlay progress
        audio.addEventListener('timeupdate', () => {
            const current = audio.currentTime;
            const duration = audio.duration || 0;
            const percent = duration > 0 ? (current / duration) * 100 : 0;

            const progressEl = document.querySelector(`.overlay-progress-${index}`);
            const timeEl = document.querySelector(`.overlay-time-${index}`);
            if (progressEl) progressEl.style.width = percent + '%';
            if (timeEl) timeEl.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
        });
    }

    // Add event listeners
    container.querySelectorAll('.overlay-play').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            state.overlayAudios.get(idx)?.play();
        });
    });

    container.querySelectorAll('.overlay-pause').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            state.overlayAudios.get(idx)?.pause();
        });
    });

    container.querySelectorAll('.overlay-loop').forEach(input => {
        input.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.index);
            const audio = state.overlayAudios.get(idx);
            if (audio) audio.loop = e.target.checked;
        });
    });

    container.querySelectorAll('.overlay-volume').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.index);
            const audio = state.overlayAudios.get(idx);
            if (audio) {
                audio.volume = e.target.value / 100;
                // Save volume to scene
                if (state.currentScene && state.currentScene.overlays[idx]) {
                    state.currentScene.overlays[idx].volume = parseInt(e.target.value);
                    const sceneIdx = state.scenes.findIndex(s => s.id === state.currentScene.id);
                    if (sceneIdx !== -1) {
                        state.scenes[sceneIdx].overlays[idx].volume = parseInt(e.target.value);
                    }
                }
            }
        });
    });
}

// Scene Management
function renderScenes() {
    const container = document.getElementById('scenesList');
    container.innerHTML = '';

    if (state.scenes.length === 0) {
        container.innerHTML = '<p style="color: #888; padding: 1rem;">No scenes yet. Click + Add to create one.</p>';
        return;
    }

    state.scenes.forEach((scene, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'scene-item-wrapper';

        const div = document.createElement('div');
        div.className = 'scene-item';
        if (state.currentScene?.id === scene.id) {
            div.classList.add('active');
            state.currentSceneIndex = index;
        }

        div.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 0.3rem;">${scene.name}</div>
            <div style="font-size: 0.8rem; color: #aaa;">${scene.overlays?.length || 0} overlays</div>
        `;

        div.addEventListener('click', () => loadScene(scene.id));

        const actions = document.createElement('div');
        actions.className = 'scene-item-actions';
        actions.innerHTML = `
            <button class="scene-action-btn" data-id="${scene.id}" data-action="edit">✏️</button>
            <button class="scene-action-btn" data-id="${scene.id}" data-action="delete">🗑️</button>
        `;

        actions.querySelectorAll('.scene-action-btn').forEach(actionBtn => {
            actionBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = e.currentTarget.dataset.action;
                const id = e.currentTarget.dataset.id;

                if (action === 'edit') {
                    openSceneModal(id);
                } else if (action === 'delete') {
                    deleteScene(id);
                }
            });
        });

        wrapper.appendChild(div);
        wrapper.appendChild(actions);
        container.appendChild(wrapper);
    });
}

function deleteScene(sceneId) {
    const scene = state.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    if (!confirm(`Delete scene "${scene.name}"?`)) return;

    // If deleting the current scene, stop playback
    if (state.currentScene?.id === sceneId) {
        if (state.mainAudio) {
            state.mainAudio.pause();
            state.mainAudio = null;
        }
        state.overlayAudios.forEach(audio => audio.pause());
        state.overlayAudios.clear();

        state.currentScene = null;
        state.currentSceneIndex = -1;
        document.getElementById('currentSceneName').textContent = 'No Scene Selected';
        document.getElementById('editScene').style.display = 'none';
        document.getElementById('nextScene').style.display = 'none';
        document.getElementById('mainTrackName').textContent = 'No track loaded';
        document.getElementById('overlaysList').innerHTML = '';
    }

    // Remove from scenes array
    state.scenes = state.scenes.filter(s => s.id !== sceneId);
    renderScenes();
}

function loadScene(sceneId) {
    const scene = state.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    // Fade out current main track
    if (state.mainAudio) {
        fadeOut(state.mainAudio, 500, () => {
            state.mainAudio.pause();
        });
    }

    // Stop all overlays
    state.overlayAudios.forEach(audio => audio.pause());

    // Load new scene
    state.currentScene = scene;
    state.currentSceneIndex = state.scenes.findIndex(s => s.id === sceneId);
    document.getElementById('currentSceneName').textContent = scene.name;
    document.getElementById('editScene').style.display = 'inline-block';
    document.getElementById('nextScene').style.display = 'inline-block';

    // Load main track
    if (scene.mainTrack) {
        setTimeout(async () => {
            await loadMainTrack(scene.mainTrack, scene.mainVolume);
            // Auto-play with fade in
            setTimeout(() => {
                fadeIn(state.mainAudio, 1000);
                state.mainAudio.play().catch(err => console.error('Auto-play prevented:', err));
            }, 100);
        }, 600);
    }

    // Load overlays
    setTimeout(async () => {
        await loadOverlays(scene.overlays || []);
    }, 700);

    // Update UI
    renderScenes();
}

function nextScene() {
    if (state.scenes.length === 0) return;

    const nextIndex = (state.currentSceneIndex + 1) % state.scenes.length;
    const nextScene = state.scenes[nextIndex];

    loadScene(nextScene.id);
}

// Fade functions
function fadeOut(audio, duration, callback) {
    if (!audio) return;
    const startVol = audio.volume;
    const fadeStep = startVol / (duration / 50);

    const interval = setInterval(() => {
        if (audio.volume > fadeStep) {
            audio.volume -= fadeStep;
        } else {
            audio.volume = 0;
            clearInterval(interval);
            if (callback) callback();
        }
    }, 50);
}

function fadeIn(audio, duration) {
    if (!audio) return;
    const targetVol = document.getElementById('mainVolume').value / 100;
    const fadeStep = targetVol / (duration / 50);
    audio.volume = 0;

    const interval = setInterval(() => {
        if (audio.volume < targetVol - fadeStep) {
            audio.volume += fadeStep;
        } else {
            audio.volume = targetVol;
            clearInterval(interval);
        }
    }, 50);
}

// Scene Modal Functions
function openSceneModal(sceneId = null) {
    state.editingSceneId = sceneId;
    const modal = document.getElementById('sceneModal');
    const title = document.getElementById('modalTitle');

    if (sceneId) {
        const scene = state.scenes.find(s => s.id === sceneId);
        if (!scene) return;

        title.textContent = 'Edit Scene';
        document.getElementById('sceneName').value = scene.name;
        document.getElementById('sceneMainTrack').value = scene.mainTrack || '';
        document.getElementById('sceneMainVolume').value = scene.mainVolume || 70;
        document.getElementById('sceneMainVolumeValue').textContent = (scene.mainVolume || 70) + '%';

        // Load overlays
        const overlaysList = document.getElementById('modalOverlaysList');
        overlaysList.innerHTML = '';
        (scene.overlays || []).forEach((overlay) => {
            addOverlayToModalUI(overlay.name, overlay.path, overlay.volume);
        });
    } else {
        title.textContent = 'Add Scene';
        document.getElementById('sceneName').value = '';
        document.getElementById('sceneMainTrack').value = '';
        document.getElementById('sceneMainVolume').value = 70;
        document.getElementById('sceneMainVolumeValue').textContent = '70%';
        document.getElementById('modalOverlaysList').innerHTML = '';
    }

    modal.classList.add('active');
}

function closeSceneModal() {
    document.getElementById('sceneModal').classList.remove('active');
    state.editingSceneId = null;
}

function addOverlayToModal() {
    addOverlayToModalUI('', '', 50);
}

function addOverlayToModalUI(name = '', path = '', volume = 50) {
    const container = document.getElementById('modalOverlaysList');
    const div = document.createElement('div');
    div.className = 'overlay-modal-item';

    div.innerHTML = `
        <input type="text" placeholder="Name" value="${name}" class="overlay-name-input">
        <input type="text" placeholder="Path or YouTube URL" value="${path}" class="overlay-path-input" readonly>
        <button class="btn btn-small browse-overlay-btn">Browse</button>
        <button class="btn btn-small youtube-overlay-btn">YouTube</button>
        <button class="btn btn-small remove-overlay-btn">Remove</button>
    `;

    div.querySelector('.browse-overlay-btn').addEventListener('click', async function() {
        const filePath = await window.electronAPI.selectAudioFile();
        if (filePath) {
            div.querySelector('.overlay-path-input').value = filePath;
        }
    });

    div.querySelector('.youtube-overlay-btn').addEventListener('click', function() {
        openYoutubeModal((url) => {
            div.querySelector('.overlay-path-input').value = url;
        });
    });

    div.querySelector('.remove-overlay-btn').addEventListener('click', function() {
        div.remove();
    });

    container.appendChild(div);
}

function saveScene() {
    const name = document.getElementById('sceneName').value.trim();
    const mainTrack = document.getElementById('sceneMainTrack').value.trim();
    const mainVolume = parseInt(document.getElementById('sceneMainVolume').value);

    if (!name) {
        alert('Please enter a scene name');
        return;
    }

    // Collect overlays
    const overlayItems = document.querySelectorAll('.overlay-modal-item');
    const overlays = Array.from(overlayItems).map(item => ({
        name: item.querySelector('.overlay-name-input').value.trim(),
        path: item.querySelector('.overlay-path-input').value.trim(),
        volume: 50
    })).filter(o => o.path);

    const scene = {
        id: state.editingSceneId || generateId(),
        name,
        mainTrack,
        mainVolume,
        overlays
    };

    if (state.editingSceneId) {
        const idx = state.scenes.findIndex(s => s.id === state.editingSceneId);
        if (idx !== -1) state.scenes[idx] = scene;
    } else {
        state.scenes.push(scene);
    }

    renderScenes();
    closeSceneModal();
}

// Soundboard Functions
function renderSoundboard() {
    const container = document.getElementById('soundboardGrid');
    container.innerHTML = '';

    if (state.soundboard.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; color: #888; text-align: center;">No sounds yet</p>';
        return;
    }

    state.soundboard.forEach(sound => {
        const wrapper = document.createElement('div');
        wrapper.className = 'sound-button-wrapper';

        const btn = document.createElement('button');
        btn.className = 'sound-button';
        btn.textContent = sound.label;
        btn.addEventListener('click', () => playSoundEffect(sound.path));

        const actions = document.createElement('div');
        actions.className = 'sound-button-actions';
        actions.innerHTML = `
            <button class="sound-action-btn" data-id="${sound.id}" data-action="edit">✏️</button>
            <button class="sound-action-btn" data-id="${sound.id}" data-action="delete">🗑️</button>
        `;

        actions.querySelectorAll('.sound-action-btn').forEach(actionBtn => {
            actionBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = e.currentTarget.dataset.action;
                const id = e.currentTarget.dataset.id;

                if (action === 'edit') {
                    openSoundModal(id);
                } else if (action === 'delete') {
                    if (confirm('Delete this sound effect?')) {
                        state.soundboard = state.soundboard.filter(s => s.id !== id);
                        renderSoundboard();
                    }
                }
            });
        });

        wrapper.appendChild(btn);
        wrapper.appendChild(actions);
        container.appendChild(wrapper);
    });
}

function playSoundEffect(path) {
    if (isYouTubeUrl(path)) {
        // Load YouTube audio asynchronously
        window.electronAPI.getYouTubeStream(path)
            .then(result => {
                if (result.success) {
                    const sfx = new Audio();
                    sfx.crossOrigin = 'anonymous';
                    sfx.src = result.url;
                    sfx.volume = 0.7;
                    sfx.addEventListener('error', (e) => {
                        console.error('Sound effect error:', e);
                    });
                    sfx.play().catch(err => console.error('SFX play error:', err));
                } else {
                    alert('Failed to load YouTube sound: ' + result.error);
                }
            })
            .catch(err => {
                console.error('YouTube sound error:', err);
                alert('Error loading YouTube sound effect: ' + err.message);
            });
    } else {
        const sfx = new Audio(path);
        sfx.volume = 0.7;
        sfx.addEventListener('error', (e) => {
            console.error('Sound effect error:', e);
        });
        sfx.play().catch(err => console.error('SFX play error:', err));
    }
}

// Sound Modal Functions
function openSoundModal(soundId = null) {
    state.editingSoundId = soundId;
    const modal = document.getElementById('soundModal');
    const title = document.getElementById('soundModalTitle');
    const deleteBtn = document.getElementById('deleteSound');

    if (soundId) {
        const sound = state.soundboard.find(s => s.id === soundId);
        if (!sound) return;

        title.textContent = 'Edit Sound Effect';
        document.getElementById('soundLabel').value = sound.label;
        document.getElementById('soundPath').value = sound.path;
        deleteBtn.style.display = 'inline-block';
    } else {
        title.textContent = 'Add Sound Effect';
        document.getElementById('soundLabel').value = '';
        document.getElementById('soundPath').value = '';
        deleteBtn.style.display = 'none';
    }

    modal.classList.add('active');
}

function closeSoundModal() {
    document.getElementById('soundModal').classList.remove('active');
    state.editingSoundId = null;
}

function saveSound() {
    const label = document.getElementById('soundLabel').value.trim();
    const path = document.getElementById('soundPath').value.trim();

    if (!label || !path) {
        alert('Please enter both label and audio file');
        return;
    }

    if (state.editingSoundId) {
        const idx = state.soundboard.findIndex(s => s.id === state.editingSoundId);
        if (idx !== -1) {
            state.soundboard[idx] = { id: state.editingSoundId, label, path };
        }
    } else {
        state.soundboard.push({ id: generateId(), label, path });
    }

    renderSoundboard();
    closeSoundModal();
}

function deleteSound() {
    if (confirm('Delete this sound effect?')) {
        state.soundboard = state.soundboard.filter(s => s.id !== state.editingSoundId);
        renderSoundboard();
        closeSoundModal();
    }
}

// YouTube Modal Functions
function openYoutubeModal(callback) {
    state.youtubeModalCallback = callback;
    document.getElementById('youtubeModal').classList.add('active');
    document.getElementById('youtubeUrlInput').value = '';
}

function closeYoutubeModal() {
    document.getElementById('youtubeModal').classList.remove('active');
    state.youtubeModalCallback = null;
}

function confirmYoutubeUrl() {
    const url = document.getElementById('youtubeUrlInput').value.trim();

    if (!url) {
        alert('Please enter a YouTube URL');
        return;
    }

    if (!isYouTubeUrl(url)) {
        alert('Invalid YouTube URL');
        return;
    }

    if (state.youtubeModalCallback) {
        state.youtubeModalCallback(url);
    }

    closeYoutubeModal();
}

// YouTube Helper Functions
function isYouTubeUrl(url) {
    return url.includes('youtube.com') || url.includes('youtu.be');
}

function extractYouTubeId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Helper Functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}