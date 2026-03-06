// State
let income = 0;
let expenses = [];
let hoveredIndex = -1;
let editingId = null; // Track which expense is being edited
const colors = ["#6c5ce7", "#ff7675", "#55efc4", "#fab1a0", "#fdcb6e", "#00cec9", "#a29bfe"];

// DOM Elements
const incomeInput = document.getElementById('income');
const expenseName = document.getElementById('expense-name');
const expenseAmount = document.getElementById('expense-amount');
const addExpenseBtn = document.getElementById('add-expense-btn');
const expenseList = document.getElementById('expense-list');
const totalExpensesEl = document.getElementById('total-expenses');
const remainingBalanceEl = document.getElementById('remaining-balance');
const warningBanner = document.getElementById('warning-banner');
const canvas = document.getElementById('budgetChart');
const ctx = canvas.getContext('2d');
const legendEl = document.getElementById('chart-legend');
const cards = document.querySelectorAll('.card');
const tooltip = document.getElementById('tooltip');
const themeToggle = document.getElementById('theme-toggle');

// Theme Logic
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
}

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    // Redraw chart to update colors/backgrounds
    drawChart(expenses.reduce((acc, curr) => acc + curr.amount, 0));
});

// Event Listeners
incomeInput.addEventListener('input', (e) => {
    income = parseFloat(e.target.value) || 0;
    updateUI();
});

addExpenseBtn.addEventListener('click', () => {
    const name = expenseName.value.trim();
    const amount = parseFloat(expenseAmount.value);

    if (name && amount > 0) {
        const id = Date.now();
        expenses.push({ id, name, amount, color: colors[expenses.length % colors.length] });
        expenseName.value = '';
        expenseAmount.value = '';
        
        triggerPulse();
        animationProgress = 0;
        updateUI();
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - canvas.width / 2;
    const y = e.clientY - rect.top - canvas.height / 2;
    const distance = Math.sqrt(x * x + y * y);
    const radius = 150;
    const innerRadius = 100;

    if (distance > innerRadius && distance < radius && expenses.length > 0) {
        let angle = Math.atan2(y, x);
        if (angle < -0.5 * Math.PI) angle += 2 * Math.PI;
        const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
        let currentAngle = -0.5 * Math.PI;
        let found = -1;
        expenses.forEach((exp, index) => {
            const sliceAngle = (exp.amount / totalSpent) * (2 * Math.PI);
            if (angle >= currentAngle && angle < currentAngle + sliceAngle) found = index;
            currentAngle += sliceAngle;
        });
        if (found !== -1) {
            const exp = expenses[found];
            const percent = ((exp.amount / totalSpent) * 100).toFixed(1);
            tooltip.classList.remove('hidden');
            tooltip.style.left = `${e.clientX + 15}px`;
            tooltip.style.top = `${e.clientY + 15}px`;
            tooltip.innerHTML = `<span style="color:${exp.color}">${exp.name}</span>: <span>${percent}%</span>`;
            if (hoveredIndex !== found) { hoveredIndex = found; drawChart(totalSpent); }
        }
    } else {
        hideTooltip();
        if (hoveredIndex !== -1) { hoveredIndex = -1; drawChart(expenses.reduce((acc, curr) => acc + curr.amount, 0)); }
    }
});

function hideTooltip() { tooltip.classList.add('hidden'); }
canvas.addEventListener('mouseleave', () => { hideTooltip(); hoveredIndex = -1; drawChart(expenses.reduce((acc, curr) => acc + curr.amount, 0)); });

function triggerPulse() {
    cards.forEach(card => {
        card.classList.remove('pulse');
        void card.offsetWidth;
        card.classList.add('pulse');
    });
}

function deleteExpense(id) {
    expenses = expenses.filter(exp => exp.id !== id);
    animationProgress = 0;
    hoveredIndex = -1;
    hideTooltip();
    updateUI();
}

// Inline Editing Logic
function startEdit(id) {
    editingId = id;
    renderList();
}

function cancelEdit() {
    editingId = null;
    renderList();
}

function saveEdit(id) {
    const nameInput = document.getElementById(`edit-name-${id}`);
    const amountInput = document.getElementById(`edit-amount-${id}`);
    const newName = nameInput.value.trim();
    const newAmount = parseFloat(amountInput.value);

    if (newName && !isNaN(newAmount) && newAmount >= 0) {
        const exp = expenses.find(e => e.id === id);
        if (exp) {
            exp.name = newName;
            exp.amount = newAmount;
            editingId = null;
            animationProgress = 0;
            updateUI();
        }
    }
}

function updateUI() {
    const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const balance = income - totalSpent;
    totalExpensesEl.textContent = `$${totalSpent.toLocaleString()}`;
    remainingBalanceEl.textContent = `$${balance.toLocaleString()}`;
    remainingBalanceEl.style.color = balance < 0 ? 'var(--danger-color)' : 'var(--text-primary)';
    balance < 0 ? warningBanner.classList.remove('hidden') : warningBanner.classList.add('hidden');
    renderList();
    drawChart(totalSpent);
    renderLegend();
}

function renderList() {
    expenseList.innerHTML = '';
    expenses.slice().reverse().forEach((exp, index) => {
        const li = document.createElement('li');
        li.style.animation = `fadeIn 0.3s ease ${index * 0.05}s forwards`;
        li.style.opacity = '0';

        if (editingId === exp.id) {
            // Edit Mode
            li.innerHTML = `
                <div class="expense-info">
                    <input type="text" id="edit-name-${exp.id}" class="edit-input name-input" value="${exp.name}">
                    <input type="number" id="edit-amount-${exp.id}" class="edit-input" value="${exp.amount}">
                </div>
                <div class="edit-actions">
                    <button class="action-btn save-btn" onclick="saveEdit(${exp.id})">✅</button>
                    <button class="action-btn cancel-btn" onclick="cancelEdit()">❌</button>
                </div>
            `;
        } else {
            // View Mode
            li.innerHTML = `
                <div class="expense-info">
                    <span>${exp.name}</span>
                    <span class="expense-val">$${exp.amount.toLocaleString()}</span>
                </div>
                <div class="actions">
                    <button class="action-btn edit-btn" onclick="startEdit(${exp.id})">✏️</button>
                    <button class="action-btn delete-btn" onclick="deleteExpense(${exp.id})">🗑️</button>
                </div>
            `;
        }
        expenseList.appendChild(li);
    });
}

function renderLegend() {
    legendEl.innerHTML = '';
    expenses.forEach((exp, index) => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.style.animationDelay = `${index * 0.1}s`;
        item.style.opacity = hoveredIndex === index || hoveredIndex === -1 ? '1' : '0.3';
        item.innerHTML = `<div class="dot" style="background:${exp.color}"></div> ${exp.name}`;
        legendEl.appendChild(item);
    });
}

