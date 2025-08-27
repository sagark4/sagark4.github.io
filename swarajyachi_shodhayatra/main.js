
/* ---------- Helpers ---------- */
function waitMs(ms) {
    return new Promise(r => setTimeout(r, ms));
}
function setButtonsEnabled(enabled) {
    document.querySelectorAll('#choices button').forEach(b => b.disabled = !enabled);
    uiLocked = !enabled;
}
let wordWriterActive = true;
function wordWriter(el, text, wSpeed = 240) {
    return new Promise(resolve => {
        el.innerHTML = '';
        const words = text.split(/\s+/);
        let i = 0;

        function step() {
            if (!wordWriterActive) {  // check flag at each step
                resolve();            // stop immediately
                return;
            }
            if (i < words.length) {
                el.innerHTML += (i ? ' ' : '') + words[i];
                i++;
                setTimeout(step, wSpeed);
            } else {
                resolve();            // finished
            }
        }

        step();
    });
}
function toDevanagari(num) {
    return String(num).replace(/[0-9]/g, d => "०१२३४५६७८९"[d]);
}

/* ---------- Intro ---------- */
const fadeMessage = document.getElementById('fadeMessage');
const introText   = document.getElementById('introText');
const rules       = document.getElementById('rules');
const game        = document.getElementById('game');
const loopOverlay = document.getElementById('loopOverlay');
const blackout    = document.getElementById('blackout');

