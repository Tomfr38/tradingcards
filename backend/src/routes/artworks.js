const express = require('express')
const multer = require('multer')
const { v4: uuidv4 } = require('uuid')
const supabase = require('../db/supabase')
const { requireAuth } = require('../middleware/auth')
const { TIER_CONFIG } = require('../config/tiers')

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

const CONCERT_PACK_NAME = 'Launch Concert Pack'

router.post('/artworks', requireAuth, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'image file is required' })
    const { orientation, title } = req.body
    if (!['vertical', 'horizontal'].includes(orientation)) {
      return res.status(400).json({ error: "orientation must be 'vertical' or 'horizontal'" })
    }

    const ext = (req.file.originalname.split('.').pop() || 'jpg').toLowerCase()
    const storagePath = `${req.userId}/${uuidv4()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('artwork-originals')
      .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype })
    if (uploadError) throw uploadError

    const { data: artwork, error: insertError } = await supabase
      .from('artworks')
      .insert({
        creator_id: req.userId,
        title: title || 'Untitled',
        orientation,
        storage_path: storagePath,
      })
      .select()
      .single()
    if (insertError) throw insertError

    const { data: pub } = supabase.storage.from('artwork-originals').getPublicUrl(storagePath)
    res.json({ ...artwork, image_url: pub.publicUrl })
  } catch (err) {
    next(err)
  }
})

router.get('/artworks/mine', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('artworks')
      .select('*')
      .eq('creator_id', req.userId)
      .order('created_at', { ascending: false })
    if (error) throw error

    const withUrls = data.map((a) => ({
      ...a,
      image_url: supabase.storage.from('artwork-originals').getPublicUrl(a.storage_path).data.publicUrl,
    }))
    res.json(withUrls)
  } catch (err) {
    next(err)
  }
})

router.post('/artworks/:id/generate-set', requireAuth, async (req, res, next) => {
  try {
    const { data: artwork, error: fetchError } = await supabase
      .from('artworks')
      .select('*')
      .eq('id', req.params.id)
      .eq('creator_id', req.userId)
      .single()
    if (fetchError || !artwork) return res.status(404).json({ error: 'Artwork not found' })
    if (artwork.status !== 'draft') {
      return res.status(400).json({ error: `Artwork already ${artwork.status}` })
    }

    const { data: cardSet, error: setError } = await supabase
      .from('card_sets')
      .insert({ artwork_id: artwork.id, creator_id: req.userId, name: artwork.title })
      .select()
      .single()
    if (setError) throw setError

    const templateRows = TIER_CONFIG.map((t) => ({
      card_set_id: cardSet.id,
      rarity_tier: t.tier,
      frame_style: t.frameStyle,
      effect_style: t.effectStyle,
      print_run_cap: t.printRunCap,
      weight: t.weight,
    }))

    const { data: templates, error: templatesError } = await supabase
      .from('card_templates')
      .insert(templateRows)
      .select()
    if (templatesError) throw templatesError

    await supabase.from('artworks').update({ status: 'generated' }).eq('id', artwork.id)

    res.json({ cardSet, templates })
  } catch (err) {
    next(err)
  }
})

router.get('/card-sets/mine', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('card_sets')
      .select('*, artworks(*), card_templates(*)')
      .eq('creator_id', req.userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

router.get('/card-sets/:id', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('card_sets')
      .select('*, artworks(*), card_templates(*)')
      .eq('id', req.params.id)
      .single()
    if (error || !data) return res.status(404).json({ error: 'Set not found' })

    const imageUrl = supabase.storage.from('artwork-originals').getPublicUrl(data.artworks.storage_path).data.publicUrl
    res.json({ ...data, artworks: { ...data.artworks, image_url: imageUrl } })
  } catch (err) {
    next(err)
  }
})

router.post('/card-sets/:id/publish', requireAuth, async (req, res, next) => {
  try {
    const { data: cardSet, error: fetchError } = await supabase
      .from('card_sets')
      .select('*, card_templates(*)')
      .eq('id', req.params.id)
      .eq('creator_id', req.userId)
      .single()
    if (fetchError || !cardSet) return res.status(404).json({ error: 'Set not found' })
    if (cardSet.status === 'published') return res.status(400).json({ error: 'Already published' })

    let { data: pack } = await supabase
      .from('packs')
      .select('*')
      .eq('name', CONCERT_PACK_NAME)
      .maybeSingle()

    if (!pack) {
      const { data: newPack, error: packError } = await supabase
        .from('packs')
        .insert({ name: CONCERT_PACK_NAME, pack_type: 'concert', price_coins: 100, card_count: 5 })
        .select()
        .single()
      if (packError) throw packError
      pack = newPack
    }

    const poolRows = cardSet.card_templates.map((t) => ({ pack_id: pack.id, card_template_id: t.id }))
    const { error: poolError } = await supabase.from('pack_pool_entries').insert(poolRows)
    if (poolError) throw poolError

    await supabase
      .from('card_sets')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', cardSet.id)
    await supabase.from('artworks').update({ status: 'published' }).eq('id', cardSet.artwork_id)

    res.json({ ok: true, pack })
  } catch (err) {
    next(err)
  }
})

module.exports = router
