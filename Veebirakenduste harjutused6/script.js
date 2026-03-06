const quizData = [
    {
        name: "Ad Hominem",
        statement: "My opponent argues that we should invest more in public schools, but he was once arrested for a DUI, so we can't trust anything he says.",
        options: ["Ad Hominem", "Appeal to Authority", "False Dilemma", "Post Hoc"],
        correct: 0,
        explanation: "Ad Hominem involves attacking the person making the argument rather than the argument itself."
    },
    {
        name: "Bandwagon",
        statement: "Everyone is buying this new brand of sneakers, so they must be the highest quality ones available.",
        options: ["Ad Hominem", "Bandwagon", "Slippery Slope", "Circular Reasoning"],
        correct: 1,
        explanation: "The Bandwagon fallacy (ad populum) assumes something is true or good simply because it is popular."
    },
    {
        name: "Slippery Slope",
        statement: "If we let students use calculators in math class, they'll never learn to think for themselves, and eventually society will collapse.",
        options: ["Straw Man", "Hasty Generalization", "Slippery Slope", "Red Herring"],
        correct: 2,
        explanation: "The Slippery Slope fallacy suggests that a small first step will inevitably lead to a chain of related negative events."
    },
    {
        name: "False Dilemma",
        statement: "You're either with us, or you're with the terrorists.",
        options: ["Straw Man", "False Dilemma", "Circular Reasoning", "No True Scotsman"],
        correct: 1,
        explanation: "A False Dilemma presents only two options when more actually exist."
    },
    {
        name: "Circular Reasoning",
        statement: "The law should be obeyed because it's the law.",
        options: ["Red Herring", "Ad Hominem", "Circular Reasoning", "Bandwagon"],
        correct: 2,
        explanation: "Circular Reasoning is when the conclusion is included in the premise."
    },
    {
        name: "Hasty Generalization",
        statement: "I met two people from that city and they were both rude. Everyone there must be unfriendly.",
        options: ["Hasty Generalization", "Post Hoc", "Straw Man", "Appeal to Emotion"],
        correct: 0,
        explanation: "Hasty Generalization involves making a claim based on evidence that is just too small."
    },
    {
        name: "Straw Man",
        statement: "Senator Smith says we should cut military spending. Why does Senator Smith hate our soldiers and want our country to be defenseless?",
        options: ["Slippery Slope", "False Dilemma", "Straw Man", "Circular Reasoning"],
        correct: 2,
        explanation: "A Straw Man fallacy misrepresents an opponent's position to make it easier to attack."
    },
    {
        name: "Post Hoc",
        statement: "I wore my lucky socks today and we won the game. The socks caused the victory!",
        options: ["Post Hoc", "Ad Hominem", "Red Herring", "False Dilemma"],
        correct: 0,
        explanation: "Post Hoc Ergo Propter Hoc assumes that because one event followed another, the first caused the second."
    },
    {
        name: "Appeal to Authority",
        statement: "The CEO of that tech giant says this energy drink is the healthiest choice, so I'm going to start drinking it every day.",
        options: ["Bandwagon", "Appeal to Authority", "Slippery Slope", "Hasty Generalization"],
        correct: 1,
        explanation: "Appeal to Authority is using the opinion of an authority figure as evidence, even if they aren't an expert in the field."
    },
    {
        name: "Red Herring",
        statement: "We can't worry about climate change when there are people losing their jobs in the coal industry!",
        options: ["Red Herring", "Circular Reasoning", "False Dilemma", "Straw Man"],
        correct: 0,
        explanation: "A Red Herring is a distraction from the actual issue being discussed."
    }
];

