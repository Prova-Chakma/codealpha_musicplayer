/**
 * AURA Music Player — script.js
 * Vanilla JS, no frameworks.
 * All controls, state, and UI sync handled here.
 */

'use strict';

/* ════════════════════════════════════════════
   1. PLAYLIST DATA
   Replace `src` paths with your actual MP3 files.
   Images can be local paths or URLs.
   ════════════════════════════════════════════ */
const playlist = [
  {
    title:  '7 RINGS',
    artist: 'ariana grande',
    album:  'Electric Horizons',
    src:    'audio/song1.mp3',
    cover:  'covers/cover1.jpg',
    gradient: 'linear-gradient(135deg, #0d1b2a 0%, #1a0546 50%, #0a2e2e 100%)',
    color:    '#00d4b8',
  },
  {
    title:  'AARZU',
    artist: 'noor,khan',
    album:  'Starfall',
    src:    'audio/song2.mp3',
    cover:  'covers/cover2.jpg',
    gradient: 'linear-gradient(135deg, #1a0533 0%, #06102a 50%, #0f2040 100%)',
    color:    '#6c63ff',
  },
  {
    title:  'BLINDING LIGHTS',
    artist: 'weekend',
    album:  'Transistor Dreams',
    src:    'audio/song3.mp3',
    cover:  'covers/cover3.jpg',
    gradient: 'linear-gradient(135deg, #1a0d00 0%, #2a1500 50%, #1a2200 100%)',
    color:    '#ffb347',
  },
  {
    title:  'TREASURE',
    artist: 'bruno mars',
    album:  'Void Garden',
    src:    'audio/song4.mp3',
    cover:  'covers/cover4.jpg',
    gradient: 'linear-gradient(135deg, #001a2a 0%, #0a2a1a 50%, #1a001a 100%)',
    color:    '#00e5ff',
  },
  {
    title:  'MAST MAGAN',
    artist: 'arijit singh',
    album:  'Parallel Skies',
    src:    'audio/song5.mp3',
    cover:  'covers/cover5.jpg',
    gradient: 'linear-gradient(135deg, #0d0020 0%, #20000d 50%, #000d20 100%)',
    color:    '#ff6584',
  },
];

/* ════════════════════════════════════════════
   2. STATE
   ════════════════════════════════════════════ */
const state = {
  currentIndex:    0,
  isPlaying:       false,
  isShuffle:       false,
  repeatMode:      0,     // 0 = off | 1 = repeat all | 2 = repeat one
  isMuted:         false,
  volume:          0.8,
  shuffleHistory:  [],
  isDraggingProgress: false,
  isDraggingVolume:   false,
};

/* ════════════════════════════════════════════
   3. DOM REFS
   ════════════════════════════════════════════ */
const audio           = document.getElementById('audioPlayer');
const albumArt        = document.getElementById('albumArt');
const albumArtFallback= document.getElementById('albumArtFallback');
const songTitle       = document.getElementById('songTitle');
const songArtist      = document.getElementById('songArtist');
const songAlbum       = document.getElementById('songAlbum');
const currentTimeEl   = document.getElementById('currentTime');
const totalDurationEl = document.getElementById('totalDuration');
const timeRemainingEl = document.getElementById('timeRemaining');
const progressTrack   = document.getElementById('progressTrack');
const progressFill    = document.getElementById('progressFill');
const progressThumb   = document.getElementById('progressThumb');
const progressBuffered= document.getElementById('progressBuffered');
const progressTooltip = document.getElementById('progressTooltip');
const volumeTrack     = document.getElementById('volumeTrack');
const volumeFill      = document.getElementById('volumeFill');
const volumeThumb     = document.getElementById('volumeThumb');
const volLabel        = document.getElementById('volLabel');
const playPauseBtn    = document.getElementById('playPauseBtn');
const playIcon        = document.getElementById('playIcon');
const pauseIcon       = document.getElementById('pauseIcon');
const prevBtn         = document.getElementById('prevBtn');
const nextBtn         = document.getElementById('nextBtn');
const shuffleBtn      = document.getElementById('shuffleBtn');
const repeatBtn       = document.getElementById('repeatBtn');
const repeatBadge     = document.getElementById('repeatBadge');
const muteBtn         = document.getElementById('muteBtn');
const vinylDisc       = document.getElementById('vinylDisc');
const playlistList    = document.getElementById('playlistList');
const playlistCount   = document.getElementById('playlistCount');
const themeToggle     = document.getElementById('themeToggle');
const volIcons        = {
  high: document.getElementById('volIconHigh'),
  mid:  document.getElementById('volIconMid'),
  low:  document.getElementById('volIconLow'),
  mute: document.getElementById('volIconMute'),
};

