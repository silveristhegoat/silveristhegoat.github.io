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
    document.body.insertAdjacentHTML('beforeend', namePromptHtml);
    document.getElementById('saveNameBtn').onclick = saveName;
    document.getElementById('playerNameInput').onkeydown = function(e) {
      if (e.key === 'Enter') saveName();
    };
  }

  function hideNamePrompt() {
    const modal = document.getElementById('namePromptModal');
    if (modal) modal.remove();
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

  // Expose for game.js
  window.saveProgress = saveProgress;
  window.loadProgress = loadProgress;

  // On load
  window.addEventListener('DOMContentLoaded', function() {
    let name = localStorage.getItem('roadPulsePlayerName');
    if (!name) {
      showNamePrompt();
    } else {
      window.playerName = name;
      updateNameDisplay();
      loadProgress();
      // Set level select dropdown to last completed level if available
      if (window.state && window.state.selectedStartLevel) {
        const levelSelect = document.getElementById('levelSelect');
        if (levelSelect) {
          levelSelect.value = String(window.state.selectedStartLevel);
        }
      }
    }
  });
})();
