const ACHIEVEMENT_STORAGE_KEY = "classic-plumber-run-achievements";
const HIGH_SCORES_STORAGE_KEY = "classic-plumber-run-high-scores";
const SKIN_STORAGE_KEY = "classic-plumber-run-skins";
const SELECTED_SKIN_STORAGE_KEY = "classic-plumber-run-selected-skin";

const SKINS = [
  {
    id: "classic",
    title: "Classic",
    unlockText: "Default",
    previewClass: "skin-preview-classic"
  },
  {
    id: "fire",
    title: "Fire",
    unlockText: "Unlock: Reach 3000 points in any recorded run",
    previewClass: "skin-preview-fire"
  },
  {
    id: "forest",
    title: "Forest",
    unlockText: "Unlock: Earn the Block Inspector achievement",
    previewClass: "skin-preview-forest"
  },
  {
    id: "midnight",
    title: "Midnight",
    unlockText: "Unlock: Earn the Long Haul achievement",
    previewClass: "skin-preview-midnight"
  }
];

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures so browsing still works.
  }
}

function loadSelectedSkin() {
  try {
    return localStorage.getItem(SELECTED_SKIN_STORAGE_KEY) || "classic";
  } catch {
    return "classic";
  }
}

function saveSelectedSkin(skinId) {
  try {
    localStorage.setItem(SELECTED_SKIN_STORAGE_KEY, skinId);
  } catch {
    // Ignore storage failures so browsing still works.
  }
}

function hasHighScoreAtLeast(highScores, points) {
  return highScores.some((entry) => Number.isFinite(entry.score) && entry.score >= points);
}

function isSkinUnlockMet(skinId, achievements, highScores) {
  switch (skinId) {
    case "classic":
      return true;
    case "fire":
      return hasHighScoreAtLeast(highScores, 3000);
    case "forest":
      return !!achievements.question_hunter;
    case "midnight":
      return !!achievements.infinite_5000;
    default:
      return false;
  }
}

function syncUnlockedSkins(unlockedSkins, achievements, highScores) {
  const next = { ...unlockedSkins, classic: true };
  for (const skin of SKINS) {
    if (next[skin.id]) {
      continue;
    }
    if (isSkinUnlockMet(skin.id, achievements, highScores)) {
      next[skin.id] = true;
    }
  }
  return next;
}

function renderSkins() {
  const summary = document.getElementById("skinsSummary");
  const list = document.getElementById("skinsList");

  const achievements = loadJson(ACHIEVEMENT_STORAGE_KEY, {});
  const highScores = loadJson(HIGH_SCORES_STORAGE_KEY, []);
  const unlockedSkins = syncUnlockedSkins(loadJson(SKIN_STORAGE_KEY, { classic: true }), achievements, highScores);
  const selectedSkinId = loadSelectedSkin();

  saveJson(SKIN_STORAGE_KEY, unlockedSkins);
  if (!unlockedSkins[selectedSkinId]) {
    saveSelectedSkin("classic");
  }

  const activeSkin = unlockedSkins[selectedSkinId] ? selectedSkinId : "classic";
  const unlockedCount = SKINS.filter((skin) => unlockedSkins[skin.id]).length;

  summary.textContent = `${unlockedCount} / ${SKINS.length} unlocked`;
  list.replaceChildren();

  for (const skin of SKINS) {
    const unlocked = !!unlockedSkins[skin.id];
    const isActive = activeSkin === skin.id;

    const item = document.createElement("article");
    item.className = "skin-card";
    if (!unlocked) {
      item.classList.add("locked");
    }

    const preview = document.createElement("div");
    preview.className = `skin-preview ${skin.previewClass}`;

    const heading = document.createElement("h3");
    heading.textContent = unlocked ? skin.title : `${skin.title} (Locked)`;

    const details = document.createElement("p");
    details.textContent = unlocked ? "Unlocked and ready to equip." : skin.unlockText;

    const action = document.createElement("button");
    action.type = "button";

    if (!unlocked) {
      action.textContent = "Locked";
      action.disabled = true;
      action.classList.add("skin-equip", "locked");
    } else if (isActive) {
      action.textContent = "Equipped";
      action.disabled = true;
      action.classList.add("skin-equip", "equipped");
    } else {
      action.textContent = "Equip";
      action.classList.add("skin-equip");
      action.addEventListener("click", () => {
        saveSelectedSkin(skin.id);
        renderSkins();
      });
    }

    item.append(preview, heading, details, action);
    list.append(item);
  }
}

renderSkins();
