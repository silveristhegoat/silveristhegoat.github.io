// Fetch and display Star Wars data by category
const API_BASE = 'https://starwars-databank-server.onrender.com/api/v1';
const CATEGORIES = [
  { key: 'droids', label: 'Droids' },
  { key: 'characters', label: 'Characters' },
  { key: 'creatures', label: 'Creatures' },
  { key: 'locations', label: 'Locations' },
  { key: 'organizations', label: 'Organizations' },
  { key: 'species', label: 'Species' },
  { key: 'vehicles', label: 'Vehicles' }
];
const ORIGINAL_CATEGORIES = [...CATEGORIES];
let pagesEl = null;
let currentPageIndex = 0;
let favoritesSection = null;

// Map of slugified droid names (and common variants) to SVG asset paths
// Filenames you provided:
// B2-RP.svg => B2-RP battle droid
// battledroid.svg => Battle Droid
// commandodroid.svg => Commando Droid
// courierdroid.svg => Courier Droid
// miningdroid.svg => Mining Guild Security Droid
const DROID_SVGS = {
  // B2-RP variants
  'b2-rp': '/svgs/B2-RP.svg',
  'b2-rp-battle-droid': '/svgs/B2-RP.svg',
  // Battle Droid variants
  'battle-droid': '/svgs/battledroid.svg',
  'battledroid': '/svgs/battledroid.svg',
  // Commando Droid
  'commando-droid': '/svgs/commandodroid.svg',
  'commandodroid': '/svgs/commandodroid.svg',
  // Courier Droid
  'courier-droid': '/svgs/courierdroid.svg',
  'courierdroid': '/svgs/courierdroid.svg',
  // Mining Guild Security Droid variants
  'mining-guild-security-droid': '/svgs/miningdroid.svg',
  'miningdroid': '/svgs/miningdroid.svg',
  'mining-droid': '/svgs/miningdroid.svg'
};

// Simple quiz questions (multiple choice)
const QUIZ_QUESTIONS = [
  {
    q: 'Who is Luke Skywalker\'s mentor early in A New Hope?',
    choices: ['Darth Vader', 'Obi-Wan Kenobi', 'Yoda', 'Han Solo'],
    a: 1
  },
  {
    q: 'What is the name of Han Solo\'s ship?',
    choices: ['Star Destroyer', 'X-wing', 'Millennium Falcon', 'Slave I'],
    a: 2
  },
  {
    q: 'Which species is Chewbacca?',
    choices: ['Togruta', 'Wookiee', 'Ewok', 'Rodian'],
    a: 1
  },
  {
    q: 'What color is Mace Windu\'s lightsaber?',
    choices: ['Green', 'Blue', 'Red', 'Purple'],
    a: 3
  },
  {
    q: 'Who built C-3PO?',
    choices: ['Luke Skywalker', 'Anakin Skywalker', 'Obi-Wan Kenobi', 'Yoda'],
    a: 1
  }
];

let quizState = { index: 0, score: 0 };

function openQuiz() {
  ensureQuizModal();
  const modal = document.getElementById('quiz-modal');
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'false');
  quizState.index = 0; quizState.score = 0;
  renderQuizQuestion();
}

function closeQuiz() {
  const modal = document.getElementById('quiz-modal');
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'true');
}

function ensureQuizModal() {
  if (document.getElementById('quiz-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'quiz-modal';
  modal.className = 'modal';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content" role="dialog" aria-modal="true">
      <button class="modal-close" aria-label="Close" id="quiz-close">×</button>
      <div id="quiz-body" class="quiz-body"></div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('.modal-backdrop').addEventListener('click', closeQuiz);
  modal.querySelector('#quiz-close').addEventListener('click', closeQuiz);
}

function renderQuizQuestion() {
  const body = document.getElementById('quiz-body');
  if (!body) return;
  body.innerHTML = '';
  const qObj = QUIZ_QUESTIONS[quizState.index];
  if (!qObj) {
    const out = document.createElement('div');
    out.className = 'quiz-results';
    out.innerHTML = `<h2>Quiz complete</h2><p>Your score: ${quizState.score} / ${QUIZ_QUESTIONS.length}</p><button id="quiz-restart">Try again</button>`;
    body.appendChild(out);
    document.getElementById('quiz-restart')?.addEventListener('click', () => { quizState.index = 0; quizState.score = 0; renderQuizQuestion(); });
    return;
  }

  const qEl = document.createElement('div'); qEl.className = 'quiz-question';
  const h = document.createElement('h2'); h.textContent = `Question ${quizState.index + 1}`;
  const p = document.createElement('p'); p.textContent = qObj.q;
  qEl.appendChild(h); qEl.appendChild(p);

  const choices = document.createElement('div'); choices.className = 'quiz-choices';
  let answered = false;
  qObj.choices.forEach((ch, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-choice';
    btn.textContent = ch;
    btn.type = 'button';
    btn.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      // mark selected
      if (i === qObj.a) {
        btn.classList.add('correct');
        quizState.score++;
      } else {
        btn.classList.add('incorrect');
        // reveal correct
        const all = choices.querySelectorAll('.quiz-choice');
        if (all && all[qObj.a]) all[qObj.a].classList.add('correct');
      }
      // disable all choices
      choices.querySelectorAll('button').forEach(b => b.disabled = true);
      // advance after brief pause so user sees feedback
      setTimeout(() => {
        quizState.index++;
        renderQuizQuestion();
      }, 900);
    });
    choices.appendChild(btn);
  });

  body.appendChild(qEl);
  body.appendChild(choices);
}


