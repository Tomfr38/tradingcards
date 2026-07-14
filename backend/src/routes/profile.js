const express = require('express')
const supabase = require('../db/supabase')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
const SEED_COINS = 500

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.userId)
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

// Idempotent — call right after signup/login to ensure a profile + starting
// coin balance exist for this auth user.
router.post('/bootstrap', requireAuth, async (req, res, next) => {
  try {
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.userId)
      .maybeSingle()

    if (existing) {
      return res.json(existing)
    }

    const displayName = req.body?.displayName || req.userEmail?.split('@')[0] || 'Collector'

    const { data: profile, error: insertError } = await supabase
      .from('profiles')
      .insert({ id: req.userId, display_name: displayName, coin_balance: SEED_COINS })
      .select()
      .single()

    if (insertError) throw insertError

    await supabase
      .from('coin_ledger')
      .insert({ profile_id: req.userId, amount: SEED_COINS, reason: 'seed' })

    res.json(profile)
  } catch (err) {
    next(err)
  }
})

module.exports = router
