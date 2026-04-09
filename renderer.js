// ---- Storage ----
const TASKS_KEY = 'tasks';
const COMPLETIONS_KEY = 'completions';

function loadTasks() {
  return JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
}
function saveTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}
function loadCompletions() {
  return JSON.parse(localStorage.getItem(COMPLETIONS_KEY) || '{}');
}
function saveCompletions(c) {
  localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(c));
}

// ---- ID ----
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ---- Date utils ----
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  const msPerDay = 86400000;
  const dateA = new Date(a + 'T00:00:00');
  const dateB = new Date(b + 'T00:00:00');
  return Math.round((dateB - dateA) / msPerDay);
}

function formatDueDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(dateStr) {
  return dateStr < todayStr();
}

// ---- Page range parser ----
// "1-10, 20-25, 30" → [1,2,...,10,20,...,25,30]
function parsePageRanges(str) {
  const pages = [];
  const seen = new Set();
  const parts = str.split(',').map(s => s.trim()).filter(Boolean);
  for (const part of parts) {
    const match = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) return null;
    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : start;
    if (end < start) return null;
    for (let p = start; p <= end; p++) {
      if (!seen.has(p)) { seen.add(p); pages.push(p); }
    }
  }
  return pages.length > 0 ? pages : null;
}

// ---- Daily page allocator ----
// Returns the slice of pages due today for a task.
function getDailyPages(task) {
  const today = todayStr();
  const totalDays = daysBetween(task.createdAt, task.dueDate);
  if (totalDays <= 0) return task.pages.slice();

  const daysElapsed = Math.max(0, daysBetween(task.createdAt, today));
  const totalPages = task.pages.length;
  const perDay = totalPages / totalDays;
  const start = Math.round(daysElapsed * perDay);
  const end = Math.round((daysElapsed + 1) * perDay);
  return task.pages.slice(start, end);
}

// ---- Completions helpers ----
function getTodayCompletions(taskId) {
  const all = loadCompletions();
  return (all[taskId] && all[taskId][todayStr()]) ? all[taskId][todayStr()] : [];
}

function toggleCompletion(taskId, page) {
  const all = loadCompletions();
  const today = todayStr();
  if (!all[taskId]) all[taskId] = {};
  if (!all[taskId][today]) all[taskId][today] = [];
  const idx = all[taskId][today].indexOf(page);
  if (idx === -1) {
    all[taskId][today].push(page);
  } else {
    all[taskId][today].splice(idx, 1);
  }
  saveCompletions(all);
}

// ---- Book autocomplete ----
function populateBookAutocomplete() {
  const tasks = loadTasks();
  const names = [...new Set(tasks.map(t => t.bookName))];
  const datalist = document.getElementById('book-suggestions');
  datalist.innerHTML = '';
  names.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    datalist.appendChild(opt);
  });
}

// ---- DOM helpers ----
function el(tag, className) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

// ---- Render a single task card ----
function renderTaskCard(task) {
  const dailyPages = getDailyPages(task);
  const donePages = getTodayCompletions(task.id);
  const doneSet = new Set(donePages);
  const checkedCount = dailyPages.filter(p => doneSet.has(p)).length;
  const totalToday = dailyPages.length;
  const remainingCount = totalToday - checkedCount;
  const progressPct = totalToday > 0 ? (checkedCount / totalToday) * 100 : 100;
  const flamePct = totalToday > 0 ? (remainingCount / totalToday) * 100 : 0;
  const allDone = totalToday > 0 && checkedCount === totalToday;

  const overdue = isOverdue(task.dueDate);
  const daysLeft = daysBetween(todayStr(), task.dueDate);
  let dueLabel;
  if (overdue) dueLabel = `Overdue — ${formatDueDate(task.dueDate)}`;
  else if (daysLeft === 0) dueLabel = 'Due today';
  else if (daysLeft === 1) dueLabel = 'Due tomorrow';
  else dueLabel = `Due ${formatDueDate(task.dueDate)}`;

  const pageRangeLabel = dailyPages.length > 0
    ? `Pages ${dailyPages[0]}–${dailyPages[dailyPages.length - 1]} (${totalToday} due today)`
    : 'No pages due today';

  // Card
  const card = el('div', 'task-card');
  card.dataset.taskId = task.id;

  // Inner
  const inner = el('div', 'task-card-inner');

  // Flame column
  const flameCol = el('div', 'flame-col');
  const flameLabel = el('span', 'flame-label');
  flameLabel.textContent = 'Flame';
  const flameTrack = el('div', 'flame-track');
  const flameFill = el('div', 'flame-fill');
  flameFill.style.height = flamePct + '%';
  flameTrack.appendChild(flameFill);
  const flameCount = el('span', 'flame-count');
  flameCount.textContent = `${remainingCount}/${totalToday}`;
  flameCol.appendChild(flameLabel);
  flameCol.appendChild(flameTrack);
  flameCol.appendChild(flameCount);

  // Task content
  const content = el('div', 'task-content');

  // Header
  const header = el('div', 'task-header');
  const bookSpan = el('span', 'task-book');
  bookSpan.textContent = '📚 ' + task.bookName;
  const dueSpan = el('span', 'task-due' + (overdue ? ' overdue' : ''));
  dueSpan.textContent = dueLabel;
  header.appendChild(bookSpan);
  header.appendChild(dueSpan);

  // Meta
  const meta = el('div', 'task-meta');
  meta.textContent = pageRangeLabel;

  // Page grid
  const grid = el('div', 'page-grid');
  dailyPages.forEach(page => {
    const box = el('div', 'page-box' + (doneSet.has(page) ? ' done' : ''));
    box.textContent = page;
    box.title = `Page ${page}`;
    box.addEventListener('click', () => {
      toggleCompletion(task.id, page);
      const updated = renderTaskCard(task);
      card.replaceWith(updated);
    });
    grid.appendChild(box);
  });

  // Progress
  const progressWrap = el('div', 'progress-wrap');
  const progressLabel = el('span', 'progress-label');
  progressLabel.textContent = 'Daily progress';
  const progressTrack = el('div', 'progress-track');
  const progressFill = el('div', 'progress-fill');
  progressFill.style.width = progressPct + '%';
  progressTrack.appendChild(progressFill);
  progressWrap.appendChild(progressLabel);
  progressWrap.appendChild(progressTrack);

  content.appendChild(header);
  content.appendChild(meta);
  content.appendChild(grid);
  content.appendChild(progressWrap);

  inner.appendChild(flameCol);
  inner.appendChild(content);
  card.appendChild(inner);

  // All done banner
  if (allDone) {
    const banner = el('div', 'all-done-banner');
    banner.textContent = 'All done today! 🎉';
    card.appendChild(banner);
  }

  return card;
}

