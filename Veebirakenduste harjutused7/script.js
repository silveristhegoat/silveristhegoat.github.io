const passwordInput = document.getElementById('password-input');
const toggleBtn = document.getElementById('toggle-pass');
const strengthBar = document.getElementById('strength-bar');
const strengthText = document.querySelector('#strength-text span');

const requirements = {
    length: document.getElementById('length'),
    case: document.getElementById('case'),
    number: document.getElementById('number'),
    symbol: document.getElementById('symbol')
};

// Toggle Visibility
toggleBtn.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    toggleBtn.textContent = type === 'password' ? 'SHOW' : 'HIDE';
});

// Main Evaluator
passwordInput.addEventListener('input', () => {
    const val = passwordInput.value;
    let score = 0;

    // 1. Length Check
    const hasLength = val.length >= 8;
    updateReq(requirements.length, hasLength);
    if (hasLength) score++;

    // 2. Case Check
    const hasCase = /[a-z]/.test(val) && /[A-Z]/.test(val);
    updateReq(requirements.case, hasCase);
    if (hasCase) score++;

    // 3. Number Check
    const hasNumber = /\d/.test(val);
    updateReq(requirements.number, hasNumber);
    if (hasNumber) score++;

    // 4. Symbol Check
    const hasSymbol = /[@$!%*?&]/.test(val);
    updateReq(requirements.symbol, hasSymbol);
    if (hasSymbol) score++;

    // Update Meter
    updateMeter(score, val.length);
});

function updateReq(el, isMet) {
    if (isMet) {
        el.classList.add('met');
        el.querySelector('.icon').textContent = '✓';
    } else {
        el.classList.remove('met');
        el.querySelector('.icon').textContent = '○';
    }
}

function updateMeter(score, length) {
    if (length === 0) {
        strengthBar.style.width = '0%';
        strengthText.textContent = 'None';
        strengthText.style.color = 'inherit';
        return;
    }

    let width = (score / 4) * 100;
    strengthBar.style.width = `${width}%`;

    if (score <= 1) {
        strengthBar.style.backgroundColor = 'var(--strength-weak)';
        strengthText.textContent = 'Weak';
        strengthText.style.color = 'var(--strength-weak)';
    } else if (score === 2) {
        strengthBar.style.backgroundColor = 'var(--strength-fair)';
        strengthText.textContent = 'Fair';
        strengthText.style.color = 'var(--strength-fair)';
    } else if (score === 3) {
        strengthBar.style.backgroundColor = 'var(--strength-good)';
        strengthText.textContent = 'Good';
        strengthText.style.color = 'var(--strength-good)';
    } else {
        strengthBar.style.backgroundColor = 'var(--strength-strong)';
        strengthText.textContent = 'Strong';
        strengthText.style.color = 'var(--strength-strong)';
    }
}
