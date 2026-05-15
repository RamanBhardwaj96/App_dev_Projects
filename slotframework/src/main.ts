import './style.css';
import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';

// Configuration
const REEL_WIDTH = 160;
const SYMBOL_SIZE = 150;
const REELS_COUNT = 5;
const ROWS_COUNT = 3;
const GAME_WIDTH = (REEL_WIDTH * REELS_COUNT) + 100;
const GAME_HEIGHT = (SYMBOL_SIZE * ROWS_COUNT) + 200;

// Symbol definitions
const symbolColors = [0xf43f5e, 0x8b5cf6, 0x3b82f6, 0x10b981, 0xf59e0b, 0xeab308];
const symbolTexts = ['A', 'K', 'Q', 'J', '10', '9'];

async function init() {
    // Initialize Pixi Application
    const app = new PIXI.Application();
    
    await app.init({
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        backgroundColor: 0x0f172a,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
    });

    document.getElementById('app')!.appendChild(app.canvas);

    // Generate symbol textures dynamically
    const textures: PIXI.Texture[] = [];

    for (let i = 0; i < symbolColors.length; i++) {
        const gfx = new PIXI.Graphics();
        
        // Draw gem-like shape
        gfx.roundRect(0, 0, SYMBOL_SIZE - 20, SYMBOL_SIZE - 20, 20);
        gfx.fill(symbolColors[i]);
        gfx.stroke({ width: 4, color: 0xffffff, alpha: 0.3 });
        
        // Add text
        const textStyle = new PIXI.TextStyle({
            fontFamily: 'Outfit, sans-serif',
            fontSize: 72,
            fontWeight: '900',
            fill: '#ffffff',
            dropShadow: {
                alpha: 0.5,
                blur: 4,
                color: '#000000',
                distance: 2,
            }
        });
        
        const text = new PIXI.Text({ text: symbolTexts[i], style: textStyle });
        text.anchor.set(0.5);
        text.x = (SYMBOL_SIZE - 20) / 2;
        text.y = (SYMBOL_SIZE - 20) / 2;
        
        gfx.addChild(text);
        
        // Render to texture
        const texture = app.renderer.generateTexture(gfx);
        textures.push(texture);
    }

    // Build Slot Machine Container
    const slotContainer = new PIXI.Container();
    slotContainer.x = 50;
    slotContainer.y = 50;
    app.stage.addChild(slotContainer);

    // Frame around slot
    const frame = new PIXI.Graphics();
    frame.roundRect(-10, -10, (REEL_WIDTH * REELS_COUNT) + 20, (SYMBOL_SIZE * ROWS_COUNT) + 20, 20);
    frame.stroke({ width: 10, color: 0xd4af37, alignment: 1 });
    slotContainer.addChild(frame);

    // Background for reels
    const reelBg = new PIXI.Graphics();
    reelBg.roundRect(0, 0, REEL_WIDTH * REELS_COUNT, SYMBOL_SIZE * ROWS_COUNT, 10);
    reelBg.fill(0x1e293b);
    slotContainer.addChild(reelBg);

    // Mask for reels
    const mask = new PIXI.Graphics();
    mask.roundRect(0, 0, REEL_WIDTH * REELS_COUNT, SYMBOL_SIZE * ROWS_COUNT, 10);
    mask.fill(0xffffff);
    slotContainer.addChild(mask);

    const reelsContainer = new PIXI.Container();
    reelsContainer.mask = mask;
    slotContainer.addChild(reelsContainer);

    // Reels Logic
    interface SymbolData {
        sprite: PIXI.Sprite;
        id: number;
    }

    interface Reel {
        container: PIXI.Container;
        symbols: SymbolData[];
        position: number;
        previousPosition: number;
        blur: PIXI.BlurFilter;
    }

    const reels: Reel[] = [];

    // Populate reels
    for (let i = 0; i < REELS_COUNT; i++) {
        const rc = new PIXI.Container();
        rc.x = i * REEL_WIDTH;
        reelsContainer.addChild(rc);

        const blurFilter = new PIXI.BlurFilter();
        blurFilter.blurX = 0;
        blurFilter.blurY = 0;
        rc.filters = [blurFilter];

        const reel: Reel = {
            container: rc,
            symbols: [],
            position: 0,
            previousPosition: 0,
            blur: blurFilter
        };

        // We add more symbols than rows for seamless scrolling
        for (let j = 0; j < ROWS_COUNT + 1; j++) {
            const id = Math.floor(Math.random() * textures.length);
            const sprite = new PIXI.Sprite(textures[id]);
            
            // Center anchor for scaling
            sprite.anchor.set(0.5);
            
            sprite.y = j * SYMBOL_SIZE + SYMBOL_SIZE / 2;
            sprite.x = REEL_WIDTH / 2;
            
            reel.symbols.push({ sprite, id });
            rc.addChild(sprite);
        }
        reels.push(reel);
    }

    // Build UI
    const uiContainer = new PIXI.Container();
    uiContainer.y = GAME_HEIGHT - 100;
    app.stage.addChild(uiContainer);

    // Spin Button
    const spinButton = new PIXI.Container();
    spinButton.x = GAME_WIDTH / 2;
    spinButton.y = 50;
    spinButton.eventMode = 'static';
    spinButton.cursor = 'pointer';

    const spinBg = new PIXI.Graphics();
    spinBg.roundRect(-100, -40, 200, 80, 40);
    spinBg.fill(0x22c55e);
    spinBg.stroke({ width: 4, color: 0x166534, alignment: 1 });
    spinButton.addChild(spinBg);

    const spinText = new PIXI.Text({
        text: 'SPIN', 
        style: new PIXI.TextStyle({
            fontFamily: 'Outfit',
            fontSize: 36,
            fontWeight: '900',
            fill: '#ffffff',
            dropShadow: {
                alpha: 0.5,
                blur: 2,
                color: '#000000',
                distance: 2,
            }
        })
    });
    spinText.anchor.set(0.5);
    spinButton.addChild(spinText);

    uiContainer.addChild(spinButton);

    let running = false;

    // Reel spinning mechanics
    spinButton.on('pointerdown', () => {
        if (running) return;
        startPlay();
    });

    // Hover effect
    spinButton.on('pointerover', () => {
        if(running) return;
        gsap.to(spinButton.scale, { x: 1.05, y: 1.05, duration: 0.2 });
    });
    spinButton.on('pointerout', () => {
        gsap.to(spinButton.scale, { x: 1, y: 1, duration: 0.2 });
    });

    function startPlay() {
        running = true;
        spinBg.tint = 0x888888;
        
        // Reset scale of all symbols
        for (let i = 0; i < reels.length; i++) {
            const r = reels[i];
            for (let j = 0; j < r.symbols.length; j++) {
                gsap.killTweensOf(r.symbols[j].sprite.scale);
                r.symbols[j].sprite.scale.set(1);
            }
        }
        
        // Determine target positions for reels
        for (let i = 0; i < reels.length; i++) {
            const r = reels[i];
            const extra = Math.floor(Math.random() * 3);
            const target = r.position + 10 + i * 5 + extra;
            const time = 2 + i * 0.5;
            
            gsap.to(r, {
                position: target,
                duration: time,
                ease: "back.inOut(0.5)",
                onUpdate: () => {
                    // Calculate blur
                    r.blur.blurY = Math.abs(r.position - r.previousPosition) * 10;
                    r.previousPosition = r.position;
                },
                onComplete: () => {
                    r.blur.blurY = 0;
                    if (i === reels.length - 1) {
                        running = false;
                        spinBg.tint = 0xffffff;
                        checkWin();
                    }
                }
            });
        }
    }

    // Update loop for symbols based on reel position
    app.ticker.add(() => {
        for (let i = 0; i < reels.length; i++) {
            const r = reels[i];
            
            for (let j = 0; j < r.symbols.length; j++) {
                const s = r.symbols[j];
                const prevY = s.sprite.y;
                
                // Loop symbol position
                const yPos = ((r.position + j) % r.symbols.length) * SYMBOL_SIZE - SYMBOL_SIZE;
                s.sprite.y = yPos + SYMBOL_SIZE / 2;
                
                // If symbol wrapped around from bottom to top, assign random texture
                if (s.sprite.y < 0 && prevY > SYMBOL_SIZE) {
                    s.id = Math.floor(Math.random() * textures.length);
                    s.sprite.texture = textures[s.id];
                }
            }
        }
    });

    function checkWin() {
        // Here you would implement your actual payline evaluation logic.
        // For example:
        // 1. Get the final symbol IDs for each row/column
        // 2. Check against a predefined paytable
        // 3. Highlight winning lines and update the user's balance
    }
}

init();
