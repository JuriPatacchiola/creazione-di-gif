import { Parser } from './parser.js';
import { Renderer } from './renderer.js';


// ============================================================
// ZOOM
// ============================================================

let ZOOM_LEVEL = 0.2;


// ============================================================
// STATO
// ============================================================

const state = {

    sequences: {
        idle: [],
        atk: [],
        move: []
    },

    framesDB: [],

    current: 'idle',

    frameIndex: 0,

    isPlaying: false,

    isPaused: false,

    lastTime: 0,

    ticks: 0,

    currentFrameDuration: 1,

    downloadCount: 1
};


// ============================================================
// INIT RENDERER
// ============================================================

Renderer.init('cv');


// ============================================================
// ELEMENTI UI
// ============================================================

const timeline =
    document.getElementById('timeline');

const frameCounter =
    document.getElementById('frameCounter');

const btnPause =
    document.getElementById('togglePause');

const selectAnim =
    document.getElementById('select');

const btnStart =
    document.getElementById('start');

const btnImage =
    document.getElementById('downloadImage');


// ============================================================
// ZOOM CON ROTELLA MOUSE
// ============================================================

Renderer.canvas.addEventListener(
    'wheel',
    (event) => {

        event.preventDefault();


        if (event.deltaY > 0) {

            ZOOM_LEVEL =
                Math.max(
                    0.02,
                    ZOOM_LEVEL - 0.05
                );

        } else {

            ZOOM_LEVEL += 0.05;
        }


        Renderer.scale = ZOOM_LEVEL;


        /*
            Ridisegniamo sempre il frame corrente,
            non solamente quando l'animazione è in play.
        */

        renderCurrentFrame();
    }
);


// ============================================================
// PAN
// ============================================================

let isDragging = false;


Renderer.canvas.addEventListener(
    'mousedown',
    () => {

        isDragging = true;
    }
);


window.addEventListener(
    'mouseup',
    () => {

        isDragging = false;
    }
);


window.addEventListener(
    'mousemove',
    (event) => {

        if (!isDragging) {
            return;
        }


        Renderer.offsetX +=
            event.movementX;

        Renderer.offsetY +=
            event.movementY;


        renderCurrentFrame();
    }
);


// ============================================================
// FEEDBACK CARICAMENTO FILE
// ============================================================

document
    .querySelectorAll('input[type="file"]')
    .forEach(input => {

        input.addEventListener(
            'change',
            function () {

                if (this.files.length > 0) {

                    this.parentElement
                        .classList
                        .add('loaded');
                }
            }
        );
    });


// ============================================================
// RENDER FRAME CORRENTE
// ============================================================

function renderCurrentFrame() {

    const sequence =
        state.sequences[state.current];


    if (
        !sequence ||
        sequence.length === 0
    ) {
        return;
    }


    const frameData =
        sequence[state.frameIndex];


    if (!frameData) {
        return;
    }


    // Durata frame

    state.currentFrameDuration =
        frameData.duration || 1;


    // Recuperiamo il frame CGG

    const pieces =
        state.framesDB[frameData.id];


    if (!pieces) {
        return;
    }


    // Zoom

    Renderer.scale =
        ZOOM_LEVEL;


    // Disegno

    Renderer.draw(
        pieces,
        frameData
    );


    // Timeline

    timeline.value =
        state.frameIndex;


    // Contatore

    frameCounter.innerText =
        `${state.frameIndex + 1} / ${sequence.length}`;
}


// ============================================================
// AGGIORNA TIMELINE
// ============================================================

function updateTimelineUI() {

    const sequence =
        state.sequences[state.current];


    if (
        !sequence ||
        sequence.length === 0
    ) {
        return;
    }


    timeline.max =
        sequence.length - 1;


    timeline.value =
        state.frameIndex;


    frameCounter.innerText =
        `${state.frameIndex + 1} / ${sequence.length}`;
}