const hardQuizData = [
    {
        name: "No True Scotsman",
        statement: "Angus says all Scotsmen love haggis. When Lachlan says he's a Scotsman and hates haggis, Angus says 'No true Scotsman hates haggis.'",
        options: ["Special Pleading", "No True Scotsman", "Moving the Goalposts", "False Equivalence"],
        correct: 1,
        explanation: "No True Scotsman is an appeal to purity as a way to dismiss relevant criticisms or flaws of an argument."
    },
    {
        name: "Texas Sharpshooter",
        statement: "The manufacturer of a sugary cereal points to a study showing that of the top 5 countries where the cereal is sold, 3 of them have high health ratings.",
        options: ["Texas Sharpshooter", "Anecdotal", "Burden of Proof", "The Fallacy Fallacy"],
        correct: 0,
        explanation: "The Texas Sharpshooter fallacy is cherry-picking data clusters to suit an argument."
    },
    {
        name: "Special Pleading",
        statement: "I know the rules say no one is allowed backstage, but I'm the lead singer's second cousin, so the rules shouldn't apply to me.",
        options: ["Genetic", "Personal Incredulity", "Special Pleading", "Tu Quoque"],
        correct: 2,
        explanation: "Special Pleading is moving the goalposts or making up exceptions when a claim is shown to be false."
    },
    {
        name: "Tu Quoque",
        statement: "My doctor told me I should stop smoking because it's bad for my health, but I saw her smoking a cigarette during her lunch break yesterday!",
        options: ["Tu Quoque", "Ad Hominem", "Appeal to Authority", "Red Herring"],
        correct: 0,
        explanation: "Tu Quoque (appeal to hypocrisy) avoids criticism by turning it back on the accuser."
    },
    {
        name: "Burden of Proof",
        statement: "I believe there is a giant invisible teapot orbiting the sun. Since you can't prove it doesn't exist, it must be there.",
        options: ["Personal Incredulity", "Burden of Proof", "Black-or-White", "Loaded Question"],
        correct: 1,
        explanation: "The Burden of Proof lies with someone who is making a claim, and is not upon anyone else to disprove."
    },
    {
        name: "The Fallacy Fallacy",
        statement: "You used a Straw Man in your argument, therefore your entire conclusion that we should protect the environment must be wrong.",
        options: ["The Fallacy Fallacy", "Circular Reasoning", "Genetic", "Appeal to Emotion"],
        correct: 0,
        explanation: "Presuming that because a claim has been poorly argued, or a fallacy has been made, that the claim itself is wrong."
    },
    {
        name: "Personal Incredulity",
        statement: "The idea that organisms could evolve over millions of years is just too hard to imagine, so it can't be true.",
        options: ["Personal Incredulity", "Hasty Generalization", "False Cause", "Anecdotal"],
        correct: 0,
        explanation: "Asserting that because one finds something difficult to understand, it is therefore not true."
    },
    {
        name: "Genetic Fallacy",
        statement: "This news article about corruption was published in a tabloid, so all the facts in it must be completely made up.",
        options: ["Ad Hominem", "Genetic Fallacy", "Red Herring", "Ambiguity"],
        correct: 1,
        explanation: "Judging something as either good or bad on the basis of where it comes from, or from whom it came."
    },
    {
        name: "Anecdotal",
        statement: "My grandfather smoked 30 cigarettes a day and lived until he was 97, so smoking isn't really that dangerous.",
        options: ["Anecdotal", "Post Hoc", "Texas Sharpshooter", "Hasty Generalization"],
        correct: 0,
        explanation: "Using a personal example or an isolated incident instead of a sound argument or compelling evidence."
    },
    {
        name: "Appeal to Emotion",
        statement: "If we don't pass this law immediately, think of all the innocent children who will suffer and cry!",
        options: ["Ad Hominem", "Appeal to Emotion", "Straw Man", "Slippery Slope"],
        correct: 1,
        explanation: "Manipulating an emotional response in place of a valid or compelling argument."
    }
];

// State
let currentQuestion = 0;
let score = 0;
let canAnswer = true;
let isHardMode = false;
let activeData = quizData;

// DOM Elements
const welcomeScreen = document.getElementById('welcome-screen');
const libraryScreen = document.getElementById('library-screen');
const quizCard = document.getElementById('quiz-card');
const resultScreen = document.getElementById('result-screen');

const statementEl = document.getElementById('statement');
const optionsEl = document.getElementById('options');
const metaEl = document.getElementById('question-meta');
const scoreEl = document.getElementById('score-display');
const progressBar = document.getElementById('progress-bar');
const feedbackContainer = document.getElementById('feedback-container');
const feedbackAlert = document.getElementById('feedback-alert');
const explanationText = document.getElementById('explanation-text');
const nextBtn = document.getElementById('next-btn');
const finalScoreEl = document.getElementById('final-score');
const scoreMsgEl = document.getElementById('score-message');
const restartBtn = document.getElementById('restart-btn');

