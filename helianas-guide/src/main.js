import {
  getCreatureTypes,
  getHarvestComponents,
  getEssence,
  getRecipes,
  getComponentEffects,
  getCookingQuirks,
  getMagicItems,
  getBossRecipeScaling,
  getVariableStats,
  getCreatureSizes,
} from './lib/supabase.js'

// ── STATE ──────────────────────────────────────────────────────────────────────
let creatureTypes = []
let allRecipes = []
let allQuirks = []
let harvestComponents = []
let selectedComponents = new Set()

// ── INIT ───────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs()
  showLoading(true)
  try {
    creatureTypes = await getCreatureTypes()
    await Promise.all([
      populateCreatureTypeSelects(),
      loadSizesTable(),
      loadEssencePanel(),
      loadQuirksRef(),
    ])
  } catch (err) {
    console.error('Init error:', err)
  } finally {
    showLoading(false)
  }
  bindEvents()
})

// ── TABS ───────────────────────────────────────────────────────────────────────
function setupTabs() {
  const btns = document.querySelectorAll('.tab-btn')
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'))
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'))
      btn.classList.add('active')
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active')
    })
  })
}

// ── LOADING ────────────────────────────────────────────────────────────────────
function showLoading(on) {
  const el = document.getElementById('loadingScreen')
  el.classList.toggle('visible', on)
}

// ── POPULATE SELECTS ───────────────────────────────────────────────────────────
function populateCreatureTypeSelects() {
  const selects = ['harvestTypeSelect', 'genTypeSelect', 'craftTypeFilter']
  selects.forEach(id => {
    const sel = document.getElementById(id)
    if (!sel) return
    creatureTypes.forEach(ct => {
      const opt = document.createElement('option')
      opt.value = ct.id
      opt.textContent = ct.name
      sel.appendChild(opt)
    })
  })
}

// ── BIND EVENTS ────────────────────────────────────────────────────────────────
function bindEvents() {
  // Harvest
  document.getElementById('loadHarvestBtn')?.addEventListener('click', loadHarvestComponents)
  document.getElementById('calcHarvestBtn')?.addEventListener('click', calculateHarvest)

  // Generator
  document.getElementById('genRollBtn')?.addEventListener('click', generateLoot)
  document.getElementById('genCopyBtn')?.addEventListener('click', copyLoot)

  // Cooking
  document.getElementById('filterRecipesBtn')?.addEventListener('click', filterRecipes)
  document.getElementById('calcCookBtn')?.addEventListener('click', calculateCooking)

  // Crafting
  document.getElementById('craftSearchBtn')?.addEventListener('click', loadMagicItems)
  loadMagicItems() // initial load
  loadHarvestSkillTable()

  // Effects
  document.getElementById('loadEffectsBtn')?.addEventListener('click', loadEffects)
  loadEffects()

  // Dice & Quirks
  document.getElementById('rollDiceBtn')?.addEventListener('click', rollDice)
  document.getElementById('genQuirkBtn')?.addEventListener('click', generateQuirk)

  // Initial recipe load
  filterRecipes()
}

// ══════════════════════════════════════════════════════════════════════════════
// HARVEST TAB
// ══════════════════════════════════════════════════════════════════════════════
async function loadHarvestComponents() {
  const typeId = document.getElementById('harvestTypeSelect').value
  if (!typeId) return alert('Please select a creature type.')
  const conditionMod = parseInt(document.getElementById('harvestCondition').value)

  showLoading(true)
  try {
    harvestComponents = await getHarvestComponents(typeId)
    selectedComponents.clear()
    renderHarvestList(harvestComponents, conditionMod)

    // Show/hide essence
    const cr = parseInt(document.getElementById('harvestCR').value)
    if (!isNaN(cr) && cr >= 3) {
      document.getElementById('essencePanel').style.display = 'block'
    }
  } catch (err) {
    console.error(err)
  } finally {
    showLoading(false)
  }
}