const introLines = [
    'संपूर्ण अंधार.',
    'हवेचा गंध दमट आणि जुनाट आहे, सर्वत्र शांतता आहे आणि पायाखालची पाळी हलकीच खसखसते आहे.',
    'तुम्ही डोळे उघडता.',
    'तुम्ही एका गडद गुफेत आहात, कुठलाही प्रकाश नाही, फक्त दूरवर आयताकृती उघडी जागा किंचित उजळते.',
    'मंद प्रकाशाच्या किरणांखाली गुफेची भिंत काळसर दिसते, प्रत्येक कोपरा अंधारात हरवलेला आहे.',
    'तुम्हाला माहीत नाही की तुम्ही येथे कसे आलात...कदाचित तुम्ही ध्यान करत होता.',
    'तुम्ही उजळणाऱ्या आयताकडे जाता आणि दरवाज्यातून बाहेर पडता तेव्हा लक्षात येते — ह्या तर वेरुळ लेणी!',
    'तुमची मोहिम: छत्रपती शिवाजी महाराजांच्या काळातील दडलेले धागे जोडणे.'
];
/* ---------- Rendering ---------- */
function getPlace(name) {
    return PLACES.find(p => p.name === name);
}
function symbolFor(name) {
    return getPlace(name).symbol;
}
function allFound() {
    return Object.keys(foundAt).length >= 7;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function renderChoices() {
    const ch = document.getElementById('choices');
    ch.innerHTML = '';

    // Shuffle the places
    let shuffledPlaces;
    if (Object.keys(foundAt).length >= 5) {
        // All forts available once 5+ symbols are collected
        shuffledPlaces = shuffleArray([...PLACES]); 
    } else {
        // Hide last two forts until then
        shuffledPlaces = shuffleArray([...PLACES.slice(0, PLACES.length - 2)]);
    }

    shuffledPlaces.forEach(pl => {
        const btn = document.createElement('button');
        btn.textContent = pl.name;
        btn.disabled = uiLocked;
        btn.onclick = () => onTravelClick(pl.name);
        ch.appendChild(btn);
    });
}

function renderSymbols() {
    const div = document.getElementById('symbols');
    const existing = div.querySelectorAll('.symbol');
    existing.forEach(e => e.remove());
    Object.keys(foundAt).forEach(loc => {
        const s = document.createElement('div');
        s.className = 'symbol';
        s.textContent = `${loc} → ${symbolFor(loc)}`;
        div.appendChild(s);
    });
}

function renderProgress() {
    const box = document.getElementById('progress2');
    if (!allFound()) {
        box.innerHTML = 'गोळा केलेली चिन्हे: ';
        // Symbol collection phase
        SYMBOL_ORDER.forEach((sym, idx) => {
            if (foundAt[PLACES.find(p=>p.symbol===sym).name]) {
                const span = document.createElement('span');
                span.className = 'symbol';
                span.textContent = sym;
                span.classList.add('correct');
                box.appendChild(span);
            }
        });
        showMessage2(`पुढील उद्दिष्ट: गडांवरून सर्व चिन्हे गोळा करा.`);
    } else {
        // Fort visiting phase
        box.innerHTML = 'सध्याचा क्रम: ';
        TRAVEL_ORDER.forEach((sym, idx) => {
            if (idx >= progressIndex) return;
            const span = document.createElement('span');
            span.className = 'symbol';
            span.textContent = PLACES.find(p=>p.symbol===sym).name;
            if (idx < progressIndex) span.classList.add('correct'); // visited correctly
            if (idx === progressIndex - 1) span.style.fontWeight = 'bold'; // latest
            box.appendChild(span);
        });
        showMessage2(`पुढील उद्दिष्ट: योग्य क्रमाने गड पार करा.`);
    }
}

function renderGame(first=false) {
    updateHUD();
    renderChoices();
    renderSymbols();
    if (first) {
        const story = document.getElementById('story');
        story.textContent = `तुम्ही वेरुळ लेण्यात आहात. येथे तुम्हाला '${symbolFor("वेरुळ")}' हे चिन्ह सापडते. आता कोणत्या किल्ल्यावर पुढचे चिन्ह शोधायला जायचे?`;
        showMessage(`फेरा क्रमांक ${toDevanagari(loop)}: तुम्ही वेरुळ लेण्यात आहात. येथे तुम्हाला '${symbolFor("वेरुळ")}' हे चिन्ह सापडते. आता कोणत्या किल्ल्यावर पुढचे चिन्ह शोधायला जायचे?`);
    }
}

/* ---------- Narration & Messages ---------- */
async function narrate(text) {
    const story = document.getElementById('story');
    setButtonsEnabled(false);
    wordWriterActive = true;      // start narration
    await wordWriter(story, text);
    setButtonsEnabled(true);
}

let msgTimeout1 = null, msgTimeout2 = null;
function showMessage(msg, dur = 2500) {
    const overlay = document.getElementById('messageOverlay');
    const text = document.getElementById('messageText');

    text.textContent = msg;
    overlay.classList.add('show');

    if (msgTimeout1) clearTimeout(msgTimeout1);
    msgTimeout1 = setTimeout(() => {
        overlay.classList.remove('show');
        text.textContent = '';
    }, dur);
}
function showMessage2(msg) {
    const el = document.getElementById('message2');
    el.textContent = msg;
}

/* ---------- Timer & Loops ---------- */
function startTimer() {
    stopTimer();
    timerId = setInterval(() => {
        secondsLeft--;
        updateHUD();
        if (secondsLeft <= 0) {
            stopTimer();
            triggerLoopEnd();
        }
    }, 1000);
}
function stopTimer() {
    if (timerId) {
        clearInterval(timerId);
        timerId = null;
    }
}
function triggerLoopEnd() {
    wordWriterActive = false; // stops any ongoing narration
    loop++;
    if (loop > maxLoops) {
        const overlay = document.getElementById('gameOverOverlay');
        if(!allFound()) {
            overlay.textContent = "खेळ संपला, तुम्ही काळाच्या पाशातून मुक्त होऊ शकला नाहीत.";
        } else {
            overlay.textContent = "खेळ संपला, तुम्ही काळाच्या पाशातून मुक्त होऊ शकला नाहीत पण तुम्हाला सर्व चिन्हे गोळा करता आली.";
        }
        overlay.style.opacity = '1';
        overlay.style.pointerEvents = 'auto';
        return;
    }

    const loopOverlay = document.getElementById('loopOverlay');
    loopOverlay.textContent = `⏳ फेरा क्रमांक ${toDevanagari(loop)}: काळाचा पाश पुनःप्रारंभ (reset) होत आहे...`;
    
    // fade in
    loopOverlay.style.opacity = '1';
    if(progressIndex > 0 ) progressIndex = 1;
    const story = document.getElementById('story');
    if(!allFound()) {
        story.textContent = `तुम्ही परत वेरुळ लेण्यात आलात. आता कोणत्या किल्ल्यावर पुढचे चिन्ह शोधायला जायचे?`;
    } else {
        story.textContent = `तुम्ही परत वेरुळ लेण्यात आलात. परत योग्य क्रमाने गड पार करा.`;
    }
    renderProgress();
    renderSymbols();
    renderChoices();
    setTimeout(() => {
        // fade out
        loopOverlay.style.opacity = '0';
        secondsLeft = loopLen;
        travelCount = 0;
        currentLoc = 'वेरुळ';
        updateHUD();
        startTimer();
        const story = document.getElementById('story');
        if(!allFound()) {
            showMessage('तुम्ही परत वेरुळ लेण्यात आलात. आता कोणत्या किल्ल्यावर पुढचे चिन्ह शोधायला जायचे?', 4000);
            story.textContent = `तुम्ही परत वेरुळ लेण्यात आलात. आता कोणत्या किल्ल्यावर पुढचे चिन्ह शोधायला जायचे?`;
        } else {
            showMessage('तुम्ही परत वेरुळ लेण्यात आलात. परत योग्य क्रमाने गड पार करा.', 4000);
            story.textContent = `तुम्ही परत वेरुळ लेण्यात आलात. परत योग्य क्रमाने गड पार करा.`;
        }
    }, 3000); // stay fully black for ~1.5s
}
function startIntro() {
    fadeMessage.style.opacity = 1;
    setTimeout(() => fadeMessage.style.opacity = 0, 800);
    setTimeout(async () => {
        fadeMessage.style.display = 'none';
        introText.style.opacity = 1;
        for (const line of introLines) {
            wordWriterActive = true;      // start narration
            await wordWriter(introText, line);
            await waitMs(2000); // this is the pause after each line is fully written by wordWriter
            introText.style.opacity = 0;
            await waitMs(400); // time gap between lines.
            introText.style.opacity = 1;
        }
        introText.style.opacity = 0;
        rules.style.display = 'block';
        rules.style.opacity = 1;
    }, 3500);
}

/* ---------- Game Data ---------- */
const SYMBOL_ORDER = ['स्व','रा','ज्य','श्रीं','ची','इ','च्छा'];
const TRAVEL_ORDER = SYMBOL_ORDER;
const PLACES = [
    {name:'वेरुळ', symbol:'स्व', facts:[
        'युनेस्को जागतिक वारसा स्थळ; कैलास मंदिर एकाच खडकातून घडवले आहे.',
        'बौद्ध, हिंदू आणि जैन लेण्यांचा संगम येथे दिसतो.',
    ], alwaysVisible:true},
    {name:'दुर्गाडी किल्ला', symbol:'रा', facts:[
        'कल्याणच्या जुन्या बंदरावर नजर; व्यापारसाखळीचे संकेत.',
        'येथील दरवाज्याजवळची नक्षी कालखंडाची आठवण करून देते.',
    ], alwaysVisible:true},
    {name:'रायगड', symbol:'ज्य', facts:[
        'छत्रपती शिवाजी महाराजांचे राज्याभिषेक इथे झाला.',
        'असामान्य उंची व बालेकिल्ला; समुद्रसपाटीपासून सुमारे १३५० मीटर.',
    ], visibleIf: (state)=> !!state.found['दुर्गाडी किल्ला'] },
    {name:'प्रतापगड', symbol:'श्रीं', facts:[
        'इथेच अफझलखानाचा वध झाला.',
        'भोर–महाबळेश्वर दरम्यानचा घाट सांभाळण्यासाठी उभारलेला तट.',
    ], alwaysVisible:true},
    {name:'राजगड', symbol:'ची', facts:[
        'मराठा साम्राज्याची पहिली राजधानी दीर्घकाळ इथे होती.',
        'सुवर्ण माची, संजीवनी माची आदी भाग प्रसिद्ध.',
    ], visibleIf: (state)=> !!state.found['प्रतापगड'] },
    {name:'तोरणा', symbol:'इ', facts:[
        'छत्रपती शिवाजी महाराजांनी तरुण वयात जिंकलेला पहिला गड मानला जातो.',
        'जिल्हा पुणे; झुंजार माच्यांसाठी ओळख.',
    ], alwaysVisible:true},
    {name:'शिवनेरी', symbol:'च्छा', facts:[
        'छत्रपती शिवाजी महाराजांचा जन्म येथे झाला.',
        'जुन्नरजवळील किल्ला; जलसंधारणाची उत्तम व्यवस्था होती.',
    ], alwaysVisible:true}
];

/* ---------- State ---------- */
let loop = 1, maxLoops = 7, loopLen = 60;
let secondsLeft = loopLen, timerId = null;
let foundAt = { 'वेरुळ': true };
let unlockedTravel = false, travelCount = 0, progressIndex = 0;
let currentLoc = 'वेरुळ', uiLocked = false;

/* ---------- HUD & Progress ---------- */
const hudLoc   = document.getElementById('hudLoc');
const hudLoop  = document.getElementById('hudLoop');
const hudTrav  = document.getElementById('hudTrav');
const hudGoal  = document.getElementById('hudGoal');
const hudTime  = document.getElementById('hudTime');
const symBar   = document.getElementById('symProgress');
const seqDiv   = document.getElementById('sequence');

function updateHUD() {
    hudLoc.textContent = `📍 स्थान: ${currentLoc}`;
    hudLoop.textContent = `फेरा: ${toDevanagari(loop)} / ${toDevanagari(maxLoops)}`;
    hudTrav.textContent = `प्रवास: ${toDevanagari(Math.min(travelCount,5))}/५ ${unlockedTravel?'(अमर्याद)':''}`;
    if (!unlockedTravel) {
        hudGoal.textContent = `चिन्हे: ${toDevanagari(Object.keys(foundAt).length)}/७`;
        updateSymbolProgress();
    } else {
        updateSequence();
    }
    hudTime.textContent = `वेळ: ${toDevanagari(secondsLeft)}से`;
}
function updateSymbolProgress() {
    let count = Object.keys(foundAt).length;
    let pct = Math.round(count/7*100);
    symBar.style.width = pct + '%';
}
function updateSequence() {
    seqDiv.innerHTML = '';
    TRAVEL_ORDER.forEach((s,i) => {
        const sp = document.createElement('span');
        sp.textContent = s;
        if (i < progressIndex) sp.classList.add('done');
        else if (i === progressIndex) sp.classList.add('current');
        seqDiv.appendChild(sp);
    });
}

/* ---------- Travel ---------- */
function showTravelAnimation(from, to, count) {
    return new Promise(resolve => {
        const overlay = document.getElementById("travelOverlay");
        overlay.innerHTML = `
             <div>
               ✈️ प्रवास: <b>${from}</b> → <b>${to}</b><br>
               आजचे प्रवास: ${toDevanagari(count)}/५
             </div>
           `;
        overlay.style.display = "flex";

        overlay.style.animation = "none";
        overlay.offsetHeight; // force reflow
        overlay.style.animation = "fadeInOut 2.5s ease forwards";

        // Resolve when animation is done
        setTimeout(() => {
            overlay.style.display = "none";
            resolve();
        }, 2500); // match animation duration
    });
}

async function onTravelClick(place) {
    if (uiLocked) return;
    if (!unlockedTravel && currentLoc === place) {
        showMessage(`तुम्ही ${place} येथेच आहात.`);
        return;
    }
    if (!unlockedTravel && travelCount >= 5) {
        showMessage('आज तुम्ही आणखी प्रवास करू शकत नाही.');
        return;
    }
    // Save "from" location before changing
    const from = currentLoc;
    const to = place;

    // Update state
    currentLoc = place;
    travelCount += (!unlockedTravel ? 1 : 0);
    updateHUD();

    // 🔒 Wait until travel animation finishes
    if(!unlockedTravel) {
        await showTravelAnimation(from, to, travelCount);
    }

    let discoveryText = '';
    if (!foundAt[place]) {
        foundAt[place] = true;
        discoveryText = ` — येथे तुम्हाला '${symbolFor(place)}' हे चिन्ह सापडते.`;
        if(Object.keys(foundAt).length == 5) {
            showMessage(`तुम्हाला '${symbolFor(place)}' हे चिन्ह सापडले. अजून दोन किल्ल्यांचा मार्ग खुला झाला!`, 3000);
        } else{
            showMessage(`तुम्हाला '${symbolFor(place)}' हे चिन्ह सापडले.`);
        }
        await new Promise(r => setTimeout(r, 3000));
    }
    renderSymbols();
    renderChoices();
    if (!unlockedTravel) {
        const facts = getPlace(place).facts;
        renderProgress();
        await narrate(`${place}: ${facts[0]} ${facts[1]}${discoveryText}`);
    } else {
        // confirmation line instead of facts
        const sym = symbolFor(place);
        const story = document.getElementById('story');
        if (sym === TRAVEL_ORDER[progressIndex]) {
            progressIndex++;
            story.innerHTML = `✅ ${place}: तुम्ही योग्य क्रमाने पुढे जात आहात.`;
        } else {
            progressIndex = (sym === TRAVEL_ORDER[0]) ? 1 : 0;
            story.innerHTML = `❌ ${place}: क्रम चुकीचा ठरला, पुन्हा सुरुवात करा.`;
        }
        renderProgress();
    }
    if (!unlockedTravel && allFound()) {
        unlockedTravel = true;
        progressIndex = 0;
        showMessage('सर्व चिन्हे सापडली! आता योग्य क्रमाने गड पार करा.',4000);
    }
    if (unlockedTravel && progressIndex >= TRAVEL_ORDER.length) {
        stopTimer();
        setButtonsEnabled(false);
        await narrate('🎉 अभिनंदन! योग्य क्रमाने सर्व गड पार झाले. काळाचा पाश तुटला आहे.');
        document.getElementById('choices').innerHTML = '';

        // Show full-screen victory fade
        const overlay = document.getElementById('victoryOverlay');
        overlay.style.pointerEvents = 'auto';
        overlay.style.opacity = '1';  // triggers 5s fade
    }
}

/* ---------- Messaging, Timer, Render... (same as before, cleaned style) ---------- */
// ...

function startGame() {
    document.getElementById('footer').style.display = 'none';  // <-- hide footer
    rules.style.display='none';
    game.style.display='block';
    renderGame(true);
    renderProgress();
    startTimer();
}
//startGame();
startIntro();