async function fetchCategory(categoryKey) {
  const res = await fetch(`${API_BASE}/${categoryKey}`);
  if (!res.ok) throw new Error(`Failed to fetch ${categoryKey}`);
  return res.json();
}

function slugify(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function tryLoadSvg(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}


  function truncate(text, maxLength = 70) {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
  }

  function createCardElement(item, category, index) {
    const description = item.description || '';
    const truncated = truncate(description);
    const card = document.createElement('div');
    card.className = 'card';
    card.tabIndex = 0;

    const img = document.createElement('img');
    img.src = item.image || 'https://starwars-visualguide.com/assets/img/big-placeholder.jpg';
    img.classList.remove('svg-fit');
    img.alt = item.name || item.title || '';

      // if this is a droid, only replace the image when we have a matching SVG you provided
      if (category === 'droids') {
        (async () => {
          const name = item.name || item.title || '';
          const key = slugify(name);
          console.debug('[SVG] droid card:', name, 'slug->', key);
          let mapped = DROID_SVGS[key];
          if (mapped) {
            try {
              const ok = await tryLoadSvg(mapped);
              if (ok) {
                img.src = mapped;
                img.classList.add('svg-fit');
                console.debug('[SVG] direct map used for', name, mapped);
                return;
              }
            } catch (e) { /* ignore */ }
          }

          // Fallback: try loose matching against available SVG basenames
          const avail = Object.values(DROID_SVGS).map(p => p.replace(/^\/assets\//, ''));
          const sName = slugify(name);
          for (const file of avail) {
            const base = file.replace(/\.svg$/i, '');
            const sBase = slugify(base);
            // match if either contains the other (loose match)
            if (!sBase || !sName) continue;
            if (sBase === sName || sBase.includes(sName) || sName.includes(sBase)) {
              const candidate = '/assets/' + file;
              try {
                const ok = await tryLoadSvg(candidate);
                if (ok) { img.src = candidate; img.classList.add('svg-fit'); console.debug('[SVG] fallback mapped', name, '->', candidate); return; }
              } catch (e) { /* ignore */ }
            }
          }
          console.debug('[SVG] no svg mapped for', name);
        })();
      }

    const content = document.createElement('div');
    content.className = 'card-content';

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = item.name || item.title || 'Untitled';

    const info = document.createElement('div');
    info.className = 'card-info';

    const short = document.createElement('span');
    short.className = 'desc-short';
    short.textContent = truncated;

    const full = document.createElement('span');
    full.className = 'desc-full';
    full.textContent = description;

    info.appendChild(short);
    info.appendChild(full);

    content.appendChild(title);
    content.appendChild(info);

    card.appendChild(img);
    card.appendChild(content);

    // favorite button
    const favBtn = document.createElement('button');
    favBtn.className = 'fav-btn';
    favBtn.setAttribute('aria-label', 'Toggle favorite');
    const key = getItemKey(item, category);
    if (isFavorited(key)) {
      favBtn.classList.add('active');
      favBtn.textContent = '★';
    } else {
      favBtn.textContent = '☆';
    }
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(item, category, favBtn);
    });
    card.appendChild(favBtn);

    // stagger entrance animations
    if (typeof index === 'number') card.style.animationDelay = `${index * 60}ms`;
      // attach original data for quick access (used by random opener)
      card._item = item;
      card._category = category;
      card.addEventListener('click', () => openModal(item));
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter') openModal(item); });

    return card;
  }

  // open a random card modal
  async function openRandomCard() {
    // ensure categories are rendered
    if (!pagesEl || !pagesEl.querySelectorAll) await renderCategories();
    const allCards = pagesEl ? Array.from(pagesEl.querySelectorAll('.card')) : [];
    if (!allCards.length) return alert('No cards loaded yet — try again shortly.');
    const idx = Math.floor(Math.random() * allCards.length);
    const chosen = allCards[idx];
    const item = chosen && chosen._item ? chosen._item : null;
    if (item) openModal(item);
  }

  function getItemKey(item, category) {
    const id = item.id || item._id || item.uid || item.slug || item.name || JSON.stringify(item);
    return `${category}::${id}`;
  }

  function loadFavorites() {
    try {
      return JSON.parse(localStorage.getItem('sw_favs') || '{}');
    } catch (e) { return {}; }
  }

  function saveFavorites(obj) { localStorage.setItem('sw_favs', JSON.stringify(obj)); }

  function isFavorited(key) { const f = loadFavorites(); return !!f[key]; }

  function toggleFavorite(item, category, btn) {
    const key = getItemKey(item, category);
    const favs = loadFavorites();
    if (favs[key]) {
      delete favs[key];
      btn.classList.remove('active'); btn.textContent = '☆';
    } else {
      favs[key] = { item, category };
      btn.classList.add('active'); btn.textContent = '★';
    }
    saveFavorites(favs);
    // update favorites view if visible
    if (favoritesSection && !favoritesSection.hidden) renderFavoritesSection();
  }

  function renderFavoritesSection() {
    if (!favoritesSection) return;
    const favs = loadFavorites();
    const items = Object.values(favs).map(v => ({ item: v.item, category: v.category }));
    const wrapper = favoritesSection.querySelector('.cards-wrapper');
    if (!wrapper) return;
    const cardsEl = wrapper.querySelector('.cards');
    cardsEl.innerHTML = '';
    items.forEach((v, i) => {
      const cardEl = createCardElement(v.item, v.category, i);
      cardsEl.appendChild(cardEl);
    });
  }

  function openModal(item) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modal-body');
    if (!modal || !body) return;
    body.innerHTML = '';

    const img = document.createElement('img');
    img.src = item.image || 'https://starwars-visualguide.com/assets/img/big-placeholder.jpg';
    img.alt = item.name || item.title || '';

    const meta = document.createElement('div');
    meta.className = 'meta';

    const h2 = document.createElement('h2');
    h2.textContent = item.name || item.title || 'Untitled';

    const p = document.createElement('p');
    p.textContent = item.description || 'No description available.';

    meta.appendChild(h2);
    meta.appendChild(p);

    body.appendChild(img);
    body.appendChild(meta);

    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    const modal = document.getElementById('modal');
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
  }


