document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const modal = document.getElementById('generatorModal');
    const createBtn = document.querySelector('.create-btn');
    const closeBtns = document.querySelectorAll('.close-btn');
    const generateBtn = document.getElementById('generateBtn');
    const resultBox = document.getElementById('resultBox');
    const modalLoader = document.getElementById('modalLoader');
    const movieIdeaInput = document.getElementById('movieIdea');
    const genreSelect = document.getElementById('genreSelect');
    
    // View Elements
    const views = {
        home: document.getElementById('homeView'),
        projects: document.getElementById('projectsView'),
        templates: document.getElementById('templatesView'),
        results: document.getElementById('resultsView')
    };
    
    // Nav Elements
    const navLogo = document.getElementById('navHomeLogo');
    const navProjects = document.getElementById('navProjects');
    const navTemplates = document.getElementById('navTemplates');
    const backToHomeBtn = document.getElementById('backToHomeBtn');
    const exportBtnManual = document.getElementById('exportBtn');

    // Chat Elements
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const chatHistoryBox = document.getElementById('chatHistory');
    
    // Refine Elements
    const refineStoryBtn = document.getElementById('refineStoryBtn');
    const refineModal = document.getElementById('refineModal');
    const refineIdea = document.getElementById('refineIdea');
    const submitRefineBtn = document.getElementById('submitRefineBtn');
    const refineModalLoader = document.getElementById('refineModalLoader');

    // Projects Grid
    const projectsGrid = document.getElementById('projectsGrid');
    const projectsEmpty = document.getElementById('projectsEmpty');

    // Settings Elements
    const settingsModal = document.getElementById('settingsModal');
    const navSettings = document.getElementById('navSettings');
    const elevenLabsKeyInput = document.getElementById('elevenLabsKeyInput');
    const unsplashKeyInput = document.getElementById('unsplashKeyInput');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const settingsSavedMsg = document.getElementById('settingsSavedMsg');
    const toggleElevenLabsKey = document.getElementById('toggleElevenLabsKey');
    const toggleUnsplashKey = document.getElementById('toggleUnsplashKey');

    // Trailer Elements
    const generateAudioBtn = document.getElementById('generateAudioBtn');
    const trailerAudioStatus = document.getElementById('trailerAudioStatus');
    const trailerAudioPlayer = document.getElementById('trailerAudioPlayer');
    const trailerQueryInfo = document.getElementById('trailerQueryInfo');

    // --- Deployment Settings ---
    // If you deploy the backend to Render, replace the empty string below with your Render .onrender.com URL
    // e.g. 'https://ai-movie-studio-backend.onrender.com'
    const PRODUCTION_API_URL = ''; 

    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://127.0.0.1:8000' 
        : PRODUCTION_API_URL;
    
    // STATE
    let currentConceptRaw = "";
    let currentChatHistory = [];
    let savedProjects = JSON.parse(localStorage.getItem('aiMovieProjects')) || [];

    // --- Load Settings from localStorage ---
    function loadSettings() {
        const savedElevenLabsKey = localStorage.getItem('elevenLabsApiKey') || '';
        const savedUnsplashKey = localStorage.getItem('unsplashApiKey') || '';
        if (elevenLabsKeyInput) elevenLabsKeyInput.value = savedElevenLabsKey;
        if (unsplashKeyInput) unsplashKeyInput.value = savedUnsplashKey;
    }
    loadSettings();

    // --- Settings Modal Logic ---
    if (navSettings) {
        navSettings.addEventListener('click', (e) => {
            e.preventDefault();
            settingsModal.style.display = 'block';
        });
    }

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            const elevenKey = elevenLabsKeyInput.value.trim();
            const unsplashKey = unsplashKeyInput.value.trim();
            localStorage.setItem('elevenLabsApiKey', elevenKey);
            localStorage.setItem('unsplashApiKey', unsplashKey);
            settingsSavedMsg.style.display = 'block';
            setTimeout(() => { settingsSavedMsg.style.display = 'none'; }, 2500);
        });
    }

    // Toggle key visibility
    function setupToggleKey(toggleBtn, inputEl) {
        if (!toggleBtn || !inputEl) return;
        toggleBtn.addEventListener('click', () => {
            const isPassword = inputEl.type === 'password';
            inputEl.type = isPassword ? 'text' : 'password';
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
            }
        });
    }
    setupToggleKey(toggleElevenLabsKey, elevenLabsKeyInput);
    setupToggleKey(toggleUnsplashKey, unsplashKeyInput);

    // --- Projects Logic ---
    function saveCurrentProject() {
        if (!currentConceptRaw) return;
        const lines = currentConceptRaw.split('\n');
        let titleMatch = "Untitled Project";
        let titleLine = lines.find(l => l.toLowerCase().includes('title:'));
        if(titleLine) { titleMatch = titleLine.replace(/.*title:/i, '').replace(/\*/g, '').trim(); }
        else { titleMatch = "Movie Concept " + new Date().toLocaleTimeString(); }
        
        const newProj = { id: Date.now(), title: titleMatch, content: currentConceptRaw };
        savedProjects.unshift(newProj);
        localStorage.setItem('aiMovieProjects', JSON.stringify(savedProjects));
        renderProjects();
    }

    function renderProjects() {
        if(savedProjects.length > 0) {
            projectsEmpty.style.display = 'none';
            projectsGrid.style.display = 'grid';
            projectsGrid.innerHTML = '';
            savedProjects.forEach(proj => {
                const numChars = (proj.content.match(/\d+\.\s+\*\*(.*?)\*\*/g) || []).length;
                const div = document.createElement('div');
                div.className = 'project-item-card';
                div.innerHTML = `
                    <button class="delete-project-btn" data-id="${proj.id}" title="Delete Project"><i class="fa-solid fa-trash-can"></i></button>
                    <h3>🎬 ${proj.title}</h3>
                    <p>${numChars} Characters</p>
                    <button class="load-project-btn" data-id="${proj.id}">Load Focus</button>
                `;
                projectsGrid.appendChild(div);
            });
            document.querySelectorAll('.load-project-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    const proj = savedProjects.find(p => p.id == id);
                    if(proj) {
                        currentConceptRaw = proj.content;
                        currentChatHistory = [];
                        chatHistoryBox.innerHTML = '<div style="color: #9ca3af; text-align: center; font-style: italic; margin-top: auto; margin-bottom: auto;">Ask me anything to expand on this concept!</div>';
                        renderConcept(currentConceptRaw);
                        updateChatLock();
                        switchView('results');
                    }
                });
            });

            document.querySelectorAll('.delete-project-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = e.currentTarget.getAttribute('data-id');
                    if(confirm('Are you sure you want to delete this project?')) {
                        savedProjects = savedProjects.filter(p => p.id != id);
                        localStorage.setItem('aiMovieProjects', JSON.stringify(savedProjects));
                        renderProjects();
                    }
                });
            });
        } else {
            projectsEmpty.style.display = 'flex';
            projectsGrid.style.display = 'none';
        }
    }
    
    // Init projects
    renderProjects();

    // --- View Navigation Logic ---
    function switchView(viewName) {
        Object.values(views).forEach(view => {
            view.style.display = 'none';
            view.classList.remove('active');
        });
        if(views[viewName]) {
            views[viewName].style.display = 'block';
            setTimeout(() => views[viewName].classList.add('active'), 10);
            if(viewName === 'projects') renderProjects();
        }
    }

    navLogo.addEventListener('click', () => switchView('home'));
    navProjects.addEventListener('click', (e) => { e.preventDefault(); switchView('projects'); });
    navTemplates.addEventListener('click', (e) => { e.preventDefault(); switchView('templates'); });
    backToHomeBtn.addEventListener('click', () => { switchView('home'); });

    // Initial View setup
    switchView('home');

    // --- Modal Logic ---
    createBtn.addEventListener('click', () => {
        movieIdeaInput.value = '';
        modal.style.display = 'block';
    });

    closeBtns.forEach(btn => btn.addEventListener('click', () => {
        modal.style.display = 'none';
        refineModal.style.display = 'none';
        settingsModal.style.display = 'none';
    }));

    window.addEventListener('click', (event) => {
        if (event.target === modal) modal.style.display = 'none';
        if (event.target === refineModal) refineModal.style.display = 'none';
        if (event.target === settingsModal) settingsModal.style.display = 'none';
    });

    // --- Quick Start Logic ---
    document.querySelectorAll('.quick-card').forEach(card => {
        card.addEventListener('click', () => {
            const titleElement = card.querySelector('.card-title-lg');
            if (titleElement) {
                movieIdeaInput.value = titleElement.innerText;
                modal.style.display = 'block';
            }
        });
    });

    // --- Template Cards Logic ---
    document.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', () => {
            const idea = card.getAttribute('data-idea');
            movieIdeaInput.value = idea;
            modal.style.display = 'block';
        });
    });

    // --- Export Logic ---
    function downloadAsText() {
        if (!currentConceptRaw) {
            alert("No concept to export! Generate one first.");
            return;
        }
        
        // Find title
        let title = "Movie Concept";
        const titleMatch = currentConceptRaw.match(/title:\s*(.*)/i);
        if (titleMatch) title = titleMatch[1].replace(/[*#]/g, '').trim();

        const blob = new Blob([currentConceptRaw], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    if (exportBtnManual) {
        exportBtnManual.addEventListener('click', (e) => {
            e.preventDefault();
            downloadAsText();
        });
    }

    // ─────────────────────────────────────────────────────
    //  UNSPLASH IMAGE SEARCH
    // ─────────────────────────────────────────────────────

    /**
     * Build a smart Unsplash search query from a character name + surrounding description text.
     * e.g. "Elara - brilliant coder" → "hacker programmer woman portrait"
     */
    function buildUnsplashQuery(charName, charDescription) {
        const combined = (charName + ' ' + charDescription).toLowerCase();

        // Keyword mapping: if certain words appear in name/desc, we emit cinematic search terms
        const mappings = [
            { triggers: ['hacker', 'coder', 'programmer', 'developer', 'engineer', 'tech', 'software'], keywords: ['hacker programmer portrait', 'software engineer coding'] },
            { triggers: ['detective', 'investigator', 'inspector', 'sleuth'], keywords: ['detective noir portrait', 'private investigator'] },
            { triggers: ['soldier', 'warrior', 'fighter', 'marine', 'veteran', 'military'], keywords: ['military soldier portrait', 'warrior cinematic'] },
            { triggers: ['scientist', 'researcher', 'physicist', 'chemist', 'biologist'], keywords: ['scientist laboratory portrait', 'researcher cinematic'] },
            { triggers: ['witch', 'wizard', 'mage', 'sorcerer', 'magical', 'magic'], keywords: ['fantasy wizard portrait', 'magical sorcerer'] },
            { triggers: ['alien', 'extraterrestrial'], keywords: ['alien extraterrestrial sci-fi portrait'] },
            { triggers: ['robot', 'android', 'cyborg', 'ai', 'artificial'], keywords: ['cyborg android sci-fi portrait'] },
            { triggers: ['assassin', 'hitman', 'mercenary', 'spy', 'secret agent'], keywords: ['spy assassin cinematic portrait', 'secret agent'] },
            { triggers: ['villain', 'antagonist', 'evil', 'dark', 'sinister'], keywords: ['villain dark cinematic portrait'] },
            { triggers: ['hero', 'protagonist', 'brave', 'courageous', 'leader'], keywords: ['heroic cinematic portrait', 'leader character'] },
            { triggers: ['doctor', 'physician', 'surgeon', 'nurse', 'medic'], keywords: ['doctor medical portrait', 'physician cinematic'] },
            { triggers: ['artist', 'painter', 'sculptor', 'creative', 'musician', 'singer'], keywords: ['artist creative portrait', 'musician cinematic'] },
            { triggers: ['pilot', 'astronaut', 'cosmonaut', 'spaceman'], keywords: ['astronaut pilot portrait', 'space explorer cinematic'] },
            { triggers: ['pirate', 'buccaneer', 'sailor', 'captain', 'seafarer'], keywords: ['pirate captain portrait', 'seafarer cinematic'] },
            { triggers: ['knight', 'paladin', 'crusader', 'medieval'], keywords: ['knight medieval portrait', 'armored warrior'] },
            { triggers: ['queen', 'princess', 'royalty', 'empress', 'duchess', 'noble'], keywords: ['royal queen portrait', 'princess cinematic'] },
            { triggers: ['king', 'prince', 'emperor', 'king', 'monarch'], keywords: ['king monarch portrait', 'royal cinematic'] },
        ];

        // Detect gender hints (expanded with names)
        const femaleWords = ['woman', 'female', 'girl', 'her', 'she', 'lady', 'queen', 'princess', 'witch', 'empress', 'duchess', 'elara', 'mia', 'sarah', 'claire', 'jessica', 'aara', 'lyra', 'mina'];
        const maleWords = ['man', 'male', 'boy', 'his', 'he', 'guy', 'king', 'prince', 'knight', 'emperor', 'kael', 'atlas', 'john', 'david', 'mark', 'commander', 'kenji', 'hanzo'];
        const combinedLower = combined.toLowerCase();
        const hasFemale = femaleWords.some(w => combinedLower.includes(w));
        const hasMale = maleWords.some(w => combinedLower.includes(w));
        const genderHint = hasFemale ? 'woman' : (hasMale ? 'man' : 'person'); // Default to 'person' instead of empty

        // SPECIFIC OVERRIDES for Neon Samurai (Presentation quality)
        if (charName.toLowerCase().includes('kenji sato')) return "weary cybernetic ronin samurai cinematic portrait";
        if (charName.toLowerCase().includes('hanzo')) return "ruthless transhumanist cybernetic villain portrait";
        if (charName.toLowerCase().includes('mina')) return "female street hacker cyberpunk goggles portrait";
        if (charName.toLowerCase().includes('lyra')) return "ethereal woman void-walker cinematic portrait";

        for (const mapping of mappings) {
            if (mapping.triggers.some(t => combined.includes(t))) {
                const base = mapping.keywords[0];
                return genderHint ? `${genderHint} ${base}` : base;
            }
        }

        // Fallback: robust human portrait query
        return `${charName} human ${genderHint} cinematic studio portrait`;
    }

    /**
     * Fetch an image URL from Unsplash Search API using the given query.
     * Falls back to picsum if no API key is configured.
     */
    async function fetchUnsplashImage(query, fallbackSeed) {
        const apiKey = localStorage.getItem('unsplashApiKey') || '';

        if (apiKey) {
            try {
                const encoded = encodeURIComponent(query);
                const url = `https://api.unsplash.com/search/photos?query=${encoded}&per_page=5&orientation=portrait&client_id=${apiKey}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Unsplash API ${res.status}`);
                const data = await res.json();
                if (data.results && data.results.length > 0) {
                    // Pick a random one from top 5 for variety
                    const idx = Math.floor(Math.random() * Math.min(data.results.length, 5));
                    return { url: data.results[idx].urls.small, attribution: data.results[idx].user.name, query };
                }
            } catch (err) {
                console.warn('Unsplash API error, falling back:', err);
            }
        }

        // Fallback: LoremFlickr (more reliable than dead Unsplash Source)
        const keywords = query.split(' ').slice(0, 3).join(',');
        return { url: `https://loremflickr.com/400/500/${keywords}`, attribution: null, query };
    }

    // ─────────────────────────────────────────────────────
    //  PARSING AND RENDERING
    // ─────────────────────────────────────────────────────

    function renderConcept(rawText) {
        let htmlOutput = rawText
            .replace(/^## (.*$)/gim, '<h2 style="color:#6366f1; margin-top:25px; margin-bottom:15px; font-size:22px;">$1</h2>')
            .replace(/^# (.*$)/gim, '<h1 style="color:#fff; margin-top:30px; margin-bottom:20px;">$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#fff;">$1</strong>');
            
        // Regex to find characters and append visual frame
        // Captures full line text after the name for description context
        htmlOutput = htmlOutput.replace(/(\d+\.\s+<strong.*?>(.*?)<\/strong>(.*?))(?:\n|$)/g, 
            (match, fullLine, charName, charDesc) => {
                const safeDesc = charDesc.replace(/"/g, '&quot;').trim();
                return `${fullLine}\n<div class="character-block"><div class="character-card" data-name="${charName.trim()}" data-desc="${safeDesc}"><div class="visual-placeholder"><i class="fa-solid fa-user" style="font-size:2rem; opacity:0.3;"></i></div><button class="generate-visual-btn"><i class="fa-solid fa-camera"></i> Generate Visual</button></div></div>\n`;
            }
        );

        htmlOutput = htmlOutput.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
        resultBox.innerHTML = htmlOutput;
        
        // Attach visual listeners
        document.querySelectorAll('.generate-visual-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const card = e.target.closest('.character-card');
                const placeholder = card.querySelector('.visual-placeholder');
                const charName = card.getAttribute('data-name') || 'character';
                const charDesc = card.getAttribute('data-desc') || '';

                placeholder.innerHTML = '<div class="loading-skeleton"></div>';
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading…';

                try {
                    const query = buildUnsplashQuery(charName, charDesc);
                    const result = await fetchUnsplashImage(query, charName.replace(/[^a-zA-Z]/g, ''));

                    let imgHTML = `<img src="${result.url}" alt="${charName}" title="Search: ${result.query}"/>`;
                    placeholder.innerHTML = imgHTML;

                    // Show query hint
                    let queryHint = card.querySelector('.visual-query-hint');
                    if (!queryHint) {
                        queryHint = document.createElement('div');
                        queryHint.className = 'visual-query-hint';
                        card.appendChild(queryHint);
                    }
                    queryHint.textContent = `🔎 "${result.query}"`;

                    btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Regenerate';
                } catch (err) {
                    placeholder.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;"></i>';
                    btn.innerHTML = '<i class="fa-solid fa-camera"></i> Retry';
                } finally {
                    btn.disabled = false;
                }
            });
        });

        // Reset trailer section when new concept is rendered
        resetTrailerPanel();
    }

    // ─────────────────────────────────────────────────────
    //  TRAILER PREVIEW — ELEVENLABS TTS
    // ─────────────────────────────────────────────────────

    /**
     * Extract the trailer script section from the raw concept text.
     * Looks for common patterns like "## Trailer Script" or "TRAILER SCRIPT" headings.
     */
    function extractTrailerScript(rawText) {
        // Try to find a section that looks like trailer/narration
        const patterns = [
            /(?:##?\s*trailer\s*(?:script|narration|voiceover)?)[:\s]*([\s\S]*?)(?=##|$)/i,
            /(?:##?\s*(?:cinematic\s*)?narration)[:\s]*([\s\S]*?)(?=##|$)/i,
            /(?:trailer script|voiceover|narration):\s*([\s\S]*?)(?=\n##|\n#|$)/i,
        ];

        for (const pattern of patterns) {
            const match = rawText.match(pattern);
            if (match && match[1]) {
                const cleaned = match[1]
                    .replace(/\*\*/g, '')
                    .replace(/\*/g, '')
                    .replace(/^#+\s*/gm, '')
                    .trim();
                if (cleaned.length > 30) return cleaned;
            }
        }

        // Fallback: extract the first 3 sentences that seem dramatic/descriptive
        const sentences = rawText
            .replace(/\*\*/g, '')
            .replace(/#+\s/g, '')
            .split(/(?<=[.!?])\s+/)
            .filter(s => s.length > 40 && s.length < 300);
        
        if (sentences.length >= 2) {
            return sentences.slice(0, 3).join(' ');
        }

        return null;
    }

    function resetTrailerPanel() {
        if (trailerAudioStatus) {
            trailerAudioStatus.textContent = 'Set your ElevenLabs API key in Settings, then click Generate Audio.';
            trailerAudioStatus.style.display = 'block';
        }
        if (trailerAudioPlayer) {
            trailerAudioPlayer.style.display = 'none';
            trailerAudioPlayer.src = '';
        }
        if (trailerQueryInfo) {
            trailerQueryInfo.style.display = 'none';
            trailerQueryInfo.textContent = '';
        }
        if (generateAudioBtn) {
            generateAudioBtn.disabled = false;
            generateAudioBtn.innerHTML = '<i class="fa-solid fa-headphones"></i> Generate Audio';
        }
    }

    if (generateAudioBtn) {
        generateAudioBtn.addEventListener('click', async () => {
            const apiKey = localStorage.getItem('elevenLabsApiKey') || '';

            if (!apiKey) {
                trailerAudioStatus.textContent = '⚠️ Please add your ElevenLabs API key in Settings first.';
                trailerAudioStatus.style.color = '#f87171';
                trailerAudioStatus.style.display = 'block';
                settingsModal.style.display = 'block';
                return;
            }

            if (!currentConceptRaw) {
                trailerAudioStatus.textContent = '⚠️ No concept loaded. Generate a movie concept first.';
                trailerAudioStatus.style.color = '#f87171';
                trailerAudioStatus.style.display = 'block';
                return;
            }

            const script = extractTrailerScript(currentConceptRaw);
            if (!script) {
                trailerAudioStatus.textContent = '⚠️ Could not find a trailer script in the concept. Try regenerating.';
                trailerAudioStatus.style.color = '#f87171';
                trailerAudioStatus.style.display = 'block';
                return;
            }

            // Show loading state
            generateAudioBtn.disabled = true;
            generateAudioBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating…';
            trailerAudioStatus.style.color = '#a78bfa';
            trailerAudioStatus.textContent = '🎙️ Sending to ElevenLabs for narration…';
            trailerAudioStatus.style.display = 'block';
            trailerAudioPlayer.style.display = 'none';
            trailerQueryInfo.style.display = 'none';

            try {
                // Use ElevenLabs TTS API — voice "Adam" (pNInz6obpgDQGcFmaJgB) is a good cinematic male voice
                // Or "Rachel" (21m00Tcm4TlvDq8ikWAM) for female. Adam has deep cinematic tone.
                const VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam

                const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': apiKey
                    },
                    body: JSON.stringify({
                        text: script,
                        model_id: 'eleven_monolingual_v1',
                        voice_settings: {
                            stability: 0.4,
                            similarity_boost: 0.85,
                            style: 0.3,
                            use_speaker_boost: true
                        }
                    })
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    const msg = errData?.detail?.message || errData?.detail || `ElevenLabs API Error ${response.status}`;
                    throw new Error(msg);
                }

                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);

                trailerAudioPlayer.src = audioUrl;
                trailerAudioPlayer.style.display = 'block';
                trailerAudioStatus.textContent = '✅ Trailer narration ready! Hit play below.';
                trailerAudioStatus.style.color = '#4ade80';

                // Show the script excerpt used
                trailerQueryInfo.style.display = 'block';
                trailerQueryInfo.textContent = `📜 Script excerpt: "${script.substring(0, 120)}${script.length > 120 ? '…' : ''}"`;

                generateAudioBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Regenerate Audio';

            } catch (err) {
                trailerAudioStatus.textContent = `❌ Error: ${err.message}`;
                trailerAudioStatus.style.color = '#f87171';
                generateAudioBtn.innerHTML = '<i class="fa-solid fa-headphones"></i> Generate Audio';
            } finally {
                generateAudioBtn.disabled = false;
            }
        });
    }

    // ─────────────────────────────────────────────────────
    //  AI GENERATION LOGIC
    // ─────────────────────────────────────────────────────

    generateBtn.addEventListener('click', async () => {
        const userInput = movieIdeaInput.value;
        const genre = genreSelect.value;
        if (!userInput.trim()) { alert('Please enter a movie idea.'); return; }

        generateBtn.disabled = true;
        generateBtn.style.opacity = '0.5';
        modalLoader.style.display = 'block';

        try {
            const res = await fetch(`${API_BASE}/api/generate`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_input: userInput, genre: genre })
            });
            if (!res.ok) throw new Error(`API returned ${res.status}`);
            const data = await res.json();
            
            currentConceptRaw = data.result;
            currentChatHistory = []; 
            chatHistoryBox.innerHTML = '<div style="color: #9ca3af; text-align: center; font-style: italic; margin-top: auto; margin-bottom: auto;">Ask me anything to expand on this concept!</div>';
            
            renderConcept(currentConceptRaw);
            saveCurrentProject();
            updateChatLock();
            
            modal.style.display = 'none';
            switchView('results');
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            generateBtn.disabled = false;
            generateBtn.style.opacity = '1';
            modalLoader.style.display = 'none';
        }
    });

    // --- Refine Logic ---
    refineStoryBtn.addEventListener('click', () => {
        refineIdea.value = '';
        refineModal.style.display = 'block';
    });

    submitRefineBtn.addEventListener('click', async () => {
        const instruction = refineIdea.value;
        if(!instruction.trim()) return;

        submitRefineBtn.disabled = true;
        submitRefineBtn.style.opacity = '0.5';
        refineModalLoader.style.display = 'block';

        try {
            const res = await fetch(`${API_BASE}/api/refine`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ original_concept: currentConceptRaw, refinement_instruction: instruction })
            });
            if (!res.ok) throw new Error(`API returned ${res.status}`);
            const data = await res.json();
            currentConceptRaw = data.result;
            renderConcept(currentConceptRaw);
            saveCurrentProject();
            refineModal.style.display = 'none';
        } catch (error) {
            alert(`Error refining: ${error.message}`);
        } finally {
            submitRefineBtn.disabled = false;
            submitRefineBtn.style.opacity = '1';
            refineModalLoader.style.display = 'none';
        }
    });

    // --- Chat Logic ---
    function appendChatMsg(text, isUser) {
        if(chatHistoryBox.querySelector('div[style*="italic"]')) {
            chatHistoryBox.innerHTML = '';
        }
        const div = document.createElement('div');
        div.className = `chat-msg ${isUser ? 'user-msg' : 'ai-msg'}`;
        div.innerText = text;
        chatHistoryBox.appendChild(div);
        chatHistoryBox.scrollTop = chatHistoryBox.scrollHeight;
    }

    function updateChatLock() {
        const isLocked = !currentConceptRaw;
        chatInput.disabled = isLocked;
        sendChatBtn.disabled = isLocked;
        chatInput.placeholder = isLocked ? "Generate a concept first..." : "How does it end?";
        chatInput.style.opacity = isLocked ? "0.5" : "1";
        sendChatBtn.style.opacity = isLocked ? "0.5" : "1";
    }
    updateChatLock();

    sendChatBtn.addEventListener('click', async () => {
        const msg = chatInput.value.trim();
        if(!msg) return;
        
        chatInput.value = '';
        appendChatMsg(msg, true);
        
        const loaderDiv = document.createElement('div');
        loaderDiv.className = 'chat-msg ai-msg';
        loaderDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right:6px;"></i>Thinking...';
        chatHistoryBox.appendChild(loaderDiv);
        chatHistoryBox.scrollTop = chatHistoryBox.scrollHeight;

        try {
            // Pass the concept SEPARATELY as concept_context — keep user messages clean
            // so Claude can respond to exactly what the user asked, not just rehash the concept
            const payload = {
                messages: currentChatHistory,
                user_message: msg,
                concept_context: currentConceptRaw
            };
            const res = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            chatHistoryBox.removeChild(loaderDiv);
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();
            
            const reply = data.reply;
            appendChatMsg(reply, false);
            
            // Store clean messages in history (no concept bloat)
            currentChatHistory.push({ role: 'user', content: msg });
            currentChatHistory.push({ role: 'assistant', content: reply });
        } catch(err) {
            chatHistoryBox.removeChild(loaderDiv);
            appendChatMsg('Sorry, connection error. Please check the backend is running.', false);
        }
    });
    
    // hit enter key to chat
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatBtn.click();
        }
    });
});
