const cardsElement = document.getElementById("cards");
const statusElement = document.getElementById("status");
const reloadButton = document.getElementById("reloadButton");
const searchInput = document.getElementById("searchInput");
const originFilter = document.getElementById("originFilter");
const sortSelect = document.getElementById("sortSelect");
const themeSelect = document.getElementById("themeSelect");
const compareModeToggle = document.getElementById("compareModeToggle");
const favoritesToggle = document.getElementById("favoritesToggle");
const dailyCatDate = document.getElementById("dailyCatDate");
const dailyCatImage = document.getElementById("dailyCatImage");
const dailyCatName = document.getElementById("dailyCatName");
const dailyCatDescription = document.getElementById("dailyCatDescription");
const dailyCatOrigin = document.getElementById("dailyCatOrigin");
const dailyCatLifeSpan = document.getElementById("dailyCatLifeSpan");
const dailyCatDetailsButton = document.getElementById("dailyCatDetailsButton");
const quizPrompt = document.getElementById("quizPrompt");
const quizScore = document.getElementById("quizScore");
const quizImage = document.getElementById("quizImage");
const quizOptions = document.getElementById("quizOptions");
const quizFeedback = document.getElementById("quizFeedback");
const quizNextButton = document.getElementById("quizNextButton");
const comparePanel = document.getElementById("comparePanel");
const compareSummary = document.getElementById("compareSummary");
const compareCards = document.getElementById("compareCards");
const clearCompareButton = document.getElementById("clearCompareButton");
const loadMoreStatus = document.getElementById("loadMoreStatus");
const scrollSentinel = document.getElementById("scrollSentinel");
const catModal = document.getElementById("catModal");
const closeModalButton = document.getElementById("closeModalButton");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");
const modalOrigin = document.getElementById("modalOrigin");
const modalLifeSpan = document.getElementById("modalLifeSpan");
const modalTemperament = document.getElementById("modalTemperament");
const modalIntelligence = document.getElementById("modalIntelligence");
const modalDogFriendly = document.getElementById("modalDogFriendly");
const modalChildFriendly = document.getElementById("modalChildFriendly");
const modalWikiLink = document.getElementById("modalWikiLink");
const shareCatButton = document.getElementById("shareCatButton");

const FAVORITES_KEY = "catExplorerFavorites";
const THEME_KEY = "catExplorerTheme";
const INITIAL_BATCH_SIZE = 12;
const LOAD_MORE_BATCH_SIZE = 9;
const MAX_COMPARE_SELECTION = 3;
const THEMES = ["sunset", "ocean", "forest", "midnight"];
const CAT_HOVER_SVGS = [
  "/cat-svgs/browncat.svg",
  "/cat-svgs/darkgraycat.svg",
  "/cat-svgs/graycat.svg",
  "/cat-svgs/tabbycat.svg",
  "/cat-svgs/whitecat.svg"
];

let allCats = [];
let searchedCats = [];
let favoriteIds = new Set(loadFavoriteIds());
let showFavoritesOnly = false;
let activeSearchRequestId = 0;
let searchDebounceTimer;
let isLoadingCats = false;
let observer;
let compareModeEnabled = false;
let comparedIds = new Set();
let quizRound = null;
let quizScoreValue = 0;
let quizTotalValue = 0;
let activeModalCat = null;
let dailyCat = null;

function shuffleArray(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getHoverSvgForCat(catId) {
  const safeId = String(catId || "cat");
  const seed = [...safeId].reduce((accumulator, char) => accumulator + char.charCodeAt(0), 0);
  return CAT_HOVER_SVGS[seed % CAT_HOVER_SVGS.length];
}

function applyTheme(themeName, persist = true) {
  const safeTheme = THEMES.includes(themeName) ? themeName : "sunset";
  document.body.dataset.theme = safeTheme;
  themeSelect.value = safeTheme;

  if (persist) {
    localStorage.setItem(THEME_KEY, safeTheme);
  }
}

function initializeTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "sunset";
  applyTheme(savedTheme, false);
}

function loadFavoriteIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavoriteIds() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favoriteIds]));
}

function toggleFavorite(catId) {
  if (favoriteIds.has(catId)) {
    favoriteIds.delete(catId);
  } else {
    favoriteIds.add(catId);
  }

  saveFavoriteIds();
  renderFromState();
}

function updateFavoritesToggleLabel() {
  favoritesToggle.textContent = `Show Favorites Only: ${showFavoritesOnly ? "On" : "Off"}`;
  favoritesToggle.classList.toggle("active", showFavoritesOnly);
}

function updateCompareModeLabel() {
  compareModeToggle.textContent = `Compare Mode: ${compareModeEnabled ? "On" : "Off"}`;
  compareModeToggle.classList.toggle("active", compareModeEnabled);
}

function getLifeSpanStart(lifeSpan) {
  const firstPart = String(lifeSpan || "").split("-")[0].trim();
  const parsed = Number.parseInt(firstPart, 10);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function buildOriginFilterOptions(cats) {
  const origins = [...new Set(cats.map((cat) => cat.origin).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );

  const selectedOrigin = originFilter.value || "all";
  originFilter.innerHTML = '<option value="all">All origins</option>';

  origins.forEach((origin) => {
    const option = document.createElement("option");
    option.value = origin;
    option.textContent = origin;
    originFilter.appendChild(option);
  });

  originFilter.value = origins.includes(selectedOrigin) ? selectedOrigin : "all";
}

function getVisibleCats() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedOrigin = originFilter.value;
  const selectedSort = sortSelect.value;

  const sourceCats = query ? searchedCats : allCats;
  let cats = [...sourceCats];

  if (query && searchedCats.length === 0) {
    cats = cats.filter((cat) => cat.name.toLowerCase().includes(query));
  }

  if (selectedOrigin && selectedOrigin !== "all") {
    cats = cats.filter((cat) => cat.origin === selectedOrigin);
  }

  if (showFavoritesOnly) {
    cats = cats.filter((cat) => favoriteIds.has(cat.id));
  }

  if (selectedSort === "name-asc") {
    cats.sort((a, b) => a.name.localeCompare(b.name));
  } else if (selectedSort === "life-asc") {
    cats.sort((a, b) => getLifeSpanStart(a.lifeSpan) - getLifeSpanStart(b.lifeSpan));
  } else if (selectedSort === "intelligence-desc") {
    cats.sort((a, b) => Number(b.intelligence || 0) - Number(a.intelligence || 0));
  }

  return cats;
}

function getCatsLookup() {
  const lookup = new Map();
  allCats.forEach((cat) => lookup.set(cat.id, cat));
  searchedCats.forEach((cat) => lookup.set(cat.id, cat));
  return lookup;
}

function getComparedCats() {
  const lookup = getCatsLookup();
  return [...comparedIds].map((id) => lookup.get(id)).filter(Boolean);
}

function getQuizPool() {
  const lookup = getCatsLookup();
  return [...lookup.values()].filter((cat) => cat.name && cat.imageUrl);
}

function renderQuizScore() {
  quizScore.textContent = `Score: ${quizScoreValue}/${quizTotalValue}`;
}

function formatDailyDate(dateKey) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function renderDailyCat() {
  if (!dailyCat) {
    dailyCatDate.textContent = "Unavailable";
    dailyCatName.textContent = "Daily cat could not be loaded";
    dailyCatDescription.textContent = "Try reloading in a moment.";
    dailyCatOrigin.textContent = "-";
    dailyCatLifeSpan.textContent = "-";
    dailyCatImage.removeAttribute("src");
    dailyCatImage.alt = "Daily cat unavailable";
    dailyCatDetailsButton.disabled = true;
    return;
  }

  dailyCatDate.textContent = formatDailyDate(dailyCat.date);
  dailyCatName.textContent = dailyCat.cat.name;
  dailyCatDescription.textContent = dailyCat.cat.description;
  dailyCatOrigin.textContent = dailyCat.cat.origin;
  dailyCatLifeSpan.textContent = `${dailyCat.cat.lifeSpan} years`;
  dailyCatImage.src = dailyCat.cat.imageUrl;
  dailyCatImage.alt = `Daily cat: ${dailyCat.cat.name}`;
  dailyCatDetailsButton.disabled = false;
}

async function loadDailyCat() {
  try {
    const response = await fetch("/api/daily-cat");
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const payload = await response.json();
    dailyCat = payload?.cat ? payload : null;
  } catch (error) {
    console.error(error);
    dailyCat = null;
  }

  renderDailyCat();
}

function renderQuizRound() {
  renderQuizScore();

  if (!quizRound) {
    quizPrompt.textContent = "Press Start Quiz to begin.";
    quizFeedback.textContent = "";
    quizImage.classList.add("hidden");
    quizOptions.innerHTML = "";
    quizNextButton.textContent = "Start Quiz";
    return;
  }

  quizPrompt.textContent = "Which breed is this cat?";
  quizImage.src = quizRound.cat.imageUrl;
  quizImage.alt = "Guess the cat breed";
  quizImage.classList.remove("hidden");
  quizOptions.innerHTML = "";
  quizNextButton.textContent = quizRound.answered ? "Next Question" : "Skip";

  quizRound.options.forEach((option) => {
    const button = document.createElement("button");
    button.className = "quiz-option";
    button.type = "button";
    button.textContent = option;
    button.disabled = quizRound.answered;

    if (quizRound.answered) {
      if (option === quizRound.cat.name) {
        button.classList.add("correct");
      } else if (option === quizRound.selectedAnswer) {
        button.classList.add("wrong");
      }
    }

    button.addEventListener("click", () => answerQuiz(option));
    quizOptions.appendChild(button);
  });
}

function nextQuizRound() {
  const pool = getQuizPool();
  const uniqueNames = [...new Set(pool.map((cat) => cat.name))];

  if (uniqueNames.length < 4) {
    quizRound = null;
    quizPrompt.textContent = "Need at least 4 unique breeds loaded for quiz. Scroll to load more cats.";
    quizFeedback.textContent = "";
    quizImage.classList.add("hidden");
    quizOptions.innerHTML = "";
    quizNextButton.textContent = "Try Again";
    renderQuizScore();
    return;
  }

  const chosenCat = shuffleArray(pool)[0];
  const wrongOptions = shuffleArray(uniqueNames.filter((name) => name !== chosenCat.name)).slice(0, 3);

  quizRound = {
    cat: chosenCat,
    options: shuffleArray([chosenCat.name, ...wrongOptions]),
    answered: false,
    selectedAnswer: ""
  };

  quizFeedback.textContent = "";
  renderQuizRound();
}

function answerQuiz(selectedName) {
  if (!quizRound || quizRound.answered) {
    return;
  }

  quizRound.answered = true;
  quizRound.selectedAnswer = selectedName;
  quizTotalValue += 1;

  if (selectedName === quizRound.cat.name) {
    quizScoreValue += 1;
    quizFeedback.textContent = "Correct! Nice guess.";
  } else {
    quizFeedback.textContent = `Not quite. Correct answer: ${quizRound.cat.name}.`;
  }

  renderQuizRound();
}

function handleQuizNext() {
  nextQuizRound();
}

function sanitizeComparedIds() {
  const lookup = getCatsLookup();
  let changed = false;

  for (const id of [...comparedIds]) {
    if (!lookup.has(id)) {
      comparedIds.delete(id);
      changed = true;
    }
  }

  return changed;
}

function renderComparePanel() {
  if (!compareModeEnabled) {
    comparePanel.classList.add("hidden");
    return;
  }

  comparePanel.classList.remove("hidden");
  const comparedCats = getComparedCats();

  if (comparedCats.length < 2) {
    compareSummary.textContent = `Select ${2 - comparedCats.length} more cat${
      comparedCats.length === 0 ? "s" : ""
    } to compare (max ${MAX_COMPARE_SELECTION}).`;
    compareCards.innerHTML = "";
    return;
  }

  compareSummary.textContent = `Comparing ${comparedCats.length} breeds side-by-side.`;
  compareCards.innerHTML = "";

  comparedCats.forEach((cat) => {
    const card = document.createElement("article");
    card.className = "compare-card";
    card.innerHTML = `
      <h3>${cat.name}</h3>
      <p class="compare-row"><strong>Origin:</strong> ${cat.origin}</p>
      <p class="compare-row"><strong>Life span:</strong> ${cat.lifeSpan} years</p>
      <p class="compare-row"><strong>Intelligence:</strong> ${cat.intelligence}/5</p>
      <p class="compare-row"><strong>Dog friendly:</strong> ${cat.dogFriendly}/5</p>
      <p class="compare-row"><strong>Child friendly:</strong> ${cat.childFriendly}/5</p>
      <p class="compare-row"><strong>Temperament:</strong> ${cat.temperament}</p>
    `;
    compareCards.appendChild(card);
  });
}

function toggleCompareSelection(catId) {
  if (comparedIds.has(catId)) {
    comparedIds.delete(catId);
  } else {
    if (comparedIds.size >= MAX_COMPARE_SELECTION) {
      compareSummary.textContent = `You can compare up to ${MAX_COMPARE_SELECTION} cats. Deselect one first.`;
      return;
    }
    comparedIds.add(catId);
  }

  renderFromState();
}

function updateLoadMoreStatus() {
  const hasQuery = searchInput.value.trim().length > 0;
  const shouldAutoLoad = !hasQuery && !showFavoritesOnly;

  if (isLoadingCats && shouldAutoLoad) {
    loadMoreStatus.textContent = "Loading more cats...";
    return;
  }

  if (hasQuery) {
    loadMoreStatus.textContent = "Infinite scroll pauses while searching breeds.";
    return;
  }

  if (showFavoritesOnly) {
    loadMoreStatus.textContent = "Showing favorites only.";
    return;
  }

  loadMoreStatus.textContent = "Scroll down to load more cats.";
}

function renderCards(cats) {
  cardsElement.innerHTML = "";

  if (cats.length === 0) {
    const hasQuery = searchInput.value.trim().length > 0;
    statusElement.textContent = hasQuery
      ? "No breeds found for that search."
      : "No cats match your current filters.";
    return;
  }

  const favoriteCount = favoriteIds.size;
  statusElement.textContent = `Showing ${cats.length} cats. Favorites saved: ${favoriteCount}.`;

  cats.forEach((cat, index) => {
    const article = document.createElement("article");
    article.className = "card";
    article.tabIndex = 0;
    article.role = "button";
    article.setAttribute("aria-label", `Open details for ${cat.name}`);
    article.style.animationDelay = `${index * 70}ms`;

    const isFavorite = favoriteIds.has(cat.id);
    const isCompared = comparedIds.has(cat.id);
    const hoverSvg = getHoverSvgForCat(cat.id);

    article.innerHTML = `
      <div class="card-media">
        <img src="${cat.imageUrl}" alt="Photo of ${cat.name}" loading="lazy" />
        <button class="compare-btn ${isCompared ? "active" : ""} ${compareModeEnabled ? "" : "hidden"}" type="button" aria-label="${
      isCompared ? "Remove from compare" : "Add to compare"
    }">${isCompared ? "Cmp" : "+Cmp"}</button>
        <button class="favorite-btn ${isFavorite ? "active" : ""}" type="button" aria-label="${
      isFavorite ? "Remove from favorites" : "Add to favorites"
    }">${isFavorite ? "♥" : "♡"}</button>
      </div>
      <div class="card-content">
        <h2>${cat.name}</h2>
        <div class="meta"><strong>Origin:</strong> ${cat.origin}</div>
        <div class="meta"><strong>Life span:</strong> ${cat.lifeSpan} years</div>
        <div class="meta"><strong>Temperament:</strong> ${cat.temperament}</div>
        <p class="desc">${cat.description}</p>
      </div>
    `;

    article.classList.toggle("compare-selected", isCompared);

    const image = article.querySelector("img");
    const originalSrc = cat.imageUrl;

    image.addEventListener("mouseenter", () => {
      image.src = hoverSvg;
    });

    image.addEventListener("mouseleave", () => {
      image.src = originalSrc;
    });

    const compareButton = article.querySelector(".compare-btn");
    compareButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleCompareSelection(cat.id);
    });

    const favoriteButton = article.querySelector(".favorite-btn");
    favoriteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleFavorite(cat.id);
    });

    article.addEventListener("click", () => {
      if (compareModeEnabled) {
        toggleCompareSelection(cat.id);
        return;
      }

      openModal(cat);
    });
    article.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (compareModeEnabled) {
          toggleCompareSelection(cat.id);
          return;
        }

        openModal(cat);
      }
    });

    cardsElement.appendChild(article);
  });
}

