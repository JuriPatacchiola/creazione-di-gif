export const Renderer = {

    canvas: null,
    ctx: null,

    image: null,

    scale: 0.2,

    offsetX: 0,
    offsetY: 0,


    // =========================================================
    // INIT
    // =========================================================

    init(canvasId) {

        this.canvas = document.getElementById(canvasId);

        if (!this.canvas) {

            console.error(
                "Renderer: Canvas non trovato!"
            );

            return;
        }

        this.ctx = this.canvas.getContext('2d');

        this.resize();

        window.addEventListener(
            'resize',
            () => this.resize()
        );
    },


    // =========================================================
    // RESIZE
    // =========================================================

    resize() {

        if (!this.canvas) {
            return;
        }

        const parent = this.canvas.parentElement;

        if (!parent) {
            return;
        }

        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;

        if (this.ctx) {

            this.ctx.imageSmoothingEnabled = false;

            /*
                Pixel art:
                evitiamo qualsiasi interpolazione.
            */

            this.ctx.imageSmoothingEnabled = false;
        }
    },


    // =========================================================
    // LOAD IMAGE
    // =========================================================

    loadImage(file) {

        return new Promise((resolve, reject) => {

            if (!file) {

                reject(
                    new Error("File immagine non valido.")
                );

                return;
            }

            const img = new Image();

            img.onload = () => {

                this.image = img;

                resolve();
            };

            img.onerror = () => {

                reject(
                    new Error(
                        "Errore caricamento immagine."
                    )
                );
            };

            img.src = URL.createObjectURL(file);
        });
    },


    // =========================================================
    // DRAW
    // =========================================================

    draw(
        pieces,
        cgsFrame = {
            xOffset: 0,
            yOffset: 0
        }
    ) {

        if (!this.ctx || !this.canvas) {
            return;
        }


        // -----------------------------------------------------
        // PULIZIA CANVAS
        // -----------------------------------------------------

        this.ctx.clearRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        );


        if (!this.image || !pieces) {
            return;
        }


        // -----------------------------------------------------
        // SALVIAMO LO STATO DEL CANVAS
        // -----------------------------------------------------

        this.ctx.save();


        // -----------------------------------------------------
        // CENTRO DEL PERSONAGGIO
        // -----------------------------------------------------

        const centerX =
            this.canvas.width / 2;

        const centerY =
            this.canvas.height / 2;


        this.ctx.translate(
            centerX + this.offsetX,
            centerY + this.offsetY
        );


        // -----------------------------------------------------
        // ZOOM
        // -----------------------------------------------------

        this.ctx.scale(
            this.scale,
            this.scale
        );


        // -----------------------------------------------------
        // OFFSET GENERALE DEL CGS
        // -----------------------------------------------------

        const frameOffsetX =
            Number(cgsFrame.xOffset) || 0;

        const frameOffsetY =
            Number(cgsFrame.yOffset) || 0;


        // =====================================================
        // DISEGNO DEI PEZZI
        // =====================================================

        /*
            I pezzi vengono disegnati dal fondo verso
            il primo piano.
        */

        for (
            let i = pieces.length - 1;
            i >= 0;
            i--
        ) {

            const piece = pieces[i];

            if (!piece) {
                continue;
            }

            if (
                piece.w <= 0 ||
                piece.h <= 0
            ) {
                continue;
            }


            // -------------------------------------------------
            // SALVIAMO LO STATO DEL SINGOLO PEZZO
            // -------------------------------------------------

            this.ctx.save();


            // -------------------------------------------------
            // OPACITÀ
            // -------------------------------------------------

            const opacity =
                Number.isFinite(piece.opacity)
                    ? piece.opacity
                    : 100;

            this.ctx.globalAlpha =
                Math.max(
                    0,
                    Math.min(
                        1,
                        opacity / 100
                    )
                );


            // -------------------------------------------------
            // BLEND MODE
            // -------------------------------------------------

            if (piece.blendMode === 1) {

                this.ctx.globalCompositeOperation =
                    'lighter';

            } else {

                this.ctx.globalCompositeOperation =
                    'source-over';
            }


            // -------------------------------------------------
            // POSIZIONE DEL PEZZO
            // -------------------------------------------------

            const x =
                (Number(piece.x) || 0) +
                frameOffsetX;

            const y =
                (Number(piece.y) || 0) +
                frameOffsetY;


            /*
                Il pezzo viene posizionato usando il suo
                centro come pivot.

                Questo è importante perché flip e rotazione
                devono avvenire attorno allo stesso punto.
            */

            const pivotX =
                x + (piece.w / 2);

            const pivotY =
                y + (piece.h / 2);


            this.ctx.translate(
                pivotX,
                pivotY
            );


            // =================================================
            // FLIP
            // =================================================

            const flipType =
                Number(piece.flipType) || 0;


            let scaleX = 1;
            let scaleY = 1;


            switch (flipType) {

                case 0:

                    // Nessun flip

                    scaleX = 1;
                    scaleY = 1;

                    break;


                case 1:

                    // Flip X

                    scaleX = -1;
                    scaleY = 1;

                    break;


                case 2:

                    // Flip Y

                    scaleX = 1;
                    scaleY = -1;

                    break;


                case 3:

                    /*
                        Flip X + Y.

                        Equivale alla combinazione
                        dei due flip.
                    */

                    scaleX = -1;
                    scaleY = -1;

                    break;


                default:

                    scaleX = 1;
                    scaleY = 1;

                    break;
            }


            this.ctx.scale(
                scaleX,
                scaleY
            );


            // =================================================
            // ROTAZIONE
            // =================================================

            /*
                IMPORTANTE:

                I valori di rotazione del CGG di Brave Frontier
                devono essere interpretati con segno NEGATIVO.

                Prima avevi:

                    rotate(+p.rotate)

                che provoca soprattutto problemi con le
                parti che hanno flipType 1/2/3.

                Ora:

                    rotate(-p.rotate)
            */

            const rotation =
                Number(piece.rotate) || 0;


            if (rotation !== 0) {

                this.ctx.rotate(
                    -rotation * Math.PI / 180
                );
            }


            // =================================================
            // DRAW IMAGE
            // =================================================

            this.ctx.drawImage(

                this.image,

                // SORGENTE SPRITESHEET
                piece.sx,
                piece.sy,
                piece.w,
                piece.h,

                // DESTINAZIONE
                -piece.w / 2,
                -piece.h / 2,
                piece.w,
                piece.h
            );


            // -------------------------------------------------
            // RIPRISTINIAMO LO STATO DEL PEZZO
            // -------------------------------------------------

            this.ctx.restore();
        }


        // -----------------------------------------------------
        // RIPRISTINIAMO LO STATO GENERALE
        // -----------------------------------------------------

        this.ctx.restore();
    }
};