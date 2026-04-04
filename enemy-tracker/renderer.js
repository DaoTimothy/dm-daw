// State management
const state = {
  enemies: [],
  currentEnemyIndex: null,
  currentFile: null
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadEnemies();
});

function setupEventListeners() {
  // Enemy form submission
  document.getElementById('enemy-form').addEventListener('submit', handleAddEnemy);

  // New enemy button
  document.getElementById('btn-new-enemy').addEventListener('click', createNewEnemy);

  // File operations
  document.getElementById('btn-new').addEventListener('click', () => {
    if (confirm('Create new enemy list? Any unsaved changes will be lost.')) {
      state.enemies = [];
      state.currentFile = null;
      state.currentEnemyIndex = null;
      renderEnemyList();
      clearEnemyDetails();
    }
  });

  document.getElementById('btn-open').addEventListener('click', openEnemiesFile);
  document.getElementById('btn-save').addEventListener('click', saveEnemies);
  document.getElementById('btn-save-as').addEventListener('click', saveEnemiesAs);

  // Enemy list click
  document.getElementById('enemy-list').addEventListener('click', handleEnemyListClick);

  // Delete button
  document.getElementById('btn-delete-enemy').addEventListener('click', deleteCurrentEnemy);

  // Duplicate button
  document.getElementById('btn-duplicate-enemy').addEventListener('click', duplicateCurrentEnemy);

  // Quick-edit buttons for HP and spell slots
  document.getElementById('enemy-details').addEventListener('click', handleQuickEdit);
}

function handleAddEnemy(e) {
  e.preventDefault();

  const formData = new FormData(document.getElementById('enemy-form'));
  const imageFile = formData.get('enemy-image');

  const enemy = {
    id: state.currentEnemyIndex !== null ? state.enemies[state.currentEnemyIndex].id : Date.now().toString(),
    name: formData.get('enemy-name'),
    ac: parseInt(formData.get('ac')) || 10,
    maxHp: parseInt(formData.get('max-hp')) || 1,
    currentHp: parseInt(formData.get('current-hp')) || 1,
    spellSlots: formData.get('spell-slots') || '',
    spellSlotsUsed: state.currentEnemyIndex !== null ? state.enemies[state.currentEnemyIndex].spellSlotsUsed : '',
    resistances: formData.get('resistances') || '',
    weaknesses: formData.get('weaknesses') || '',
    legendaryMax: parseInt(formData.get('legendary-max')) || 0,
    legendaryCurrent: parseInt(formData.get('legendary-current')) || 0,
    statBlockImage: state.currentEnemyIndex !== null ? state.enemies[state.currentEnemyIndex].statBlockImage : ''
  };

  // Handle image upload
  if (imageFile && imageFile.size > 0) {
    const reader = new FileReader();
    reader.onload = (event) => {
      enemy.statBlockImage = event.target.result;
      saveEnemyData(enemy);
    };
    reader.readAsDataURL(imageFile);
  } else {
    saveEnemyData(enemy);
  }
}

function saveEnemyData(enemy) {
  if (state.currentEnemyIndex !== null) {
    // Update existing enemy
    state.enemies[state.currentEnemyIndex] = enemy;
  } else {
    // Add new enemy
    state.enemies.push(enemy);
  }

  document.getElementById('enemy-form').reset();
  state.currentEnemyIndex = null;
  renderEnemyList();
  clearEnemyDetails();
  saveEnemies();
}

function createNewEnemy() {
  state.currentEnemyIndex = null;
  document.getElementById('enemy-form').reset();
  clearEnemyDetails();
  document.getElementById('enemy-name').focus();
}

function handleEnemyListClick(e) {
  const listItem = e.target.closest('.enemy-list-item');
  if (listItem) {
    const index = parseInt(listItem.dataset.index);
    state.currentEnemyIndex = index;
    selectEnemy(index);
  }
}

function selectEnemy(index) {
  document.querySelectorAll('.enemy-list-item').forEach((item, i) => {
    item.classList.toggle('selected', i === index);
  });

  const enemy = state.enemies[index];
  if (enemy) {
    // Initialize spellSlotsUsed if it doesn't exist
    if (!enemy.spellSlotsUsed) {
      enemy.spellSlotsUsed = '';
    }
    populateEnemyForm(enemy);
    displayEnemyDetails(enemy, index);
    // Re-attach quick edit listener after HTML is rendered
    document.getElementById('enemy-details').addEventListener('click', handleQuickEdit);
  }
}

function populateEnemyForm(enemy) {
  document.getElementById('enemy-name').value = enemy.name;
  document.getElementById('ac').value = enemy.ac;
  document.getElementById('max-hp').value = enemy.maxHp;
  document.getElementById('current-hp').value = enemy.currentHp;
  document.getElementById('spell-slots').value = enemy.spellSlots;
  document.getElementById('resistances').value = enemy.resistances;
  document.getElementById('weaknesses').value = enemy.weaknesses;
  document.getElementById('legendary-max').value = enemy.legendaryMax;
  document.getElementById('legendary-current').value = enemy.legendaryCurrent;
}