// ---- Render app ----
function renderApp() {
  const tasks = loadTasks();
  const list = document.getElementById('task-list');
  const empty = document.getElementById('empty-state');
  list.innerHTML = '';

  if (tasks.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  tasks.forEach(task => {
    list.appendChild(renderTaskCard(task));
  });
}

// ---- Modal ----
let editingTaskId = null;

function openModal(task = null) {
  editingTaskId = task ? task.id : null;
  document.getElementById('modal-title').textContent = task ? 'Edit Task' : 'New Reading Task';
  document.getElementById('book-input').value = task ? task.bookName : '';
  document.getElementById('pages-input').value = task ? task.pageRanges : '';
  document.getElementById('due-date-input').value = task ? task.dueDate : '';
  document.getElementById('pages-preview').textContent = '';
  document.getElementById('form-error').classList.add('hidden');
  populateBookAutocomplete();
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('book-input').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  editingTaskId = null;
}

function showError(msg) {
  const errEl = document.getElementById('form-error');
  errEl.textContent = msg;
  errEl.classList.remove('hidden');
}

function saveTask() {
  const bookName = document.getElementById('book-input').value.trim();
  const pagesRaw = document.getElementById('pages-input').value.trim();
  const dueDate = document.getElementById('due-date-input').value;

  if (!bookName) return showError('Please enter a book name.');
  if (!pagesRaw) return showError('Please enter page ranges (e.g. 1-10, 20-25).');
  const pages = parsePageRanges(pagesRaw);
  if (!pages) return showError('Invalid page ranges. Use format: 1-10, 20-25, 30-40');
  if (!dueDate) return showError('Please pick a due date.');
  if (dueDate <= todayStr()) return showError('Due date must be in the future.');

  const tasks = loadTasks();

  if (editingTaskId) {
    const idx = tasks.findIndex(t => t.id === editingTaskId);
    if (idx !== -1) {
      tasks[idx] = { ...tasks[idx], bookName, pageRanges: pagesRaw, pages, dueDate };
    }
  } else {
    tasks.push({
      id: genId(),
      bookName,
      pageRanges: pagesRaw,
      pages,
      dueDate,
      createdAt: todayStr()
    });
  }

  saveTasks(tasks);
  closeModal();
  renderApp();
}

// ---- Live page count preview ----
document.getElementById('pages-input').addEventListener('input', (e) => {
  const pages = parsePageRanges(e.target.value);
  const preview = document.getElementById('pages-preview');
  if (pages) {
    preview.textContent = `${pages.length} pages total`;
  } else if (e.target.value.trim()) {
    preview.textContent = 'Invalid format';
  } else {
    preview.textContent = '';
  }
});

// ---- Event bindings ----
document.getElementById('new-task-btn').addEventListener('click', () => openModal());
document.getElementById('cancel-btn').addEventListener('click', closeModal);
document.getElementById('save-btn').addEventListener('click', saveTask);

document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ---- Init ----
renderApp();