function renderHarvestList(components, conditionMod = 0) {
  const panel = document.getElementById('harvestListPanel')
  if (!components.length) {
    panel.innerHTML = '<p class="muted-text">No components found.</p>'
    return
  }

  const grouped = {}
  components.forEach(c => {
    const dc = Math.max(1, c.component_dc + conditionMod)
    const key = dc
    if (!grouped[key]) grouped[key] = []
    grouped[key].push({ ...c, effectiveDC: dc })
  })

  let html = '<p style="font-size:0.8rem;color:#8a7a60;margin-bottom:0.75rem;">Click components to add to harvest list</p>'
  Object.keys(grouped).sort((a, b) => a - b).forEach(dc => {
    html += `<div style="font-family:var(--font-heading);font-size:0.68rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--gold);margin:0.75rem 0 0.35rem;">DC ${dc}</div>`
    grouped[dc].forEach(c => {
      const tags = []
      if (c.is_edible) tags.push(`<span class="tag tag-edible">E</span>`)
      if (c.is_volatile) tags.push(`<span class="tag tag-volatile">⚡ V</span>`)
      html += `
        <div class="component-row" data-id="${c.id}" data-dc="${c.effectiveDC}" data-name="${c.component_name}" onclick="toggleComponent(this)">
          <span class="component-dc">${c.effectiveDC}</span>
          <span class="component-name">${c.component_name}</span>
          <span class="component-tags">${tags.join('')}</span>
        </div>`
    })
  })

  panel.innerHTML = html
}

window.toggleComponent = function(el) {
  const id = el.dataset.id
  if (selectedComponents.has(id)) {
    selectedComponents.delete(id)
    el.classList.remove('selected')
  } else {
    selectedComponents.add(id)
    el.classList.add('selected')
  }
}

function calculateHarvest() {
  const assessment = parseInt(document.getElementById('assessmentRoll').value)
  const carving = parseInt(document.getElementById('carvingRoll').value)
  const conditionMod = parseInt(document.getElementById('harvestCondition').value)

  if (isNaN(assessment) || isNaN(carving)) {
    document.getElementById('harvestResult').innerHTML = '<p class="fail">Enter both rolls first.</p>'
    return
  }

  const components = harvestComponents.map(c => ({
    ...c,
    effectiveDC: Math.max(1, c.component_dc + conditionMod)
  }))

  // Cumulative DC: each component you attempt adds its DC to the running total
  const sorted = [...components].sort((a, b) => a.effectiveDC - b.effectiveDC)
  let cumulativeAssess = 0
  let cumulativeCarve = 0
  const results = []

  sorted.forEach(c => {
    cumulativeAssess += c.effectiveDC
    cumulativeCarve += c.effectiveDC
    const assessed = assessment >= cumulativeAssess
    const carved = carving >= cumulativeCarve
    results.push({ ...c, assessed, carved, harvested: assessed && carved })
  })

  const harvested = results.filter(r => r.harvested)
  const missed = results.filter(r => !r.harvested)

  let html = `<div style="margin-bottom:0.75rem">
    <span class="success">Harvested: ${harvested.length}</span> / 
    <span style="color:var(--ink)">${results.length} components</span>
  </div>`

  if (harvested.length) {
    html += '<div style="margin-bottom:0.5rem;font-family:var(--font-heading);font-size:0.72rem;letter-spacing:0.1em;color:var(--teal)">✓ OBTAINED</div>'
    harvested.forEach(r => {
      const tags = []
      if (r.is_edible) tags.push('<span class="tag tag-edible">E</span>')
      if (r.is_volatile) tags.push('<span class="tag tag-volatile">⚡V</span>')
      html += `<div class="component-row harvested" style="pointer-events:none">
        <span class="component-dc">${r.effectiveDC}</span>
        <span class="component-name">${r.component_name}</span>
        <span class="component-tags">${tags.join('')}</span>
      </div>`
    })
  }

  if (missed.length) {
    html += '<div style="margin:0.75rem 0 0.35rem;font-family:var(--font-heading);font-size:0.72rem;letter-spacing:0.1em;color:var(--blood)">✗ MISSED</div>'
    missed.forEach(r => {
      html += `<div class="component-row" style="pointer-events:none;opacity:0.45">
        <span class="component-dc">${r.effectiveDC}</span>
        <span class="component-name">${r.component_name}</span>
      </div>`
    })
  }

  document.getElementById('harvestResult').innerHTML = html

  // Also highlight the component rows
  document.querySelectorAll('.component-row[data-id]').forEach(el => {
    const component = results.find(r => String(r.id) === el.dataset.id)
    if (component?.harvested) {
      el.classList.add('harvested')
    }
  })
}

