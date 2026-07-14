// One-off dev seed script. Run with: npm run seed (from backend/), after
// applying supabase/schema.sql. Requires SUPABASE_SERVICE_ROLE_KEY in
// backend/.env — it uses the Supabase Auth admin API to create real accounts.
require('dotenv').config()
const { PNG } = require('pngjs')
const supabase = require('../src/db/supabase')
const { TIER_CONFIG } = require('../src/config/tiers')

const SEED_COINS = 500
const CONCERT_PACK_NAME = 'Launch Concert Pack'
const PASSWORD = 'password123'

const SEED_USERS = [
  { email: 'artist1@example.com', displayName: 'Aiko Renders', isCreator: true, color: [214, 64, 110] },
  { email: 'artist2@example.com', displayName: 'Ken Pixel', isCreator: true, color: [64, 140, 214] },
  { email: 'collector1@example.com', displayName: 'Sam Collector', isCreator: false },
  { email: 'collector2@example.com', displayName: 'Riko Collector', isCreator: false },
]

function makeSolidPng(width, height, [r, g, b]) {
  const png = new PNG({ width, height })
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2
      png.data[idx] = r
      png.data[idx + 1] = g
      png.data[idx + 2] = b
      png.data[idx + 3] = 255
    }
  }
  return PNG.sync.write(png)
}

async function getOrCreateAuthUser(email) {
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 200 })
  if (listError) throw listError
  const existing = list.users.find((u) => u.email === email)
  if (existing) return existing

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  })
  if (error) throw error
  return data.user
}

async function ensureProfile(userId, displayName, isCreator) {
  const { data: existing } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (existing) return existing

  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({ id: userId, display_name: displayName, is_creator: isCreator, coin_balance: SEED_COINS })
    .select()
    .single()
  if (error) throw error

  await supabase.from('coin_ledger').insert({ profile_id: userId, amount: SEED_COINS, reason: 'seed' })
  return profile
}

async function ensureSeedArtworkAndSet(creatorId, displayName, color) {
  const { data: existing } = await supabase
    .from('artworks')
    .select('*, card_sets(*, card_templates(*))')
    .eq('creator_id', creatorId)
    .maybeSingle()
  if (existing) return existing

  const png = makeSolidPng(400, 560, color)
  const storagePath = `${creatorId}/seed-artwork.png`
  const { error: uploadError } = await supabase.storage
    .from('artwork-originals')
    .upload(storagePath, png, { contentType: 'image/png', upsert: true })
  if (uploadError) throw uploadError

  const { data: artwork, error: artworkError } = await supabase
    .from('artworks')
    .insert({
      creator_id: creatorId,
      title: `${displayName}'s Debut`,
      orientation: 'vertical',
      storage_path: storagePath,
      status: 'generated',
    })
    .select()
    .single()
  if (artworkError) throw artworkError

  const { data: cardSet, error: setError } = await supabase
    .from('card_sets')
    .insert({ artwork_id: artwork.id, creator_id: creatorId, name: artwork.title, status: 'published', published_at: new Date().toISOString() })
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
  const { data: templates, error: templatesError } = await supabase.from('card_templates').insert(templateRows).select()
  if (templatesError) throw templatesError

  await supabase.from('artworks').update({ status: 'published' }).eq('id', artwork.id)

  return { ...artwork, card_sets: [{ ...cardSet, card_templates: templates }] }
}

async function ensureLaunchPack(templateIds) {
  let { data: pack } = await supabase.from('packs').select('*').eq('name', CONCERT_PACK_NAME).maybeSingle()
  if (!pack) {
    const { data: newPack, error } = await supabase
      .from('packs')
      .insert({ name: CONCERT_PACK_NAME, pack_type: 'concert', price_coins: 100, card_count: 5 })
      .select()
      .single()
    if (error) throw error
    pack = newPack
  }

  const rows = templateIds.map((card_template_id) => ({ pack_id: pack.id, card_template_id }))
  await supabase.from('pack_pool_entries').upsert(rows, { onConflict: 'pack_id,card_template_id' })
  return pack
}

async function main() {
  console.log('Seeding accounts...')
  const allTemplateIds = []

  for (const user of SEED_USERS) {
    const authUser = await getOrCreateAuthUser(user.email)
    await ensureProfile(authUser.id, user.displayName, user.isCreator)
    console.log(`  ✓ ${user.email} (${user.isCreator ? 'creator' : 'collector'})`)

    if (user.isCreator) {
      const artwork = await ensureSeedArtworkAndSet(authUser.id, user.displayName, user.color)
      const templates = artwork.card_sets[0].card_templates
      allTemplateIds.push(...templates.map((t) => t.id))
    }
  }

  console.log('Setting up launch pack...')
  const pack = await ensureLaunchPack(allTemplateIds)
  console.log(`  ✓ ${pack.name} (${pack.price_coins} coins, ${pack.card_count} cards/pack)`)

  console.log('\nDone. Sign in with any seeded account:')
  SEED_USERS.forEach((u) => console.log(`  ${u.email} / ${PASSWORD}`))
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
