let setStatus = function () { }

async function main() {
    setStatus = (text) => {
        const el = document.getElementById("analyzing-status");
        if (el) el.innerHTML = text;
    };

    setStatus("Loading models...");
    try {
        const model = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh, {
            maxFaces: 1
        });
        window.faceModel = model;
    } catch (e) {
        console.error("Failed to load face model:", e);
        setStatus("Error: Could not load AI models. Check internet connection.");
    }

    try {
        window.database = await setupDatabase();
    } catch (e) {
        console.error("Failed to setup database:", e);
        window.database = { entries: {} };
    }

    const imageInputFile = document.getElementById("image-file");
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    let analysisData = void 0;

    imageInputFile?.addEventListener("change", async () => {
        if (imageInputFile.files[0]) {
            document.getElementById("init-view")?.classList.add("d-none");
            document.getElementById("analyzing-overlay")?.classList.remove("d-none");

            clearData();

            setStatus("Reading image...");
            let url = URL.createObjectURL(imageInputFile.files[0]);
            await onChange(url);
        }
    });

    async function onChange(url) {
        try {
            setStatus("Analyzing face morphology...");
            let analysis = await analyze(canvas, ctx, url, window.faceModel);

            const criteriaMap = {
                midfaceRatio: "Midface ratio",
                facialWidthToHeightRatio: "Facial width to height",
                chinToPhiltrumRatio: "Chin to philtrum",
                canthalTilt: "Canthal tilt",
                mouthToNoseRatio: "Mouth to nose",
                bigonialWidth: "Bigonial width",
                lipRatio: "Lip ratio",
                eyeSeparationRatio: "Eye separation",
                eyeToMouthAngle: "Eye to mouth angle",
                lowerThirdHeight: "Lower third height",
                palpebralFissureLength: "Palpebral length",
                eyeColor: "Eye Color"
            };

            analysisData = analysis;

            let calculate = () => {
                const feed = document.getElementById("metrics-feed");
                if (feed) feed.innerHTML = "";

                for (let [key, i] of Object.entries(analysis.criteria)) {
                    // i is the Criteria instance
                    i.calculate();

                    if (key === 'eyeColor') {
                        const card = document.createElement("div");
                        card.className = "metric-card";
                        card.innerHTML = `
                            <div class="metric-header">
                                <span class="trait-name">Eye Color</span>
                                <span class="assessment-badge badge-perfect">Detected</span>
                            </div>
                            <div class="d-flex justify-content-center gap-3 mt-2" id="eye-color-canvases">
                                <canvas height="40" width="40" style="border-radius: 50%; border: 2px solid rgba(255,255,255,0.2)"></canvas>
                                <canvas height="40" width="40" style="border-radius: 50%; border: 2px solid rgba(255,255,255,0.2)"></canvas>
                            </div>
                        `;
                        feed?.appendChild(card);
                        const canvases = card.querySelectorAll("canvas");
                        i.detect(analysis.image, Array.from(canvases).map(c => c.getContext("2d")));
                        continue;
                    }

                    const dbEntry = window.database.entries[key];
                    if (!dbEntry) continue;

                    const value = (key === 'eyeToMouthAngle') ? i.angle :
                        (key === 'canthalTilt') ? (i.leftCanthalTilt + i.rightCanthalTilt) / 2 :
                            (key === 'palpebralFissureLength') ? (i.leftPFL + i.rightPFL) / 2 :
                                i.ratio;

                    let status = "far";
                    let statusText = i.assess().replace(/<[^>]*>?/gm, '');
                    if (value >= dbEntry.idealLower && value <= dbEntry.idealUpper) {
                        status = "perfect";
                    } else if (value >= (dbEntry.idealLower - dbEntry.deviation) && value <= (dbEntry.idealUpper + dbEntry.deviation)) {
                        status = "near";
                    }

                    const min = dbEntry.idealLower - (dbEntry.deviation * 3);
                    const max = dbEntry.idealUpper + (dbEntry.deviation * 3);
                    const range = max - min;
                    const idealStart = ((dbEntry.idealLower - min) / range) * 100;
                    const idealWidth = ((dbEntry.idealUpper - dbEntry.idealLower) / range) * 100;
                    const userPos = Math.max(0, Math.min(100, ((value - min) / range) * 100));

                    const card = document.createElement("div");
                    card.className = "metric-card";
                    card.innerHTML = `
                        <div class="metric-header">
                            <span class="trait-name">${criteriaMap[key] || key}</span>
                            <span class="assessment-badge badge-${status}">${statusText}</span>
                        </div>
                        <div class="metric-bar-wrapper">
                            <div class="metric-bar-container">
                                <div class="ideal-zone" style="left: ${idealStart}%; width: ${idealWidth}%"></div>
                                <div class="user-marker" style="left: ${userPos}%"></div>
                            </div>
                            <div class="extreme-labels">
                                <span>${dbEntry.deviatingLow}</span>
                                <span>${dbEntry.deviatingHigh}</span>
                            </div>
                        </div>
                    `;
                    feed?.appendChild(card);
                }
            }

            let render = () => {
                analysis.resetToImage();
                for (let i of Object.values(analysis.criteria)) {
                    i.draw(ctx);
                }
            }

            document.getElementById("analyzing-overlay")?.classList.add("d-none");
            document.getElementById("results-view")?.classList.remove("d-none");
            document.getElementById("ai-btn-container")?.classList.remove("d-none");

            calculate();
            render();
            document.getElementById("results-view")?.scrollIntoView({ behavior: 'smooth' });

        } catch (e) {
            console.error("Analysis Error:", e);
            setStatus(`Analysis Failed: ${e.message}`);
            document.getElementById("analyzing-overlay")?.classList.add("d-none");
            document.getElementById("init-view")?.classList.remove("d-none");
        }
    }

    function clearData() {
        const feed = document.getElementById("metrics-feed");
        if (feed) feed.innerHTML = "";
    }

    function addMessage(text, role) {
        const chatMessages = document.getElementById("chat-messages");
        if (!chatMessages) return;
        const div = document.createElement("div");
        div.className = `msg msg-${role}`;
        if (role === 'ai') {
            div.innerHTML = marked.parse(text);
        } else {
            div.innerText = text;
        }
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function openChat() {
        const chatWindow = document.getElementById("chat-window");
        const chatMessages = document.getElementById("chat-messages");
        if (!chatWindow || !chatMessages) return;

        chatWindow.style.display = "flex";
        if (chatMessages.children.length === 1 && analysisData) {
            const key = localStorage.getItem("gemini_api_key");
            const metricsSummary = Object.fromEntries(
                Object.entries(analysisData.criteria).map(([k, v]) => [k, {
                    value: v.render(),
                    assessment: v.assess().replace(/<[^>]*>?/gm, '')
                }])
            );

            const prompt = `You are a professional facial aesthetic consultant. 
Analysis results:
${JSON.stringify(metricsSummary, null, 2)}

Provide a concise, premium Genetic Improvement Plan. Highlight strengths and suggest subtle grooming/lifestyle changes.Be rought and direct. Avoid sweet talk`;

            addMessage("Consulting with AI...", "ai");
            try {
                const response = await callGemini(key, prompt);
                chatMessages.innerHTML = "";
                addMessage(response, "ai");
            } catch (e) {
                addMessage(`Error: ${e.message}. Check your Gemini API key in settings.`, "ai");
            }
        }
    }

    async function callGemini(apiKey, prompt) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });
        if (!response.ok) throw new Error("API request failed");
        const resData = await response.json();
        return resData.candidates[0].content.parts[0].text;
    }

    const adviceBtn = document.getElementById("get-advice-btn");
    const saveApiKeyBtn = document.getElementById("save-api-key");
    const apiKeyInput = document.getElementById("gemini-api-key");
    const apiKeyModalEl = document.getElementById("apiKeyModal");
    const apiKeyModal = apiKeyModalEl ? new bootstrap.Modal(apiKeyModalEl) : null;
    const closeChat = document.getElementById("close-chat");
    const sendBtn = document.getElementById("send-chat");
    const chatInput = document.getElementById("chat-user-input");

    adviceBtn?.addEventListener("click", () => {
        const key = localStorage.getItem("gemini_api_key");
        if (!key) {
            apiKeyModal?.show();
        } else {
            openChat();
        }
    });

    saveApiKeyBtn?.addEventListener("click", () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem("gemini_api_key", key);
            apiKeyModal?.hide();
            openChat();
        }
    });

    closeChat?.addEventListener("click", () => {
        const chatWindow = document.getElementById("chat-window");
        if (chatWindow) chatWindow.style.display = "none";
    });

    sendBtn?.addEventListener("click", async () => {
        const text = chatInput.value.trim();
        if (!text) return;
        const key = localStorage.getItem("gemini_api_key");
        addMessage(text, "user");
        chatInput.value = "";
        try {
            const response = await callGemini(key, text);
            addMessage(response, "ai");
        } catch (e) {
            addMessage(`Error: ${e.message}`, "ai");
        }
    });

    const exampleModalEl = document.getElementById("exampleModal");
    if (exampleModalEl) {
        const modal = new bootstrap.Modal(exampleModalEl, {});
        modal.show();
    }
}