async function loadEssencePanel() {
  try {
    const essence = await getEssence()
    const html = `<div class="essence-table-grid">${essence.map(e => `
      <div class="essence-card">
        <div class="essence-name">${e.name} Essence</div>
        <div class="essence-detail">
          CR ${e.cr_min}${e.cr_max ? `–${e.cr_max}` : '+'}
          &nbsp;·&nbsp; DC ${e.component_dc}
          &nbsp;·&nbsp; ${e.item_rarity}<br/>
          Sell: ${e.sell_value_gp} gp&nbsp;·&nbsp;Buy: ${e.buy_value_gp} gp
        </div>
      </div>`).join('')}</div>`
    document.getElementById('essenceTable').innerHTML = html
  } catch (err) { console.error(err) }
}

async function loadSizesTable() {
  try {
    const sizes = await getCreatureSizes()
    const order = ['Tiny','Small','Medium','Large','Huge','Gargantuan']
    const sorted = sizes.sort((a, b) => order.indexOf(a.size) - order.indexOf(b.size))
    const html = `<table>
      <thead><tr><th>Size</th><th>Harvest Time</th></tr></thead>
      <tbody>${sorted.map(s => `<tr><td>${s.size}</td><td>${s.harvest_time}</td></tr>`).join('')}</tbody>
    </table>`
    document.getElementById('sizesTable').innerHTML = html
  } catch (err) { console.error(err) }
}

// ══════════════════════════════════════════════════════════════════════════════
// GENERATOR TAB
// ══════════════════════════════════════════════════════════════════════════════
async function generateLoot() {
  const typeId = document.getElementById('genTypeSelect').value
  const tier = document.getElementById('genCRTier').value
  const condition = document.getElementById('genCondition').value
  if (!typeId) return alert('Select a creature type.')

  showLoading(true)
  try {
    const components = await getHarvestComponents(typeId)
    const typeName = creatureTypes.find(c => String(c.id) === typeId)?.name || ''

    // DC filter by tier
    const tierMaxDC = { low: 15, mid: 20, high: 25, apex: 30 }[tier]
    const tierMinDC = { low: 1, mid: 10, high: 15, apex: 20 }[tier]

    // Condition: how many DCs are reachable
    const condMod = { pristine: 0, damaged: -2, destroyed: -5 }[condition]

    const eligible = components.filter(c => {
      const dc = c.component_dc + condMod
      return dc <= tierMaxDC
    })

    // Randomly pick components with weighted probability
    const loot = eligible
      .filter(() => Math.random() < 0.55)
      .map(c => ({
        name: c.component_name,
        qty: Math.ceil(Math.random() * 2),
        isEdible: c.is_edible,
        isVolatile: c.is_volatile,
        dc: c.component_dc + condMod
      }))

    if (!loot.length) {
      document.getElementById('genResultList').innerHTML = '<p class="muted-text">No parts obtained — the creature was thoroughly destroyed.</p>'
    } else {
      document.getElementById('genResultList').innerHTML = loot.map(l => `
        <div class="loot-item">
          <span class="loot-qty">×${l.qty}</span>
          <span class="loot-name">${l.name}</span>
          <span class="component-tags">
            ${l.isEdible ? '<span class="tag tag-edible">E</span>' : ''}
            ${l.isVolatile ? '<span class="tag tag-volatile">⚡V</span>' : ''}
          </span>
        </div>`).join('')
    }

    document.getElementById('genResultTitle').textContent =
      `${typeName} — ${tier.charAt(0).toUpperCase() + tier.slice(1)} CR — ${condition}`
    document.getElementById('genResult').style.display = 'block'
  } catch (err) {
    console.error(err)
  } finally {
    showLoading(false)
  }
}

