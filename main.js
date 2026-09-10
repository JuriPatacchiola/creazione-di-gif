import { Parser } from './parser.js';
import { Renderer } from './renderer.js';

let ZOOM_LEVEL = 0.2;

const state = {
    sequences: { idle: [], atk: [], move: [] },
    framesDB: [],
    current: 'idle',
    frameIndex: 0,
    isPlaying: false,
    isPaused: false,
    lastTime: 0,
    ticks: 0,
    currentFrameDuration: 0,
    downloadCount: 1
};

Renderer.init('cv');

// --- ZOOM & PAN ---
Renderer.canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.deltaY > 0) {
        ZOOM_LEVEL = Math.max(0.02, ZOOM_LEVEL - 0.05);
    } else {
        ZOOM_LEVEL += 0.05;
    }
    if (state.isPlaying) renderCurrentFrame();
});

let isDragging = false;
Renderer.canvas.addEventListener('mousedown', () => isDragging = true);
window.addEventListener('mouseup', () => isDragging = false);
window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    Renderer.offsetX += e.movementX;
    Renderer.offsetY += e.movementY;
    if (state.isPlaying && state.isPaused) renderCurrentFrame();
});

// UI Elements
const timeline = document.getElementById('timeline');
const frameCounter = document.getElementById('frameCounter');
const btnPause = document.getElementById('togglePause');
const selectAnim = document.getElementById('select');
const btnStart = document.getElementById('start');
const btnImage = document.getElementById('downloadImage');

// Feedback caricamento file
document.querySelectorAll('input[type="file"]').forEach(input => {
    input.addEventListener('change', function () {
        if (this.files.length > 0) {
            this.parentElement.classList.add('loaded');
        }
    });
});

function renderCurrentFrame() {
    const sequence = state.sequences[state.current];
    if (!sequence || sequence.length === 0) return;

    const frameData = sequence[state.frameIndex];
    if (frameData) {
        state.currentFrameDuration = frameData.duration || 1;
        const pieces = state.framesDB[frameData.id];

        Renderer.scale = ZOOM_LEVEL;
        Renderer.draw(pieces, frameData);

        timeline.value = state.frameIndex;
        frameCounter.innerText = `${state.frameIndex + 1} / ${sequence.length}`;
    }
}

function updateTimelineUI() {
    const sequence = state.sequences[state.current];
    if (sequence && sequence.length > 0) {
        timeline.max = sequence.length - 1;
        timeline.value = state.frameIndex;
        frameCounter.innerText = `${state.frameIndex + 1} / ${sequence.length}`;
    }
}

function advanceFrame(direction) {
    const sequence = state.sequences[state.current];
    if (!sequence || sequence.length === 0) return;

    state.frameIndex = (state.frameIndex + direction + sequence.length) % sequence.length;
    state.ticks = 0;
    renderCurrentFrame();
}

btnPause.onclick = () => {
    if (!state.isPlaying) return;
    state.isPaused = !state.isPaused;
    btnPause.innerText = state.isPaused ? "▶ RIPRENDI" : "⏸ PAUSA";
};

document.getElementById('nextFrame').onclick = () => {
    state.isPaused = true;
    btnPause.innerText = "▶ RIPRENDI";
    advanceFrame(1);
};

document.getElementById('prevFrame').onclick = () => {
    state.isPaused = true;
    btnPause.innerText = "▶ RIPRENDI";
    advanceFrame(-1);
};

timeline.addEventListener('input', (e) => {
    state.isPaused = true;
    btnPause.innerText = "▶ RIPRENDI";
    state.frameIndex = parseInt(e.target.value, 10);
    state.ticks = 0;
    renderCurrentFrame();
});

selectAnim.onchange = (e) => {
    state.current = e.target.value;
    state.frameIndex = 0;
    state.ticks = 0;
    if (state.isPlaying) {
        updateTimelineUI();
        renderCurrentFrame();
    }
};

btnStart.onclick = async () => {
    const files = {
        img: document.getElementById('img').files[0],
        cgg: document.getElementById('cgg').files[0],
        idle: document.getElementById('idle').files[0],
        atk: document.getElementById('atk').files[0],
        move: document.getElementById('move').files[0]
    };

    if (!files.img || !files.cgg) return alert("Carica almeno PNG e CGG!");

    try {
        await Renderer.loadImage(files.img);
        state.framesDB = Parser.parseCGG(await files.cgg.text());

        if (files.idle) state.sequences.idle = Parser.parseCGS(await files.idle.text());
        if (files.atk) state.sequences.atk = Parser.parseCGS(await files.atk.text());
        if (files.move) state.sequences.move = Parser.parseCGS(await files.move.text());

        // --- RESET STATO ANIMAZIONE ---
        state.isPlaying = true;
        state.isPaused = false;
        state.frameIndex = 0;
        state.ticks = 0;

        // --- RESET CONTATORE DOWNLOAD ---
        // Ogni volta che carichi nuovi file, il conteggio riparte da 1
        state.downloadCount = 1;

        btnPause.innerText = "⏸ PAUSA";
        Renderer.offsetX = 0;
        Renderer.offsetY = 0;

        updateTimelineUI();
        renderCurrentFrame();

        if (state.lastTime === 0) requestAnimationFrame(gameLoop);
    } catch (err) { alert("Errore nel caricamento file."); }
};

// --- ESPORTAZIONE IMMAGINE CON NOME INCREMENTALE ---
btnImage.onclick = async () => {
    const sequence = state.sequences[state.current];
    if (!state.isPlaying || !sequence || sequence.length === 0) {
        return alert("Avvia l'animazione prima di scaricare il frame!");
    }

    if (!window.showSaveFilePicker) {
        alert("Il tuo browser non supporta questa funzione. Usa Chrome o Edge.");
        return;
    }

    try {
        const blob = await new Promise(resolve => Renderer.canvas.toBlob(resolve, 'image/png'));

        const suggestedFileName = `download${state.downloadCount}.png`;

        const handle = await window.showSaveFilePicker({
            suggestedName: suggestedFileName,
            types: [{
                description: 'Immagine PNG',
                accept: { 'image/png': ['.png'] },
            }],
        });

        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();

        state.downloadCount++;

    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error("Errore:", err);
            alert("Errore durante il salvataggio.");
        }
    }
};

function gameLoop(timestamp) {
    if (state.isPlaying && !state.isPaused) {
        if (timestamp - state.lastTime >= 1000 / 60) {
            const sequence = state.sequences[state.current];
            if (sequence && sequence.length > 0) {
                if (state.ticks >= state.currentFrameDuration) {
                    state.ticks = 0;
                    state.frameIndex = (state.frameIndex + 1) % sequence.length;
                    renderCurrentFrame();
                }
                state.ticks++;
            }
            state.lastTime = timestamp;
        }
    }
    requestAnimationFrame(gameLoop);
}