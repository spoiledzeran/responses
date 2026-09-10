// Storage key for snippets
const STORAGE_KEY = 'snippets';

// Get all snippets from storage
async function getSnippets() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || [];
}

// Save snippets to storage
async function saveSnippets(snippets) {
  await chrome.storage.local.set({ [STORAGE_KEY]: snippets });
}

// State
let snippets = [];
let editingId = null;

// DOM elements
const snippetsList = document.getElementById('snippets-list');
const searchInput = document.getElementById('search');
const addBtn = document.getElementById('add-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');
const modal = document.getElementById('modal');
const snippetForm = document.getElementById('snippet-form');
const modalTitle = document.getElementById('modal-title');
const snippetTitle = document.getElementById('snippet-title');
const snippetShortcut = document.getElementById('snippet-shortcut');
const exampleHint = document.getElementById('example-hint');
const snippetContent = document.getElementById('snippet-content');
const snippetCategory = document.getElementById('snippet-category');
const cancelBtn = document.getElementById('cancel-btn');

// Initialize
document.addEventListener('DOMContentLoaded', loadSnippets);

// Load snippets
async function loadSnippets() {
  snippets = await getSnippets();
  renderSnippets();
}

// Render snippets list
function renderSnippets() {
  const searchTerm = searchInput.value.toLowerCase();
  const filtered = snippets.filter(s =>
    s.title.toLowerCase().includes(searchTerm) ||
    s.shortcut.toLowerCase().includes(searchTerm) ||
    s.content.toLowerCase().includes(searchTerm)
  );

  if (filtered.length === 0) {
    snippetsList.innerHTML = `
      <div class="empty-state">
        <p>No snippets yet</p>
        <small>Click "+ New" to create your first canned response</small>
      </div>
    `;
    return;
  }

  snippetsList.innerHTML = filtered.map(snippet => {
    return `
    <div class="snippet-item" data-id="${snippet.id}">
      <div class="snippet-header">
        <span class="snippet-title">${esc(snippet.title)}</span>
        <span class="snippet-shortcut">${esc(normalizeShortcut(snippet))}</span>
      </div>
      <div class="snippet-preview">${esc(snippet.content)}</div>
      <div class="snippet-meta">
        <span class="category-badge">${esc(snippet.category)}</span>
        <div class="snippet-actions">
          <button class="edit-btn" data-id="${snippet.id}">Edit</button>
          <button class="delete-btn" data-id="${snippet.id}">Delete</button>
        </div>
      </div>
    </div>
  `;
  }).join('');

  // Attach event listeners
  document.querySelectorAll('.snippet-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('edit-btn') || e.target.classList.contains('delete-btn')) return;
      copySnippet(e.currentTarget.dataset.id);
    });
  });

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteSnippet(btn.dataset.id));
  });
}

// Copy snippet content to clipboard
async function copySnippet(id) {
  const snippet = snippets.find(s => s.id === id);
  if (!snippet) return;
  
  await navigator.clipboard.writeText(snippet.content);
  
  // Show feedback
  const item = document.querySelector(`.snippet-item[data-id="${id}"]`);
  const original = item.querySelector('.snippet-title').textContent;
  const title = item.querySelector('.snippet-title');
  title.textContent = '✓ Copied!';
  setTimeout(() => title.textContent = original, 1500);
}

// Open modal for creating a new snippet
function openNewModal() {
  editingId = null;
  modalTitle.textContent = 'New Snippet';
  snippetForm.reset();
  snippetCategory.value = 'general';
  updateExampleHint();
  snippetTitle.focus();
  modal.classList.remove('hidden');
}

// Open modal for editing
function openEditModal(id) {
  const snippet = snippets.find(s => s.id === id);
  if (!snippet) return;
  
  editingId = id;
  modalTitle.textContent = 'Edit Snippet';
  snippetTitle.value = snippet.title;
  snippetShortcut.value = normalizeShortcut(snippet);
  snippetContent.value = snippet.content;
  snippetCategory.value = snippet.category || 'general';
  updateExampleHint();
  modal.classList.remove('hidden');
  snippetTitle.focus();
}

// Close modal
function closeModal() {
  modal.classList.add('hidden');
  editingId = null;
  snippetForm.reset();
}