function copyLoot() {
  const title = document.getElementById('genResultTitle').textContent
  const items = [...document.querySelectorAll('.loot-item')].map(el => {
    const qty = el.querySelector('.loot-qty').textContent
    const name = el.querySelector('.loot-name').textContent
    return `${qty} ${name}`
  })
  navigator.clipboard.writeText(`${title}\n${items.join('\n')}`)
    .then(() => alert('Copied to clipboard!'))
}

// ══════════════════════════════════════════════════════════════════════════════
// COOKING TAB
// ══════════════════════════════════════════════════════════════════════════════
async function filterRecipes() {
  const tier = document.getElementById('recipeTierFilter').value
  const ingredient = document.getElementById('recipeIngredientFilter').value

  showLoading(true)
  try {
    allRecipes = await getRecipes(tier || null)

    let filtered = allRecipes
    if (ingredient) {
      filtered = filtered.filter(r =>
        r.recipe_ingredients?.some(i => i.ingredient_type === ingredient)
      )
    }

    renderRecipes(filtered)
  } catch (err) {
    console.error(err)
  } finally {
    showLoading(false)
  }
}

function renderRecipes(recipes) {
  const container = document.getElementById('recipeList')
  if (!recipes.length) {
    container.innerHTML = '<p class="muted-text">No recipes match those filters.</p>'
    return
  }

  container.innerHTML = recipes.map(r => {
    const ingredients = r.recipe_ingredients
      ?.map(i => {
        if (i.is_boss_ingredient) return `<strong>${i.boss_creature_name || i.boss_creature_type}</strong> ${i.notes || ''}`
        return i.ingredient_type.charAt(0).toUpperCase() + i.ingredient_type.slice(1)
      })
      .join(', ') || ''

    return `<div class="recipe-card">
      <div class="recipe-card-header">
        <span class="recipe-name">${r.name}</span>
        <span class="recipe-tier-badge tier-${r.tier}">${r.tier}</span>
      </div>
      <div class="recipe-dc">DC ${r.dc}${r.requires_heat ? '' : ' · No heat required'}</div>
      <div class="recipe-ingredients">${ingredients}</div>
      ${r.boss_special_effect ? `<div class="recipe-boss-note">★ ${r.boss_special_effect}</div>` : ''}
    </div>`
  }).join('')
}

async function calculateCooking() {
  const con = parseInt(document.getElementById('cookCon').value) || 0
  const prof = parseInt(document.getElementById('cookProf').value) || 0
  const helper = parseInt(document.getElementById('cookHelper').value) || 0
  const d20 = parseInt(document.getElementById('cookD20').value)
  const dc = parseInt(document.getElementById('cookDC').value)
  const rarity = document.getElementById('cookRarity').value

  if (isNaN(d20) || isNaN(dc)) {
    document.getElementById('cookResult').innerHTML = '<p class="fail">Enter d20 roll and DC.</p>'
    return
  }

  const total = d20 + con + prof + helper
  const margin = total - dc
  const success = margin >= 0

  let html = `<div style="margin-bottom:0.75rem">
    <strong>Total: ${total}</strong> vs DC ${dc} —
    <span class="${success ? 'success' : 'fail'}">${success ? 'SUCCESS' : 'FAILURE'}</span>
    (margin: ${margin >= 0 ? '+' : ''}${margin})
  </div>`

  if (success && margin >= 5) {
    // Boon
    try {
      const quirks = await getCookingQuirks('boon')
      const quirk = quirks[Math.floor(Math.random() * quirks.length)]
      html += `<div class="quirk-type-boon">
        <div class="quirk-header">
          <span class="quirk-roll">${quirk.d8_roll}</span>
          <span class="quirk-name">Boon: ${quirk.name}</span>
        </div>
        <div class="quirk-desc">${quirk.description}</div>
      </div>`
    } catch(e) {}
  } else if (!success && margin <= -5) {
    // Flaw
    try {
      const quirks = await getCookingQuirks('flaw')
      const quirk = quirks[Math.floor(Math.random() * quirks.length)]
      html += `<div class="quirk-type-flaw">
        <div class="quirk-header">
          <span class="quirk-roll">${quirk.d8_roll}</span>
          <span class="quirk-name">Flaw: ${quirk.name}</span>
        </div>
        <div class="quirk-desc">${quirk.description}</div>
      </div>`
    } catch(e) {}
  } else {
    html += `<p style="color:#5a4020;font-style:italic">Result is within 5 of DC — no quirk triggered.</p>`
  }

  document.getElementById('cookResult').innerHTML = html
}