// ============================================================
// CAMBIO FRAME
// ============================================================

function advanceFrame(direction) {

    const sequence =
        state.sequences[state.current];


    if (
        !sequence ||
        sequence.length === 0
    ) {
        return;
    }


    state.frameIndex =
        (
            state.frameIndex +
            direction +
            sequence.length
        ) % sequence.length;


    state.ticks = 0;


    renderCurrentFrame();
}


// ============================================================
// PAUSA / RIPRENDI
// ============================================================

btnPause.onclick = () => {

    if (!state.isPlaying) {
        return;
    }


    state.isPaused =
        !state.isPaused;


    if (state.isPaused) {

        btnPause.innerText =
            "▶ RIPRENDI";

    } else {

        btnPause.innerText =
            "⏸ PAUSA";


        /*
            Evita uno scatto quando riprendiamo
            l'animazione.
        */

        state.lastTime =
            performance.now();
    }
};


// ============================================================
// FRAME SUCCESSIVO
// ============================================================

document
    .getElementById('nextFrame')
    .onclick = () => {

        state.isPaused = true;

        btnPause.innerText =
            "▶ RIPRENDI";

        advanceFrame(1);
    };


// ============================================================
// FRAME PRECEDENTE
// ============================================================

document
    .getElementById('prevFrame')
    .onclick = () => {

        state.isPaused = true;

        btnPause.innerText =
            "▶ RIPRENDI";

        advanceFrame(-1);
    };


// ============================================================
// TIMELINE
// ============================================================

timeline.addEventListener(
    'input',
    (event) => {

        state.isPaused = true;

        btnPause.innerText =
            "▶ RIPRENDI";


        state.frameIndex =
            parseInt(
                event.target.value,
                10
            );


        state.ticks = 0;


        renderCurrentFrame();
    }
);


// ============================================================
// CAMBIO ANIMAZIONE
// ============================================================

selectAnim.onchange =
    (event) => {

        state.current =
            event.target.value;


        state.frameIndex = 0;

        state.ticks = 0;


        if (state.isPlaying) {

            updateTimelineUI();

            renderCurrentFrame();
        }
    };


// ============================================================
// START
// ============================================================

btnStart.onclick = async () => {

    const files = {

        img:
            document
                .getElementById('img')
                .files[0],

        cgg:
            document
                .getElementById('cgg')
                .files[0],

        idle:
            document
                .getElementById('idle')
                .files[0],

        atk:
            document
                .getElementById('atk')
                .files[0],

        move:
            document
                .getElementById('move')
                .files[0]
    };


    // ========================================================
    // CONTROLLO FILE
    // ========================================================

    if (!files.img || !files.cgg) {

        alert(
            "Carica almeno PNG e CGG!"
        );

        return;
    }


    try {

        // ====================================================
        // CARICAMENTO PNG
        // ====================================================

        await Renderer.loadImage(
            files.img
        );


        // ====================================================
        // PARSING CGG
        // ====================================================

        state.framesDB =
            Parser.parseCGG(
                await files.cgg.text()
            );


        // ====================================================
        // PARSING IDLE
        // ====================================================

        if (files.idle) {

            state.sequences.idle =
                Parser.parseCGS(
                    await files.idle.text()
                );
        } else {

            state.sequences.idle = [];
        }


        // ====================================================
        // PARSING ATK
        // ====================================================

        if (files.atk) {

            state.sequences.atk =
                Parser.parseCGS(
                    await files.atk.text()
                );
        } else {

            state.sequences.atk = [];
        }


        // ====================================================
        // PARSING MOVE
        // ====================================================

        if (files.move) {

            state.sequences.move =
                Parser.parseCGS(
                    await files.move.text()
                );
        } else {

            state.sequences.move = [];
        }


        // ====================================================
        // RESET ANIMAZIONE
        // ====================================================

        state.isPlaying = true;

        state.isPaused = false;

        state.frameIndex = 0;

        state.ticks = 0;

        state.lastTime =
            performance.now();


        // ====================================================
        // RESET DOWNLOAD
        // ====================================================

        state.downloadCount = 1;


        // ====================================================
        // RESET UI
        // ====================================================

        btnPause.innerText =
            "⏸ PAUSA";


        // ====================================================
        // RESET PAN
        // ====================================================

        Renderer.offsetX = 0;

        Renderer.offsetY = 0;


        // ====================================================
        // RESET ZOOM
        // ====================================================

        ZOOM_LEVEL = 0.2;

        Renderer.scale =
            ZOOM_LEVEL;


        // ====================================================
        // PRIMO FRAME
        // ====================================================

        updateTimelineUI();

        renderCurrentFrame();


        // ====================================================
        // AVVIO GAME LOOP
        // ====================================================

        requestAnimationFrame(
            gameLoop
        );


    } catch (error) {

        console.error(
            "Errore:",
            error
        );


        alert(
            "Errore nel caricamento dei file."
        );
    }
};