// Handle form submission
snippetForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const title = snippetTitle.value.trim();
  const shortcut = snippetShortcut.value.trim().toLowerCase();
  const content = snippetContent.value.trim();
  const category = snippetCategory.value;
  
  if (!title || !shortcut || !content) return;
  
  // Shortcuts may contain only letters and numbers.
  if (!/^[a-z0-9]+$/.test(shortcut)) {
    showError('Shortcut can only contain letters and numbers.');
    return;
  }
  
  // All shortcuts use the "." prefix: compare against ".shortcut"
  const trigger = '.' + shortcut;
  
  // Check for duplicate shortcut (excluding current editing item)
  const duplicate = snippets.find(s =>
    normalizeShortcut(s) === trigger && s.id !== editingId
  );
  
  if (duplicate) {
    showError('A snippet with this shortcut already exists.');
    return;
  }
  
  const save = { title, shortcut, content, category };
  
  if (editingId) {
    // Update existing
    snippets = snippets.map(s =>
      s.id === editingId ? { ...s, ...save } : s
    );
  } else {
    // Create new
    snippets.push({ id: Date.now().toString(), ...save });
  }
  
  await saveSnippets(snippets);
  closeModal();
  renderSnippets();
});

// Show error message near shortcut field
function showError(message) {
  // Simple approach - use title input for now
  const shortcutInput = document.getElementById('snippet-shortcut');
  shortcutInput.style.borderColor = '#e74c3c';
  shortcutInput.setAttribute('title', message);
  
  // Clear on next input
  shortcutInput.addEventListener('input', () => {
    shortcutInput.style.borderColor = '#ddd';
    shortcutInput.removeAttribute('title');
  }, { once: true });
}

// Delete snippet
async function deleteSnippet(id) {
  if (!confirm('Delete this snippet?')) return;
  snippets = snippets.filter(s => s.id !== id);
  await saveSnippets(snippets);
  renderSnippets();
}

// Search
searchInput.addEventListener('input', renderSnippets);

// Reconstruct the full trigger text for a snippet.
// "." is always the activator prefix.
function normalizeShortcut(snippet) {
  const sc = snippet.shortcut || '';
  return sc.startsWith('.') ? sc : '.' + sc;
}

// Update the "type this to insert" hint inside the modal
function updateExampleHint() {
  if (!exampleHint) return;
  const sc = snippetShortcut.value.trim() || 'hello';
  exampleHint.textContent = '.' + sc;
}

// Live-update the hint as the user types; strip anything that's not a letter or number
snippetShortcut.addEventListener('input', () => {
  snippetShortcut.value = snippetShortcut.value.replace(/[^a-z0-9]/gi, '');
  updateExampleHint();
});

// Event listeners
addBtn.addEventListener('click', openNewModal);
cancelBtn.addEventListener('click', closeModal);
exportBtn.addEventListener('click', exportSnippets);
importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', importSnippets);

// Close modal on click outside
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

// Export snippets to JSON file
async function exportSnippets() {
  const snippets = await getSnippets();
  const blob = new Blob([JSON.stringify(snippets, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `foundever-responses-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

// Import snippets from JSON file
async function importSnippets(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (!Array.isArray(imported)) throw new Error('Invalid format');
      
      const existing = await getSnippets();
      
      // Normalize imported snippets: strip any stored prefix and keep the
      // bare shortcut, since "." is always the activator now.
      const normalized = imported.map(s => ({
        ...s,
        shortcut: String(s.shortcut || '').replace(/^[^a-z0-9_]+/i, '')
      }));
      
      // Merge imported snippets, checking for duplicate triggers.
      // Shortcuts with spaces are rejected.
      const existingKeys = new Set(existing.map(normalizeShortcut));
      const newSnippets = normalized.filter(s => {
        if (!s.title || !s.shortcut || !s.content) return false;
        if (!/^[a-z0-9]+$/i.test(s.shortcut)) return false;
        const key = normalizeShortcut(s);
        if (existingKeys.has(key)) return false;
        existingKeys.add(key);
        return true;
      });
      
      if (newSnippets.length === 0) {
        alert('No new snippets to import (all shortcuts already exist or format is invalid).');
      } else {
        const merged = [...existing, ...newSnippets];
        await saveSnippets(merged);
        await loadSnippets();
        alert(`Imported ${newSnippets.length} new snippet(s).`);
      }
    } catch (err) {
      alert('Failed to import: Invalid file format.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// Escape HTML to prevent XSS
function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Notify content script that snippets were updated
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.snippets) {
    // Content script will read latest on next keypress
  }
});