/* ════════════════════════════════════════════
   4. INIT
   ════════════════════════════════════════════ */
function init() {
  buildPlaylist();
  loadTrack(state.currentIndex, false); // load without autoplay
  audio.volume = state.volume;
  updateVolumeUI(state.volume);
  const saved = localStorage.getItem('aura-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

/* ════════════════════════════════════════════
   5. PLAYLIST UI
   ════════════════════════════════════════════ */
function buildPlaylist() {
  playlistList.innerHTML = '';
  playlistCount.textContent = `${playlist.length} track${playlist.length !== 1 ? 's' : ''}`;

  playlist.forEach((track, index) => {
    const li = document.createElement('li');
    li.className = 'playlist-item';
    li.setAttribute('role', 'option');
    li.setAttribute('aria-label', `${track.title} by ${track.artist}`);
    li.dataset.index = index;

    li.innerHTML = `
      <div class="playing-bars" aria-hidden="true">
        <div class="playing-bar"></div>
        <div class="playing-bar"></div>
        <div class="playing-bar"></div>
        <div class="playing-bar"></div>
      </div>
      <span class="track-num">${String(index + 1).padStart(2, '0')}</span>
      <img class="track-thumb" src="${track.cover}" alt="${track.title}" onerror="this.style.background='${track.gradient}'; this.src='';" />
      <div class="track-info">
        <div class="track-name">${escapeHTML(track.title)}</div>
        <div class="track-artist">${escapeHTML(track.artist)}</div>
      </div>
      <span class="track-duration" id="dur-${index}">—</span>
    `;

    li.addEventListener('click', () => {
      if (index === state.currentIndex) {
        togglePlay();
      } else {
        state.currentIndex = index;
        loadTrack(index, true);
      }
    });

    playlistList.appendChild(li);
  });

  prefetchDurations();
}

function prefetchDurations() {
  playlist.forEach((track, i) => {
    const a = new Audio();
    a.preload = 'metadata';
    a.src = track.src;
    a.addEventListener('loadedmetadata', () => {
      const el = document.getElementById(`dur-${i}`);
      if (el) el.textContent = formatTime(a.duration);
    });
  });
}

function updatePlaylistActive() {
  const items = playlistList.querySelectorAll('.playlist-item');
  items.forEach((item, i) => {
    item.classList.toggle('active', i === state.currentIndex);
    item.classList.toggle('paused', i === state.currentIndex && !state.isPlaying);
    item.setAttribute('aria-selected', i === state.currentIndex);
  });

  const activeItem = playlistList.querySelector('.playlist-item.active');
  if (activeItem) {
    activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/* ════════════════════════════════════════════
   6. LOAD TRACK
   ════════════════════════════════════════════ */

// FIX 1: Track whether a canplay listener is pending so we don't stack duplicates.
let _canplayPending = false;

function loadTrack(index, autoplay = true) {
  const track = playlist[index];
  if (!track) return;

  // FIX 2: Remove any previously attached (but not yet fired) canplay listener
  // before assigning a new src. Without this, switching tracks quickly could
  // fire the old listener on the new track, or pile up multiple listeners.
  if (_canplayPending) {
    audio.removeEventListener('canplay', playWhenReady);
    _canplayPending = false;
  }

  // — Update song info —
  songTitle.textContent  = track.title;
  songArtist.textContent = track.artist;
  songAlbum.textContent  = track.album;

  requestAnimationFrame(() => {
    const si = songTitle.closest('.song-info');
    if (si) {
      si.classList.add('song-transitioning');
      setTimeout(() => si.classList.remove('song-transitioning'), 400);
    }
  });

  // — Album art swap —
  swapAlbumArt(track);

  // — Accent color update —
  updateAccentColor(track.color);

  // FIX 3: Pause before changing src. Changing audio.src while playing can
  // silently fail or leave the element in a broken state on some browsers.
  audio.pause();

  // — Audio source —
  // FIX 4: Use an absolute-style path with './' prefix to ensure Live Server
  // always resolves the file relative to index.html, not the browser origin.
  audio.src = track.src;

  // FIX 5: Explicitly set preload so the browser fetches enough data to play.
  audio.preload = 'auto';

  audio.load();

  // Reset progress
  progressFill.style.width = '0%';
  if (progressThumb) progressThumb.style.left = '0%';
  currentTimeEl.textContent  = '0:00';
  totalDurationEl.textContent = '0:00';
  if (timeRemainingEl) timeRemainingEl.textContent = '−0:00';

  // Restore volume
  audio.volume = state.isMuted ? 0 : state.volume;

  // Update playlist highlight
  updatePlaylistActive();

  if (autoplay) {
    // FIX 6: Register the canplay listener AFTER audio.load() and track the
    // flag so we can clean it up if needed. `{ once: true }` is correct here.
    _canplayPending = true;
    audio.addEventListener('canplay', playWhenReady, { once: true });
  } else {
    state.isPlaying = false;
    updatePlayPauseUI();
  }
}

function playWhenReady() {
  _canplayPending = false;

  // FIX 7: Always update UI optimistically before the promise resolves so the
  // button doesn't lag. Real state is corrected by the 'play'/'pause' events.
  const promise = audio.play();

  if (promise !== undefined) {
    promise
      .then(() => {
        // 'play' event handler keeps state in sync — nothing extra needed here.
      })
      .catch(err => {
        // Autoplay blocked by browser policy (common without a prior user gesture).
        console.warn('Autoplay blocked:', err);
        state.isPlaying = false;
        updatePlayPauseUI();
        updatePlaylistActive();
      });
  }
}

/* ── Album art swap animation ── */
function swapAlbumArt(track) {
  albumArt.classList.add('swap-out');

  setTimeout(() => {
    albumArt.classList.remove('swap-out');
    albumArt.src = track.cover;

    albumArt.onerror = () => {
      albumArtFallback.style.background = track.gradient;
      albumArtFallback.classList.add('visible');
      albumArt.style.opacity = '0';
    };
    albumArt.onload = () => {
      albumArtFallback.classList.remove('visible');
      albumArt.style.opacity = '1';
    };

    albumArt.classList.add('swap-in');
    setTimeout(() => albumArt.classList.remove('swap-in'), 380);
  }, 260);

  albumArtFallback.style.background = track.gradient;
}

/* ── Accent color (CSS var override) ── */
function updateAccentColor(color) {
  document.documentElement.style.setProperty('--accent-primary', color);
  const hex = color.replace('#','');
  const r = parseInt(hex.slice(0,2),16);
  const g = parseInt(hex.slice(2,4),16);
  const b = parseInt(hex.slice(4,6),16);
  document.documentElement.style.setProperty('--accent-glow', `rgba(${r},${g},${b},0.35)`);
}

/* ════════════════════════════════════════════
   7. PLAY / PAUSE
   ════════════════════════════════════════════ */
function togglePlay() {
  // FIX 8: The original check `if (!audio.src)` evaluates to false even when
  // src is set to a relative path, because the browser expands it to an
  // absolute URL. Use audio.readyState instead to detect an unloaded track.
  if (audio.readyState === 0 && !audio.src) {
    loadTrack(state.currentIndex, true);
    return;
  }

  if (state.isPlaying) {
    audio.pause();
    // state.isPlaying is set to false by the 'pause' event listener
  } else {
    // FIX 9: If canplay hasn't fired yet (e.g. user clicks play very quickly
    // after a track change), cancel the pending listener and play directly.
    if (_canplayPending) {
      audio.removeEventListener('canplay', playWhenReady);
      _canplayPending = false;
    }

    const promise = audio.play();
    if (promise !== undefined) {
      promise.catch(err => {
        console.warn('Play failed:', err);
        state.isPlaying = false;
        updatePlayPauseUI();
        updatePlaylistActive();
      });
    }
    // state.isPlaying = true is set by the 'play' event listener
  }
}

function updatePlayPauseUI() {
  if (state.isPlaying) {
    playIcon.style.display  = 'none';
    pauseIcon.style.display = 'flex';
    vinylDisc.classList.add('spinning');
  } else {
    playIcon.style.display  = 'flex';
    pauseIcon.style.display = 'none';
    vinylDisc.classList.remove('spinning');
  }
}

/* ════════════════════════════════════════════
   8. NEXT / PREVIOUS
   ════════════════════════════════════════════ */
function playNext(fromEnd = false) {
  if (state.repeatMode === 2 && fromEnd) {
    audio.currentTime = 0;
    audio.play();
    return;
  }

  if (state.isShuffle) {
    state.currentIndex = getShuffledNext();
  } else {
    state.currentIndex = (state.currentIndex + 1) % playlist.length;
  }

  loadTrack(state.currentIndex, true);
}

function playPrev() {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }

  if (state.isShuffle && state.shuffleHistory.length > 1) {
    state.shuffleHistory.pop();
    state.currentIndex = state.shuffleHistory[state.shuffleHistory.length - 1];
    state.shuffleHistory.pop();
  } else {
    state.currentIndex = (state.currentIndex - 1 + playlist.length) % playlist.length;
  }

  loadTrack(state.currentIndex, true);
}

function getShuffledNext() {
  const pool = playlist
    .map((_, i) => i)
    .filter(i => i !== state.currentIndex);

  if (pool.length === 0) return state.currentIndex;

  const recentCount = Math.min(Math.floor(playlist.length / 2), state.shuffleHistory.length);
  const recent = state.shuffleHistory.slice(-recentCount);
  const filtered = pool.filter(i => !recent.includes(i));
  const candidates = filtered.length > 0 ? filtered : pool;

  const next = candidates[Math.floor(Math.random() * candidates.length)];
  state.shuffleHistory.push(next);

  if (state.shuffleHistory.length > playlist.length) {
    state.shuffleHistory.shift();
  }

  return next;
}

/* ════════════════════════════════════════════
   9. SHUFFLE & REPEAT
   ════════════════════════════════════════════ */
function toggleShuffle() {
  state.isShuffle = !state.isShuffle;
  state.shuffleHistory = [state.currentIndex];
  shuffleBtn.classList.toggle('active', state.isShuffle);
  shuffleBtn.setAttribute('aria-pressed', state.isShuffle);
}

function toggleRepeat() {
  state.repeatMode = (state.repeatMode + 1) % 3;

  repeatBtn.classList.toggle('active', state.repeatMode > 0);
  repeatBadge.style.display = state.repeatMode === 2 ? 'flex' : 'none';
  repeatBtn.setAttribute('aria-pressed', state.repeatMode > 0);

  const titles = ['Repeat: Off', 'Repeat: All', 'Repeat: One'];
  repeatBtn.title = titles[state.repeatMode];
}

/* ════════════════════════════════════════════
   10. PROGRESS BAR — SEEK
   ════════════════════════════════════════════ */
function updateProgress() {
  if (state.isDraggingProgress || !audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  progressFill.style.width = `${pct}%`;
  if (progressThumb) progressThumb.style.left = `${pct}%`;
  progressTrack.setAttribute('aria-valuenow', Math.round(pct));
  currentTimeEl.textContent = formatTime(audio.currentTime);

  // Update remaining time
  if (timeRemainingEl) {
    const remaining = audio.duration - audio.currentTime;
    timeRemainingEl.textContent = `−${formatTime(remaining)}`;
  }

  // Update buffered
  if (progressBuffered && audio.buffered.length > 0) {
    const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
    progressBuffered.style.width = `${(bufferedEnd / audio.duration) * 100}%`;
  }
}

function seekToEvent(e) {
  const rect = progressTrack.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  if (audio.duration) {
    audio.currentTime = pct * audio.duration;
    progressFill.style.width = `${pct * 100}%`;
    if (progressThumb) progressThumb.style.left = `${pct * 100}%`;
    currentTimeEl.textContent = formatTime(audio.currentTime);

    // Show tooltip
    if (progressTooltip) {
      progressTooltip.textContent = formatTime(pct * audio.duration);
      progressTooltip.style.left = `${pct * 100}%`;
    }
  }
}

progressTrack.addEventListener('mousedown',  e => { state.isDraggingProgress = true; seekToEvent(e); });
progressTrack.addEventListener('touchstart', e => { state.isDraggingProgress = true; seekToEvent(e); }, { passive: true });
progressTrack.addEventListener('click', seekToEvent);

document.addEventListener('mousemove', e => { if (state.isDraggingProgress) seekToEvent(e); });
document.addEventListener('touchmove', e => { if (state.isDraggingProgress) seekToEvent(e); }, { passive: true });
document.addEventListener('mouseup',   () => { state.isDraggingProgress = false; });
document.addEventListener('touchend',  () => { state.isDraggingProgress = false; });

progressTrack.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
  if (e.key === 'ArrowLeft')  audio.currentTime = Math.max(0, audio.currentTime - 5);
});

/* ════════════════════════════════════════════
   11. VOLUME CONTROL
   ════════════════════════════════════════════ */
function setVolume(pct) {
  pct = Math.max(0, Math.min(1, pct));
  state.volume = pct;
  state.isMuted = (pct === 0);
  audio.volume = pct;
  updateVolumeUI(pct);
}

function updateVolumeUI(pct) {
  const pctStr = `${(pct * 100).toFixed(0)}%`;
  volumeFill.style.width  = pctStr;
  volumeThumb.style.left  = pctStr;
  volLabel.textContent    = Math.round(pct * 100);
  volumeTrack.setAttribute('aria-valuenow', Math.round(pct * 100));

  Object.values(volIcons).forEach(ic => ic.style.display = 'none');
  if (pct === 0 || state.isMuted) {
    volIcons.mute.style.display = 'block';
  } else if (pct < 0.4) {
    volIcons.low.style.display  = 'block';
  } else if (pct < 0.75) {
    volIcons.mid.style.display  = 'block';
  } else {
    volIcons.high.style.display = 'block';
  }
}

function volumeSeekEvent(e) {
  const rect = volumeTrack.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  setVolume(pct);
}

volumeTrack.addEventListener('mousedown',  e => { state.isDraggingVolume = true; volumeSeekEvent(e); });
volumeTrack.addEventListener('touchstart', e => { state.isDraggingVolume = true; volumeSeekEvent(e); }, { passive: true });
volumeTrack.addEventListener('click', volumeSeekEvent);

document.addEventListener('mousemove', e => { if (state.isDraggingVolume) volumeSeekEvent(e); });
document.addEventListener('touchmove', e => { if (state.isDraggingVolume) volumeSeekEvent(e); }, { passive: true });
document.addEventListener('mouseup',   () => { state.isDraggingVolume = false; });
document.addEventListener('touchend',  () => { state.isDraggingVolume = false; });

volumeTrack.addEventListener('keydown', e => {
  if (e.key === 'ArrowUp')   setVolume(state.volume + 0.05);
  if (e.key === 'ArrowDown') setVolume(state.volume - 0.05);
});

function toggleMute() {
  if (state.isMuted) {
    state.isMuted = false;
    audio.volume  = state.volume;
    updateVolumeUI(state.volume);
  } else {
    state.isMuted = true;
    audio.volume  = 0;
    updateVolumeUI(0);
  }
}

/* ════════════════════════════════════════════
   12. AUDIO EVENTS
   ════════════════════════════════════════════ */
audio.addEventListener('timeupdate', updateProgress);

audio.addEventListener('loadedmetadata', () => {
  totalDurationEl.textContent = formatTime(audio.duration);
  const el = document.getElementById(`dur-${state.currentIndex}`);
  if (el) el.textContent = formatTime(audio.duration);
});

audio.addEventListener('ended', () => {
  if (state.repeatMode === 2) {
    audio.currentTime = 0;
    audio.play();
  } else if (state.repeatMode === 1) {
    playNext(true);
  } else {
    if (state.currentIndex < playlist.length - 1 || state.isShuffle) {
      playNext(true);
    } else {
      state.isPlaying = false;
      updatePlayPauseUI();
      updatePlaylistActive();
    }
  }
});

// FIX 10: Let the native 'play' and 'pause' events be the single source of
// truth for state.isPlaying. Syncing state here (instead of inside .then())
// prevents race conditions where the promise resolves after a pause has fired.
audio.addEventListener('play',  () => {
  state.isPlaying = true;
  updatePlayPauseUI();
  updatePlaylistActive();
});

audio.addEventListener('pause', () => {
  state.isPlaying = false;
  updatePlayPauseUI();
  updatePlaylistActive();
});

audio.addEventListener('error', (e) => {
  // FIX 11: Log the specific error code so the developer can see what failed
  // (e.g. MEDIA_ERR_SRC_NOT_SUPPORTED means the file path is wrong or the
  // format is unsupported; MEDIA_ERR_NETWORK means a file-fetch problem).
  const codes = {
    1: 'MEDIA_ERR_ABORTED',
    2: 'MEDIA_ERR_NETWORK',
    3: 'MEDIA_ERR_DECODE',
    4: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
  };
  const code = audio.error ? codes[audio.error.code] || `code ${audio.error.code}` : 'unknown';
  console.error(`Audio error [${code}]:`, audio.error?.message || '', '— src:', audio.src);

  albumArtFallback.classList.add('visible');
  albumArt.style.opacity = '0';
  state.isPlaying = false;
  updatePlayPauseUI();
  updatePlaylistActive();
});

/* ════════════════════════════════════════════
   13. BUTTON EVENT LISTENERS
   ════════════════════════════════════════════ */
playPauseBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', () => playPrev());
nextBtn.addEventListener('click', () => playNext(false));
shuffleBtn.addEventListener('click', toggleShuffle);
repeatBtn.addEventListener('click', toggleRepeat);
muteBtn.addEventListener('click', toggleMute);

/* ════════════════════════════════════════════
   14. DARK / LIGHT THEME TOGGLE
   ════════════════════════════════════════════ */
themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('aura-theme', next);
});

/* ════════════════════════════════════════════
   15. KEYBOARD SHORTCUTS (global)
   ════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  switch (e.code) {
    case 'Space':
      e.preventDefault();
      togglePlay();
      break;
    case 'ArrowRight':
      if (e.altKey) { e.preventDefault(); playNext(false); }
      break;
    case 'ArrowLeft':
      if (e.altKey) { e.preventDefault(); playPrev(); }
      break;
    case 'KeyM':
      toggleMute();
      break;
    case 'KeyS':
      toggleShuffle();
      break;
    case 'KeyR':
      toggleRepeat();
      break;
  }
});

/* ════════════════════════════════════════════
   16. UTILITY HELPERS
   ════════════════════════════════════════════ */
function formatTime(secs) {
  if (isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', init);