// ============================================================
// DOWNLOAD FRAME
// ============================================================

btnImage.onclick = async () => {

    const sequence =
        state.sequences[state.current];


    if (
        !state.isPlaying ||
        !sequence ||
        sequence.length === 0
    ) {

        alert(
            "Avvia l'animazione prima di scaricare il frame!"
        );

        return;
    }


    // ========================================================
    // CONTROLLO SUPPORTO BROWSER
    // ========================================================

    if (!window.showSaveFilePicker) {

        alert(
            "Il tuo browser non supporta questa funzione. Usa Chrome o Edge."
        );

        return;
    }


    try {

        // ====================================================
        // CREAZIONE PNG
        // ====================================================

        const blob =
            await new Promise(
                resolve => {

                    Renderer.canvas.toBlob(
                        resolve,
                        'image/png'
                    );
                }
            );


        if (!blob) {

            throw new Error(
                "Impossibile creare il PNG."
            );
        }


        // ====================================================
        // NOME FILE
        // ====================================================

        const suggestedFileName =
            `download${state.downloadCount}.png`;


        // ====================================================
        // SAVE FILE PICKER
        // ====================================================

        const handle =
            await window.showSaveFilePicker({

                suggestedName:
                    suggestedFileName,

                types: [

                    {
                        description:
                            'Immagine PNG',

                        accept: {
                            'image/png':
                                ['.png']
                        }
                    }
                ]
            });


        // ====================================================
        // SCRITTURA
        // ====================================================

        const writable =
            await handle.createWritable();


        await writable.write(blob);

        await writable.close();


        // ====================================================
        // INCREMENTO
        // ====================================================

        state.downloadCount++;

    } catch (error) {

        if (
            error.name ===
            'AbortError'
        ) {
            return;
        }


        console.error(
            "Errore:",
            error
        );


        alert(
            "Errore durante il salvataggio."
        );
    }
};


// ============================================================
// GAME LOOP
// ============================================================

function gameLoop(timestamp) {

    if (
        state.isPlaying &&
        !state.isPaused
    ) {

        /*
            60 FPS.
        */

        const frameTime =
            1000 / 60;


        if (
            timestamp -
            state.lastTime >=
            frameTime
        ) {

            const sequence =
                state.sequences[state.current];


            if (
                sequence &&
                sequence.length > 0
            ) {

                /*
                    Quando abbiamo raggiunto la durata
                    prevista dal CGS passiamo al frame
                    successivo.
                */

                if (
                    state.ticks >=
                    state.currentFrameDuration
                ) {

                    state.ticks = 0;


                    state.frameIndex =
                        (
                            state.frameIndex +
                            1
                        ) % sequence.length;


                    renderCurrentFrame();
                }


                state.ticks++;
            }


            state.lastTime =
                timestamp;
        }
    }


    requestAnimationFrame(
        gameLoop
    );
}