function renderFromState() {
  sanitizeComparedIds();
  updateFavoritesToggleLabel();
  updateCompareModeLabel();
  renderCards(getVisibleCats());
  renderComparePanel();
  updateLoadMoreStatus();
  renderQuizRound();
}

async function searchBreedsAcrossApi() {
  const query = searchInput.value.trim();
  if (!query) {
    searchedCats = [];
    buildOriginFilterOptions(allCats);
    renderFromState();
    return;
  }

  const requestId = ++activeSearchRequestId;
  statusElement.textContent = "Searching all breeds...";

  try {
    const response = await fetch(`/api/breeds/search?query=${encodeURIComponent(query)}&limit=30`);
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const results = await response.json();
    if (requestId !== activeSearchRequestId) {
      return;
    }

    searchedCats = Array.isArray(results) ? results : [];
    buildOriginFilterOptions(searchInput.value.trim() ? searchedCats : allCats);
    renderFromState();
  } catch (error) {
    if (requestId !== activeSearchRequestId) {
      return;
    }

    searchedCats = [];
    buildOriginFilterOptions(allCats);
    statusElement.textContent = "Search failed. Showing loaded cats only.";
    renderFromState();
    console.error(error);
  }
}

function handleSearchInput() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(searchBreedsAcrossApi, 250);
}

