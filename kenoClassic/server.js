import express from 'express';
import cors from 'cors';
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Game state for controlled payouts
let totalRounds = 0;
let bigWinsInCycle = 0;
const CYCLE_LENGTH = 10;
const MAX_BIG_WINS = 3;

app.post('/api/draw', (req, res) => {
    const { selectedNumbers } = req.body;
    
    if (!selectedNumbers || !Array.isArray(selectedNumbers)) {
        return res.status(400).json({ error: 'Invalid selected numbers' });
    }

    totalRounds++;
    // Reset cycle every 10 rounds
    if (totalRounds > CYCLE_LENGTH) {
        totalRounds = 1;
        bigWinsInCycle = 0;
    }

    let drawnNumbers, hits, winAmount;
    let attempts = 0;

    // Controlled drawing loop
    while (attempts < 100) {
        attempts++;
        // Create pool of 1-40 and shuffle to pick 20 unique numbers
        const pool = Array.from({ length: 40 }, (_, i) => i + 1);
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        drawnNumbers = pool.slice(0, 20);

        hits = selectedNumbers.filter(num => drawnNumbers.includes(num));
        winAmount = calculateWin(selectedNumbers.length, hits.length);

        // Mechanic: Win > 50 only allowed 3 times per 10 rounds
        if (winAmount > 50) {
            if (bigWinsInCycle < MAX_BIG_WINS) {
                bigWinsInCycle++;
                break; // Big win allowed
            } else {
                continue; // Big win NOT allowed, re-draw
            }
        } else {
            break; // Normal win allowed
        }
    }

    res.json({
        drawnNumbers,
        hits,
        winAmount
    });
});

function calculateWin(selectedCount, hitCount) {
    // Specifically balanced for drawing 20 numbers from a pool of 40.
    const paytable = {
        10: [
            0,      // 0 hits
            0.1,    // 1 hit
            0.1,    // 2 hits
            0.1,    // 3 hits
            0.1,    // 4 hits
            0.1,    // 5 hits
            1.2,    // 6 hits
            2.5,    // 7 hits
            8,      // 8 hits
            25,     // 9 hits
            100     // 10 hits
        ]
    };

    const returns = paytable[selectedCount];
    if (returns && returns[hitCount] !== undefined) {
        return returns[hitCount] * 10; // Return absolute win amount (bet is 10)
    }
    return 0;
}



app.listen(port, () => {
    console.log(`Keno Classic backend listening at http://localhost:${port}`);
});
