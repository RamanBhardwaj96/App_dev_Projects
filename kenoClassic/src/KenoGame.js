import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import { ApiService } from './ApiService';

export class KenoGame {
    constructor() {
        this.app = new PIXI.Application();
        this.container = document.getElementById('game-container');
        this.selectedNumbers = new Set();
        this.cells = [];
        this.balance = 1000;
        this.totalBet = 0;
        this.totalWin = 0;
        this.isDrawing = false;
        this.isAutoPlaying = false;

        this.init();
    }

    async init() {
        await this.app.init({ 
            width: 800, 
            height: 600, 
            backgroundColor: 0x0a0a1a,
            antialias: true
        });
        this.container.appendChild(this.app.canvas);

        this.setupBoard();
        this.setupEventListeners();
        this.updateWinDisplay(0);
        this.updateUI();

        // Animate progress bar
        const progressBar = document.getElementById('progress-bar');
        const loadingText = document.getElementById('loading-text');
        
        const steps = [
            { p: 30, t: 'Connecting to Server...' },
            { p: 60, t: 'Loading Assets...' },
            { p: 90, t: 'Starting Game...' },
            { p: 100, t: 'Ready!' }
        ];

        steps.forEach((step, i) => {
            setTimeout(() => {
                progressBar.style.width = `${step.p}%`;
                loadingText.innerText = step.t;
                
                if (i === steps.length - 1) {
                    setTimeout(() => {
                        const loadingScreen = document.getElementById('loading-screen');
                        loadingScreen.style.opacity = '0';
                        setTimeout(() => {
                            loadingScreen.style.visibility = 'hidden';
                        }, 800);
                    }, 500);
                }
            }, i * 500);
        });
    }

    setupBoard() {
        const padding = 20;
        const cellSize = 60;
        const gap = 10;
        const columns = 10;
        const rows = 4;

        const boardContainer = new PIXI.Container();
        boardContainer.x = (800 - (columns * (cellSize + gap) - gap)) / 2;
        boardContainer.y = 100;


        for (let i = 0; i < 40; i++) {
            const num = i + 1;
            const col = i % columns;
            const row = Math.floor(i / columns);

            const cell = new PIXI.Container();
            cell.x = col * (cellSize + gap) + cellSize / 2;
            cell.y = row * (cellSize + gap) + cellSize / 2;
            cell.pivot.set(cellSize / 2, cellSize / 2);
            cell.interactive = true;
            cell.cursor = 'pointer';

            const bg = new PIXI.Graphics();
            this.drawWoodenButton(bg, 0xA0522D); // Base wooden color
            
            const text = new PIXI.Text({
                text: num.toString(),
                style: {
                    fill: 0xffffff,
                    fontSize: 22,
                    fontWeight: 'bold',
                    dropShadow: {
                        alpha: 0.5,
                        blur: 2,
                        color: 0x000000,
                        distance: 2
                    }
                }
            });
            text.anchor.set(0.5);
            text.x = cellSize / 2;
            text.y = cellSize / 2;

            cell.addChild(bg, text);
            cell.on('pointerdown', () => this.toggleNumber(num, cell));

            boardContainer.addChild(cell);
            this.cells[num] = { container: cell, bg, text };
        }

        this.app.stage.addChild(boardContainer);
    }

    drawWoodenButton(graphics, color) {
        graphics.clear();
        const size = 60; // Match cellSize
        const radius = 8;
        const borderColor = 0x5D2906;



        // Main tile body
        graphics.beginFill(color)
            .lineStyle(3, borderColor)
            .drawRoundedRect(0, 0, size, size, radius)
            .endFill();
    }

    toggleNumber(num, cell) {
        if (this.isDrawing) return;

        if (this.selectedNumbers.has(num)) {
            this.selectedNumbers.delete(num);
            this.updateCellState(num, 'default');
        } else {
            if (this.selectedNumbers.size < 10) {
                this.selectedNumbers.add(num);
                this.updateCellState(num, 'selected');
            }
        }
        this.updateUI();
    }

    updateCellState(num, state) {
        const { bg, text } = this.cells[num];
        
        switch (state) {
            case 'selected':
                this.drawWoodenButton(bg, 0xff0000); // Red when selected
                text.style.fill = 0xffffff;
                break;
            case 'drawn':
                this.drawWoodenButton(bg, 0x000000); // Black when drawn
                text.style.fill = 0xffffff;
                break;
            case 'hit':
                this.drawWoodenButton(bg, 0x00ff00); // Green when hit
                text.style.fill = 0x000000;
                break;
            default:
                this.drawWoodenButton(bg, 0xA0522D); // Default wooden brown
                text.style.fill = 0xffffff;
                gsap.killTweensOf(bg);
                bg.alpha = 1;
        }
        text.y = 30;
    }

    setupEventListeners() {
        document.getElementById('play-btn').onclick = () => this.play();
        document.getElementById('clear-btn').onclick = () => this.clear();
        document.getElementById('quick-pick-btn').onclick = () => this.quickPick();
        document.getElementById('autoplay-btn').onclick = () => this.toggleAutoPlay();
        this.setupPaytableModal();
    }

