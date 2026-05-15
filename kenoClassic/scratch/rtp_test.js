
const paytable = [0, 0.1, 0.1, 0.1, 0.1, 0.5, 1.5, 3.5, 10, 50, 200];
const bet = 10;
const hitCounts = new Array(11).fill(0);

function simulateRound() {
    const pool = Array.from({ length: 40 }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const drawn = pool.slice(0, 20);
    const selected = [1,2,3,4,5,6,7,8,9,10];
    const hits = selected.filter(num => drawn.includes(num)).length;
    hitCounts[hits]++;
    return paytable[hits] * bet;
}

let totalBet = 0;
let totalWin = 0;
const rounds = 100000;

for (let i = 0; i < rounds; i++) {
    totalBet += bet;
    totalWin += simulateRound();
}

console.log("Hit Distribution:");
hitCounts.forEach((count, i) => {
    console.log(`${i} hits: ${(count/rounds*100).toFixed(2)}%`);
});

console.log(`\nResults:`);
console.log(`Total Bet: $${totalBet}`);
console.log(`Total Win: $${totalWin}`);
console.log(`RTP: ${((totalWin / totalBet) * 100).toFixed(2)}%`);
