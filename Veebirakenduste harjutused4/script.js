const targetInput = document.getElementById('target-date');
const daysEl = document.getElementById('days');
const hoursEl = document.getElementById('hours');
const minsEl = document.getElementById('minutes');
const secsEl = document.getElementById('seconds');
const countdownGrid = document.getElementById('countdown');
const expiredMsg = document.getElementById('expired-msg');
const resetBtn = document.getElementById('reset-btn');
const timeVals = document.querySelectorAll('.time-val');

let countdownInterval = null;
const MASK = "YYYY-MM-DD HH:MM:SS";

// Reset System
resetBtn.addEventListener('click', () => {
    expiredMsg.className = 'expired-hidden';
    targetInput.value = MASK;
    targetInput.focus();
    targetInput.setSelectionRange(0, 0);
});

// Intelligent Terminal-Style "Type-Over" Input
targetInput.addEventListener('keydown', (e) => {
    const pos = targetInput.selectionStart;
    const val = targetInput.value.split("");

    // Allow navigation keys
    if (["ArrowLeft", "ArrowRight", "Tab", "Home", "End"].includes(e.key)) return;

    e.preventDefault(); // Take manual control

    if (e.key === "Backspace") {
        if (pos > 0) {
            let prevPos = pos - 1;
            // Skip separators
            while (prevPos >= 0 && (MASK[prevPos] === "-" || MASK[prevPos] === ":" || MASK[prevPos] === " ")) {
                prevPos--;
            }
            if (prevPos >= 0) {
                val[prevPos] = MASK[prevPos];
                targetInput.value = val.join("");
                targetInput.setSelectionRange(prevPos, prevPos);
            }
        }
    } else if (/\d/.test(e.key)) {
        if (pos < MASK.length) {
            let currentPos = pos;
            // Skip separators
            while (currentPos < MASK.length && (MASK[currentPos] === "-" || MASK[currentPos] === ":" || MASK[currentPos] === " ")) {
                currentPos++;
            }
            
            if (currentPos < MASK.length) {
                val[currentPos] = e.key;
                const newVal = clampDate(val.join(""));
                targetInput.value = newVal;
                targetInput.setSelectionRange(currentPos + 1, currentPos + 1);
            }
        }
    }
    
    validateAndStart();
});

// Clamp invalid segments
function clampDate(str) {
    let parts = str.split("");
    
    // Month
    if (!str.substring(5,7).includes("M")) {
        let mm = parseInt(str.substring(5, 7));
        if (mm > 12) { parts[5] = "1"; parts[6] = "2"; }
        if (mm === 0) { parts[5] = "0"; parts[6] = "1"; }
    }

    // Day (dynamic based on month/year)
    if (!str.substring(8,10).includes("D")) {
        let yyyy = parseInt(str.substring(0, 4)) || 2026;
        let mm = parseInt(str.substring(5, 7)) || 1;
        let dd = parseInt(str.substring(8, 10));
        let maxDays = new Date(yyyy, mm, 0).getDate();
        if (dd > maxDays) {
            let s = String(maxDays);
            parts[8] = s[0]; parts[9] = s[1];
        }
        if (dd === 0) { parts[8] = "0"; parts[9] = "1"; }
    }

    // Time
    if (!str.substring(11,13).includes("H")) {
        if (parseInt(str.substring(11, 13)) > 23) { parts[11] = "2"; parts[12] = "3"; }
    }
    if (!str.substring(14,16).includes("M")) {
        if (parseInt(str.substring(14, 16)) > 59) { parts[14] = "5"; parts[15] = "9"; }
    }
    if (!str.substring(17,19).includes("S")) {
        if (parseInt(str.substring(17, 19)) > 59) { parts[17] = "5"; parts[15] = "9"; }
    }

    return parts.join("");
}

function validateAndStart() {
    const val = targetInput.value;
    if (!val.match(/[YMDHS]/)) {
        const targetDate = new Date(val.replace(/ /g, "T")).getTime();
        if (!isNaN(targetDate) && targetDate > new Date().getTime()) {
            targetInput.style.borderColor = 'var(--neon-cyan)';
            startCountdown(targetDate);
        } else {
            targetInput.style.borderColor = 'var(--neon-magenta)';
        }
    }
}

function startCountdown(targetTime) {
    if (countdownInterval) clearInterval(countdownInterval);
    triggerScramble();
    countdownGrid.style.display = 'grid';
    expiredMsg.className = 'expired-hidden';

    countdownInterval = setInterval(() => {
        const now = new Date().getTime();
        const distance = targetTime - now;
        if (distance < 0) {
            clearInterval(countdownInterval);
            countdownGrid.style.display = 'none';
            expiredMsg.className = 'expired-show';
            return;
        }
        const d = Math.floor(distance / (1000 * 60 * 60 * 24));
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        updateDisplay(d, h, m, s);
    }, 1000);
}

function triggerScramble() {
    timeVals.forEach(val => {
        val.classList.add('scrambling');
        let count = 0;
        const interval = setInterval(() => {
            val.innerText = Math.floor(Math.random() * 99);
            count++;
            if (count > 10) { clearInterval(interval); val.classList.remove('scrambling'); }
        }, 40);
    });
}

function updateDisplay(d, h, m, s) {
    if (!daysEl.classList.contains('scrambling')) {
        daysEl.innerText = String(d).padStart(2, '0');
        hoursEl.innerText = String(h).padStart(2, '0');
        minsEl.innerText = String(m).padStart(2, '0');
        secsEl.innerText = String(s).padStart(2, '0');
    }
}

// Initial Setup
const tomorrow = new Date();
tomorrow.setHours(tomorrow.getHours() + 24);
const dateStr = tomorrow.getFullYear() + "-" + 
                String(tomorrow.getMonth() + 1).padStart(2, '0') + "-" + 
                String(tomorrow.getDate()).padStart(2, '0') + " " + 
                String(tomorrow.getHours()).padStart(2, '0') + ":" + 
                String(tomorrow.getMinutes()).padStart(2, '0') + ":00";

targetInput.value = dateStr;
startCountdown(new Date(dateStr).getTime());
