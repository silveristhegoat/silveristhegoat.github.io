// Handles user name and progress persistence for Road Pulse
(function() {
  // DOM elements
  const namePromptHtml = `
    <div id="namePromptModal" class="modal-overlay">
      <div class="modal-content">
        <h2>Enter Your Name</h2>
        <input id="playerNameInput" type="text" maxlength="16" placeholder="Your name" autofocus />
        <button id="saveNameBtn" class="action action-primary">Save</button>
      </div>
    </div>
  `;

  // Insert modal into body
  function showNamePrompt() {
    if (document.getElementById('namePromptModal')) return;
    if (typeof window.pauseGameForName === 'function') window.pauseGameForName();
    document.body.insertAdjacentHTML('beforeend', namePromptHtml);
    document.getElementById('saveNameBtn').onclick = saveName;
    document.getElementById('playerNameInput').onkeydown = function(e) {
      if (e.key === 'Enter') saveName();
    };
  }

  function hideNamePrompt() {
    const modal = document.getElementById('namePromptModal');
    if (modal) modal.remove();
    if (typeof window.resumeGameAfterName === 'function') window.resumeGameAfterName();
  }

  function saveName() {
    const input = document.getElementById('playerNameInput');
    const name = input.value.trim().slice(0, 16);
    if (name) {
      localStorage.setItem('roadPulsePlayerName', name);
      window.playerName = name;
      hideNamePrompt();
      saveProgress();
      updateNameDisplay();
    } else {
      input.focus();
    }
  }

  function updateNameDisplay() {
    let el = document.getElementById('playerNameDisplay');
    if (!el) {
      const h1 = document.querySelector('h1');
      el = document.createElement('div');
      el.id = 'playerNameDisplay';
      el.style.fontSize = '1.1rem';
      el.style.color = 'var(--accent)';
      el.style.marginBottom = '8px';
      h1.insertAdjacentElement('afterend', el);
    }
    el.textContent = `Player: ${window.playerName || ''}`;
  }

  function saveProgress() {
    if (!window.playerName) return;
    const progress = {
      best: window.state?.best || 0,
      completedLevel: window.state?.completedLevel || 0,
      selectedStartLevel: window.state?.completedLevel || 1
    };
    localStorage.setItem('roadPulseProgress_' + window.playerName, JSON.stringify(progress));
  }

  function loadProgress() {
    if (!window.playerName) return;
    const raw = localStorage.getItem('roadPulseProgress_' + window.playerName);
    if (raw) {
      try {
        const progress = JSON.parse(raw);
        if (window.state) {
          window.state.best = progress.best || 0;
          window.state.completedLevel = progress.completedLevel || 0;
          window.state.selectedStartLevel = progress.selectedStartLevel || 1;
        }
      } catch {}
    }
  }

  // --- RECORDS LOGIC ---
  function saveRecord(score) {
    if (!window.playerName) return;
    let records = JSON.parse(localStorage.getItem('roadPulseRecords') || '{}');
    if (!records[window.playerName] || score > records[window.playerName]) {
      records[window.playerName] = score;
      localStorage.setItem('roadPulseRecords', JSON.stringify(records));
    }
  }

  function getRecords() {
    return JSON.parse(localStorage.getItem('roadPulseRecords') || '{}');
  }

  // Show records in UI (below player name)
  function showRecords() {
    let el = document.getElementById('playerRecordsDisplay');
    if (!el) {
      const nameEl = document.getElementById('playerNameDisplay');
      el = document.createElement('div');
      el.id = 'playerRecordsDisplay';
      el.style.fontSize = '1.05rem';
      el.style.color = '#ffd166';
      el.style.marginBottom = '10px';
      nameEl.insertAdjacentElement('afterend', el);
    }
    const records = getRecords();
    let html = '<b>Records:</b><br>';
    for (const [name, score] of Object.entries(records)) {
      html += `${name}: ${score}<br>`;
    }
    el.innerHTML = html;
  }

  // Save record on progress save
  const origSaveProgress = saveProgress;
  function saveProgressWithRecord() {
    origSaveProgress();
    saveRecord(window.state?.best || 0);
    showRecords();
  }
  window.saveProgress = saveProgressWithRecord;

  // On load
  window.addEventListener('DOMContentLoaded', function() {
    // Remove any cached player name
    localStorage.removeItem('roadPulsePlayerName');
    showNamePrompt();
    showRecords();
  });

  // Save progress on tab close or reload
  window.addEventListener('beforeunload', function() {
    if (window.saveProgress) window.saveProgress();
  });
})();