// ══════════════════════════════════════════════════════════════════════════════
// CRAFTING TAB
// ══════════════════════════════════════════════════════════════════════════════
async function loadMagicItems() {
  const search = document.getElementById('craftSearch').value
  const typeId = document.getElementById('craftTypeFilter').value
  const rarity = document.getElementById('craftRarityFilter').value

  showLoading(true)
  try {
    const items = await getMagicItems({
      search: search || null,
      creature_type_id: typeId || null,
      rarity: rarity || null
    })
    renderMagicItemsTable(items)
  } catch (err) {
    console.error(err)
  } finally {
    showLoading(false)
  }
}

function renderMagicItemsTable(items) {
  const container = document.getElementById('craftTable')
  if (!items.length) {
    container.innerHTML = '<p class="muted-text">No items match those filters.</p>'
    return
  }

  container.innerHTML = `<table>
    <thead><tr>
      <th>Name</th>
      <th>Type</th>
      <th>Rarity</th>
      <th>Attunement</th>
      <th>Creature</th>
      <th>Required Component</th>
    </tr></thead>
    <tbody>${items.map(i => `<tr>
      <td><strong>${i.name}</strong></td>
      <td>${i.item_type}</td>
      <td><span class="rarity-badge rarity-${i.rarity}">${i.rarity.replace('_',' ')}</span></td>
      <td style="font-size:0.82rem">${formatAttunement(i.requires_attunement)}</td>
      <td>${i.creature_types?.name || '—'}</td>
      <td style="font-style:italic">${i.component}</td>
    </tr>`).join('')}</tbody>
  </table>`
}

function formatAttunement(att) {
  if (!att || att === 'none') return '—'
  if (att === 'required') return '✦ Required'
  if (att === 'required_spellcaster') return '✦ Spellcaster'
  if (att === 'required_paladin') return '✦ Paladin'
  if (att === 'required_monk') return '✦ Monk'
  if (att === 'required_bard') return '✦ Bard'
  if (att === 'required_druid') return '✦ Druid'
  if (att.includes('cursed')) return '☠ Required (cursed)'
  return att
}

function loadHarvestSkillTable() {
  const container = document.getElementById('harvestSkillTable')
  container.innerHTML = `<div class="skill-table">${creatureTypes.map(ct => `
    <div class="skill-row">
      <span class="skill-type">${ct.name}</span>
      <span class="skill-detail">${ct.assessment_check} / ${ct.carving_check}</span>
    </div>`).join('')}</div>`
}

