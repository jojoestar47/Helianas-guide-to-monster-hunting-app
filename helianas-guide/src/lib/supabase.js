import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function getCreatureTypes() {
  const { data, error } = await supabase
    .from('heliana_creature_types')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function getHarvestComponents(creatureTypeId) {
  let query = supabase
    .from('heliana_harvest_components')
    .select('*, heliana_creature_types(name)')
    .order('component_dc')
  if (creatureTypeId) query = query.eq('creature_type_id', creatureTypeId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getEssence() {
  const { data, error } = await supabase
    .from('heliana_essence')
    .select('*')
    .order('cr_min')
  if (error) throw error
  return data
}

export async function getRecipes(tier) {
  let query = supabase
    .from('heliana_recipes')
    .select('*, heliana_recipe_ingredients(*)')
    .order('dc')
  if (tier) query = query.eq('tier', tier)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getComponentEffects(componentType, rarity) {
  let query = supabase
    .from('heliana_component_effects')
    .select('*, heliana_creature_types(name)')
  if (componentType) query = query.eq('component_type', componentType)
  if (rarity) query = query.eq('rarity', rarity)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getCookingQuirks(type) {
  let query = supabase
    .from('heliana_cooking_quirks')
    .select('*')
    .order('d8_roll')
  if (type) query = query.eq('quirk_type', type)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getMagicItems(filters = {}) {
  let query = supabase
    .from('heliana_magic_items')
    .select('*, heliana_creature_types(name)')
    .order('name')
  if (filters.rarity) query = query.eq('rarity', filters.rarity)
  if (filters.creature_type_id) query = query.eq('creature_type_id', filters.creature_type_id)
  if (filters.search) query = query.ilike('name', `%${filters.search}%`)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getBossRecipeScaling(recipeId) {
  const { data, error } = await supabase
    .from('heliana_boss_recipe_scaling')
    .select('*')
    .eq('recipe_id', recipeId)
    .order('rarity')
  if (error) throw error
  return data
}

export async function getVariableStats() {
  const { data, error } = await supabase
    .from('heliana_variable_stats')
    .select('*')
    .order('apl_min')
  if (error) throw error
  return data
}

export async function getCreatureSizes() {
  const { data, error } = await supabase
    .from('heliana_creature_sizes')
    .select('*')
  if (error) throw error
  return data
}
