
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
const fadeMessage1 = document.getElementById('fadeMessage1');
const introText   = document.getElementById('introText');
const rules       = document.getElementById('rules');
const game        = document.getElementById('game');
const loopOverlay = document.getElementById('loopOverlay');
const blackout    = document.getElementById('blackout');

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
        SYMBOL_ORDER.forEach((sym, _idx) => {
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
        SYMBOL_ORDER.forEach((sym, idx) => {
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
function showMessage2(msg, highlight = false) {
    const el = document.getElementById('message2');
    if(highlight) {
        el.style.backgroundColor = "lightyellow";   // set
    } else {
        el.style.removeProperty("background-color"); // reset back to original (CSS default)
    }
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
async function startIntro() {
    fadeMessage.style.opacity = 1;
    setTimeout(() => fadeMessage.style.opacity = 0, 2400);
    await new Promise(r => setTimeout(r, 2000));
    fadeMessage1.style.opacity = 1;
    setTimeout(() => fadeMessage1.style.opacity = 0, 4000);
    await new Promise(r => setTimeout(r, 4000));
    if(skipIntro) {
        startGame();
    } else {
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
            introText.remove();
        }, 3500);
    }
    fadeMessage.remove();
    fadeMessage1.remove();
}

/* ---------- Game Data ---------- */
const SYMBOL_ORDER = ['स्व','रा','ज्य','श्रीं','ची','इ','च्छा'];

const PLACES = [
    {name:'वेरुळ', symbol:'स्व', facts:[
        'युनेस्को जागतिक वारसा स्थळ; कैलास मंदिर एकाच खडकातून घडवले आहे.',
        'बौद्ध, हिंदू, आणि जैन लेण्यांचा संगम येथे दिसतो.',
    ]},
    {name:'दुर्गाडी किल्ला', symbol:'रा', facts:[
        'दुर्गाडी किल्ला कल्याण परिसरात स्थित असून स्थानिक इतिहासाशी संलग्न आहे.',
        'छत्रपती शिवाजी महाराजांनी मराठा आरमाराची सुरुवात केली.',
    ]},
    {name:'रायगड', symbol:'ज्य', facts:[
        'छत्रपती शिवाजी महाराजांचा राज्याभिषेक येथे झाला.',
        'त्यांची समाधी पण येथेच आहे.',
    ]},
    {name:'प्रतापगड', symbol:'श्रीं', facts:[
        'येथेच अफझलखानाचा वध झाला.',
        'जिल्हा: सातारा.',
    ]},
    {name:'राजगड', symbol:'ची', facts:[
        'छत्रपती शिवाजी महाराजांची पहिली राजधानी दीर्घकाळ येथे होती.',
        'आधीचे नाव मुरुंबदेव.',
    ]},
    {name:'तोरणा', symbol:'इ', facts:[
        'छत्रपती शिवाजी महाराजांनी तरुण वयात जिंकलेला पहिला गड मानला जातो.',
        'प्रचंडगड असेही नाव आहे.',
    ]},
    {name:'शिवनेरी', symbol:'च्छा', facts:[
        'छत्रपती शिवाजी महाराजांचा जन्म येथे झाला.',
        'जुन्नरजवळील किल्ला.',
    ]}
];

// Example: questions per fort
const FORT_QUESTIONS = {
    'प्रतापगड': [
        { text: "प्रतापगडाखाली अफजलखानाचा वध करण्यास शिवाजी महाराजांनी काय वापरले?", choices: ["भाला", "वाघनखे"], correct: 1 }
    ],
    'राजगड': [
        { text: "राजगड किल्ल्याचे जुने नाव काय?", choices: ["प्रचंडगड", "मुरुंबदेव", "सिंधुदुर्ग"], correct: 1 },
    ],
    'वेरुळ': [
        { text: "वेरुळ लेणी कोणत्या धर्माशी संबंधित आहेत?", choices: ["बौद्ध, हिंदू, जैन", "फक्त बौद्ध", "फक्त हिंदू"], correct: 0 },
        { text: "चूक की बरोबर सांगा. घृष्णेश्वर मंदिर हे १२ ज्योतिर्लिंगापैकी एक आहे.", choices: ["चूक", "बरोबर"], correct: 1 },
        // { text: "वेरुळ लेणी महाराष्ट्रात कुठे आहेत?", choices: ["छत्रपती संभाजीनगर", "पुणे", "नाशिक"], correct: 0 }
    ],
    'शिवनेरी': [
        { text: "शिवनेरी किल्ला कोणत्या ऐतिहासिक व्यक्तीचे जन्मस्थान आहे?", choices: ["छत्रपती संभाजी महाराज", "छत्रपती शिवाजी महाराज", "छत्रपती महाराणी ताराबाई"], correct: 1 },
    ],
    'तोरणा': [
        { text: "छत्रपती शिवाजी महाराजांनी सर्वप्रथम जिंकलेला किल्ला कोणता?", choices: ["प्रतापगड", "सिंहगड", "तोरणा"], correct: 2 },
        { text: "तोरणा किल्ल्याला दुसरे नाव काय आहे?", choices: ["रायगड", "प्रचंडगड", "मंगलगड"], correct: 1 }
    ],
    'रायगड': [
        { text: "छत्रपती शिवाजी महाराजांचा राज्याभिषेक कुठे झाला?", choices: ["रायगड", "प्रतापगड", "शिवनेरी"], correct: 0 },
    ],
    'दुर्गाडी किल्ला': [
        { text: "दुर्गाडी किल्ला कोणत्या शहरात आहे?", choices: ["कल्याण", "पुणे", "छत्रपती संभाजीनगर"], correct: 0 },
    ]
};
// Fort info dictionary
const FORT_INFO = {
    'प्रतापगड': {
        text1: "इ.स. १६५९ मध्ये आदिलशाही सरदार अफजलखानाला शिवाजी महाराजांचा पराभव करण्यासाठी पाठविण्यात आले. अफजलखान उंच, बलदंड आणि कपटी होता. त्याच्याकडे हजारो सैनिक, हत्ती, घोडदळ, तोफा होत्या. शिवाजी महाराजांकडे त्याच्या तुलनेत सैन्य कमी होते. अफजलखानाने महाराजांना 'आपण भेटू, मैत्री करू' असे सांगून प्रतापगडाच्या पायथ्याशी बोलावले. महाराजांना त्याचा डाव कळला होता. त्यांनी हा खेळ समजून घेतला आणि युक्ती आखली. भेटीच्या वेळी महाराजांनी अंगावर लोखंडी कवच व 'वाघनखं' हे अस्त्र घेतले होते. अफजलखानाने महाराजांना मिठी मारताच त्याच्या हातातील कट्यारीने वार करण्याचा प्रयत्न केला. पण महाराज सज्ज होते—त्यांनी क्षणार्धात वाघनख्याने अफजलखानाचा प्राणघात केला. हा संकेत मिळताच गडावरून तोफांचा आवाज झाला आणि प्रतापगडाभोवती दडलेले मराठा मावळे झुंजत सुटले. अफजलखानाच्या फौजेवर मराठ्यांनी जोरदार हल्ला केला आणि त्यांना पळवून लावले.",
        text2: "अफजलखानाच्या पराभवानंतर येथेच महाराजांनी देवी भवानीचे मंदिर बांधले."
    },
    'राजगड': {
        text1: "राजगड छत्रपती शिवाजी महाराजांची जुनी राजधानी होती. त्यांची राजमुद्रा वर दाखवली आहे.",
        text2: "हा गड आधी मुरुंबदेव म्हणून ओळखला जात होता."
    },
    'शिवनेरी': {
        text1: "शिवनेरी किल्ला हे छत्रपती शिवाजी महाराजांचे जन्मस्थान. येथेच त्यांचे बालपण गेले.",
        text2: "हा किल्ला पुणे जिल्ह्यातील जुन्नर जवळ असून, छत्रपती शिवाजी महाराजांचा जन्म १९ फेब्रुवारी १६३० रोजी येथे झाला."
    },
    'रायगड': {
        text1: "१६७४ मध्ये रायगड किल्ल्यावर छत्रपती शिवाजी महाराजांचा राज्याभिषेक झाला आणि मराठा साम्राज्याची औपचारिक स्थापना झाली. त्यांनी शिस्तबद्ध लष्कर, नौदलाची निर्मिती, आणि सुसंगठित प्रशासन व्यवस्था उभी केली. मराठी व संस्कृत भाषांचा राजकार्यात वापर वाढविला.",
        text2: "१६८० मध्ये शिवाजी महाराजांचा मृत्यु झाला. येथेच त्यांची समाधीदेखील आहे."
    },
    'दुर्गाडी किल्ला': {
        text1: "दुर्गाडी किल्ला कल्याण परिसरात स्थित असून स्थानिक इतिहासाशी संलग्न आहे.",
        text2: "समुद्रावरून त्या काळी पोर्तुगीज व इंग्रज हे शत्रू येत होते. असे म्हणतात की त्या दृष्टिकोनातून छत्रपती शिवाजी महाराजांनी मराठा आरमाराची सुरुवात येथेच केली. सिंधुदुर्ग व विजयदुर्ग हे किल्ले बांधले."
    },
    'वेरुळ': {
        text1: "छत्रपती शिवाजी महाराज म्हणजे महाराष्ट्राच्याच नव्हे तर भारताच्या इतिहासातील एक अत्यंत महत्त्वाचे योद्धा व शासक, आणि मराठा साम्राज्याचे संस्थापक. त्यांनी महाराष्ट्रात स्वराज्याची स्थापना केली. त्याचा विस्तार होऊन अठराव्या शतकात मराठा साम्राज्य दिल्लीच्या तख्तापर्यंत पोहोचले. ते वेरुळच्या भोसले घराण्याचे होते. त्यांचे आजोबा मालोजी भोसले हे मोठे शिवभक्त होते आणि त्यांनी वेरुळमधल्या घृष्णेश्वर मंदिराचा, जे १२ ज्योतिर्लिंगांपैकी एक आहे त्याचा, जीर्णोद्धार केला.",
        text2: "वेरुळ हे छत्रपती संभाजीनगर (ज्याचे नाव आधी औरंगाबाद होते) जवळ असून तिथल्या लेण्यांसाठी जगप्रसिद्ध आहे. हा एक ऐतिहासिक लेणी समूह असून त्यात बौद्ध, हिंदू, आणि जैन धर्मीयांची लेणी समाविष्ट आहेत. यातील सर्वांत प्रसिद्ध कैलास मंदिर (लेणी क्र. १६) हे एक अखंड खडकातून कोरलेले भव्य मंदिर आहे, ज्याला जगातील सर्वात मोठे एकल खडक मंदिर मानले जाते. या लेण्यांच्या स्थापत्यकलेत राष्ट्रकूट आणि चालुक्य राजवंशांचा प्रभाव दिसतो. वेरुळ लेणी आणि अजिंठा लेणी ह्या दोन्हींना युनेस्कोने जागतिक वारसा स्थळ म्हणून घोषित केले आहे."
    },
    'तोरणा': {
        text1: "त्या काळी सत्ता चालवायला किल्ले ताब्यात असणे अतिशय महत्त्वाचे होते.",
        text2: "असे म्हणतात की शिवाजी महाराजांनी सर्वप्रथम जिंकलेला हा किल्ला, म्हणजेच हा किल्ला जिंकून त्यांनी स्वराज्याचे तोरण घातले. म्हणून याचे नाव तोरणा, पण प्रचंडगड म्हणूनही ओळखला जातो."
    }
};

const introLines = [
    'संपूर्ण अंधार.',
    'हवेचा गंध दमट आणि जुनाट आहे, सर्वत्र शांतता आहे.',
    'तुम्ही डोळे उघडता. तुम्ही एका गडद गुफेत आहात, कुठलाही प्रकाश नाही, फक्त दूरवर आयताकृती उघडी जागा किंचित उजळते.',
    'मंद प्रकाशाच्या किरणांखाली गुफेची भिंत काळसर दिसते, प्रत्येक कोपरा अंधारात हरवलेला आहे.',
    'तुम्हाला माहीत नाही की तुम्ही इथे कसे आलात...कदाचित तुम्ही ध्यान करत होता.',
    'तुम्ही उजळणाऱ्या आयताकडे जाता आणि दरवाज्यातून बाहेर पडता तेव्हा लक्षात येते — ह्या तर वेरुळ लेणी!',
    'तुमची मोहिम: छत्रपती शिवाजी महाराजांच्या काळातील दडलेले धागे जोडणे.'
];

/* ---------- State ---------- */
let skipIntro = false;
let loop = 1, maxLoops = 7, loopLen = 60;
let secondsLeft = loopLen, timerId = null;
let foundAt = { };
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
    SYMBOL_ORDER.forEach((s,i) => {
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

async function onTravelClick(place, first = false) {
    if (uiLocked) return;
    stopTimer();
    if (!unlockedTravel && currentLoc === place && !first) {
        showMessage(`तुम्ही ${place} इथेच आहात.`);
        startTimer();
        return;
    }
    if (!unlockedTravel && travelCount >= 5) {
        showMessage('आज तुम्ही आणखी प्रवास करू शकत नाही.');
        startTimer();
        return;
    }
    document.querySelectorAll('#choices button').forEach(b => b.disabled = "true");
    if(!first) {
        travelCount += (!unlockedTravel ? 1 : 0);        
    }
    updateHUD();

    // 🔒 Wait until travel animation finishes
    if(!unlockedTravel && !first) {
        // Save "from" location before changing
        const from = currentLoc;
        const to = place;
        // Update state
        currentLoc = place;
        await showTravelAnimation(from, to, travelCount);
    }

    let discoveryText = '';
    if (!foundAt[place]) {
        const correct = await showQuiz(place);
        window.scrollTo(0, 0);
        if (correct) {
            foundAt[place] = true;
            discoveryText = ` — इथे तुम्हाला '${symbolFor(place)}' हे चिन्ह सापडते.`;
            if(Object.keys(foundAt).length == 5) {
                showMessage(`बरोबर उत्तर! तुम्हाला '${symbolFor(place)}' हे चिन्ह सापडले. अजून दोन किल्ल्यांचा मार्ग खुला झाला!`, 3000);
            } else{
                showMessage(`बरोबर उत्तर! तुम्हाला '${symbolFor(place)}' हे चिन्ह सापडले.`);
            }
            await new Promise(r => setTimeout(r, 3000));
        } else {
            showMessage("चुकीचे उत्तर! इथले चिन्ह मिळाले नाही, परत यावे लागेल.");
        }
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
        if (sym === SYMBOL_ORDER[progressIndex]) {
            progressIndex++;
            story.innerHTML = `✅ ${place}: तुम्ही योग्य क्रमाने पुढे जात आहात.`;
        } else {
            progressIndex = (sym === SYMBOL_ORDER[0]) ? 1 : 0;
            story.innerHTML = `❌ ${place}: क्रम चुकीचा ठरला, पुन्हा सुरुवात करा.`;
        }
        renderProgress();
    }
    if (!unlockedTravel && allFound()) {
        unlockedTravel = true;
        progressIndex = 0;
        showMessage('सर्व चिन्हे सापडली! आता योग्य क्रमाने गड पार करा.',4000);
        await new Promise(r => setTimeout(r, 4000));
    }
    if (unlockedTravel && progressIndex >= SYMBOL_ORDER.length) {
        setButtonsEnabled(false);
        await narrate('🎉 अभिनंदन! योग्य क्रमाने सर्व गड पार झाले. काळाचा पाश तुटला आहे.');
        document.getElementById('choices').innerHTML = '';

        // Show full-screen victory fade
        const overlay = document.getElementById('victoryOverlay');
        overlay.style.pointerEvents = 'auto';
        overlay.style.opacity = '1';  // triggers 5s fade
    } else {
        startTimer();
    }
}

/* ---------- Messaging, Timer, Render... (same as before, cleaned style) ---------- */
// ...

// Show the quiz/info overlay
function showQuiz(fortName) {
    const overlay = document.getElementById('quizOverlay');
    overlay.innerHTML = '';

    // Fort heading
    const h3 = document.createElement('h3');
    h3.textContent = fortName;
    overlay.appendChild(h3);

    // Generic quiz info:
    const h5 = document.createElement('h5');
    h5.textContent = 'येथील चिन्ह जिंकण्यासाठी माहिती वाचून शेवटी दिलेल्या प्रश्नाचे उत्तर द्या.';
    overlay.appendChild(h5);

    // Cover image
    if(fortName === 'वेरुळ') {
        const coverImg = document.createElement('img');
        coverImg.src = 'shivaji_maharaj_1.jpg';
        coverImg.alt = fortName;
        coverImg.style.width = '400px';
        overlay.appendChild(coverImg);
    }
    if(fortName === 'रायगड'){
        const coverImg = document.createElement('img');
        coverImg.src = 'rajyabhishek.jpg';
        coverImg.alt = fortName;
        coverImg.style.width = '400px';
        overlay.appendChild(coverImg);
    }
    if(fortName === 'प्रतापगड'){
        const coverImg = document.createElement('img');
        coverImg.src = 'afzal.jpg';
        coverImg.alt = fortName;
        coverImg.style.width = '400px';
        overlay.appendChild(coverImg);

    }
    if(fortName === 'राजगड'){
        const coverImg = document.createElement('img');
        coverImg.src = 'rajmudra.jpg';
        coverImg.alt = fortName;
        coverImg.style.width = '400px';
        overlay.appendChild(coverImg);
    }
    if(fortName === 'तोरणा'){
        const coverImg = document.createElement('img');
        coverImg.src = 'shivaji_maharaj.jpg';
        coverImg.alt = fortName;
        coverImg.style.width = '400px';
        overlay.appendChild(coverImg);
    }

    // Some text
    const text1 = document.createElement('p');
    text1.textContent = (FORT_INFO[fortName] && FORT_INFO[fortName].text1) 
        ? FORT_INFO[fortName].text1 
        : 'या किल्ल्याबद्दल थोडक्यात माहिती...';
    overlay.appendChild(text1);

    // Fort image
    // Dictionary for fort images
    const FORT_IMAGE_FILES = {
        'वेरुळ': 'verul.jpg',
        'शिवनेरी': 'shivneri.jpg',
        'प्रतापगड': 'pratapgad.jpg',
        'राजगड': 'rajgad.jpg',
        'तोरणा': 'torna.jpg'
    };

    // Fort image
    if (FORT_IMAGE_FILES[fortName]) {
        const fortImg = document.createElement('img');
        fortImg.src = FORT_IMAGE_FILES[fortName];
        fortImg.alt = fortName;
        fortImg.style.width = '400px';
        overlay.appendChild(fortImg);
    }
    
    // More text
    const text2 = document.createElement('p');
    text2.textContent = (FORT_INFO[fortName] && FORT_INFO[fortName].text2) 
        ? FORT_INFO[fortName].text2 
        : 'अधिक माहिती इथे दिली आहे...';
    overlay.appendChild(text2);

    // Multiple choice question
    const questions = FORT_QUESTIONS[fortName];
    const q = questions[Math.floor(Math.random() * questions.length)];

    const qText = document.createElement('p');
    qText.textContent = "प्रश्न: " + q.text;
    overlay.appendChild(qText);

    const choicesDiv = document.createElement('div');
    choicesDiv.className = 'choices';

    return new Promise(resolve => {
        q.choices.forEach((choiceText, idx) => {
            const btn = document.createElement('button');
            btn.textContent = choiceText;
            btn.onclick = () => {
                overlay.innerHTML = '';
                overlay.style.display = 'none';
                resolve(idx === q.correct);
            };
            choicesDiv.appendChild(btn);
        });
        overlay.appendChild(choicesDiv);
        overlay.style.display = 'flex';
        overlay.scrollTop = 0;
    });
}
async function startGame() {
    document.getElementById('footer').style.display = 'none';  // <-- hide footer
    rules.style.display='none';
    rules.remove();
    game.style.display='block';
    await onTravelClick('वेरुळ', true);
    renderProgress();
    startTimer();
}
document.getElementById('skipIntroBtn').onclick = () => {
    skipIntro = true;
};
//startGame();
startIntro();

/*
  - Public Domain, Afzal: https://en.wikipedia.org/wiki/Afzal_Khan_(general)#/media/File:Death_of_Afzal_Khan.jpg
  - Public Domain, Pratapgad: http://en.wikipedia.org/wiki/Battle_of_Pratapgarh#/media/File:Pratapgad_(2).jpg
  - Public Domain, Rajmudra: https://commons.wikimedia.org/wiki/File:Seal_of_Shivaji.png
  - Public Domain, Ellora: https://en.wikipedia.org/wiki/Ellora_Caves#/media/File:Das_Avatara,_by_Thomas_Daniell_and_James_Wales,_1803.jpeg
  - Public Domain, Kalyan station: https://en.wikipedia.org/wiki/File:Kalyan_Junction_station_on_the_Great_Indian_Peninsula_Railway_near_Bombay_LCCN2004707348.jpg
  - CC 3.0 Unported Udaykumar PR, Durgadi: https://commons.wikimedia.org/wiki/File:Durgadi_Fort_,Kalyan,_Maharashtra_-_panoramio_%2830%29.jpg
  - Public Domain, Shaistekhan fajiti: https://commons.wikimedia.org/wiki/File:Shaistekhan_Surprised.jpg
  - Public Domain, Rajgad: https://en.wikipedia.org/wiki/File:Rajgad_Fort_in_Pune,_Maharashtra.jpg
  - Public Domain, Shivaji Maharaj: https://commons.wikimedia.org/wiki/File:Chatrapati_Shivaji_Maharaj.jpg
  - Public Domain, Coronation: https://en.wikipedia.org/wiki/Shivaji#/media/File:The_Coronation_Durbar_with_over_100_characters_depicted_in_attendance.jpg
  - Public Domain, Shivneri: https://commons.wikimedia.org/wiki/File:Shivneri_fort1.JPG
  - Public Domain, Shivaji Maharaj 1: https://commons.wikimedia.org/wiki/File:Raja_Ravi_Varma,_Shivaji_Maharaj_(Oleographic_Print).jpg
  - Public Domain, Torna fort:   https://commons.wikimedia.org/wiki/File:Torna_fort_main_gate.jpg

  - Maratha navy formed in 1654 Kalyan: https://en.wikipedia.org/wiki/Maratha_Navy
  - Rajgad was Maratha Empire first capital: https://en.wikipedia.org/wiki/Rajgad_Fort
  - Bhawani temple construction: https://pudhari.news/maharashtra/raigad/tuljabhavani-mata-pratapgadvasini-tuljabhavani-mata-shivpremis-shrine

*/