// ══════════════════════════════════════════════════════════════════════════════
// EFFECTS TAB
// ══════════════════════════════════════════════════════════════════════════════
async function loadEffects() {
  const type = document.getElementById('effectTypeSelect').value
  const rarity = document.getElementById('effectRaritySelect').value

  showLoading(true)
  try {
    const effects = await getComponentEffects(type, rarity)
    const container = document.getElementById('effectsGrid')

    if (!effects.length) {
      container.innerHTML = '<p class="muted-text">No effects found.</p>'
      return
    }

    container.innerHTML = `<h3>${type.charAt(0).toUpperCase() + type.slice(1)} — ${rarity.replace('_',' ')}</h3>
      <div class="effects-grid-inner">
        ${effects.map(e => `
          <div class="effect-card">
            <div class="effect-creature">${e.creature_types?.name || '—'}</div>
            <div class="effect-value">${e.effect_value || ''}</div>
            <div class="effect-desc">${e.effect_description}</div>
          </div>`).join('')}
      </div>`
  } catch (err) {
    console.error(err)
  } finally {
    showLoading(false)
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DICE & QUIRKS TAB
// ══════════════════════════════════════════════════════════════════════════════
function rollDice() {
  const count = parseInt(document.getElementById('diceCount').value) || 1
  const sides = parseInt(document.getElementById('diceSides').value)
  const mod = parseInt(document.getElementById('diceMod').value) || 0

  const rolls = Array.from({ length: count }, () => Math.ceil(Math.random() * sides))
  const total = rolls.reduce((a, b) => a + b, 0) + mod

  const rollStr = count === 1 ? rolls[0] : `[${rolls.join(', ')}]`
  document.getElementById('diceResult').innerHTML = `
    <div>${rollStr}${mod !== 0 ? ` + ${mod}` : ''}</div>
    ${count > 1 ? `<div style="font-size:0.9rem;color:var(--ink)">= ${total}</div>` : ''}
  `
}

async function generateQuirk() {
  const total = parseInt(document.getElementById('quirkTotal').value)
  const dc = parseInt(document.getElementById('quirkDC').value)
  if (isNaN(total) || isNaN(dc)) {
    document.getElementById('quirkResult').innerHTML = '<p class="fail">Enter both cooking total and DC.</p>'
    return
  }

  const margin = total - dc

  let quirkType = null
  if (margin >= 5) quirkType = 'boon'
  else if (margin <= -5) quirkType = 'flaw'

  if (!quirkType) {
    document.getElementById('quirkResult').innerHTML = '<p style="color:#5a4020;font-style:italic">No quirk — margin within ±4 of DC.</p>'
    return
  }

  try {
    const quirks = await getCookingQuirks(quirkType)
    const roll = Math.ceil(Math.random() * 8)
    const quirk = quirks.find(q => q.d8_roll === roll) || quirks[0]

    document.getElementById('quirkResult').innerHTML = `
      <div class="quirk-type-${quirkType}">
        <div class="quirk-header">
          <span class="quirk-roll">${quirk.d8_roll}</span>
          <span class="quirk-name">${quirkType === 'boon' ? '✦ Boon' : '☠ Flaw'}: ${quirk.name}</span>
        </div>
        <div class="quirk-desc">${quirk.description}</div>
      </div>`
  } catch (err) {
    console.error(err)
  }
}

async function loadQuirksRef() {
  try {
    allQuirks = await getCookingQuirks()
    const container = document.getElementById('quirksRef')

    const flaws = allQuirks.filter(q => q.quirk_type === 'flaw')
    const boons = allQuirks.filter(q => q.quirk_type === 'boon')

    const renderList = (list, type) => list.map(q => `
      <div class="quirk-item quirk-type-${type}">
        <div class="quirk-header">
          <span class="quirk-roll">${q.d8_roll}</span>
          <span class="quirk-name">${q.name}</span>
        </div>
        <div class="quirk-desc">${q.description}</div>
      </div>`).join('')

    container.innerHTML = `
      <div style="font-family:var(--font-heading);font-size:0.72rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--blood);margin-bottom:0.5rem;">Flaws (Roll Low)</div>
      ${renderList(flaws, 'flaw')}
      <div style="font-family:var(--font-heading);font-size:0.72rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--teal);margin:1rem 0 0.5rem;">Boons (Roll High)</div>
      ${renderList(boons, 'boon')}
    `
  } catch (err) {
    console.error(err)
  }
}
