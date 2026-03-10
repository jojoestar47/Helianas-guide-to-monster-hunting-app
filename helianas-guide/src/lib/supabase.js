import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'heliana' }
})

// ── Creature Types ─────────────────────────────────────────────────────────────
export async function getCreatureTypes() {
  const { data, error } = await supabase
    .from('creature_types')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

// ── Harvest Components ─────────────────────────────────────────────────────────
export async function getHarvestComponents(creatureTypeId) {
  let query = supabase
    .from('harvest_components')
    .select('*, creature_types(name)')
    .order('component_dc')
  if (creatureTypeId) query = query.eq('creature_type_id', creatureTypeId)
  const { data, error } = await query
  if (error) throw error
  return data
}

// ── Essence ────────────────────────────────────────────────────────────────────
export async function getEssence() {
  const { data, error } = await supabase
    .from('essence')
    .select('*')
    .order('cr_min')
  if (error) throw error
  return data
}

// ── Recipes ────────────────────────────────────────────────────────────────────
export async function getRecipes(tier) {
  let query = supabase
    .from('recipes')
    .select('*, recipe_ingredients(*)')
    .order('dc')
  if (tier) query = query.eq('tier', tier)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getRecipesByIngredient(ingredientType) {
  const { data, error } = await supabase
    .from('recipe_ingredients')
    .select('*, recipes(*)')
    .eq('ingredient_type', ingredientType)
  if (error) throw error
  return data
}

// ── Component Effects ──────────────────────────────────────────────────────────
export async function getComponentEffects(componentType, rarity) {
  let query = supabase
    .from('component_effects')
    .select('*, creature_types(name)')
  if (componentType) query = query.eq('component_type', componentType)
  if (rarity) query = query.eq('rarity', rarity)
  const { data, error } = await query
  if (error) throw error
  return data
}

// ── Cooking Quirks ─────────────────────────────────────────────────────────────
export async function getCookingQuirks(type) {
  let query = supabase
    .from('cooking_quirks')
    .select('*')
    .order('d8_roll')
  if (type) query = query.eq('quirk_type', type)
  const { data, error } = await query
  if (error) throw error
  return data
}

// ── Magic Items ────────────────────────────────────────────────────────────────
export async function getMagicItems(filters = {}) {
  let query = supabase
    .from('magic_items')
    .select('*, creature_types(name)')
    .order('name')
  if (filters.rarity) query = query.eq('rarity', filters.rarity)
  if (filters.creature_type_id) query = query.eq('creature_type_id', filters.creature_type_id)
  if (filters.search) query = query.ilike('name', `%${filters.search}%`)
  const { data, error } = await query
  if (error) throw error
  return data
}

// ── Boss Recipe Scaling ────────────────────────────────────────────────────────
export async function getBossRecipeScaling(recipeId) {
  const { data, error } = await supabase
    .from('boss_recipe_scaling')
    .select('*')
    .eq('recipe_id', recipeId)
    .order('rarity')
  if (error) throw error
  return data
}

// ── Variable Stats ─────────────────────────────────────────────────────────────
export async function getVariableStats() {
  const { data, error } = await supabase
    .from('variable_stats')
    .select('*')
    .order('apl_min')
  if (error) throw error
  return data
}

// ── Creature Sizes ─────────────────────────────────────────────────────────────
export async function getCreatureSizes() {
  const { data, error } = await supabase
    .from('creature_sizes')
    .select('*')
  if (error) throw error
  return data
}
