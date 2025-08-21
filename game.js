// Wait for the DOM to be fully loaded before starting the game
window.addEventListener('load', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1280;
    canvas.height = 720;

    // ASSET MANAGEMENT: In a real game, you'd have a proper asset loader.
    // For now, we'll define placeholders.
    const playerImage = null; // To use an image, you'd do: new Image(); playerImage.src = 'path/to/ezreal.png';
    const projectileImages = {
        mysticShot: null, // new Image(); mysticShot.src = '...';
    };


    /**
     * Handles user input including keyboard and mouse.
     */
    class InputHandler {
        constructor(game) {
            this.game = game;
            this.keys = new Set();
            this.mouseX = 0;
            this.mouseY = 0;
            this.isMouseDown = false; // NEW: Track if the mouse is held down

            window.addEventListener('keydown', e => {
                // We only care about ability keys now
                if (e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'f') {
                    this.keys.add(e.key.toLowerCase());
                }
            });

            window.addEventListener('keyup', e => {
                this.keys.delete(e.key.toLowerCase());
            });

            this.game.canvas.addEventListener('mousemove', e => {
                const rect = this.game.canvas.getBoundingClientRect();
                this.mouseX = e.clientX - rect.left;
                this.mouseY = e.clientY - rect.top;
            });
            
            this.game.canvas.addEventListener('mousedown', e => {
                 if (e.button === 0) { // Left mouse click
                    this.isMouseDown = true;
                }
            });

            this.game.canvas.addEventListener('mouseup', e => {
                if (e.button === 0) {
                    this.isMouseDown = false;
                }
            });
        }
    }

    /**
     * Represents the player character.
     */
    class Player {
        constructor(game) {
            this.game = game;
            this.width = 40; // Size of the character sprite
            this.height = 40;
            this.x = this.game.width / 2 - this.width / 2;
            this.y = this.game.height / 2 - this.height / 2;
            
            // NEW: Click-to-move properties
            this.targetX = this.x;
            this.targetY = this.y;

            this.speed = 380;
            this.health = 1;

            this.dashCooldown = 3;
            this.dashTimer = this.dashCooldown;
            this.dashDistance = 250;
            this.dashSpeed = 1500;
            this.isDashing = false;
            this.dashTargetX = 0;
            this.dashTargetY = 0;

            this.flashCooldown = 15;
            this.flashTimer = this.flashCooldown;
            this.maxFlashRange = 450;
        }

        update(deltaTime, inputHandler) {
            this.dashTimer += deltaTime;
            this.flashTimer += deltaTime;

            if (this.isDashing) {
                this.performDashMovement(deltaTime);
                return;
            }

            // NEW: Hold-to-move logic
            if (inputHandler.isMouseDown) {
                this.targetX = inputHandler.mouseX;
                this.targetY = inputHandler.mouseY;
            }

            const dx = this.targetX - (this.x + this.width / 2);
            const dy = this.targetY - (this.y + this.height / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Move towards the target if not already there
            if (distance > this.speed * deltaTime) {
                const moveX = (dx / distance) * this.speed * deltaTime;
                const moveY = (dy / distance) * this.speed * deltaTime;
                this.x += moveX;
                this.y += moveY;
            } else {
                this.x = this.targetX - this.width / 2;
                this.y = this.targetY - this.height / 2;
            }
            
            // Handle Abilities
            if (inputHandler.keys.has('e')) this.dash(inputHandler.mouseX, inputHandler.mouseY);
            if (inputHandler.keys.has('f')) this.flash(inputHandler.mouseX, inputHandler.mouseY);
            inputHandler.keys.clear(); // Consume ability press

            // Boundary checks
            this.x = Math.max(0, Math.min(this.game.width - this.width, this.x));
            this.y = Math.max(0, Math.min(this.game.height - this.height, this.y));
        }
        
        performDashMovement(deltaTime) {
             const dx = this.dashTargetX - this.x;
             const dy = this.dashTargetY - this.y;
             const distance = Math.sqrt(dx * dx + dy * dy);

             if (distance < this.dashSpeed * deltaTime) {
                 this.x = this.dashTargetX;
                 this.y = this.dashTargetY;
                 this.isDashing = false;
                 this.targetX = this.x; // Stop movement after dash
                 this.targetY = this.y;
             } else {
                 this.x += (dx / distance) * this.dashSpeed * deltaTime;
                 this.y += (dy / distance) * this.dashSpeed * deltaTime;
             }
        }

        draw(ctx) {
            // NEW: Drawing logic for a humanoid character
            if (playerImage && playerImage.complete) {
                // If you have a player image asset, it will be drawn here.
                ctx.drawImage(playerImage, this.x, this.y, this.width, this.height);
            } else {
                // Placeholder if no image is loaded
                // ASSET_PLAYER
                ctx.fillStyle = '#f0e68c'; // Ezreal-like gold color
                ctx.fillRect(this.x, this.y, this.width / 2, this.height);
                 ctx.fillStyle = '#add8e6'; // Blueish cloak
                ctx.fillRect(this.x + this.width / 2, this.y, this.width / 2, this.height);
            }
            // Draw a simple health bar above the player
            ctx.fillStyle = '#101010';
            ctx.fillRect(this.x - 5, this.y - 15, this.width + 10, 10);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - 5, this.y - 15, (this.width + 10) * this.health, 10);
        }

        dash(mouseX, mouseY) {
            if (this.dashTimer >= this.dashCooldown && !this.isDashing) {
                this.isDashing = true;
                this.dashTimer = 0;
                const dx = mouseX - (this.x + this.width / 2);
                const dy = mouseY - (this.y + this.height / 2);
                const magnitude = Math.sqrt(dx * dx + dy * dy);
                if (magnitude > 0) {
                    this.dashTargetX = this.x + (dx / magnitude) * this.dashDistance;
                    this.dashTargetY = this.y + (dy / magnitude) * this.dashDistance;
                } else {
                     this.dashTargetX = this.x + this.dashDistance;
                     this.dashTargetY = this.y;
                }
            }
        }
        
        flash(mouseX, mouseY) {
            if (this.flashTimer >= this.flashCooldown) {
                this.flashTimer = 0;
                const centerX = this.x + this.width / 2;
                const centerY = this.y + this.height / 2;
                const dx = mouseX - centerX;
                const dy = mouseY - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= this.maxFlashRange) {
                    this.x = mouseX - this.width / 2;
                    this.y = mouseY - this.height / 2;
                } else {
                    this.x += (dx / distance) * this.maxFlashRange;
                    this.y += (dy / distance) * this.maxFlashRange;
                }
                this.targetX = this.x; // Stop movement after flash
                this.targetY = this.y;
            }
        }


        takeDamage() {
            this.health = 0;
        }

        reset() {
            this.x = this.game.width / 2 - this.width / 2;
            this.y = this.game.height / 2 - this.height / 2;
            this.targetX = this.x;
            this.targetY = this.y;
            this.health = 1;
            this.dashTimer = this.dashCooldown;
            this.flashTimer = this.flashCooldown;
            this.isDashing = false;
        }
    }
    
    /**
     * Base class for all projectiles.
     */
    class Projectile {
        constructor(game, startX, startY, targetX, targetY, config) {
            this.game = game;
            this.x = startX;
            this.y = startY;
            this.active = true;
            
            // Copy properties from config
            this.speed = config.speed;
            this.color = config.color;
            this.width = config.width;
            this.height = config.height;
            this.radius = config.radius || Math.max(this.width, this.height) / 2; // Approx radius for collision
            
            const dx = targetX - startX;
            const dy = targetY - startY;
            const magnitude = Math.sqrt(dx * dx + dy * dy);

            this.vx = (dx / magnitude) * this.speed;
            this.vy = (dy / magnitude) * this.speed;
        }

        update(deltaTime) {
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;

            if (this.x + this.width < 0 || this.x > this.game.width ||
                this.y + this.height < 0 || this.y > this.game.height) {
                this.active = false;
            }
        }

        draw(ctx) {
            // ASSET_PROJECTILE
            // Draw as a rotating rectangle to simulate skillshots
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.rotate(Math.atan2(this.vy, this.vx));
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            ctx.restore();
        }
    }


    /**
     * Manages spawning projectiles with increasing difficulty.
     */
    class EnemySpawner {
        constructor(game) {
            this.game = game;
            this.spawnInterval = 1.5;
            this.spawnTimer = 0;
            
            // NEW: Define different projectile types based on LoL skills
            this.projectileTypes = [
                { name: 'MysticShot', speed: 1200, color: '#f2d479', width: 70, height: 15 },
                { name: 'DarkBinding', speed: 900, color: '#4b0082', width: 25, height: 25, radius: 15 },
                { name: 'LightBinding', speed: 1000, color: '#ffff99', width: 30, height: 30, radius: 18 },
                { name: 'RocketGrab', speed: 1100, color: '#a0522d', width: 20, height: 20, radius: 12 },
            ];
        }

        update(deltaTime, score) {
            this.spawnTimer += deltaTime;
            this.spawnInterval = Math.max(0.08, 1.5 - score / 40);
            
            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnTimer = 0;
                this.spawnProjectile();

                if (score > 30 && Math.random() < 0.5) {
                    this.spawnProjectile();
                }
            }
        }

        spawnProjectile() {
            let spawnX, spawnY;
            const edge = Math.floor(Math.random() * 4);
            switch (edge) {
                case 0: spawnX = Math.random() * this.game.width; spawnY = -50; break;
                case 1: spawnX = this.game.width + 50; spawnY = Math.random() * this.game.height; break;
                case 2: spawnX = Math.random() * this.game.width; spawnY = this.game.height + 50; break;
                case 3: spawnX = -50; spawnY = Math.random() * this.game.height; break;
            }
            
            const projectileConfig = this.projectileTypes[Math.floor(Math.random() * this.projectileTypes.length)];
            const targetX = this.game.player.x + this.game.player.width / 2;
            const targetY = this.game.player.y + this.game.player.height / 2;

            this.game.projectiles.push(new Projectile(this.game, spawnX, spawnY, targetX, targetY, projectileConfig));
        }
        
        reset() {
            this.spawnInterval = 1.5;
            this.spawnTimer = 0;
        }
    }

    /**
     * The main game manager class.
     */
    class GameManager {
        constructor(canvas, ctx) {
            this.canvas = canvas;
            this.ctx = ctx;
            this.width = canvas.width;
            this.height = canvas.height;
            this.gameState = 'MENU';

            this.inputHandler = new InputHandler(this);
            this.player = new Player(this);
            this.enemySpawner = new EnemySpawner(this);
            
            this.projectiles = [];
            this.score = 0;
            this.highScore = localStorage.getItem('dodgeGameHighScore') || 0;
        }

        update(deltaTime) {
            switch (this.gameState) {
                case 'MENU':
                    if (this.inputHandler.isMouseDown) {
                        this.gameState = 'PLAYING';
                        this.canvas.classList.add('playing');
                    }
                    break;
                case 'PLAYING':
                    this.score += deltaTime;
                    this.player.update(deltaTime, this.inputHandler);
                    this.enemySpawner.update(deltaTime, this.score);
                    
                    this.projectiles.forEach(p => {
                        p.update(deltaTime);
                        if (checkCollision(this.player, p)) {
                            this.player.takeDamage();
                        }
                    });

                    this.projectiles = this.projectiles.filter(p => p.active);
                    
                    if (this.player.health <= 0) {
                        this.gameState = 'GAME_OVER';
                        this.canvas.classList.remove('playing');
                        if (this.score > this.highScore) {
                            this.highScore = Math.floor(this.score);
                            localStorage.setItem('dodgeGameHighScore', this.highScore);
                        }
                    }
                    break;
                case 'GAME_OVER':
                     if (this.inputHandler.isMouseDown) {
                        // Use a small delay to prevent accidental restart
                        setTimeout(() => {
                            this.reset();
                            this.gameState = 'PLAYING';
                            this.canvas.classList.add('playing');
                            this.inputHandler.isMouseDown = false;
                        }, 100);
                     }
                    break;
            }
        }

        draw() {
            // Clear the canvas. The background image from CSS will show through.
            this.ctx.clearRect(0, 0, this.width, this.height);

            switch (this.gameState) {
                case 'MENU':
                    this.drawText('CLICK TO START', this.width / 2, this.height / 2, 70, '#c4b998', '#010a13');
                    break;
                case 'PLAYING':
                    this.player.draw(this.ctx);
                    this.projectiles.forEach(p => p.draw(this.ctx));
                    this.drawUI();
                    break;
                case 'GAME_OVER':
                    this.drawText('DEFEAT', this.width / 2, this.height / 2 - 80, 100, '#ff4136', '#010a13');
                    this.drawText(`Time: ${Math.floor(this.score)}s`, this.width / 2, this.height / 2 + 10, 40, '#c4b998', '#010a13');
                    this.drawText(`High Score: ${this.highScore}s`, this.width / 2, this.height / 2 + 60, 30, '#a09477', '#010a13');
                    this.drawText('Click to Play Again', this.width / 2, this.height / 2 + 120, 30, '#c4b998', '#010a13');
                    break;
            }
        }

        drawUI() {
            this.drawText(`Time: ${Math.floor(this.score)}`, this.width / 2, 40, 30, '#c4b998', '#010a13');
        }

        drawText(text, x, y, size, color, strokeColor) {
            this.ctx.font = `bold ${size}px "Beaufort for LOL", "Spiegel", sans-serif`;
            this.ctx.fillStyle = color;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            if (strokeColor) {
                this.ctx.strokeStyle = strokeColor;
                this.ctx.lineWidth = size / 10;
                this.ctx.strokeText(text, x, y);
            }
            this.ctx.fillText(text, x, y);
        }

        reset() {
            this.player.reset();
            this.enemySpawner.reset();
            this.projectiles = [];
            this.score = 0;
        }
    }

    function checkCollision(rect, projectile) {
        // Use projectile's approximate radius for simpler collision
        const circle = { x: projectile.x + projectile.width / 2, y: projectile.y + projectile.height / 2, radius: projectile.radius };
        
        const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
        const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

        const distanceX = circle.x - closestX;
        const distanceY = circle.y - closestY;
        const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

        return distanceSquared < (circle.radius * circle.radius);
    }
    
    const game = new GameManager(canvas, ctx);
    let lastTime = 0;

    function animate(timestamp) {
        const deltaTime = (timestamp - lastTime) / 1000;
        lastTime = timestamp;
        game.update(deltaTime || 0); // Use 0 if deltaTime is NaN on the first frame
        game.draw();
        requestAnimationFrame(animate);
    }

    animate(0);
});
