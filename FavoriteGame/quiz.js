const questions = [
    { q: "Where does Deadlock take place?", choices: ["New York", "London", "Paris", "Washington D.C."], correct: 0 },
    { q: "How many heroes are in Deadlock?", choices: ["37", "38", "39", "40"], correct: 1 },
    { q: "Which game mechanic lets you revive yourself?", choices: ["Urn", "Creeps", "Souls", "Rejuvenator"], correct: 3 }
];

let current = 0;
let score = 0;

const questionEl = document.getElementById('question');
const answersEl = document.getElementById('answers');
const nextBtn = document.getElementById('next');
const restartBtn = document.getElementById('restart');
const scoreEl = document.getElementById('score');
const scoreValue = document.getElementById('score-value');
const totalEl = document.getElementById('total');

totalEl.textContent = questions.length;

function showQuestion() {
    const item = questions[current];
    questionEl.textContent = item.q;
    answersEl.innerHTML = '';
    item.choices.forEach((choice, i) => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        btn.textContent = choice;
        btn.dataset.index = i;
        btn.addEventListener('click', selectAnswer);
        answersEl.appendChild(btn);
    });
    nextBtn.disabled = true;
}

function selectAnswer(e) {
    const selected = Number(e.currentTarget.dataset.index);
    const correctIndex = questions[current].correct;
    // disable all buttons
    Array.from(answersEl.children).forEach(btn => btn.disabled = true);

    if (selected === correctIndex) {
        e.currentTarget.classList.add('correct');
        score++;
        scoreValue.textContent = score;
    } else {
        e.currentTarget.classList.add('wrong');
        // mark correct answer
        const correctBtn = Array.from(answersEl.children).find(b => Number(b.dataset.index) === correctIndex);
        if (correctBtn) correctBtn.classList.add('correct');
    }
    nextBtn.disabled = false;
}

nextBtn.addEventListener('click', () => {
    current++;
    if (current < questions.length) {
        showQuestion();
    } else {
        showResults();
    }
});

restartBtn.addEventListener('click', () => {
    current = 0;
    score = 0;
    scoreValue.textContent = score;
    restartBtn.hidden = true;
    scoreEl.hidden = true;
    nextBtn.hidden = false;
    showQuestion();
});

function showResults() {
    questionEl.textContent = `Quiz complete! You scored ${score} of ${questions.length}.`;
    answersEl.innerHTML = '';
    nextBtn.hidden = true;
    restartBtn.hidden = false;
    scoreEl.hidden = true;
}

// initialize
showQuestion();
scoreEl.hidden = true;
 