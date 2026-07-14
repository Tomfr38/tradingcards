const express = require('express')
const supabase = require('../db/supabase')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

router.get('/inventory/mine', requireAuth, async (req, res, next) => {
  try {
    let query = supabase
      .from('card_editions')
      .select(
        '*, card_templates(rarity_tier, frame_style, effect_style, print_run_cap, card_sets(name, artworks(title, storage_path, orientation, creator_id, profiles(display_name))))'
      )
      .eq('owner_id', req.userId)
      .order('created_at', { ascending: false })

    if (req.query.rarity) {
      query = query.eq('card_templates.rarity_tier', req.query.rarity)
    }

    const { data, error } = await query
    if (error) throw error

    let cards = data.map((edition) => {
      const t = edition.card_templates
      const artwork = t?.card_sets?.artworks
      const imageUrl = artwork
        ? supabase.storage.from('artwork-originals').getPublicUrl(artwork.storage_path).data.publicUrl
        : null
      return {
        id: edition.id,
        edition_number: edition.edition_number,
        visual_seed: edition.visual_seed,
        acquired_via: edition.acquired_via,
        created_at: edition.created_at,
        rarity_tier: t?.rarity_tier,
        frame_style: t?.frame_style,
        effect_style: t?.effect_style,
        print_run_cap: t?.print_run_cap,
        set_name: t?.card_sets?.name,
        artist_name: artwork?.profiles?.display_name,
        orientation: artwork?.orientation,
        image_url: imageUrl,
      }
    })

    // rarity filter already applied server-side via the query above; artist
    // filter applied here since it crosses two joined tables
    if (req.query.artist) {
      cards = cards.filter((c) => c.artist_name === req.query.artist)
    }

    res.json(cards)
  } catch (err) {
    next(err)
  }
})

module.exports = router