let animationProgress = 0;
function drawChart(totalSpent) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 150 * animationProgress;
    const innerRadius = 100 * animationProgress;

    if (animationProgress < 1) { animationProgress += 0.03; requestAnimationFrame(() => drawChart(totalSpent)); }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get theme colors from CSS
    const style = getComputedStyle(document.body);
    const bgColor = style.getPropertyValue('--primary-bg');
    const holeColor = style.getPropertyValue('--sidebar-bg');
    const textColor = style.getPropertyValue('--text-primary');

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.closePath();

    if (expenses.length > 0) {
        let startAngle = -0.5 * Math.PI;
        expenses.forEach((exp, index) => {
            const sliceAngle = (exp.amount / totalSpent) * (2 * Math.PI);
            const isHovered = hoveredIndex === index;
            const currentRadius = isHovered ? radius + 5 : radius;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, currentRadius, startAngle, startAngle + sliceAngle);
            ctx.fillStyle = exp.color;
            ctx.fill();
            ctx.closePath();
            startAngle += sliceAngle;
        });
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = holeColor;
    ctx.fill();
    ctx.closePath();

    ctx.textAlign = 'center';
    ctx.globalAlpha = animationProgress;
    ctx.fillStyle = textColor;
    ctx.font = 'bold 24px Segoe UI';
    ctx.fillText('BUDGET', centerX, centerY - 5);
    ctx.font = '16px Segoe UI';
    ctx.fillText('Overview', centerX, centerY + 20);
    ctx.globalAlpha = 1;
}

window.addEventListener('load', () => { animationProgress = 0; updateUI(); });

