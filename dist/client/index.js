// Client-side plugin entry point
function register({ peertubeHelpers }) {
  console.log('[bulk-playlist] client loaded');

  peertubeHelpers.router.onPageChange(route => {
    if (!route.startsWith('/my-library/videos')) return;
    setTimeout(() => injectUI(peertubeHelpers), 500);
  });
}

async function injectUI(helpers) {
  if (document.getElementById('bulk-playlist-btn')) return;

  const toolbar = document.querySelector('.action-bar');
  if (!toolbar) return;

  // Select all button
  const selectAllBtn = document.createElement('button');
  selectAllBtn.className = 'peertube-button secondary';
  selectAllBtn.textContent = 'Select all';
  selectAllBtn.onclick = () => {
    document
      .querySelectorAll('input[type=checkbox][data-video-id]')
      .forEach(c => (c.checked = true));
  };

  // Playlist dropdown
  const playlistSelect = document.createElement('select');
  playlistSelect.className = 'peertube-select';
  const newOption = document.createElement('option');
  newOption.value = '';
  newOption.textContent = 'New playlist…';
  playlistSelect.appendChild(newOption);

  const playlists = await helpers
    .fetch('/api/v1/video-playlists?count=100')
    .then(r => r.json());
  playlists.data.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.displayName;
    playlistSelect.appendChild(opt);
  });

  // Add to playlist button
  const addBtn = document.createElement('button');
  addBtn.id = 'bulk-playlist-btn';
  addBtn.className = 'peertube-button';
  addBtn.textContent = 'Add to playlist';
  addBtn.onclick = async () => {
    const checked = document.querySelectorAll(
      'input[type=checkbox][data-video-id]:checked'
    );
    const videoIds = Array.from(checked).map(c => c.dataset.videoId);
    if (!videoIds.length) return alert('No videos selected');

    let playlistId = playlistSelect.value || null;
    let playlistName;
    if (!playlistId) {
      playlistName = prompt('New playlist name');
      if (!playlistName) return;
    }

    await helpers.fetch('/plugins/bulk-playlist/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoIds, playlistId, playlistName })
    });

    alert('Videos added to playlist');
  };

  toolbar.append(selectAllBtn, playlistSelect, addBtn);
}

module.exports = { register };
