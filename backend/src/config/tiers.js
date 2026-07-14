// Fixed rarity ladder used to auto-generate one card_template per tier from
// a single uploaded artwork. See supabase/schema.sql card_templates.rarity_tier
// check constraint for the allowed tier values.
const TIER_CONFIG = [
  { tier: 'common', frameStyle: 'flat-slate', effectStyle: 'none', printRunCap: null, weight: 60 },
  { tier: 'rare', frameStyle: 'gradient-teal', effectStyle: 'sheen', printRunCap: null, weight: 25 },
  { tier: 'epic', frameStyle: 'pattern-violet', effectStyle: 'glow-pulse', printRunCap: null, weight: 10 },
  { tier: 'legendary', frameStyle: 'metallic-gold', effectStyle: 'holo-shimmer', printRunCap: null, weight: 4 },
  { tier: 'ultra_100', frameStyle: 'foil-rainbow', effectStyle: 'holo-sweep', printRunCap: 100, weight: 0.8 },
  { tier: 'one_of_one', frameStyle: 'obsidian-gold', effectStyle: 'holo-prism', printRunCap: 1, weight: 0.05 },
]

module.exports = { TIER_CONFIG }
