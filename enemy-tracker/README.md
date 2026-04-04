# D&D Enemy Tracker

A desktop application built with Electron for Dungeon Masters to track enemy stats during combat encounters.

## Features

- ✅ **Add/Edit Enemies** - Create and manage enemy stat blocks
- ✅ **Real-time HP Tracking** - Monitor health with quick-adjust buttons (-5, -1, +1, +5)
- ✅ **Spell Slot Management** - Track available spell slots
- ✅ **Armor Class Display** - View AC at a glance
- ✅ **Legendary Actions** - Track legendary action usage with quick reset
- ✅ **Resistances & Weaknesses** - Note damage resistances and vulnerabilities
- ✅ **Duplicate Enemies** - Quickly copy enemy templates with stats reset to max
- ✅ **Save/Load** - Persist enemy lists and load different encounter configs

## Enemy Properties

Each enemy tracks:
- **Name** - Creature name
- **AC** - Armor Class
- **HP** - Current and Maximum Health
- **Spell Slots** - Free-form text for tracking spell availability
- **Legendary Max/Current** - Number of legendary actions
- **Resistances** - Damage resistance types
- **Weaknesses** - Damage vulnerability types

## Usage

1. **Add an Enemy** - Fill out the form on the left and click "Add Enemy"
2. **Select an Enemy** - Click on an enemy in the "Tracked Enemies" list
3. **Adjust HP** - Use the quick buttons (+1, +5, -1, -5) to modify current HP
4. **Manage Legendary Actions** - Adjust current legendary action usage or reset to max
5. **Duplicate** - Clone an enemy template for similar foes in the same encounter
6. **Delete** - Remove an enemy from tracking
7. **Save** - Save your current enemy list
8. **Save As** - Export to a named configuration file
9. **Open** - Load a previously saved enemy list

## Getting Started

```bash
npm install
npm start
```

## Dark Theme

Features a dark fantasy-themed interface with:
- Dark gradient background
- Pink accent color (#e94560)
- Gold legendary action bar
- HP bar with color coding (green when healthy, yellow/orange when wounded, red when critical)

## Tips for DMs

- **Pre-create enemies** during session prep and save a config
- **Duplicate strong enemies** to quickly add reinforcements
- **Use spell slots tracking** for casting-heavy encounters
- **Note resistances** for players to discover during combat
- **Legendary actions display** helps manage turn economy

## Files

- `main.js` - Electron main process
- `preload.js` - Security bridge for IPC
- `renderer.js` - UI logic and state management
- `index.html` - Application layout
- `styles.css` - Dark theme styling
