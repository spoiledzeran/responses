// Foundever Responses - Content Script
// Detects typed triggers and expands them into saved snippets.
// "." is always the activator prefix (e.g., trigger is ".hello").
// Snippets store the bare shortcut ("hello") and get "." prepended here.

const STORAGE_KEY = 'snippets';
let snippets = [];

// Timestamp window used to ignore the editor's own events after an expansion.
let suppressUntil = 0;

// Load snippets from Chrome storage
async function loadSnippets() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  snippets = (data[STORAGE_KEY] || []).map(normalizeSnippet);
}

// "." is always the activator: ensure each snippet's shortcut carries it
// (avoiding double dots for any snippet that already stored the dot).
function normalizeSnippet(s) {
  const sc = s.shortcut || '';
  return { ...s, shortcut: sc.startsWith('.') ? sc : '.' + sc };
}

// Refresh when storage changes (e.g., popup saves new snippet)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.snippets) loadSnippets();
});

// Check if an element is a valid text-editable field
function isEditable(element) {
  if (!element) return false;
  if (element.isContentEditable) return true;
  const tag = element.tagName.toLowerCase();
  return tag === 'textarea' ||
    (tag === 'input' && ['text', 'search', 'email', 'url', 'tel'].includes(element.type));
}

// Resolve the true editable element for an event. Composed input events that
// originate inside a Shadow DOM retarget to the shadow host, so e.target is
// wrong there — composedPath() gives the actual inner field.
function eventElement(e) {
  const path = e.composedPath ? e.composedPath() : [];
  const innermost = path[0];
  if (innermost && innermost.nodeType === Node.ELEMENT_NODE && isEditable(innermost)) {
    return innermost;
  }
  return e.target;
}

// For fields inside a Shadow DOM, the selection lives on the shadow root
// (ShadowRoot.getSelection), not on the document.
function selectionFor(element) {
  const root = element.getRootNode();
  if (root && typeof root.getSelection === 'function') return root.getSelection();
  return window.getSelection();
}

// Get text before the caret in an editable element
function textBeforeCaret(element) {
  if (element.isContentEditable) {
    const sel = selectionFor(element);
    if (!sel || sel.rangeCount === 0) return '';
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) return node.textContent.slice(0, range.startOffset);
    return '';
  }
  return element.value.slice(0, element.selectionStart || 0);
}

// Find the snippet whose full trigger text matches the end of the input.
function findMatch(input) {
  if (!snippets.length) return null;
  const candidates = [...snippets].sort((a, b) => b.shortcut.length - a.shortcut.length);
  for (const s of candidates) {
    if (input.endsWith(s.shortcut)) {
      return { snippet: s, markerLen: s.shortcut.length };
    }
  }
  return null;
}

// Replace the typed trigger with the snippet content
function performExpansion(element, match) {
  const { snippet, markerLen } = match;

  // Ignore editor events triggered by our own expansion to avoid loops.
  suppressUntil = Date.now() + 300;

  if (element.isContentEditable) {
    const sel = selectionFor(element);
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const startNode = range.startContainer;
    const startOffset = range.startOffset;

    if (startNode.nodeType !== Node.TEXT_NODE) return;
    const removeStart = startOffset - markerLen;
    if (removeStart < 0) return;

    // Preferred path: go through the browser's native editing pipeline
    // (beforeinput/input). Rich editors like Amazon Connect's (ProseMirror)
    // catch these and update their own internal model. Direct DOM edits are
    // treated as corruption and the app shows "Something went wrong".
    const marker = document.createRange();
    marker.setStart(startNode, removeStart);
    marker.setEnd(startNode, startOffset);
    sel.removeAllRanges();
    sel.addRange(marker);
    element.focus();

    let inserted = false;
    try {
      inserted = document.execCommand('insertText', false, snippet.content);
    } catch (_) {
      inserted = false;
    }

    // If the editor ignored the native insert, verify the text actually
    // landed; otherwise fall back to a direct DOM edit.
    const landed = inserted && textBeforeCaret(element).indexOf(snippet.content) !== -1;
    if (!landed) {
      if (!startNode.isConnected) return;
      const delRange = document.createRange();
      delRange.setStart(startNode, removeStart);
      delRange.setEnd(startNode, startOffset);
      delRange.deleteContents();

      const textNode = startNode.ownerDocument.createTextNode(snippet.content);
      const insPoint = document.createRange();
      insPoint.setStart(startNode, removeStart);
      insPoint.collapse(true);
      insPoint.insertNode(textNode);

      const caret = document.createRange();
      caret.setStartAfter(textNode);
      caret.collapse(true);
      sel.removeAllRanges();
      sel.addRange(caret);

      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  } else {
    const start = element.selectionStart;
    const removeStart = start - markerLen;
    element.value =
      element.value.slice(0, removeStart) +
      snippet.content +
      element.value.slice(start);
    const newPos = removeStart + snippet.content.length;
    element.selectionStart = element.selectionEnd = newPos;
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// Called after text changes; expands a recognized shortcut if present
// The setTimeout lets the pending keystroke register before we act.
function checkAndExpand(element) {
  if (Date.now() < suppressUntil) return;

  setTimeout(async () => {
    const input = textBeforeCaret(element);
    if (!input) return;

    // Always pull the freshest snippets so newly added ones work
    // without reloading the page, regardless of storage event delivery.
    const data = await chrome.storage.local.get(STORAGE_KEY);
    snippets = (data[STORAGE_KEY] || []).map(normalizeSnippet);

    const match = findMatch(input);
    if (match) {
      performExpansion(element, match);
    }
  }, 0);
}

// Capture phase: fires even if the page calls stopPropagation() on its own
// bubble-phase handler, and catches composed events from inside shadow DOM.
document.addEventListener('input', (e) => {
  if (!isEditable(eventElement(e))) return;
  checkAndExpand(eventElement(e));
}, true);

// Fallback for editors that don't emit input events: react to the keystroke
// ending a trigger (always an alphanumeric character for our shortcuts).
document.addEventListener('keyup', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (typeof e.key !== 'string' || e.key.length !== 1 || !/^[a-z0-9]$/i.test(e.key)) return;
  const element = eventElement(e);
  if (!isEditable(element)) return;
  checkAndExpand(element);
}, true);

loadSnippets();