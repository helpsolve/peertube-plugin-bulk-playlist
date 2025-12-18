import {
  RegisterServerOptions,
  PlaylistPrivacy
} from '@peertube/peertube-types'

export async function register ({ registerRouter, peertubeHelpers }: RegisterServerOptions) {
  const router = registerRouter({
    root: '/bulk-playlist'
  })

  router.post('/add', async (req, res) => {
    try {
      const user = await peertubeHelpers.user.getAuthUser(res)
      if (!user) return res.sendStatus(401)

      const { videoIds, playlistId, playlistName } = req.body

      if (!Array.isArray(videoIds) || videoIds.length === 0) {
        return res.status(400).json({ error: 'No videos provided' })
      }

      let playlist

      if (playlistId) {
        playlist = await peertubeHelpers.playlist.load(playlistId)
      } else {
        playlist = await peertubeHelpers.playlist.create({
          name: playlistName || 'Bulk Playlist',
          privacy: PlaylistPrivacy.PRIVATE,
          ownerAccountId: user.Account.id
        })
      }

      for (const videoId of videoIds) {
        await peertubeHelpers.playlist.addVideo({
          playlistId: playlist.id,
          videoId
        })
      }

      res.json({ success: true, playlistId: playlist.id })
    } catch (err) {
      console.error('[bulk-playlist]', err)
      res.status(500).json({ error: 'Bulk playlist operation failed' })
    }
  })
}
