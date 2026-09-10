export const Renderer = {
    canvas: null,
    ctx: null,
    image: null,
    scale: 0.2, // Zoom dinamico
    offsetX: 0, // Pan orizzontale
    offsetY: 0, // Pan verticale

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error("Renderer: Canvas non trovato!");
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        const parent = this.canvas.parentElement;
        if (!parent) return;
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;
        if (this.ctx) {
            this.ctx.imageSmoothingEnabled = false; // Mantiene la pixel art nitida
        }
    },

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.image = img;
                resolve();
            };
            img.onerror = () => reject("Errore caricamento immagine");
            img.src = URL.createObjectURL(file);
        });
    },

    draw(pieces, cgsFrame = { xOffset: 0, yOffset: 0 }) {
        // Pulizia completa per ogni frame
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.image || !pieces) return;

        this.ctx.save();

        // Posizionamento globale (Centro + Offset utente)
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        this.ctx.translate(cx + this.offsetX, cy + this.offsetY);
        this.ctx.scale(this.scale, this.scale);

        // Disegno dei pezzi (Ordine inverso per layering corretto)
        for (let i = pieces.length - 1; i >= 0; i--) {
            const p = pieces[i];
            if (!p || p.w === 0 || p.h === 0) continue;

            this.ctx.save();

            // Opacità e Blend Mode
            this.ctx.globalAlpha = (p.opacity ?? 100) / 100;
            this.ctx.globalCompositeOperation = (p.blendMode === 1) ? 'lighter' : 'source-over';

            const dx = p.x + (cgsFrame.xOffset || 0);
            const dy = p.y + (cgsFrame.yOffset || 0);

            // Pivot al centro del pezzo per rotazione e flip
            this.ctx.translate(dx + (p.w / 2), dy + (p.h / 2));

            if (p.rotate) {
                this.ctx.rotate(-p.rotate * Math.PI / 180);
            }

            // Gestione Flip
            const scaleX = (p.flipType === 1 || p.flipType === 3) ? -1 : 1;
            const scaleY = (p.flipType === 2 || p.flipType === 3) ? -1 : 1;
            if (scaleX !== 1 || scaleY !== 1) {
                this.ctx.scale(scaleX, scaleY);
            }

            // Disegno effettivo
            this.ctx.drawImage(
                this.image,
                p.sx, p.sy, p.w, p.h,
                -p.w / 2, -p.h / 2,
                p.w, p.h
            );

            this.ctx.restore();
        }

        this.ctx.restore();
    }
};