function displayEnemyDetails(enemy, index) {
  const detailsContainer = document.getElementById('enemy-details');
  const hpPercent = (enemy.currentHp / enemy.maxHp) * 100;
  const hpColor = hpPercent > 50 ? '#28a745' : hpPercent > 25 ? '#ffc107' : '#dc3545';

  const legendaryPercent = enemy.legendaryMax > 0 ? (enemy.legendaryCurrent / enemy.legendaryMax) * 100 : 0;

  detailsContainer.innerHTML = `
    <div class="details-header">
      <h3>${enemy.name}</h3>
      <div class="details-controls">
        <button id="btn-delete-enemy" class="btn btn-danger">Delete</button>
        <button id="btn-duplicate-enemy" class="btn btn-secondary">Duplicate</button>
      </div>
    </div>

    ${enemy.statBlockImage ? `
    <div class="stat-block-image-container">
      <img src="${enemy.statBlockImage}" alt="Stat Block for ${escapeHtml(enemy.name)}" class="stat-block-image">
    </div>
    ` : ''}

    <div class="stat-row">
      <div class="stat">
        <label>AC:</label>
        <span class="stat-value">${enemy.ac}</span>
      </div>
    </div>

    <div class="stat-section">
      <h4>HP</h4>
      <div class="hp-bar">
        <div class="hp-fill" style="width: ${hpPercent}%; background-color: ${hpColor};"></div>
      </div>
      <div class="hp-text">
        <span>${enemy.currentHp} / ${enemy.maxHp}</span>
      </div>
      <div class="hp-controls">
        <input type="text" class="hp-change-input" id="hp-change-${enemy.id}" data-id="${enemy.id}" placeholder="e.g., -26 or +11">
        <button class="btn btn-apply-hp" data-id="${enemy.id}">Apply</button>
      </div>
    </div>

    ${enemy.legendaryMax > 0 ? `
    <div class="stat-section">
      <h4>Legendary Actions</h4>
      <div class="legendary-bar">
        <div class="legendary-fill" style="width: ${legendaryPercent}%;"></div>
      </div>
      <div class="legendary-text">
        <span>${enemy.legendaryCurrent} / ${enemy.legendaryMax}</span>
      </div>
      <div class="legendary-controls">
        <button class="btn-quick-edit btn-legendary-adjust" data-id="${enemy.id}" data-type="legendary" data-amount="-1">-1</button>
        <button class="btn-quick-edit btn-legendary-adjust" data-id="${enemy.id}" data-type="legendary" data-amount="1">+1</button>
        <button class="btn-quick-edit btn-legendary-adjust" data-id="${enemy.id}" data-type="legendary" data-amount="reset">Reset</button>
      </div>
    </div>
    ` : ''}

    ${enemy.spellSlots ? `
    <div class="stat-section">
      <h4>Spell Slots</h4>
      <div class="spell-slots-display">Available: ${escapeHtml(enemy.spellSlots)}</div>
      <div class="spell-slots-input">
        <label for="spell-slots-used-${enemy.id}">Slots Used:</label>
        <div class="spell-slots-input-row">
          <input type="text" id="spell-slots-used-${enemy.id}" class="spell-slots-input-field" data-id="${enemy.id}" value="${escapeHtml(enemy.spellSlotsUsed)}" placeholder="e.g., 1st: 2, 2nd: 1">
          <button class="btn btn-save-slots" data-id="${enemy.id}">Save</button>
        </div>
      </div>
    </div>
    ` : ''}

    ${enemy.resistances ? `
    <div class="stat-section">
      <h4>Resistances</h4>
      <div class="detail-text">${escapeHtml(enemy.resistances)}</div>
    </div>
    ` : ''}

    ${enemy.weaknesses ? `
    <div class="stat-section">
      <h4>Weaknesses</h4>
      <div class="detail-text">${escapeHtml(enemy.weaknesses)}</div>
    </div>
    ` : ''}
  `;

  // Re-attach event listeners for delete and duplicate buttons
  const deleteBtn = document.getElementById('btn-delete-enemy');
  const duplicateBtn = document.getElementById('btn-duplicate-enemy');
  if (deleteBtn) deleteBtn.addEventListener('click', deleteCurrentEnemy);
  if (duplicateBtn) duplicateBtn.addEventListener('click', duplicateCurrentEnemy);
}

