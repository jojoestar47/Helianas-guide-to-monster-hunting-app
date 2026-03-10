# Heliana's Guide — Monster Hunting Companion

A full-featured web companion app for **Heliana's Guide to Monster Hunting Part 1**, powered by Supabase and deployable on Vercel.

## Features

- **Harvest Calculator** — Select creature type, apply condition modifiers, enter rolls, see exactly what you harvested
- **Monster Parts Generator** — Randomized loot tables by creature type, CR tier, and battle condition
- **Cooking** — Recipe finder with tier/ingredient filters + cooking check calculator with quirk generation
- **Crafting** — Searchable magic item reference linked to required components and creature types
- **Ingredient Effects** — All 10 component types × 14 creature types × 4 rarities
- **Dice & Quirks** — Dice roller + full cooking quirk flaw/boon tables from the book

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/helianas-guide-companion.git
cd helianas-guide-companion
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run locally

```bash
npm run dev
```

### 4. Deploy to Vercel

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add environment variables in the Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy — Vercel auto-detects Vite

## Database

All data lives in the `heliana` schema inside a Supabase project. Tables:

| Table | Contents |
|---|---|
| `creature_types` | 14 creature types with harvest skills |
| `harvest_components` | 214 harvestable components with DCs |
| `essence` | 5 essence tiers by CR |
| `recipes` | 22 staple + 5 boss recipes |
| `recipe_ingredients` | Ingredients per recipe |
| `component_effects` | 540 effects across all types/rarities |
| `cooking_quirks` | 8 flaws + 8 boons |
| `magic_items` | 55 craftable magic items |
| `boss_recipe_scaling` | Per-rarity scaling for boss recipes |
| `variable_stats` | APL-based variable stats table |
| `creature_sizes` | Harvest time by creature size |

## Tech Stack

- **Frontend**: Vanilla JS + Vite
- **Database**: Supabase (PostgreSQL)
- **Fonts**: Cinzel Decorative, Cinzel, Crimson Pro
- **Hosting**: Vercel
