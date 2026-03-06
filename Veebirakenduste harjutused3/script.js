const hoursInput = document.getElementById('hours-input');
const hoursYearEl = document.getElementById('hours-year');
const daysYearEl = document.getElementById('days-year');
const percentWakingEl = document.getElementById('percent-waking');

// Animation state
let animationFrameId = null;

hoursInput.addEventListener('input', (e) => {
    const dailyHours = parseFloat(e.target.value) || 0;
    
    // Calculations
    const hoursPerYear = dailyHours * 365;
    const daysPerYear = hoursPerYear / 24;
    const percentWaking = (dailyHours / 16) * 100; // Assuming 8h sleep

    updateCounters(hoursPerYear, daysPerYear, percentWaking);
});

function updateCounters(targetHours, targetDays, targetPercent) {
    const duration = 800; // ms
    const startTime = performance.now();
    
    // Get current values to start from
    const startHours = parseFloat(hoursYearEl.innerText) || 0;
    const startDays = parseFloat(daysYearEl.innerText) || 0;
    const startPercent = parseFloat(percentWakingEl.innerText) || 0;

    // Cancel previous animation if any
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (easeOutExpo)
        const ease = 1 - Math.pow(2, -10 * progress);
        
        const currentHours = startHours + (targetHours - startHours) * ease;
        const currentDays = startDays + (targetDays - startDays) * ease;
        const currentPercent = startPercent + (targetPercent - startPercent) * ease;

        hoursYearEl.innerText = Math.round(currentHours).toLocaleString();
        daysYearEl.innerText = currentDays.toFixed(1);
        percentWakingEl.innerText = currentPercent.toFixed(1);

        if (progress < 1) {
            animationFrameId = requestAnimationFrame(animate);
        }
    }

    animationFrameId = requestAnimationFrame(animate);
}

// Initial state
hoursInput.value = "";

