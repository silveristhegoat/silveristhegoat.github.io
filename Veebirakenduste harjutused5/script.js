const phrases = [
    "Let's circle back on this when I care slightly more.",
    "We need to leverage our synergies while ignoring the collective burnout.",
    "That sounds like a 'you' problem masquerading as a 'we' problem.",
    "I'm putting this on your plate because my plate is full of lunch.",
    "Let's move the needle, preferably without me having to do anything.",
    "We need to be agile, which is corporate speak for 'I changed my mind again'.",
    "I'll take that under advisement and then immediately forget it.",
    "Let's touch base once you've done all the work I'm taking credit for.",
    "We need a deep dive into why you're not working 80 hours a week.",
    "Think outside the box, but stay within the very small box I've built for you.",
    "I'm not saying no, I'm just saying 'never'.",
    "Let's socialize this idea until it loses all its original meaning.",
    "We need to align our visions, specifically with my incorrect one.",
    "It's about the journey, not the destination. But if we miss the destination, you're fired.",
    "I appreciate your transparency, now please hide that mistake immediately.",
    "Let's put a pin in that, and by pin, I mean a grenade.",
    "We need more 'blue-sky thinking' and less 'asking for a raise'.",
    "I'm a big picture person. The picture is me on a boat.",
    "We need to optimize our bandwidth by you working through the weekend.",
    "Let's pivot this failure into a 'learning opportunity' for your replacement."
];

const phraseText = document.getElementById('phrase-text');
const generateBtn = document.getElementById('generate-btn');
const copyBtn = document.getElementById('copy-btn');
const toast = document.getElementById('toast');

function generatePhrase() {
    // Pick random phrase
    const randomIndex = Math.floor(Math.random() * phrases.length);
    const newPhrase = phrases[randomIndex];

    // Trigger animation
    phraseText.classList.remove('fade-up');
    void phraseText.offsetWidth; // Force reflow
    
    phraseText.textContent = newPhrase;
    phraseText.classList.add('fade-up');
}

async function copyToClipboard() {
    const text = phraseText.textContent;
    if (text.includes("Click below")) return;

    try {
        await navigator.clipboard.writeText(text);
        showToast();
    } catch (err) {
        console.error('Failed to copy: ', err);
    }
}

function showToast() {
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 2000);
}

// Event Listeners
generateBtn.addEventListener('click', generatePhrase);
copyBtn.addEventListener('click', copyToClipboard);

// Optional: Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        generatePhrase();
    }
});