async function renderCategories() {
  const container = document.getElementById('categories');
  if (!container) return;
  container.innerHTML = '';
  const pages = [];
  for (const { key, label } of ORIGINAL_CATEGORIES) {
    try {
      const data = await fetchCategory(key);
      const items = data.data || [];
      if (!items.length) continue;

      const section = document.createElement('section');
      section.className = 'category-section';
      section.dataset.key = key;

      const inner = document.createElement('div');
      inner.className = 'category-inner';

      const titleEl = document.createElement('div');
      titleEl.className = 'category-title';
      titleEl.textContent = label;

      const cardsEl = document.createElement('div');
      cardsEl.className = 'cards';
      items.slice(0, 12).forEach((item, i) => {
        const cardEl = createCardElement(item, key, i);
        cardsEl.appendChild(cardEl);
      });

      const wrapper = document.createElement('div');
      wrapper.className = 'cards-wrapper';
      wrapper.appendChild(cardsEl);

      inner.appendChild(titleEl);
      inner.appendChild(wrapper);
      section.appendChild(inner);
      pages.push(section);
    } catch (e) {
      console.error(e);
    }
  }

  // build pages container
  pagesEl = document.createElement('div');
  pagesEl.className = 'pages';
  pages.forEach(p => pagesEl.appendChild(p));

  // create favorites section (hidden by default)
  favoritesSection = document.createElement('section');
  favoritesSection.className = 'category-section';
  favoritesSection.dataset.key = 'favorites';
  const favInner = document.createElement('div');
  favInner.className = 'category-inner';
  const favTitle = document.createElement('div');
  favTitle.className = 'category-title';
  favTitle.textContent = 'Favorites';
  const favWrapper = document.createElement('div');
  favWrapper.className = 'cards-wrapper';
  const favCards = document.createElement('div');
  favCards.className = 'cards';
  favWrapper.appendChild(favCards);
  favInner.appendChild(favTitle);
  favInner.appendChild(favWrapper);
  favoritesSection.appendChild(favInner);
  favoritesSection.hidden = true;
  pagesEl.appendChild(favoritesSection);
  container.appendChild(pagesEl);

  // default to showing all categories (All selected)
  showAll();
}

