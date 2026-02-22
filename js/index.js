let setStatus = function () { }

async function main() {
    setStatus = (text) => {
        const el = document.getElementById("analyzing-status");
        if (el) el.innerHTML = text;
    };

    setStatus("Loading models...");
    const model = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh, {
        maxFaces: 1
    });
    window.faceModel = model;
    window.database = await setupDatabase();

    const imageInputFile = document.getElementById("image-file");
    const imageInputUrl = document.getElementById("image-url");
    const introductionElement = document.getElementById("introduction");
    const analyzingElement = document.getElementById("analyzing");
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    let data = void 0;

    imageInputFile.addEventListener("change", async () => {
        if (imageInputFile.files[0]) {
            introductionElement.style.display = "none";
            analyzingElement.classList.remove("d-none");
            data && clearData();

            setStatus("Reading image");
            imageInputUrl.value = "";
            let url = URL.createObjectURL(imageInputFile.files[0]);
            await onChange(url);
        }
    });

    imageInputUrl.addEventListener("change", async () => {
        if (imageInputUrl.value) {
            introductionElement.style.display = "none";
            analyzingElement.classList.remove("d-none");
            data && clearData();

            setStatus("Downloading image");
            imageInputFile.value = "";
            try {
                let file = await (await fetch(imageInputUrl.value)).blob();
                let url = URL.createObjectURL(file);
                await onChange(url);
            } catch (e) {
                console.error(e);
                setStatus(`Error downloading image: ${e.message}`);
                analyzingElement.classList.add("d-none");
            }
        }
    });

    async function onChange(url) {
        try {
            setStatus("Analyzing...");
            let analysis = await analyze(canvas, ctx, url, window.faceModel);

            data = analysis.criteria = {
                midfaceRatio: {
                    analysis: analysis.criteria.midfaceRatio,
                    render: document.getElementById("value-midface-ratio"),
                    toggle: document.getElementById("toggle-midface-ratio"),
                    ideal: document.getElementById("ideal-midface-ratio"),
                    assessment: document.getElementById("assessment-midface-ratio"),
                },
                facialWidthToHeightRatio: {
                    analysis: analysis.criteria.facialWidthToHeightRatio,
                    render: document.getElementById("value-facial-width-to-height-ratio"),
                    toggle: document.getElementById("toggle-facial-width-to-height-ratio"),
                    ideal: document.getElementById("ideal-facial-width-to-height-ratio"),
                    assessment: document.getElementById("assessment-facial-width-to-height-ratio"),
                },
                chinToPhiltrumRatio: {
                    analysis: analysis.criteria.chinToPhiltrumRatio,
                    render: document.getElementById("value-chin-to-philtrum-ratio"),
                    toggle: document.getElementById("toggle-chin-to-philtrum-ratio"),
                    ideal: document.getElementById("ideal-chin-to-philtrum-ratio"),
                    assessment: document.getElementById("assessment-chin-to-philtrum-ratio"),
                },
                canthalTilt: {
                    analysis: analysis.criteria.canthalTilt,
                    render: document.getElementById("value-canthal-tilt"),
                    toggle: document.getElementById("toggle-canthal-tilt"),
                    ideal: document.getElementById("ideal-canthal-tilt"),
                    assessment: document.getElementById("assessment-canthal-tilt"),
                },
                mouthToNoseRatio: {
                    analysis: analysis.criteria.mouthToNoseRatio,
                    render: document.getElementById("value-mouth-to-nose-ratio"),
                    toggle: document.getElementById("toggle-mouth-to-nose-ratio"),
                    ideal: document.getElementById("ideal-mouth-to-nose-ratio"),
                    assessment: document.getElementById("assessment-mouth-to-nose-ratio"),
                },
                bigonialWidth: {
                    analysis: analysis.criteria.bigonialWidth,
                    render: document.getElementById("value-bigonial-width"),
                    toggle: document.getElementById("toggle-bigonial-width"),
                    ideal: document.getElementById("ideal-bigonial-width"),
                    assessment: document.getElementById("assessment-bigonial-width"),
                },
                lipRatio: {
                    analysis: analysis.criteria.lipRatio,
                    render: document.getElementById("value-lip-ratio"),
                    toggle: document.getElementById("toggle-lip-ratio"),
                    ideal: document.getElementById("ideal-lip-ratio"),
                    assessment: document.getElementById("assessment-lip-ratio"),
                },
                eyeSeparationRatio: {
                    analysis: analysis.criteria.eyeSeparationRatio,
                    render: document.getElementById("value-eye-separation-ratio"),
                    toggle: document.getElementById("toggle-eye-separation-ratio"),
                    ideal: document.getElementById("ideal-eye-separation-ratio"),
                    assessment: document.getElementById("assessment-eye-separation-ratio"),
                },
                eyeToMouthAngle: {
                    analysis: analysis.criteria.eyeToMouthAngle,
                    render: document.getElementById("value-eye-to-mouth-angle"),
                    toggle: document.getElementById("toggle-eye-to-mouth-angle"),
                    ideal: document.getElementById("ideal-eye-to-mouth-angle"),
                    assessment: document.getElementById("assessment-eye-to-mouth-angle"),
                },
                lowerThirdHeight: {
                    analysis: analysis.criteria.lowerThirdHeight,
                    render: document.getElementById("value-lower-third-height"),
                    toggle: document.getElementById("toggle-lower-third-height"),
                    ideal: document.getElementById("ideal-lower-third-height"),
                    assessment: document.getElementById("assessment-lower-third-height"),
                },
                palpebralFissureLength: {
                    analysis: analysis.criteria.palpebralFissureLength,
                    render: document.getElementById("value-palpebral-fissure-length"),
                    toggle: document.getElementById("toggle-palpebral-fissure-length"),
                    ideal: document.getElementById("ideal-palpebral-fissure-length"),
                    assessment: document.getElementById("assessment-palpebral-fissure-length"),
                },
                eyeColor: {
                    analysis: analysis.criteria.eyeColor,
                    render: document.getElementById("value-eye-color"),
                    toggle: document.getElementById("toggle-eye-color"),
                    ideal: document.getElementById("ideal-eye-color"),
                    assessment: document.getElementById("assessment-eye-color"),
                },
            };

            let calculate = () => {
                for (let i of Object.values(analysis.criteria)) {
                    i.analysis.calculate();
                    i.render.innerHTML = i.analysis.render();
                    i.ideal.innerHTML = i.analysis.ideal();
                    i.assessment.innerHTML = i.analysis.assess();
                }

                analysis.criteria.eyeColor.analysis.detect(analysis.image, Array.from(analysis.criteria.eyeColor.render.children).map(i => i.getContext("2d")));
            }

            let render = () => {
                analysis.resetToImage();
                for (let i of Object.values(analysis.criteria)) {
                    if (i.toggle.checked) {
                        i.analysis.draw(ctx);
                    }
                }
            }

            for (let i of Object.values(analysis.criteria)) {
                i.toggle.onchange = () => render();
            }

            let moving = false;

            canvas.onmousedown = ({ offsetX: x, offsetY: y }) => {
                let necessaryPoints = Object.values(analysis.criteria).filter(i => i.toggle.checked).map(i => i.analysis.necessaryPoints()).flat();

                for (let i in analysis.points) {
                    if (analysis.points.hasOwnProperty(i) && necessaryPoints.includes(i)) {
                        if (Math.sqrt(
                            (analysis.points[i][0] - x) ** 2
                            + (analysis.points[i][1] - y) ** 2
                        ) <= analysis.arcRadius) {
                            moving = i;
                            return;
                        }
                    }
                }
            }

            canvas.ontouchstart = (e) => {
                let bcr = e.target.getBoundingClientRect();
                let x = e.targetTouches[0].clientX - bcr.x;
                let y = e.targetTouches[0].clientY - bcr.y;
                canvas.onmousedown({ offsetX: x, offsetY: y });
            }

            canvas.onmouseup = () => {
                moving = false;
            }

            canvas.ontouchend = canvas.ontouchcancel = (e) => {
                canvas.onmouseup();
            }

            canvas.onmousemove = ({ offsetX: x, offsetY: y }) => {
                if (moving) {
                    analysis.points[moving] = [x, y];
                    calculate();
                    render();
                } else {
                    let necessaryPoints = Object.values(analysis.criteria).filter(i => i.toggle.checked).map(i => i.analysis.necessaryPoints()).flat();

                    for (let i in analysis.points) {
                        if (analysis.points.hasOwnProperty(i) && necessaryPoints.includes(i)) {
                            if (Math.sqrt(
                                (analysis.points[i][0] - x) ** 2
                                + (analysis.points[i][1] - y) ** 2
                            ) <= analysis.arcRadius) {
                                render();
                                ctx.beginPath();
                                ctx.strokeStyle = "gray";
                                let oldLineWidth = ctx.lineWidth;
                                ctx.lineWidth = 0.5;
                                ctx.arc(analysis.points[i][0], analysis.points[i][1], ctx.arcRadius + 1.5, 0, 2 * Math.PI);
                                ctx.stroke();
                                ctx.lineWidth = oldLineWidth;
                                return;
                            }
                        }
                    }
                    render();
                }
            }

            canvas.ontouchmove = (e) => {
                let bcr = e.target.getBoundingClientRect();
                let x = e.targetTouches[0].clientX - bcr.x;
                let y = e.targetTouches[0].clientY - bcr.y;
                canvas.onmousemove({ offsetX: x, offsetY: y });
            }

            analyzingElement.classList.add("d-none");
            calculate();
            render();
        } catch (e) {
            console.error(e);
            setStatus(`Error: ${e.message}`);
            analyzingElement.classList.add("d-none");
        }
    }

    function clearData() {
        canvas.width = 0;
        canvas.height = 0;
        if (data) {
            for (let i of Object.values(data)) {
                if (i.render) i.render.innerHTML = "";
                if (i.ideal) i.ideal.innerHTML = "";
                if (i.assessment) i.assessment.innerHTML = "";
            }
        }
    }

    document.querySelector("#loading").style.display = "none";
    document.querySelector(".container").classList.remove("d-none");

    const exampleModalEl = document.getElementById("exampleModal");
    if (exampleModalEl) {
        const modal = new bootstrap.Modal(exampleModalEl, {});
        modal.toggle();
    }
}

async function analyze(canvas, ctx, url, model) {
    setStatus("Loading image...");
    let image = await loadImage(url);

    canvas.width = image.width;
    canvas.height = image.height;
    resetToImage(ctx, image);
    ctx.lineWidth = Math.sqrt((image.width * image.height) / 100000);
    ctx.arcRadius = Math.sqrt((image.width * image.height) / 100000);

    setStatus("Analyzing...");
    if (!model) {
        model = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh, {
            maxFaces: 1
        });
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
        throw new Error("No face detected");
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
