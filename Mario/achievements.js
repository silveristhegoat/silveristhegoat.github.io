const ACHIEVEMENT_STORAGE_KEY = "classic-plumber-run-achievements";

const ACHIEVEMENTS = [
  {
    id: "zero_score_classic",
    title: "Blank Slate",
    description: "Reach the classic flag before earning any points."
  },
  {
    id: "no_coin_classic",
    title: "Coinless",
    description: "Finish classic mode without collecting a coin."
  },
  {
    id: "combo_triple",
    title: "Chain Reaction",
    description: "Reach combo x3 in a single run."
  },
  {
    id: "question_hunter",
    title: "Block Inspector",
    description: "Hit 5 question blocks in one run."
  },
  {
    id: "infinite_5000",
    title: "Long Haul",
    description: "Score 5000 points in Infinite mode."
  }
];

function loadAchievements() {
  try {
    const raw = localStorage.getItem(ACHIEVEMENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function renderAchievements() {
  const summary = document.getElementById("achievementSummary");
  const list = document.getElementById("achievementsList");
  const unlocked = loadAchievements();
  const unlockedCount = ACHIEVEMENTS.filter((achievement) => unlocked[achievement.id]).length;

  summary.textContent = `${unlockedCount} / ${ACHIEVEMENTS.length} unlocked`;
  list.replaceChildren();

  for (const achievement of ACHIEVEMENTS) {
    const item = document.createElement("li");
    if (unlocked[achievement.id]) {
      item.classList.add("unlocked");
    }

    const title = document.createElement("strong");
    title.className = "achievement-title";
    title.textContent = achievement.title;

    const copy = document.createElement("span");
    copy.className = "achievement-copy";
    copy.textContent = achievement.description;

    const state = document.createElement("span");
    state.className = "achievement-state";
    state.textContent = unlocked[achievement.id] ? "Unlocked" : "Locked";

    item.append(title, copy, state);
    list.append(item);
  }
}

renderAchievements();