    setupPaytableModal() {
        const modal = document.getElementById('paytable-modal');
        const btn = document.getElementById('info-btn');
        const closeBtn = document.querySelector('.close-btn');

        btn.onclick = () => {
            modal.style.display = 'flex';
        };

        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };

        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
    }

    toggleAutoPlay() {
        this.isAutoPlaying = !this.isAutoPlaying;
        document.getElementById('autoplay-btn').innerText = `Auto Play: ${this.isAutoPlaying ? 'ON' : 'OFF'}`;
        if (this.isAutoPlaying && !this.isDrawing && this.selectedNumbers.size === 10) {
            this.play();
        }
    }

    clear() {
        if (this.isDrawing) return;
        this.selectedNumbers.forEach(num => this.updateCellState(num, 'default'));
        this.selectedNumbers.clear();
        this.resetBoard();
        this.updateWinDisplay(0);
        document.getElementById('drawn-count').innerText = 0;
        document.getElementById('hit-rate').innerText = 0;
        this.updateUI();
    }

    resetBoard() {
        for (let i = 1; i <= 40; i++) {
            if (!this.selectedNumbers.has(i)) {
                this.updateCellState(i, 'default');
            } else {
                this.updateCellState(i, 'selected');
            }
        }
    }

    quickPick() {
        this.clear();
        while (this.selectedNumbers.size < 10) {
            const num = Math.floor(Math.random() * 40) + 1;
            this.selectedNumbers.add(num);
        }
        this.selectedNumbers.forEach(num => this.updateCellState(num, 'selected'));
        this.updateUI();
    }

    updateUI() {
        const playBtn = document.getElementById('play-btn');
        const clearBtn = document.getElementById('clear-btn');
        const quickPickBtn = document.getElementById('quick-pick-btn');
        const autoPlayBtn = document.getElementById('autoplay-btn');
        const message = document.getElementById('message');
        const count = this.selectedNumbers.size;

        const disabled = this.isDrawing || this.isAutoPlaying;
        playBtn.disabled = disabled || count !== 10;
        clearBtn.disabled = disabled;
        quickPickBtn.disabled = disabled;
        // AutoPlay remains enabled so it can be turned OFF
        autoPlayBtn.disabled = false;
        // AutoPlay and QuickPlay can be toggled even during drawing? 
        // Usually AutoPlay can be turned OFF during draw.
        // We'll keep them enabled for toggle.
        
        message.innerText = count === 10 ? 'Ready to Play!' : `${count}/10 numbers selected`;
        document.getElementById('balance').innerText = this.balance;
        
        const rtp = this.totalBet > 0 ? ((this.totalWin / this.totalBet) * 100).toFixed(1) : 0;
        const rtpElem = document.getElementById('rtp');
        const rtpStat = document.getElementById('rtp-stat');
        rtpElem.innerText = rtp;
        rtpStat.style.display = parseFloat(rtp) > 0 ? 'flex' : 'none';
    }

    getCurrentWin(hitCount) {
        const paytable = [0, 0.1, 0.1, 0.1, 0.1, 0.1, 1.2, 2.5, 8.0, 25.0, 100.0];
        return (paytable[hitCount] || 0) * 10;
    }




    async play() {
        if (this.isDrawing) return;
        this.isDrawing = true;
        this.balance -= 10;
        this.totalBet += 10;
        document.getElementById('drawn-count').innerText = 0;
        document.getElementById('hit-rate').innerText = 0;
        this.updateUI();
        this.resetBoard();

        try {
            const data = await ApiService.draw(Array.from(this.selectedNumbers));
            await this.animateDraw(data.drawnNumbers, data.hits);
            
            this.balance += data.winAmount;
            this.totalWin += data.winAmount;
            this.updateWinDisplay(data.winAmount, data.hits.length);
            document.getElementById('hit-rate').innerText = data.hits.length;
            this.updateUI();

            if (this.isAutoPlaying) {
                setTimeout(() => {
                    if (this.isAutoPlaying) this.play();
                }, 1500);
            }
        } catch (error) {
            alert('Failed to connect to server. Make sure server.js is running!');
            this.isAutoPlaying = false;
            this.updateUI();
        } finally {
            this.isDrawing = false;
            this.updateUI();
        }
    }

    async animateDraw(drawnNumbers, hits) {
        let count = 0;
        let currentHits = 0;
        for (const num of drawnNumbers) {
            count++;
            document.getElementById('drawn-count').innerText = count;
            
            const isHit = hits.includes(num);
            if (isHit) {
                currentHits++;
                const hitRateElem = document.getElementById('hit-rate');
                hitRateElem.innerText = currentHits;
                gsap.fromTo(hitRateElem, { scale: 1.5 }, { scale: 1, duration: 0.3, ease: "back.out" });
                this.updateWinDisplay(this.getCurrentWin(currentHits), currentHits);
            }

            this.updateCellState(num, isHit ? 'hit' : 'drawn');
            
            // Subtle pop animation on grid
            const cell = this.cells[num].container;
            await gsap.fromTo(cell.scale, 
                { x: 1, y: 1 }, 
                { 
                    x: 1.2, 
                    y: 1.2, 
                    duration: 0.15, 
                    yoyo: true, 
                    repeat: 1 
                }
            );
            
            await new Promise(resolve => setTimeout(resolve, 150));
        }
    }

    updateWinDisplay(amount, hits = 0) {
        const winElem = document.getElementById('win');
        if (amount > 0) {
            winElem.innerText = `$${amount}`;
        } else {
            winElem.innerText = '';
        }
    }
}