async function analyze(canvas, ctx, url, model) {
    let image = await loadImage(url);

    canvas.width = image.width;
    canvas.height = image.height;
    resetToImage(ctx, image);
    ctx.lineWidth = Math.sqrt((image.width * image.height) / 100000);
    ctx.arcRadius = Math.sqrt((image.width * image.height) / 100000);

    if (!model) {
        throw new Error("AI Model not loaded. Please wait or refresh.");
    }
    let face = await findLandmarks(model, image);
    let [points, criteria] = analyseCriteria(face);

    return {
        image,
        resetToImage: () => resetToImage(ctx, image),
        points,
        criteria,
        arcRadius: ctx.arcRadius,
    };
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = url;
        image.crossOrigin = "anonymous";
        image.onload = () => resolve(image);
        image.onerror = (e) => reject(new Error("Failed to load image"));
    });
}

function resetToImage(ctx, image) {
    ctx.drawImage(image, 0, 0);
}

async function findLandmarks(model, image) {
    const predictions = await model.estimateFaces({
        input: image
    });

    if (predictions && predictions.length > 0) {
        return predictions[0];
    } else {
        throw new Error("No face detected in photo");
    }
}

(async function () {
    try {
        await main();
    } catch (e) {
        console.error("Main initialization failed:", e);
        setStatus(`Initialization Error: ${e.message}`);
    }
})();
