export const Parser = {
    parseCGG(text) {
        const framesDB = [];
        const lines = text.split('\n');
        for (const l of lines) {
            if (!l.trim()) continue;
            const v = l.split(',').map(x => x.trim()).filter(x => x !== "").map(Number);
            const pieces = [];
            const numPieces = v[1];
            for (let i = 0; i < numPieces; i++) {
                const base = 2 + (i * 11);
                if (v[base + 9] !== undefined) {
                    pieces.push({
                        x: v[base + 0],
                        y: v[base + 1],
                        flipType: v[base + 2],
                        blendMode: v[base + 3],
                        opacity: v[base + 4],
                        rotate: v[base + 5],
                        sx: v[base + 6],
                        sy: v[base + 7],
                        w: v[base + 8],
                        h: v[base + 9],
                        pageId: v[base + 10]
                    });
                }
            }
            framesDB.push(pieces);
        }
        return framesDB;
    },

    parseCGS(text) {
        return text.split('\n').filter(l => l.trim()).map(l => {
            const parts = l.split(',').map(Number);
            return {
                id: parts[0],
                xOffset: parts[1] || 0,
                yOffset: parts[2] || 0,
                duration: parts[3] || 1
            };
        });
    }
};