// removed unused page navigation function during refactor

function showPage(index) {
  if (!pagesEl) return;
  const pages = Array.from(pagesEl.children);
  if (!pages.length) return;
  if (index < 0) index = 0;
  if (index >= pages.length) index = pages.length - 1;
  currentPageIndex = index;
  // Show only the requested page (single-page view)
  pages.forEach((p, i) => {
    if (i === index) {
      p.hidden = false;
      p.classList.add('visible');
    } else {
      p.hidden = true;
      p.classList.remove('visible');
    }
  });
  // ensure corresponding category button is active
  const group = document.querySelector('.category-buttons');
  if (group) {
    group.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    const key = ORIGINAL_CATEGORIES[index] && ORIGINAL_CATEGORIES[index].key;
    const btn = group.querySelector(`button[data-key="${key}"]`);
    if (btn) btn.classList.add('active');
  }
}

function showAll() {
  if (!pagesEl) return;
  const pages = Array.from(pagesEl.children);
  pages.forEach(p => { p.hidden = false; p.classList.remove('visible'); });
  // hide favorites when showing all categories
  if (favoritesSection) favoritesSection.hidden = true;
  // activate 'All' button
  const group = document.querySelector('.category-buttons');
  if (group) {
    group.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    const allBtn = group.querySelector('button[data-key="all"]');
    if (allBtn) allBtn.classList.add('active');
  }
}

function showFavorites() {
  if (!pagesEl || !favoritesSection) return;
  const pages = Array.from(pagesEl.children);
  pages.forEach(p => {
    if (p === favoritesSection) { p.hidden = false; p.classList.add('visible'); }
    else { p.hidden = true; p.classList.remove('visible'); }
  });
  renderFavoritesSection();
  const group = document.querySelector('.category-buttons');
  if (group) {
    group.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    const btn = group.querySelector('button[data-key="favorites"]');
    if (btn) btn.classList.add('active');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // create category buttons dynamically so they stay in sync with categories
  const controls = document.querySelector('.controls');
  if (controls) {
    // theme toggle: apply saved theme and add control
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') document.body.classList.add('theme-light');
    else document.body.classList.remove('theme-light');

    const themeToggle = document.createElement('button');
    themeToggle.type = 'button';
    themeToggle.className = 'theme-toggle';
    themeToggle.textContent = (savedTheme === 'light') ? '☀️ Light' : '🌙 Dark';
    themeToggle.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('theme-light');
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
      themeToggle.textContent = isLight ? '☀️ Light' : '🌙 Dark';
    });
    controls.appendChild(themeToggle);
    // Quiz button
    const quizBtn = document.createElement('button');
    quizBtn.type = 'button';
    quizBtn.className = 'theme-toggle';
    quizBtn.textContent = '🎯 Quiz';
    quizBtn.addEventListener('click', () => openQuiz());
    controls.appendChild(quizBtn);
    // Random card button
    const rndBtn = document.createElement('button');
    rndBtn.type = 'button';
    rndBtn.className = 'theme-toggle';
    rndBtn.textContent = '🎲 Random';
    rndBtn.addEventListener('click', () => openRandomCard());
    controls.appendChild(rndBtn);
    const group = document.createElement('div');
    group.className = 'category-buttons';

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'category-button active';
    allBtn.dataset.key = 'all';
    allBtn.textContent = 'All';
    group.appendChild(allBtn);

    // Favorites button
    const favBtn = document.createElement('button');
    favBtn.type = 'button';
    favBtn.className = 'category-button';
    favBtn.dataset.key = 'favorites';
    favBtn.textContent = 'Favorites';
    group.appendChild(favBtn);

    ORIGINAL_CATEGORIES.forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'category-button';
      b.dataset.key = c.key;
      b.textContent = c.label;
      group.appendChild(b);
    });

    group.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn || !group.contains(btn)) return;
      const key = btn.dataset.key;
      // single-select active
      group.querySelectorAll('button').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      if (!pagesEl) return;
      const idx = ORIGINAL_CATEGORIES.findIndex(c => c.key === key);
      if (key === 'all') {
        showAll();
      } else if (key === 'favorites') {
        showFavorites();
      } else if (idx !== -1) {
        showPage(idx);
      } else {
        showAll();
      }
    });

    controls.appendChild(group);

    // (previous/next page nav removed — categories act as page selectors)
  }

  renderCategories();
});