function handleQuickEdit(e) {
  if (e.target.classList.contains('btn-apply-hp')) {
    const enemyId = e.target.dataset.id;
    const inputField = document.querySelector(`#hp-change-${enemyId}`);
    const enemy = state.enemies.find(en => en.id === enemyId);
    
    if (!enemy || !inputField) return;
    
    const changeStr = inputField.value.trim();
    const change = parseInt(changeStr);
    
    if (!isNaN(change)) {
      enemy.currentHp = Math.max(0, Math.min(enemy.maxHp, enemy.currentHp + change));
      saveEnemies();
      selectEnemy(state.currentEnemyIndex);
    }
  }

  if (e.target.classList.contains('btn-quick-edit')) {
    const enemyId = e.target.dataset.id;
    const type = e.target.dataset.type;
    const amount = e.target.dataset.amount;

    const enemy = state.enemies.find(en => en.id === enemyId);
    if (!enemy) return;

    if (type === 'legendary') {
      if (amount === 'reset') {
        enemy.legendaryCurrent = enemy.legendaryMax;
      } else {
        const change = parseInt(amount);
        enemy.legendaryCurrent = Math.max(0, Math.min(enemy.legendaryMax, enemy.legendaryCurrent + change));
      }
    }

    saveEnemies();
    selectEnemy(state.currentEnemyIndex);
  }

  // Handle spell slots save button
  if (e.target.classList.contains('btn-save-slots')) {
    const enemyId = e.target.dataset.id;
    const inputField = document.querySelector(`#spell-slots-used-${enemyId}`);
    const enemy = state.enemies.find(en => en.id === enemyId);
    
    if (enemy && inputField) {
      enemy.spellSlotsUsed = inputField.value;
      saveEnemies();
      e.target.textContent = 'Saved!';
      setTimeout(() => {
        e.target.textContent = 'Save';
      }, 1500);
    }
  }
}

function deleteCurrentEnemy() {
  if (state.currentEnemyIndex === null) return;

  const enemyName = state.enemies[state.currentEnemyIndex].name;
  if (confirm(`Delete ${enemyName}?`)) {
    state.enemies.splice(state.currentEnemyIndex, 1);
    state.currentEnemyIndex = null;
    renderEnemyList();
    clearEnemyDetails();
    saveEnemies();
  }
}

function duplicateCurrentEnemy() {
  if (state.currentEnemyIndex === null) return;

  const original = state.enemies[state.currentEnemyIndex];
  const duplicate = {
    ...original,
    id: Date.now().toString(),
    name: `${original.name} (Copy)`,
    currentHp: original.maxHp, // Reset HP to max
    legendaryCurrent: original.legendaryMax, // Reset legendary actions to max
    spellSlotsUsed: '' // Reset spell slots used for fresh copy
  };

  state.enemies.push(duplicate);
  renderEnemyList();
  saveEnemies();
}

function renderEnemyList() {
  const list = document.getElementById('enemy-list');
  list.innerHTML = state.enemies.map((enemy, index) => `
    <div class="enemy-list-item" data-index="${index}">
      <div class="enemy-list-name">${escapeHtml(enemy.name)}</div>
      <div class="enemy-list-stats">
        <span>AC ${enemy.ac}</span>
        <span>${enemy.currentHp}/${enemy.maxHp} HP</span>
      </div>
    </div>
  `).join('');
}

function clearEnemyDetails() {
  document.getElementById('enemy-details').innerHTML = '<p class="placeholder">Select an enemy or add a new one</p>';
  document.getElementById('enemy-form').reset();
}

async function loadEnemies() {
  const data = await window.electronAPI.loadEnemies();
  if (data) {
    state.enemies = data;
    // Initialize missing fields for any enemies that don't have them
    state.enemies.forEach(enemy => {
      if (!enemy.spellSlotsUsed) {
        enemy.spellSlotsUsed = '';
      }
      if (!enemy.statBlockImage) {
        enemy.statBlockImage = '';
      }
    });
    renderEnemyList();
  }
}

async function saveEnemies() {
  const success = await window.electronAPI.saveEnemies(state.enemies);
  if (success) {
    console.log('Enemies saved');
  }
}

async function saveEnemiesAs() {
  const filePath = await window.electronAPI.saveEnemiesAs(state.enemies);
  if (filePath) {
    state.currentFile = filePath;
    console.log('Enemies saved as:', filePath);
  }
}

async function openEnemiesFile() {
  const data = await window.electronAPI.openEnemiesFile();
  if (data && Array.isArray(data)) {
    state.enemies = data;
    // Initialize missing fields for any enemies that don't have them
    state.enemies.forEach(enemy => {
      if (!enemy.spellSlotsUsed) {
        enemy.spellSlotsUsed = '';
      }
      if (!enemy.statBlockImage) {
        enemy.statBlockImage = '';
      }
    });
    state.currentEnemyIndex = null;
    renderEnemyList();
    clearEnemyDetails();
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
