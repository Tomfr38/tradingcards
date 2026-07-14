const express = require('express')
const supabase = require('../db/supabase')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

router.get('/packs', requireAuth, async (req, res, next) => {
  try {
    const { data: packs, error } = await supabase
      .from('packs')
      .select('*, pack_pool_entries(card_templates(*, card_sets(name, artworks(title, creator_id, profiles(display_name)))))')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    if (error) throw error

    const withArtists = packs.map((pack) => {
      const artistNames = new Set()
      for (const entry of pack.pack_pool_entries || []) {
        const name = entry.card_templates?.card_sets?.artworks?.profiles?.display_name
        if (name) artistNames.add(name)
      }
      const { pack_pool_entries, ...rest } = pack
      return { ...rest, artists: [...artistNames], template_count: pack_pool_entries?.length || 0 }
    })

    res.json(withArtists)
  } catch (err) {
    next(err)
  }
})

router.post('/packs/:id/open', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase.rpc('open_pack', {
      p_pack_id: req.params.id,
      p_buyer_id: req.userId,
    })
    if (error) return res.status(400).json({ error: error.message })

    const templateIds = data.map((d) => d.card_template_id)
    const { data: templates, error: templatesError } = await supabase
      .from('card_templates')
      .select('id, card_sets(name, artworks(title, storage_path, orientation, profiles(display_name)))')
      .in('id', templateIds)
    if (templatesError) throw templatesError

    const templateById = Object.fromEntries(templates.map((t) => [t.id, t]))

    const drawnCards = data.map((edition) => {
      const t = templateById[edition.card_template_id]
      const artwork = t?.card_sets?.artworks
      const imageUrl = artwork
        ? supabase.storage.from('artwork-originals').getPublicUrl(artwork.storage_path).data.publicUrl
        : null
      return {
        ...edition,
        set_name: t?.card_sets?.name,
        artist_name: artwork?.profiles?.display_name,
        orientation: artwork?.orientation,
        image_url: imageUrl,
      }
    })

    res.json({ cards: drawnCards })
  } catch (err) {
    next(err)
  }
})

module.exports = router
