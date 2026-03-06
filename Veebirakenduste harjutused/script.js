const subjects = [
    "The production server",
    "My cat",
    "The intern",
    "A cosmic ray",
    "The garbage collector",
    "My IDE",
    "The documentation",
    "The legacy code",
    "The wifi",
    "The client's nephew",
    "Stack Overflow",
    "A malicious npm package",
    "The CSS-in-JS library",
    "My standing desk",
    "The cloud provider",
    "The git history"
];

const verbs = [
    "accidentally deleted",
    "spontaneously combusted because of",
    "refused to acknowledge",
    "mistook for a virus",
    "rewrote itself to avoid",
    "is currently protesting",
    "overwrote",
    "leaked all of",
    "is still compiling",
    "lost track of",
    "force-pushed over",
    "shadow-banned",
    "infinite-looped into",
    "segfaulted on"
];

const objects = [
    "the database password",
    "my last three commits",
    "the production environment",
    "the semicolon on line 42",
    "the entire front-end framework",
    "the client's expectations",
    "the coffee machine API",
    "the .env file",
    "my mental health",
    "the Friday afternoon release",
    "the load balancer",
    "the Kubernetes cluster",
    "the documentation I was about to write",
    "the only working test case"
];

const excuseDisplay = document.getElementById('excuse-display');
const generateBtn = document.getElementById('generate-btn');
const copyBtn = document.getElementById('copy-btn');

function generateExcuse() {
    // Pick random parts
    const s = subjects[Math.floor(Math.random() * subjects.length)];
    const v = verbs[Math.floor(Math.random() * verbs.length)];
    const o = objects[Math.floor(Math.random() * objects.length)];

    const excuse = `${s} ${v} ${o}.`;

    // Remove animation class to reset it
    excuseDisplay.classList.remove('animate-in');
    
    // Void offset hack to trigger reflow and restart animation
    void excuseDisplay.offsetWidth;

    // Set text and add animation
    excuseDisplay.textContent = excuse;
    excuseDisplay.classList.add('animate-in');
}

function copyToClipboard() {
    const text = excuseDisplay.textContent;
    if (text.includes("Click the button")) return;

    navigator.clipboard.writeText(text).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = "COPIED!";
        copyBtn.style.backgroundColor = "#4BB543"; // Success green
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.backgroundColor = "";
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

// Event Listeners
generateBtn.addEventListener('click', generateExcuse);
copyBtn.addEventListener('click', copyToClipboard);

// Initial state
// generateExcuse(); // Uncomment to start with an excuse
