// renderer.js
const webviews = {
    chatgpt: document.getElementById('wv-chatgpt'),
    gemini: document.getElementById('wv-gemini'),
    grok: document.getElementById('wv-grok'),
    claude: document.getElementById('wv-claude'),
    deepseek: document.getElementById('wv-deepseek')
};


const promptInput = document.getElementById('prompt-in');
const broadcastBtn = document.getElementById('broadcast-btn');
const refreshBtn = document.getElementById('refresh-btn');
const langSelector = document.getElementById('lang-selector');

const i18n = {
    en: {
        submit: "SUBMIT",
        cancel: "CANCEL",
        initializing: "Initializing...",
        askTeam: "Ask team",
        reloading: "Reloading...",
        loading: "LOADING...",
        loading: "LOADING...",
        processing: "SENDING...",
        ready: "READY",
        ready: "READY",
        incoming: "INCOMING...",
        waiting: "WAITING...",
        forceSynth: "SYNTHESIZE NOW",
        attention: "ATTENTION: TEAM HAS QUESTIONS",
        clarify: "Some members need more info to continue.",
        sendClarify: "SEND CLARIFICATION",
        allDataCollected: "All data collected. MASTER CORE starting synthesis...",
        masterCoreAnalysing: "Analyzing...",
        synthesizing: "Answers are being synthesized...",
        synthesizedAnswer: "SYNTHESIZED ANSWER"
    },
    tr: {
        submit: "GÖNDER",
        cancel: "İPTAL",
        initializing: "Hazırlanıyor...",
        askTeam: "Ekibe sor",
        reloading: "Yükleniyor...",
        loading: "YÜKLENİYOR...",
        loading: "YÜKLENİYOR...",
        processing: "GÖNDERİLİYOR...",
        ready: "HAZIR",
        ready: "HAZIR",
        incoming: "VERİ GELİYOR...",
        waiting: "BEKLENİYOR...",
        forceSynth: "HEMEN SENTEZLE",
        attention: "DİKKAT: EKİBİN SORULARI VAR",
        clarify: "Bazı üyeler analize devam etmek için ek bilgi istiyor.",
        sendClarify: "BİLGİLERİ GÖNDER",
        allDataCollected: "Tüm veriler toplandı. MASTER CORE sentezleme işlemini başlatıyor...",
        masterCoreAnalysing: "Analiz yapılıyor...",
        synthesizing: "Cevaplar sentezleniyor...",
        synthesizedAnswer: "SENTEZLENMİŞ CEVAP"
    }
};

function t(key) {
    const lang = config?.lang || 'en';
    return i18n[lang][key] || key;
}

langSelector.addEventListener('change', async (e) => {
    const newLang = e.target.value;
    // Wait for the main process to update session headers
    await window.electronAPI.updateLang(newLang);
    config.lang = newLang;
    updateUIStrings();

    // Refresh webviews to apply new language headers (hard reload)
    triggerRefresh();
});

function updateUIStrings() {
    if (!isMonitoring) {
        broadcastBtn.innerText = t('submit');
        promptInput.placeholder = t('askTeam');
    }
}

// Open Grok DevTools automatically
webviews.grok.addEventListener('did-finish-load', () => {

});

function triggerRefresh() {
    isMonitoring = false;
    const urls = {
        chatgpt: "https://chatgpt.com/?model=gpt-4o",
        claude: "https://claude.ai/new",
        gemini: "https://gemini.google.com/app",
        deepseek: "https://chat.deepseek.com/",
        grok: "https://grok.com/"
    };

    // Disable button during refresh
    broadcastBtn.disabled = true;
    broadcastBtn.innerText = t('submit');
    broadcastBtn.classList.remove('cancel');
    promptInput.placeholder = t('reloading');
    promptInput.value = "";

    Object.keys(webviews).forEach(id => {
        if (urls[id]) webviews[id].src = urls[id];
        else webviews[id].reload();
    });
}

broadcastBtn.addEventListener('click', () => {
    if (broadcastBtn.innerText === t('submit')) {
        broadcastPrompt();
    } else if (broadcastBtn.innerText === t('cancel')) {
        triggerRefresh();
    }
});

refreshBtn.addEventListener('click', triggerRefresh);

// Textarea Auto-Resize and Submit Logic
promptInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    if (this.scrollHeight > 200) {
        this.style.overflowY = 'scroll';
    } else {
        this.style.overflowY = 'hidden';
    }
});

promptInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        broadcastPrompt();
    }
});