async function appendRandomCats(limit) {
  if (isLoadingCats) {
    return;
  }

  isLoadingCats = true;
  updateLoadMoreStatus();

  try {
    const response = await fetch(`/api/cats?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const cats = await response.json();
    if (!Array.isArray(cats) || cats.length === 0) {
      return;
    }

    const mergedById = new Map(allCats.map((cat) => [cat.id, cat]));
    cats.forEach((cat) => mergedById.set(cat.id, cat));
    allCats = [...mergedById.values()];

    buildOriginFilterOptions(searchInput.value.trim() ? searchedCats : allCats);
    renderFromState();
  } catch (error) {
    console.error(error);
    loadMoreStatus.textContent = "Could not load more cats right now.";
  } finally {
    isLoadingCats = false;
    updateLoadMoreStatus();
  }
}

function setupInfiniteScroll() {
  observer = new IntersectionObserver(
    (entries) => {
      const firstEntry = entries[0];
      if (!firstEntry?.isIntersecting) {
        return;
      }

      const hasQuery = searchInput.value.trim().length > 0;
      if (hasQuery || showFavoritesOnly) {
        return;
      }

      appendRandomCats(LOAD_MORE_BATCH_SIZE);
    },
    {
      root: null,
      rootMargin: "220px 0px",
      threshold: 0
    }
  );

  observer.observe(scrollSentinel);
}

function openModal(cat) {
  activeModalCat = cat;
  modalImage.src = cat.imageUrl;
  modalImage.alt = `Photo of ${cat.name}`;
  modalTitle.textContent = cat.name;
  modalDescription.textContent = cat.description;
  modalOrigin.textContent = cat.origin;
  modalLifeSpan.textContent = `${cat.lifeSpan} years`;
  modalTemperament.textContent = cat.temperament;
  modalIntelligence.textContent = String(cat.intelligence);
  modalDogFriendly.textContent = `${cat.dogFriendly}/5`;
  modalChildFriendly.textContent = `${cat.childFriendly}/5`;

  if (cat.wikipediaUrl) {
    modalWikiLink.classList.remove("hidden");
    modalWikiLink.href = cat.wikipediaUrl;
  } else {
    modalWikiLink.classList.add("hidden");
    modalWikiLink.removeAttribute("href");
  }

  catModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  catModal.classList.add("hidden");
  document.body.style.overflow = "";
}

async function shareActiveCat() {
  if (!activeModalCat) {
    return;
  }

  const shareText = `${activeModalCat.name} cat breed from Cat Explorer`;
  const shareUrl = activeModalCat.wikipediaUrl || activeModalCat.imageUrl || window.location.href;

  try {
    if (navigator.share) {
      await navigator.share({
        title: activeModalCat.name,
        text: shareText,
        url: shareUrl
      });
      shareCatButton.textContent = "Shared";
      setTimeout(() => {
        shareCatButton.textContent = "Share This Cat";
      }, 1400);
      return;
    }

    await navigator.clipboard.writeText(`${shareText} - ${shareUrl}`);
    shareCatButton.textContent = "Copied Link";
    setTimeout(() => {
      shareCatButton.textContent = "Share This Cat";
    }, 1400);
  } catch {
    shareCatButton.textContent = "Share Failed";
    setTimeout(() => {
      shareCatButton.textContent = "Share This Cat";
    }, 1400);
  }
}

async function loadCats() {
  statusElement.textContent = "Loading cats...";
  cardsElement.innerHTML = "";
  allCats = [];
  searchedCats = [];
  searchInput.value = "";
  sortSelect.value = "random";
  showFavoritesOnly = false;
  compareModeEnabled = false;
  comparedIds = new Set();
  quizRound = null;
  quizScoreValue = 0;
  quizTotalValue = 0;
  reloadButton.disabled = true;

  try {
    await loadDailyCat();
    await appendRandomCats(INITIAL_BATCH_SIZE);
    if (allCats.length === 0) {
      statusElement.textContent = "No cats were returned by the API.";
    }
  } catch (error) {
    statusElement.textContent = "Could not load cats. Please try again.";
    console.error(error);
  } finally {
    reloadButton.disabled = false;
  }
}

reloadButton.addEventListener("click", loadCats);
searchInput.addEventListener("input", handleSearchInput);
originFilter.addEventListener("change", renderFromState);
sortSelect.addEventListener("change", renderFromState);
themeSelect.addEventListener("change", () => applyTheme(themeSelect.value));
compareModeToggle.addEventListener("click", () => {
  compareModeEnabled = !compareModeEnabled;
  renderFromState();
});
clearCompareButton.addEventListener("click", () => {
  comparedIds.clear();
  renderFromState();
});
quizNextButton.addEventListener("click", handleQuizNext);
dailyCatDetailsButton.addEventListener("click", () => {
  if (!dailyCat?.cat) {
    return;
  }

  openModal(dailyCat.cat);
});
shareCatButton.addEventListener("click", shareActiveCat);
favoritesToggle.addEventListener("click", () => {
  showFavoritesOnly = !showFavoritesOnly;
  renderFromState();
});
closeModalButton.addEventListener("click", closeModal);

catModal.addEventListener("click", (event) => {
  if (event.target === catModal) {
    closeModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !catModal.classList.contains("hidden")) {
    closeModal();
  }
});

setupInfiniteScroll();
initializeTheme();
loadCats();
