// Wait for the DOM to be fully loaded before starting the game
window.addEventListener('load', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1280;
    canvas.height = 720;

    /**
     * Handles user input including keyboard and mouse.
     */
    class InputHandler {
        constructor(game) {
            this.game = game;
            this.keys = new Set(); // Using a Set for efficient key tracking
            this.mouseX = 0;
            this.mouseY = 0;
            this.mouseClicked = false;

            window.addEventListener('keydown', e => {
                const validKeys = ['w', 'a', 's', 'd', 'e', 'f'];
                if (validKeys.includes(e.key.toLowerCase())) {
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
            
            window.addEventListener('mousedown', e => {
                 if (e.button === 0) { // Left mouse click
                    this.mouseClicked = true;
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
            this.width = 30;
            this.height = 30;
            this.x = this.game.width / 2 - this.width / 2;
            this.y = this.game.height / 2 - this.height / 2;
            this.speed = 350; // pixels per second
            this.health = 1;

            // Dash ability
            this.dashCooldown = 3; // seconds
            this.dashTimer = this.dashCooldown;
            this.dashDistance = 200;
            this.dashSpeed = 1500;
            this.isDashing = false;
            this.dashTargetX = 0;
            this.dashTargetY = 0;


            // Flash ability
            this.flashCooldown = 15; // seconds
            this.flashTimer = this.flashCooldown;
            this.maxFlashRange = 450;
        }

        update(deltaTime, inputHandler) {
            // Update timers
            this.dashTimer += deltaTime;
            this.flashTimer += deltaTime;

            if (this.isDashing) {
                this.performDashMovement(deltaTime);
                return; // Don't allow other movements during dash
            }

            // Standard Movement
            let dx = 0;
            let dy = 0;
            if (inputHandler.keys.has('w')) dy -= 1;
            if (inputHandler.keys.has('s')) dy += 1;
            if (inputHandler.keys.has('a')) dx -= 1;
            if (inputHandler.keys.has('d')) dx += 1;

            // Normalize diagonal movement
            const magnitude = Math.sqrt(dx * dx + dy * dy);
            if (magnitude > 0) {
                dx /= magnitude;
                dy /= magnitude;
            }

            this.x += dx * this.speed * deltaTime;
            this.y += dy * this.speed * deltaTime;

            // Handle Abilities
            if (inputHandler.keys.has('e')) this.dash(inputHandler.mouseX, inputHandler.mouseY);
            if (inputHandler.keys.has('f')) this.flash(inputHandler.mouseX, inputHandler.mouseY);

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
            } else {
                const moveX = (dx / distance) * this.dashSpeed * deltaTime;
                const moveY = (dy / distance) * this.dashSpeed * deltaTime;
                this.x += moveX;
                this.y += moveY;
            }
        }

        draw(ctx) {
            // ASSET_PLAYER
            ctx.fillStyle = '#4a90e2'; // A nice blue color
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        dash(mouseX, mouseY) {
            if (this.dashTimer >= this.dashCooldown && !this.isDashing) {
                this.isDashing = true;
                this.dashTimer = 0;

                const dx = mouseX - (this.x + this.width / 2);
                const dy = mouseY - (this.y + this.height / 2);
                const magnitude = Math.sqrt(dx * dx + dy * dy);
                
                let moveX = 0;
                let moveY = 0;
                if (magnitude > 0) {
                    moveX = (dx / magnitude) * this.dashDistance;
                    moveY = (dy / magnitude) * this.dashDistance;
                }

                this.dashTargetX = this.x + moveX;
                this.dashTargetY = this.y + moveY;
            }
        }

        flash(mouseX, mouseY) {
            if (this.flashTimer >= this.flashCooldown) {
                this.flashTimer = 0;
                const dx = mouseX - (this.x + this.width / 2);
                const dy = mouseY - (this.y + this.height / 2);
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= this.maxFlashRange) {
                    this.x = mouseX - this.width / 2;
                    this.y = mouseY - this.height / 2;
                } else {
                    const ratio = this.maxFlashRange / distance;
                    this.x += dx * ratio;
                    this.y += dy * ratio;
                }
            }
        }

        takeDamage() {
            this.health = 0;
        }

        reset() {
            this.x = this.game.width / 2 - this.width / 2;
            this.y = this.game.height / 2 - this.height / 2;
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
        constructor(x, y, radius) {
            this.x = x;
            this.y = y;
            this.radius = radius;
            this.active = true;
        }
    }

    /**
     * A projectile that moves in a straight line.
     */
    class LinearProjectile extends Projectile {
        constructor(game, startX, startY, targetX, targetY, speed) {
            super(startX, startY, 8);
            this.game = game;
            this.speed = speed;

            const dx = targetX - startX;
            const dy = targetY - startY;
            const magnitude = Math.sqrt(dx * dx + dy * dy);

            this.vx = (dx / magnitude) * this.speed;
            this.vy = (dy / magnitude) * this.speed;
        }

        update(deltaTime) {
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;

            // Deactivate if it goes off-screen
            if (this.x + this.radius < 0 || this.x - this.radius > this.game.width ||
                this.y + this.radius < 0 || this.y - this.radius > this.game.height) {
                this.active = false;
            }
        }

        draw(ctx) {
            // ASSET_PROJECTILE
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#ff4136'; // Red
            ctx.fill();
        }
    }

    /**
     * An Area of Effect (AoE) projectile that explodes after a delay.
     */
    class AoEProjectile extends Projectile {
        constructor(x, y) {
            super(x, y, 60);
            this.warningDuration = 1.0; // 1 second warning
            this.activeDuration = 0.3; // 0.3 seconds active damage
            this.timer = 0;
            this.state = 'WARNING'; // 'WARNING', 'ACTIVE'
        }

        update(deltaTime) {
            this.timer += deltaTime;
            if (this.state === 'WARNING' && this.timer >= this.warningDuration) {
                this.state = 'ACTIVE';
            }
            if (this.state === 'ACTIVE' && this.timer >= this.warningDuration + this.activeDuration) {
                this.active = false;
            }
        }

        draw(ctx) {
             // ASSET_PROJECTILE
            if (this.state === 'WARNING') {
                const warningProgress = this.timer / this.warningDuration;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 65, 54, ${0.2 + warningProgress * 0.8})`;
                ctx.lineWidth = 4;
                ctx.stroke();
            } else if (this.state === 'ACTIVE') {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 65, 54, 0.8)'; // Solid red
                ctx.fill();
            }
        }
    }


    /**
     * Manages spawning projectiles with increasing difficulty.
     */
    class EnemySpawner {
        constructor(game) {
            this.game = game;
            this.spawnInterval = 2.0; // Start by spawning one every 2 seconds
            this.spawnTimer = 0;
        }

        update(deltaTime, score) {
            this.spawnTimer += deltaTime;
            
            // Difficulty scaling: spawn rate increases with score
            this.spawnInterval = Math.max(0.1, 2.0 - score / 30);
            
            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnTimer = 0;
                this.spawnProjectile(score);

                // Chance to spawn a second projectile at higher scores
                if (score > 20 && Math.random() < 0.3) {
                     this.spawnProjectile(score);
                }
            }

            // Occasionally spawn an AoE projectile
            if (Math.random() < 0.002 && score > 10) {
                 this.game.projectiles.push(new AoEProjectile(this.game.player.x + this.game.player.width / 2, this.game.player.y + this.game.player.height / 2));
            }
        }

        spawnProjectile(score) {
            let spawnX, spawnY;
            const edge = Math.floor(Math.random() * 4);
            switch (edge) {
                case 0: // Top
                    spawnX = Math.random() * this.game.width;
                    spawnY = -20;
                    break;
                case 1: // Right
                    spawnX = this.game.width + 20;
                    spawnY = Math.random() * this.game.height;
                    break;
                case 2: // Bottom
                    spawnX = Math.random() * this.game.width;
                    spawnY = this.game.height + 20;
                    break;
                case 3: // Left
                    spawnX = -20;
                    spawnY = Math.random() * this.game.height;
                    break;
            }
            
            // Difficulty scaling: projectile speed increases with score
            const projectileSpeed = 200 + score * 4;
            this.game.projectiles.push(new LinearProjectile(this.game, spawnX, spawnY, this.game.player.x, this.game.player.y, projectileSpeed));
        }
        
        reset() {
            this.spawnInterval = 2.0;
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
            this.gameState = 'MENU'; // 'MENU', 'PLAYING', 'GAME_OVER'

            this.inputHandler = new InputHandler(this);
            this.player = new Player(this);
            this.enemySpawner = new EnemySpawner(this);
            
            this.projectiles = [];
            this.score = 0;
            this.highScore = localStorage.getItem('dodgeGameHighScore') || 0;

            this.lastTime = 0;
        }

        update(deltaTime) {
            switch (this.gameState) {
                case 'MENU':
                    if (this.inputHandler.mouseClicked) {
                        this.gameState = 'PLAYING';
                        this.canvas.classList.add('playing');
                    }
                    break;
                case 'PLAYING':
                    this.score += deltaTime;
                    this.player.update(deltaTime, this.inputHandler);
                    this.enemySpawner.update(deltaTime, this.score);
                    
                    // Update and check projectiles
                    this.projectiles.forEach(p => {
                        p.update(deltaTime);
                        if (checkCollision(this.player, p)) {
                            // AoE projectiles only damage when active
                            if (p instanceof AoEProjectile && p.state !== 'ACTIVE') return;
                            this.player.takeDamage();
                        }
                    });

                    // Remove inactive projectiles
                    this.projectiles = this.projectiles.filter(p => p.active);
                    
                    // Check for game over
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
                    if (this.inputHandler.mouseClicked) {
                       this.reset();
                       this.gameState = 'PLAYING';
                       this.canvas.classList.add('playing');
                    }
                    break;
            }
            // Reset click state after processing
            this.inputHandler.mouseClicked = false;
        }

        draw() {
            this.ctx.clearRect(0, 0, this.width, this.height);

            switch (this.gameState) {
                case 'MENU':
                    this.drawText('CLICK TO START', this.width / 2, this.height / 2, 60, 'white');
                    break;
                case 'PLAYING':
                    this.player.draw(this.ctx);
                    this.projectiles.forEach(p => p.draw(this.ctx));
                    this.drawUI();
                    break;
                case 'GAME_OVER':
                    this.drawText('GAME OVER', this.width / 2, this.height / 2 - 60, 80, '#ff4136');
                    this.drawText(`Score: ${Math.floor(this.score)}`, this.width / 2, this.height / 2 + 10, 40, 'white');
                    this.drawText(`High Score: ${this.highScore}`, this.width / 2, this.height / 2 + 60, 30, '#aaa');
                    this.drawText('Click to Play Again', this.width / 2, this.height / 2 + 120, 30, 'white');
                    break;
            }
        }

        drawUI() {
            // Score and High Score
            this.drawText(`Score: ${Math.floor(this.score)}`, 20, 40, 30, 'white', 'left');
            this.drawText(`High Score: ${this.highScore}`, 20, 80, 20, '#aaa', 'left');

            // Ability Cooldowns
            const abilityY = this.height - 40;
            const abilitySpacing = 120;
            // Dash (E)
            this.drawAbilityIcon(this.width / 2 - abilitySpacing, abilityY, 'E', this.player.dashTimer, this.player.dashCooldown);
            // Flash (F)
            this.drawAbilityIcon(this.width / 2 + abilitySpacing, abilityY, 'F', this.player.flashTimer, this.player.flashCooldown);
        }

        drawText(text, x, y, size, color, align = 'center') {
            this.ctx.font = `bold ${size}px 'Segoe UI', sans-serif`;
            this.ctx.fillStyle = color;
            this.ctx.textAlign = align;
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(text, x, y);
        }

        drawAbilityIcon(x, y, key, timer, cooldown) {
            const size = 60;
            const ready = timer >= cooldown;
        
            // Background
            this.ctx.fillStyle = ready ? '#222' : '#555';
            this.ctx.strokeStyle = ready ? '#888' : '#aaa';
            this.ctx.lineWidth = 2;
            this.ctx.fillRect(x - size / 2, y - size / 2, size, size);
            this.ctx.strokeRect(x - size / 2, y - size / 2, size, size);
        
            // Key Text
            this.ctx.fillStyle = ready ? '#fff' : '#888';
            this.ctx.font = `bold 24px 'Segoe UI'`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(key, x, y);
        
            // Cooldown overlay
            if (!ready) {
                const remaining = cooldown - timer;
                this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
                this.ctx.fillRect(x - size / 2, y - size / 2, size, size);
                this.ctx.fillStyle = '#fff';
                this.ctx.font = `bold 28px 'Segoe UI'`;
                this.ctx.fillText(remaining.toFixed(1), x, y);
            }
        }

        reset() {
            this.player.reset();
            this.enemySpawner.reset();
            this.projectiles = [];
            this.score = 0;
        }
    }

    /**
     * Circle vs Rectangle collision detection.
     * @param {object} rect - The rectangle object {x, y, width, height}.
     * @param {object} circle - The circle object {x, y, radius}.
     * @returns {boolean} - True if they are colliding.
     */
    function checkCollision(rect, circle) {
        // Find the closest point on the rect to the circle's center
        const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
        const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

        // Calculate the distance between the closest point and the circle's center
        const distanceX = circle.x - closestX;
        const distanceY = circle.y - closestY;
        const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

        return distanceSquared < (circle.radius * circle.radius);
    }
    

    // Initialize and start the game loop
    const game = new GameManager(canvas, ctx);
    let lastTime = 0;

    function animate(timestamp) {
        const deltaTime = (timestamp - lastTime) / 1000; // time in seconds
        lastTime = timestamp;

        game.update(deltaTime);
        game.draw();

        requestAnimationFrame(animate);
    }

    animate(0);
});