let isMonitoring = false;
let config = null;
let lastTexts = {};
let baseTexts = {}; // Capture state BEFORE prompt
let stableCount = {};
let allConfiguredMembers = []; // Members from setup
let activeMembers = []; // Currently checked in UI
let maximizedId = null; // Track which AI is maximized
let currentSessionId = null; // Track the current active session

// Load config and init
async function initDashboard() {
    broadcastBtn.disabled = true;
    broadcastBtn.innerText = "SUBMIT";
    broadcastBtn.classList.remove('cancel');
    promptInput.placeholder = "Initializing...";

    config = await window.electronAPI.getConfig();
    if (!config) return;

    const supported = ['chatgpt', 'claude', 'gemini', 'deepseek', 'grok'];
    allConfiguredMembers = config.members.filter(id => supported.includes(id));

    // Initialize AI Accordion Structural Changes
    Object.keys(webviews).forEach(id => {
        const container = webviews[id].parentElement;
        if (container) {
            const wv = webviews[id];

            // Create Header
            const header = document.createElement('div');
            header.className = 'webview-header';
            header.id = `header-${id}`;
            header.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span class="ai-name">${id}</span>
                    <span class="ai-status"></span>
                </div>
                <div class="actions">
                    <span id="dot-${id}" class="status-dot"></span>
                    <input type="checkbox" id="check-${id}" class="ai-checkbox" checked onclick="event.stopPropagation();">
                    <span class="chevron">▼</span>
                </div>
            `;

            // Set initial loading state (No text, just red dot by default)

            // Handle Collapse
            header.onclick = (e) => {
                if (e.target.type === 'checkbox') return;
                toggleAIPanel(id);
            };


            const checkbox = header.querySelector('.ai-checkbox');
            checkbox.onchange = () => {
                // Minimum limit check
                const allChecks = document.querySelectorAll('.webview-header .ai-checkbox:checked');
                if (allChecks.length < 2) {
                    checkbox.checked = true; // Revert
                    console.log("Minimum 2 members required.");
                    return;
                }

                const dot = document.getElementById(`dot-${id}`);
                const isChecked = checkbox.checked;

                if (!isChecked) {
                    if (dot) dot.classList.remove('online');
                } else {
                    if (dot) dot.classList.remove('online');
                    if (!wv.isLoading()) {
                        if (dot) dot.classList.add('online');
                    }
                }
                updateCouncilLayout();
            };

            // Track load state for color change
            const markReady = () => {
                const dot = document.getElementById(`dot-${id}`);
                if (dot) dot.classList.add('online');
                container.classList.add('is-loaded');
                checkReadyState();
            };

            wv.addEventListener('did-finish-load', markReady);
            wv.addEventListener('did-stop-loading', markReady);

            // Create Body wrapper
            const body = document.createElement('div');
            body.className = 'webview-body';

            // Re-arrange
            container.innerHTML = '';
            container.appendChild(header);
            container.appendChild(body);
            body.appendChild(wv);
        }
    });

    // Create Checkboxes in Toolbar (Keeping the hidden logic for core functionality if needed, but primary is in accordion)
    const selectorCont = document.getElementById('member-selectors');
    if (selectorCont) selectorCont.innerHTML = '';

    updateCouncilLayout();
    checkReadyState();

    if (config.lang) {
        langSelector.value = config.lang;
    }

    // DEBUG: Open DevTools for Grok to investigate injection issues
    if (webviews.grok) {
        webviews.grok.addEventListener('dom-ready', () => {
            // webviews.grok.openDevTools();
        });
    }
}

function setAIStatus(id, state) {
    const header = document.getElementById(`header-${id}`);
    if (!header) return;
    const statusEl = header.querySelector('.ai-status');
    if (!statusEl) return;

    // Reset classes
    statusEl.classList.remove('waiting', 'processing', 'incoming', 'ready', 'loading');
    // Add new state class & update text
    statusEl.classList.add(state);
    statusEl.innerText = t(state);
}

function checkReadyState() {
    if (isMonitoring) return; // Don't interfere during session

    let allReady = true;
    activeMembers.forEach(id => {
        if (webviews[id].isLoading()) allReady = false;
    });

    if (allReady && activeMembers.length > 0) {
        broadcastBtn.disabled = false;
        broadcastBtn.innerText = t('submit');
        broadcastBtn.classList.remove('cancel');
        broadcastBtn.style.backgroundColor = "";
        promptInput.placeholder = t('askTeam');
    }
}



function toggleAIPanel(id) {
    const container = webviews[id].closest('.webview-container');
    const body = container.querySelector('.webview-body');
    const isExpanded = container.classList.contains('expanded');

    // Close all others
    allConfiguredMembers.forEach(mid => {
        const otherContainer = webviews[mid].closest('.webview-container');
        if (otherContainer && otherContainer !== container) {
            otherContainer.classList.remove('expanded');
            const otherBody = otherContainer.querySelector('.webview-body');
            if (otherBody) otherBody.style.height = '0px';
        }
    });

    if (!isExpanded) {
        container.classList.add('expanded');
        // Set explicit height to trigger transition
        body.style.height = '600px';
    } else {
        container.classList.remove('expanded');
        body.style.height = '0px';
    }
}

function updateCouncilLayout() {
    activeMembers = [];
    allConfiguredMembers.forEach(id => {
        const cb = document.getElementById(`check-${id}`);
        const isChecked = cb ? cb.checked : false;
        const container = webviews[id].closest('.webview-container');

        if (container) {
            // container.style.display = 'block'; // Always visible
            if (isChecked) {
                container.classList.remove('disabled');
                activeMembers.push(id);
            } else {
                container.classList.add('disabled');
            }
        }
    });

    // Vertical Accordion doesn't need complex grid logic anymore
    const grid = document.getElementById('team-grid');
    if (activeMembers.length === 0) {
        grid.style.display = 'none';
    } else {
        grid.style.display = 'flex';
        grid.style.flexDirection = 'column';
    }
}

window.addEventListener('DOMContentLoaded', initDashboard);

async function broadcastPrompt() {
    const rawPrompt = promptInput.value;
    if (!rawPrompt) return;

    broadcastBtn.innerText = t('cancel');
    broadcastBtn.classList.add('cancel');
    broadcastBtn.style.backgroundColor = "";
    broadcastBtn.disabled = false;

    const teamPrefix = `You are a senior specialist of the 'AI-TEAM' Unit.

CRITICAL INSTRUCTIONS:
1. RESPONSE LANGUAGE: ALWAYS respond in TURKISH(TÜRKÇE).
2. Your response must be in STRICT JSON format ONLY. 
3. DO NOT include any conversational text, markdown blocks(\` \` \`), or headers.
4. Provide your SINGLE BEST definitive response. NO ALTERNATIVES. NEVER offer options like "or", "alternatively". MAKE A DECISION.
5. JSON SCHEMA: Create a single object with these keys: 
   - "detailed_answer": (Your comprehensive final response in Turkish)
   - "summary": (A one-sentence conclusion in Turkish)
   - "confidence_score": (A numeric value 0-100)
   - "clarifying_question": (If STRICTLY necessary for a better answer, ask exactly ONE question to the user in Turkish. Otherwise, leave as null.)

IMPORTANT: Only ask a question if you are truly missing critical information. If you have enough info, keep it null. DO NOT GIVE MULTIPLE CHOICE ANSWERS.

QUESTION: `;

    const finalPrompt = teamPrefix + rawPrompt;

    if (broadcastBtn.dataset.mode === "clarify") {
        sendClarification(rawPrompt);
        return;
    }

    isMonitoring = true;

    const baselineTasks = activeMembers.map(async (id) => {
        try {
            const baseline = await scrapeLastResponse(id);
            baseTexts[id] = baseline || "(bos)";
            lastTexts[id] = baseTexts[id];
            stableCount[id] = 0;
        } catch (e) {
            baseTexts[id] = "(hata)";
        }
    });

    await Promise.all(baselineTasks);

    promptInput.value = '';
    promptInput.style.height = 'auto';

    const leadMessages = document.getElementById('lead-messages');
    const userMsg = document.createElement('div');
    userMsg.className = 'message user';
    userMsg.innerText = rawPrompt;
    // Reset Global Status Indicators
    activeMembers.forEach(id => setAIStatus(id, 'processing'));

    leadMessages.scrollTop = leadMessages.scrollHeight;

    if (activeMembers.includes('chatgpt')) injectChatGPT(finalPrompt);
    if (activeMembers.includes('claude')) injectClaude(finalPrompt);
    if (activeMembers.includes('deepseek')) injectDeepSeek(finalPrompt);
    if (activeMembers.includes('gemini')) injectGemini(finalPrompt);
    if (activeMembers.includes('grok')) injectGrok(finalPrompt);

    startAutoPilot();
}

function parseAIResponse(text) {
    if (!text) return "";
    try {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            const jsonStr = text.substring(start, end + 1);
            const parsed = JSON.parse(jsonStr);
            return parsed.detailed_answer || parsed.answer || text;
        }
        return text;
    } catch (e) {
        // Fallback: Try Regex if JSON.parse failed (common with newlines in LLM output)
        const match = text.match(/"detailed_answer":\s*"(.*?)"/s);
        // Note: s flag for dotAll (if supported in this env) or use [\s\S]*?
        if (match && match[1]) {
            return match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }

        // Try alternate regex handling generic "answer" key or just pure text extraction if needed
        // But for now, return original if all else fails
        return text;
    }
}

function isValidJSON(text) {
    if (!text || text.length < 10) return false;
    try {
        // Try to find JSON object bounds
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1 || end < start) return false;

        const jsonStr = text.substring(start, end + 1);
        JSON.parse(jsonStr);
        return true;
    } catch (e) {
        return false;
    }
}

async function startAutoPilot() {
    const checkInterval = setInterval(async () => {
        if (!isMonitoring) {
            clearInterval(checkInterval);
            broadcastBtn.innerText = t('submit');
            broadcastBtn.style.backgroundColor = "#28a745";
            broadcastBtn.disabled = false;
            const oldForce = document.getElementById('force-synth-btn');
            if (oldForce) oldForce.remove();
            return;
        }

        if (!document.getElementById('force-synth-btn')) {
            const forceBtn = document.createElement('button');
            forceBtn.id = 'force-synth-btn';
            forceBtn.innerText = t('forceSynth');
            forceBtn.className = 'action-btn';
            forceBtn.style.marginRight = '4px';
            forceBtn.style.backgroundColor = '#f59e0b';
            forceBtn.style.color = 'white';
            forceBtn.onclick = () => {
                isMonitoring = false;
                clearInterval(checkInterval);
                triggerJudgeDecision(lastTexts);
            };
            broadcastBtn.parentElement.insertBefore(forceBtn, broadcastBtn);
        }

        const currentVals = {};
        await Promise.all(activeMembers.map(async (id) => {
            currentVals[id] = await scrapeLastResponse(id);
        }));

        activeMembers.forEach(id => {
            const val = currentVals[id] || "";
            // Logic:
            // 1. If length > 10 AND different from baseline => We have NEW data.
            // 2. If same as last check => Stable++ -> Ready
            // 3. If changed from last check => Stable=0 -> Incoming
            // 4. If same as baseline => Analyzing (waiting for first token)

            if (val.length > 10 && val !== baseTexts[id]) {
                const isJson = isValidJSON(val);

                if (val === lastTexts[id]) {
                    stableCount[id]++;

                    // IF we have valid JSON, we can be ready faster (e.g. 2 stable checks)
                    // IF NOT valid JSON, we wait longer or never ready (until timeout/valid)

                    if (isJson && stableCount[id] >= 2) {
                        setAIStatus(id, 'ready');
                    } else if (stableCount[id] >= 8) {
                        // Fallback: If it's been stable for ~16s but still not valid JSON, 
                        // maybe it failed to format. Mark ready to avoid infinite wait.
                        setAIStatus(id, 'ready');
                    } else {
                        // Still stabilizing or waiting for JSON close
                        setAIStatus(id, 'incoming');
                    }
                } else {
                    stableCount[id] = 0;
                    setAIStatus(id, 'incoming');
                }
            } else {
                // No new text yet => AI is thinking (or still sending)
                setAIStatus(id, 'processing');
                stableCount[id] = 0;
            }
            lastTexts[id] = val;
        });

        const allDone = activeMembers.every(id => {
            const isReady = (isValidJSON(lastTexts[id]) && stableCount[id] >= 2) || stableCount[id] >= 8;
            const hasData = lastTexts[id] !== baseTexts[id] && lastTexts[id].length > 10;
            return isReady && hasData;
        });

        if (allDone) {
            isMonitoring = false;
            clearInterval(checkInterval);
            triggerJudgeDecision(lastTexts);
        }
    }, 2000);
}

async function triggerJudgeDecision(results) {
    let questionsFound = [];
    activeMembers.forEach(id => {
        try {
            const parsed = JSON.parse(results[id]);
            if (parsed.clarifying_question && parsed.clarifying_question !== "null") {
                questionsFound.push({ id, q: parsed.clarifying_question });
            }
        } catch (e) {
            const qMatch = results[id].match(/"clarifying_question":\s*"([^"]+)"/i);
            if (qMatch && qMatch[1] !== "null") {
                questionsFound.push({ id, q: qMatch[1] });
            }
        }
    });

    const leadMessages = document.getElementById('lead-messages');

    if (questionsFound.length > 0) {
        const alertMsg = document.createElement('div');
        alertMsg.className = 'message user';
        alertMsg.style.background = '#fbbf2433';
        alertMsg.style.borderColor = '#fbbf24';
        alertMsg.innerHTML = `<strong>${t('attention')}</strong><br>${t('clarify')}`;
        leadMessages.appendChild(alertMsg);

        questionsFound.forEach(item => {
            const qBox = document.createElement('div');
            qBox.className = 'message assistant';
            qBox.style.borderLeft = '4px solid #fbbf24';
            qBox.innerHTML = `<strong>${item.id.toUpperCase()}:</strong><br>${item.q}`;
            leadMessages.appendChild(qBox);
        });

        broadcastBtn.innerText = t('sendClarify');
        broadcastBtn.style.backgroundColor = "#fbbf24";
        broadcastBtn.dataset.mode = "clarify";
        broadcastBtn.dataset.context = JSON.stringify(questionsFound);
    } else {
        let membersReport = "EKİP RAPORU:\n";
        activeMembers.forEach((id) => {
            membersReport += `\n[${id.toUpperCase()}]:\n${results[id]}\n`;
        });
        window.currentReport = membersReport;
        startMasterJudgeSynthesis();
    }
}

async function sendClarification(answer) {
    const qFound = JSON.parse(broadcastBtn.dataset.context || "[]");
    let infoBlock = "KULLANICI GERİ BİLDİRİMİ:\n";
    qFound.forEach(item => { infoBlock += `- ${item.id.toUpperCase()} tarafına cevap: "${answer}"\n`; });

    const followUpPrompt = `${infoBlock}\n\nLütfen yukarıdaki yeni bilgiyi kullanarak önceki analizini gözden geçir ve nihai cevabını güncelle. Yine STRICT JSON formatında cevap ver.`;

    broadcastBtn.innerText = t('cancel');
    broadcastBtn.classList.add('cancel');
    broadcastBtn.style.backgroundColor = "";
    delete broadcastBtn.dataset.mode;
    delete broadcastBtn.dataset.context;
    promptInput.value = '';

    const leadMessages = document.getElementById('lead-messages');
    const msg = document.createElement('div');
    msg.className = 'message user';
    msg.innerText = answer;
    leadMessages.appendChild(msg);

    activeMembers.forEach(id => {
        lastTexts[id] = "";
        stableCount[id] = 0;
        setAIStatus(id, 'processing');
    });

    if (activeMembers.includes('chatgpt')) injectChatGPT(followUpPrompt);
    if (activeMembers.includes('claude')) injectClaude(followUpPrompt);
    if (activeMembers.includes('deepseek')) injectDeepSeek(followUpPrompt);
    if (activeMembers.includes('gemini')) injectGemini(followUpPrompt);
    if (activeMembers.includes('grok')) injectGrok(followUpPrompt);

    startAutoPilot();
}

async function startMasterJudgeSynthesis() {
    if (!window.currentReport) return;

    const leadMessages = document.getElementById('lead-messages');

    const synthesisPrompt = `
SEN 'AI-TEAM' EKİBİNİN 'MASTER CORE' BİRİMİSİN.
Aşağıda ekip üyelerinden gelen farklı yanıtlar içeren bir rapor var. 

GÖREVİN:
1. Bu yanıtları analiz et, ortak noktaları ve çelişkileri bul.
2. Nihai kararı TÜRKÇE, tarafsız ve profesyonel bir dille açıkla.
3. ÇOK ÖNEMLİ: Cevabının sonunda asla "yardımcı olabilir miyim?", "başka bir sorun var mı?" gibi sorular sorma. Sadece sentezi yap ve bitir.
4. ÇIKTI FORMATI: Asla "MASTER CORE:", "ANALİZ RAPORU:" gibi başlıklar kullanma. Sadece doğrudan sentezlenmiş cevabı yaz.

EKİP RAPORU:
${window.currentReport}
    `;

    const judgeMsg = document.createElement('div');
    judgeMsg.className = 'message assistant master-core';
    judgeMsg.innerHTML = `<div class="content" style="color: #6366f1; font-style: italic;">${t('synthesizing')}</div>`;
    leadMessages.appendChild(judgeMsg);
    judgeMsg.scrollIntoView({ behavior: 'smooth' });

    injectGemini(synthesisPrompt);

    let stableChecks = 0;
    let lastGeminiVal = "";
    const checkSynthesis = setInterval(async () => {
        const geminiResponse = await scrapeLastResponse('gemini');
        if (geminiResponse && geminiResponse.length > 50 && !geminiResponse.includes("EKİP RAPORU")) {
            const cleanResponse = parseAIResponse(geminiResponse);
            judgeMsg.innerHTML = `<strong>${t('synthesizedAnswer')}:</strong><br><div class="content">${cleanResponse}</div>`;
            judgeMsg.style.background = 'transparent';
            judgeMsg.style.borderLeft = 'none';
            judgeMsg.style.color = '#d1d1d1';

            leadMessages.scrollTop = leadMessages.scrollHeight;

            if (geminiResponse === lastGeminiVal) {
                stableChecks++;
            } else {
                stableChecks = 0;
            }
            lastGeminiVal = geminiResponse;

            if (stableChecks >= 3) {
                clearInterval(checkSynthesis);
            }
        }
    }, 2000);
}

// Helper to scrape text from webviews
async function scrapeLastResponse(service) {
    const wv = webviews[service];
    let code = `
        (function() {
            try {
                // 1. Broad selectors for message containers
                const selectors = [
                    'div.font-claude-message', 'div.font-user-message', 
                    '[data-message-author-role]', 
                    '.agent-turn-details', '.message-row-assistant', 
                    'article', '.q-message-content',
                    '.prose', '.markdown-content', '.ds-markdown',
                    'div[dir="ltr"]', 'pre', 'code',
                    '.model-response-text', '.message-content', 'model-response' // Gemini
                ];
                
                const containers = Array.from(document.querySelectorAll(selectors.join(',')))
                    .filter(node => node.innerText.trim().length > 10);
                
                if (containers.length === 0) return { text: "", isAssistant: false };

                // 2. Get the absolutely last container
                // For Gemini/others that split messages, we need to ensure we get the full block.
                // Often the 'last' node found by querySelectorAll might be just a part if selectors are too granular.
                // But with 'model-response' or 'message-content', we should get the wrapper.
                
                let lastNode = containers[containers.length - 1];
                
                // Gemini Specific Fix: If we found a model-response, use that as the source of truth
                const geminiResponse = Array.from(document.querySelectorAll('model-response, .model-response-text')).pop();
                if (geminiResponse) {
                    lastNode = geminiResponse;
                }

                const text = lastNode.innerText.trim();
                
                // 3. Robust Speaker Detection
                const isExplicitUser = 
                    lastNode.classList.contains('font-user-message') || 
                    lastNode.getAttribute('data-message-author-role') === 'user';
                
                const isExplicitAssistant = 
                    lastNode.classList.contains('font-claude-message') || 
                    lastNode.getAttribute('data-message-author-role') === 'assistant' ||
                    lastNode.tagName === 'PRE' || lastNode.tagName === 'CODE';

                // If it contains our long prefix, it's likely a user message UNLESS 
                // it's inside an explicit assistant container.
                const hasPromptPrefix = text.includes("You are a senior specialist");
                
                let isAssistant = isExplicitAssistant || (!isExplicitUser && !hasPromptPrefix);
                
                // Final override: if it's an explicit user node, it's not assistant
                if (isExplicitUser) isAssistant = false;

                // 4. Handle states
                if (!isAssistant && hasPromptPrefix) {
                    return { text: "WAITING_FOR_AI", isAssistant: false };
                }

                // 5. Cleanup
                const cleanText = text
                    .replace(/\`\`\`json/gi, '')
                    .replace(/\`\`\`/g, '')
                    .replace(/Assistant\\n/gi, '')
                    .trim();

                return { text: cleanText, isAssistant: isAssistant && cleanText.length > 5 };
            } catch (e) { return { text: "", isAssistant: false }; }
        })();
`;

    try {
        const result = await wv.executeJavaScript(code);
        if (result && result.isAssistant) {
            return result.text;
        }
        return "";
    } catch (e) {
        return "";
    }
}

// --- Injection Logic ---

function injectChatGPT(text) {
    const wv = webviews.chatgpt;
    const safeText = JSON.stringify(text);
    const code = `
    (function () {
        try {
            const ta = document.querySelector('#prompt-textarea');
            if (ta) {
                ta.focus();
                document.execCommand('selectAll', false, null);
                document.execCommand('insertText', false, ${safeText});
                ta.dispatchEvent(new Event('input', { bubbles: true }));
                setTimeout(() => {
                    const btn = document.querySelector('button[data-testid="send-button"]');
                    if (btn && !btn.disabled) btn.click();
                }, 500);
            }
        } catch (e) {
            console.error("Injected Script Error (ChatGPT):", e);
        }
    })();
`;
    wv.executeJavaScript(code).catch(e => console.error("Webview Exec Error (ChatGPT):", e));
}

function injectGemini(text) {
    const wv = webviews.gemini;
    const safeText = JSON.stringify(text);
    const code = `
    (function () {
        try {
            // Simplified, proven strategy
            const editor = document.querySelector('rich-textarea > div > p') ||
                           document.querySelector('div[contenteditable="true"][role="textbox"]');

            if (editor) {
                editor.focus();
                
                // 1. Select All & Insert
                document.execCommand('selectAll', false, null);
                document.execCommand('insertText', false, ${safeText});
                
                // 2. Trigger Input events extensively to wake up Gemini's listeners
                editor.dispatchEvent(new Event('input', { bubbles: true }));
                
                const rt = editor.closest('rich-textarea');
                if (rt) rt.dispatchEvent(new Event('input', { bubbles: true }));

                // 3. Click Send with delay
                setTimeout(() => {
                    const send = document.querySelector('button[aria-label="Send message"]') ||
                                 document.querySelector('button[aria-label="Send"]');
                    
                    if (send) {
                        if (send.disabled) { 
                             // Force enable if still disabled (sometimes happens with fast injection)
                             send.removeAttribute('disabled');
                             send.click();
                        } else {
                             send.click();
                        }
                    } else {
                        // Enter fallback
                        const enterEvent = new KeyboardEvent('keydown', {
                            key: 'Enter', code: 'Enter', keyCode: 13, which: 13, 
                            bubbles: true, cancelable: true 
                        });
                        editor.dispatchEvent(enterEvent);
                    }
                }, 800);
            }
        } catch (e) {
            console.error("Injected Script Error (Gemini):", e);
        }
    })();
`;
    wv.executeJavaScript(code).catch(e => console.error("Webview Exec Error (Gemini):", e));
}

function injectGrok(text) {
    const wv = webviews.grok;
    const safeText = JSON.stringify(text);
    const code = `
    (function() {
        try {
            console.log("=== GROK INJECTION START ===");

            // 1. Find the REAL visible input field
            const allInputs = Array.from(document.querySelectorAll('textarea, div[contenteditable="true"], [role="textbox"], .proseMirror'));
            const input = allInputs.find(el => {
                const r = el.getBoundingClientRect();
                return r.width > 0 && r.height > 0 && r.top > 50; 
            }) || allInputs[0];
            
            if (!input) {
                console.error("No input found! Checking for New Chat or Login...");
                const actionBtn = Array.from(document.querySelectorAll('button, a')).find(el => {
                    const t = el.innerText.toLowerCase();
                    return t.includes('yeni') || t.includes('new chat') || t.includes('oturum aç') || t.includes('sign in');
                });
                if (actionBtn) {
                    actionBtn.click();
                    return "CLICKED_ACTION";
                }
                return "FAIL: NO_INPUT";
            }
            
            input.focus();
            input.click();
            
            // 2. Set the text
            const textToInject = ${safeText};
            if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
                input.value = textToInject;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
                // For contenteditable
                input.innerText = textToInject; // Direct set if execCommand fails
                document.execCommand('selectAll', false, null);
                document.execCommand('insertText', false, textToInject);
                ['input', 'change', 'compositionend'].forEach(name => {
                    input.dispatchEvent(new Event(name, { bubbles: true }));
                });
            }
            
            // 3. Find and click the button
            setTimeout(() => {
                const inputRect = input.getBoundingClientRect();
                const allClickables = Array.from(document.querySelectorAll('button, [role="button"], a, div[aria-label*="send"]'));
                
                const isNoise = (el) => {
                    const label = (el.ariaLabel || el.title || el.innerText || "").toLowerCase();
                    const html = el.innerHTML.toLowerCase();
                    const rect = el.getBoundingClientRect();
                    const noise = ['attach', 'file', 'image', 'media', 'dosya', 'resim', 'plus', 'paperclip', 
                                   'banner', 'gizle', 'kapat', 'hide', 'close', 'dismiss', 'satış', 'sale', 'promo', 
                                   'search', 'sidebar', 'özel', 'private', 'share', 'paylaş'];
                    if (noise.some(word => label.includes(word) || html.includes(word))) return true;
                    if (Math.abs(rect.top - inputRect.top) > 300) return true;
                    return false;
                };

                // Strategy A: SVG Icon match
                let sendBtn = allClickables.find(el => {
                    if (el.offsetParent === null || isNoise(el)) return false;
                    const svg = el.querySelector('svg');
                    if (!svg) return false;
                    const d = el.innerHTML;
                    return d.includes('M12 2') || d.includes('M2 21') || d.includes('l7-7') || d.includes('M3 12') || d.includes('M6 12') || d.includes('m12');
                });

                // Strategy B: Aria Label match
                if (!sendBtn) {
                    sendBtn = allClickables.find(el => {
                        const l = (el.ariaLabel || el.title || "").toLowerCase();
                        return (l.includes('send') || l.includes('gönder')) && !isNoise(el);
                    });
                }

                // Strategy C: Right-most candidate
                if (!sendBtn) {
                    const candidates = allClickables.filter(el => el.offsetParent !== null && !isNoise(el));
                    if (candidates.length > 0) {
                        sendBtn = candidates.sort((a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().left)[0];
                    }
                }

                if (sendBtn) {
                    sendBtn.focus();
                    sendBtn.click();
                    // Double tap with Enter for safety
                    setTimeout(() => {
                        const enterEv = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true });
                        input.dispatchEvent(enterEv);
                    }, 100);
                } else {
                    console.log("Using Enter key fallback");
                    ['keydown', 'keypress', 'keyup'].forEach(type => {
                        input.dispatchEvent(new KeyboardEvent(type, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
                    });
                }
            }, 1000);
            
            return "SUCCESS";
        } catch(e) {
            console.error('Grok injection error:', e);
            return "ERROR: " + e.message;
        }
    })();
`;
    wv.executeJavaScript(code).then(res => console.log("Grok injection result:", res))
        .catch(e => console.error("Grok exec error:", e));
}

function injectClaude(text) {
    const wv = webviews.claude;
    const safeText = JSON.stringify(text);
    const code = `
    (function () {
        try {
            const editor = document.querySelector('div[contenteditable="true"].ProseMirror') ||
                document.querySelector('div[contenteditable="true"]') ||
                document.querySelector('[role="textbox"]');
            if (editor) {
                editor.focus();
                document.execCommand('selectAll', false, null);
                document.execCommand('insertText', false, ${safeText});

                // Force state update for React/ProseMirror
                ['input', 'change', 'compositionend'].forEach(name => {
                    editor.dispatchEvent(new Event(name, { bubbles: true }));
                });

                setTimeout(() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const btn = buttons.find(b => {
                        const l = (b.ariaLabel || b.title || "").toLowerCase();
                        return l.includes("send message") || l.includes("send prompt");
                    }) || document.querySelector('button.bg-brand-500') || document.querySelector('button:has(svg)');

                    if (btn && !btn.disabled) {
                        btn.click();
                    } else {
                        // Systematic Enter key fallback
                        const kEvents = ['keydown', 'keypress', 'keyup'];
                        kEvents.forEach(type => {
                            editor.dispatchEvent(new KeyboardEvent(type, {
                                key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true
                            }));
                        });
                    }
                }, 1200);
            }
        } catch (e) {
            console.error("Injected Script Error (Claude):", e);
        }
    })();
`;
    wv.executeJavaScript(code).catch(e => console.error("Claude Error:", e));
}

function injectDeepSeek(text) {
    const wv = webviews.deepseek;
    const safeText = JSON.stringify(text);
    const code = `
    (function () {
        try {
            const ta = document.querySelector('textarea') || document.getElementById('chat-input');
            if (ta) {
                ta.focus();
                document.execCommand('selectAll', false, null);
                document.execCommand('insertText', false, ${safeText});
                ta.dispatchEvent(new Event('input', { bubbles: true }));
                setTimeout(() => {
                    const send = document.querySelector('div[role="button"][aria-label="Send"]') ||
                        document.querySelector('button[type="submit"]') ||
                        document.querySelector('div.ds-chat-input-send-button');
                    if (send) {
                        send.click();
                    } else {
                        // Fallback: Enter key
                        ta.dispatchEvent(new KeyboardEvent('keydown', {
                            key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
                        }));
                    }
                }, 1000);
            }
        } catch (e) {
            console.error("Injected Script Error (DeepSeek):", e);
        }
    })();
`;
    wv.executeJavaScript(code).catch(e => console.error("DeepSeek Error:", e));
}