// Menu buttons
const startQuizBtn = document.getElementById('start-quiz-btn');
const startHardBtn = document.getElementById('start-hard-btn');
const viewLibraryBtn = document.getElementById('view-library-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const quizBackBtn = document.getElementById('quiz-back-btn');
const quizRestartBtn = document.getElementById('quiz-restart-btn');
const libraryStartBtn = document.getElementById('library-start-btn');
const fallacyList = document.getElementById('fallacy-list');

// Navigation
function showScreen(screen) {
    [welcomeScreen, libraryScreen, quizCard, resultScreen].forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
}

startQuizBtn.onclick = () => {
    startNewQuiz(false);
};

startHardBtn.onclick = () => {
    startNewQuiz(true);
};

function startNewQuiz(hard) {
    isHardMode = hard;
    activeData = hard ? hardQuizData : quizData;
    
    // Always remove class first, then only add if hard (though CSS doesn't change theme anymore)
    document.body.classList.remove('hard-mode-active');
    if (hard) document.body.classList.add('hard-mode-active');
    
    resetQuiz();
    showScreen(quizCard);
    loadQuestion();
}

viewLibraryBtn.onclick = () => {
    renderLibrary();
    showScreen(libraryScreen);
};

backToMenuBtn.onclick = () => showScreen(welcomeScreen);
quizBackBtn.onclick = () => showScreen(welcomeScreen);
quizRestartBtn.onclick = () => {
    if (confirm("Are you sure you want to restart?")) {
        resetQuiz();
        loadQuestion();
    }
};
libraryStartBtn.onclick = () => startNewQuiz(false);

function renderLibrary() {
    fallacyList.innerHTML = '';
    // Combine both sets for the library
    [...quizData, ...hardQuizData].forEach(q => {
        const item = document.createElement('div');
        item.className = 'library-item';
        item.innerHTML = `<h4>${q.name}</h4><p>${q.explanation}</p>`;
        fallacyList.appendChild(item);
    });
}

function resetQuiz() {
    currentQuestion = 0;
    score = 0;
    scoreEl.textContent = `Score: 0`;
}

function loadQuestion() {
    canAnswer = true;
    const q = activeData[currentQuestion];
    statementEl.textContent = q.statement;
    metaEl.textContent = `Question ${currentQuestion + 1} of ${activeData.length}`;
    progressBar.style.width = `${((currentQuestion) / activeData.length) * 100}%`;
    feedbackContainer.classList.add('hidden');
    optionsEl.innerHTML = '';
    
    q.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.onclick = () => handleSelection(index, btn);
        optionsEl.appendChild(btn);
    });
}

function handleSelection(index, btn) {
    if (!canAnswer) return;
    canAnswer = false;
    const q = activeData[currentQuestion];
    const isCorrect = index === q.correct;

    if (isCorrect) {
        score++;
        scoreEl.textContent = `Score: ${score}`;
        btn.classList.add('correct');
        feedbackAlert.textContent = "Correct!";
        feedbackAlert.className = "feedback-banner correct";
    } else {
        btn.classList.add('wrong');
        optionsEl.children[q.correct].classList.add('correct');
        feedbackAlert.textContent = "Incorrect";
        feedbackAlert.className = "feedback-banner wrong";
    }

    Array.from(optionsEl.children).forEach(b => b.disabled = true);
    
    // In Hard Mode, we hide the explanation box via CSS, 
    // but we still need to show the feedback container to see the Next button
    explanationText.textContent = q.explanation;
    feedbackContainer.classList.remove('hidden');
}

nextBtn.addEventListener('click', () => {
    currentQuestion++;
    if (currentQuestion < activeData.length) {
        loadQuestion();
    } else {
        showResults();
    }
});

function showResults() {
    showScreen(resultScreen);
    progressBar.style.width = '100%';
    finalScoreEl.textContent = `${score}/${activeData.length}`;
    
    let msg = "";
    if (score === activeData.length) msg = "Logical Genius! You navigated the hardest flaws perfectly.";
    else if (score >= 7) msg = "Great effort! You've got a solid grasp on logic.";
    else msg = "Logic is a skill that takes practice. Try again!";
    
    scoreMsgEl.textContent = msg;
}

restartBtn.addEventListener('click', () => showScreen(welcomeScreen));

// Initial screen
showScreen(welcomeScreen);
