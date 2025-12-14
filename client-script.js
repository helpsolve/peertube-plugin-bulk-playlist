function register ({ registerHook, peertubeHelpers }) {
  registerHook({
    hook: 'action:video-list.bulk-action.render',
    target: 'my-library-videos',
    handler: ({ bulkActionComponent }) => {
      bulkActionComponent.addAction({
        label: peertubeHelpers.translate('Add selected to playlist'),
        icon: 'playlist-add',
        onClick: async (selectedVideoIds) => {
          if (!selectedVideoIds || selectedVideoIds.length === 0) return;

          let playlists = []
          try {
            const res = await peertubeHelpers.getMyPlaylists()
            playlists = res?.data || []
          } catch (err) {
            peertubeHelpers.notifier.error('Failed to load playlists')
            return
          }

          const existingOptionsHTML = playlists
            .map(p => `<option value="${p.id}">${p.displayName}</option>`)
            .join('')

          const privacyOptions = `
            <option value="1">Public</option>
            <option value="2">Unlisted</option>
            <option value="3">Private</option>
          `

          const result = await peertubeHelpers.showModal({
            title: `Add ${selectedVideoIds.length} videos to playlist`,
            content: `
              <div>
                <label>
                  <input type="radio" name="playlist-mode" value="existing" checked>
                  Add to existing playlist
                </label>
                <br><br>

                <select id="existing-playlist-select" class="form-control">
                  ${existingOptionsHTML || '<option disabled>No playlists yet</option>'}
                </select>

                <br><br>

                <label>
                  <input type="radio" name="playlist-mode" value="new">
                  Create new playlist
                </label>
                <br><br>

                <input
                  type="text"
                  id="new-playlist-name"
                  class="form-control"
                  placeholder="Playlist name (required)"
                >
                <br><br>

                <textarea
                  id="new-playlist-description"
                  class="form-control"
                  placeholder="Description (optional)"
                  rows="3"
                ></textarea>
                <br><br>

                <select
                  id="new-playlist-privacy"
                  class="form-control"
                >${privacyOptions}</select>
              </div>
            `,
            confirm: { label: 'Add' },
            cancel: { label: 'Cancel' },
            validate: () => {
              const mode = document.querySelector('input[name="playlist-mode"]:checked')?.value
              if (mode === 'new') {
                const name = document.getElementById('new-playlist-name')?.value?.trim()
                if (!name) {
                  peertubeHelpers.notifier.error('Name required for new playlist')
                  return false
                }
              }
              return true
            }
          })

          if (!result) return

          const mode = document.querySelector('input[name="playlist-mode"]:checked').value
          let playlistId

          if (mode === 'existing') {
            playlistId = document.getElementById('existing-playlist-select')?.value
            if (!playlistId) return
          } else {
            const name = document.getElementById('new-playlist-name').value.trim()
            const description = document.getElementById('new-playlist-description').value.trim()
            const privacy = parseInt(document.getElementById('new-playlist-privacy').value, 10)

            const formData = new FormData()
            formData.append('displayName', name)
            if (description) formData.append('description', description)
            formData.append('privacy', privacy)

            let createResponse
            try {
              createResponse = await fetch('/api/v1/video-playlists', {
                method: 'POST',
                headers: {
                  'Authorization': 'Bearer ' + peertubeHelpers.getAuthHeader()
                },
                body: formData
              })
            } catch (err) {
              peertubeHelpers.notifier.error('Failed to create playlist')
              return
            }

            if (!createResponse.ok) {
              peertubeHelpers.notifier.error('Failed to create playlist')
              return
            }

            const { videoPlaylist } = await createResponse.json()
            playlistId = videoPlaylist.id
          }

          let successCount = 0

          for (const videoId of selectedVideoIds) {
            try {
              await fetch(`/api/v1/video-playlists/${playlistId}/videos`, {
                method: 'POST',
                headers: {
                  'Authorization': 'Bearer ' + peertubeHelpers.getAuthHeader(),
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ videoId: parseInt(videoId, 10) })
              })
              successCount++
            } catch (err) {
              console.error(err)
            }
          }

          peertubeHelpers.notifier.success(
            `Added ${successCount}/${selectedVideoIds.length} videos`
          )
        }
      })
    }
  })
}

module.exports = { register }
