// Game Scene Module - Street Driving Game
export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        this.load.image('player', 'assets/player.png');
    }

    create() {
        // ========== GAME STATE ==========
        this.gameActive = true;
        this.score = 0;
        this.survivalTime = 0;
        this.speedMultiplier = 1;
        this.trafficSpawnRate = 400; // milliseconds between spawns
        this.baseTrafficSpeed = 500;

        // ========== WORLD BOUNDS & CAMERA ==========
        this.physics.world.setBounds(0, -50000, 800, 100000);
        this.cameras.main.setBackgroundColor(0x1a1a1a);
        this.cameras.main.setBounds(0, -50000, 800, 100000);

        // ========== ROAD SETUP ==========
        this.roadWidth = 400;
        this.roadX = 200;
        this.laneMarkings = [];
        this.createRoad();

        // ========== PLAYER CAR ==========
        this.player = this.createPlayerCar();

        // ========== CAMERA FOLLOW ==========
        this.cameras.main.startFollow(this.player, false, 1, 1, 0, 300);

        // ========== INPUT HANDLING ==========
        this.setupInput();

        // ========== PHYSICS GROUPS ==========
        this.trafficGroup = this.physics.add.group();

        // ========== COLLISION DETECTION ==========
        this.physics.add.overlap(this.player, this.trafficGroup, this.handleCollision, null, this);

        // ========== UI TEXT ==========
        this.timerText = this.add.text(20, 20, 'Time: 0s', {
            font: '20px Arial',
            fill: '#ffffff'
        }).setScrollFactor(0);

        this.speedText = this.add.text(20, 50, 'Speed: 0', {
            font: '20px Arial',
            fill: '#ffffff'
        }).setScrollFactor(0);

        this.scoreText = this.add.text(20, 80, 'Score: 0', {
            font: '20px Arial',
            fill: '#ffffff'
        }).setScrollFactor(0);

        this.fpsText = this.add.text(20, 110, 'FPS: 0', {
            font: '20px Arial',
            fill: '#ffffff'
        }).setScrollFactor(0);

        this.gameOverText = this.add.text(400, 300, '', {
            font: '48px Arial',
            fill: '#ff0000',
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0);

        this.restartText = this.add.text(400, 400, '', {
            font: '24px Arial',
            fill: '#ffff00'
        }).setOrigin(0.5).setScrollFactor(0);

        // ========== TRAFFIC SPAWNING ==========
        this.trafficSpawnTimer = 0;
        this.spawnInterval = this.trafficSpawnRate;
        this.difficultyTimer = 0;

        // ========== PLAYER MOVEMENT STATE ==========
        this.moveLeft = false;
        this.moveRight = false;
        this.accelerating = false;
        this.braking = false;
        this.playerVelocityY = 0; // Track current forward velocity for gradual braking

        // ========== ROAD ANIMATION ==========
        this.roadScrollOffset = 0;
        this.lastMarkingY = 0;
    }

    update(time, delta) {
        if (!this.gameActive) return;

        // ========== UPDATE SURVIVAL TIME & DIFFICULTY ==========
        this.survivalTime += delta / 1000;
        this.timerText.setText(`Time: ${Math.floor(this.survivalTime)}s`);

        // Increase difficulty every 10 seconds
        this.difficultyTimer += delta;
        if (this.difficultyTimer > 10000) {
            this.difficultyTimer = 0;
            this.spawnInterval = Math.max(1500, this.trafficSpawnRate - 200);
            this.trafficSpawnRate = this.spawnInterval;
            this.baseTrafficSpeed += 25;
            this.speedMultiplier += 0.1;
        }

        // ========== ANIMATE ROAD MARKINGS ==========
        this.roadScrollOffset += 3;
        if (this.roadScrollOffset > 100) {
            this.roadScrollOffset = 0;
        }
        this.updateRoadMarkings();

        // ========== DYNAMICALLY SPAWN ROAD MARKINGS ==========
        const minY = this.player.y - 500;
        const maxY = this.player.y + 500;
        if (this.lastMarkingY < maxY) {
            this.spawnRoadMarkings(maxY);
            this.lastMarkingY = maxY;
        }

        // ========== PLAYER INPUT & MOVEMENT ==========
        this.handlePlayerMovement(delta);

        // ========== UPDATE UI ==========
        const displaySpeed = Math.round(Math.abs(this.player.body.velocity.y) / 10);
        this.speedText.setText(`Speed: ${displaySpeed}`);
        this.scoreText.setText(`Score: ${Math.round(this.score)}`);
        this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);

        // Increase score based on survival and speed
        this.score += (displaySpeed * 0.1 * delta) / 1000;

        // ========== SPAWN TRAFFIC ==========
        this.trafficSpawnTimer += delta;
        if (this.trafficSpawnTimer > this.spawnInterval && Math.abs(this.playerVelocityY) > 50) {
            this.trafficSpawnTimer = 0;
            this.spawnTrafficCar();
        }

        // ========== UPDATE TRAFFIC ==========
        this.trafficGroup.children.entries.forEach(car => {
            // Remove cars that have gone far off-screen
            if (car.y < this.player.y - 1000 || car.y > this.player.y + 1000) {
                car.destroy();
            }
        });
    }

    // ========== HELPER METHODS ==========

    createRoad() {
        // Draw road background - infinite road
        this.add.rectangle(this.roadX + this.roadWidth / 2, 0, this.roadWidth, 100000, 0x333333);

        // Draw lane markings (dashed lines) - store in array for animation
        const laneWidth = this.roadWidth / 4;
        for (let i = 0; i < 1000; i++) {
            const y = i * 100;
            // Three lane markings to create 4 lanes
            const mark1 = this.add.rectangle(
                this.roadX + laneWidth * 1,
                y - 50000,
                2,
                40,
                0xffff00
            ).setOrigin(0.5);
            const mark2 = this.add.rectangle(
                this.roadX + laneWidth * 2,
                y - 50000,
                2,
                40,
                0xffff00
            ).setOrigin(0.5);
            const mark3 = this.add.rectangle(
                this.roadX + laneWidth * 3,
                y - 50000,
                2,
                40,
                0xffff00
            ).setOrigin(0.5);
            this.laneMarkings.push(mark1, mark2, mark3);
        }

        // Draw road edges - infinite edges
        const edgeColor = 0xffffff;
        this.add.rectangle(this.roadX - 5, 0, 10, 100000, edgeColor); // Left edge
        this.add.rectangle(this.roadX + this.roadWidth + 5, 0, 10, 100000, edgeColor); // Right edge
    }

    spawnRoadMarkings(maxY) {
        const laneWidth = this.roadWidth / 4;
        const spacing = 100;
        const startY = Math.floor(this.lastMarkingY / spacing) * spacing;
        
        for (let y = startY; y <= maxY + 500; y += spacing) {
            const mark1 = this.add.rectangle(
                this.roadX + laneWidth * 1,
                y,
                2,
                40,
                0xffff00
            ).setOrigin(0.5);
            const mark2 = this.add.rectangle(
                this.roadX + laneWidth * 2,
                y,
                2,
                40,
                0xffff00
            ).setOrigin(0.5);
            const mark3 = this.add.rectangle(
                this.roadX + laneWidth * 3,
                y,
                2,
                40,
                0xffff00
            ).setOrigin(0.5);
            this.laneMarkings.push(mark1, mark2, mark3);
        }
    }

    updateRoadMarkings() {
        // No longer needed - markings spawn dynamically
    }

    createPlayerCar() {
        const car = this.add.sprite(this.roadX + this.roadWidth / 2, 9500, 'player');
        this.physics.add.existing(car);
        car.body.setSize(120, 120, true);
        car.body.setBounce(0);
        car.body.setDrag(0.5);
        car.body.setMaxVelocity(1000, 1000);
        car.body.setCollideWorldBounds(true);
        return car;
    }

    setupInput() {
        this.keys = {
            w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            r: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)
        };

        // Input event listeners for continuous movement
        this.input.keyboard.on('keydown-W', () => { this.accelerating = true; });
        this.input.keyboard.on('keyup-W', () => { this.accelerating = false; });

        this.input.keyboard.on('keydown-S', () => { this.braking = true; });
        this.input.keyboard.on('keyup-S', () => { this.braking = false; });

        this.input.keyboard.on('keydown-A', () => { this.moveLeft = true; });
        this.input.keyboard.on('keyup-A', () => { this.moveLeft = false; });

        this.input.keyboard.on('keydown-D', () => { this.moveRight = true; });
        this.input.keyboard.on('keyup-D', () => { this.moveRight = false; });

        this.input.keyboard.on('keydown-R', () => {
            if (!this.gameActive) {
                this.scene.restart();
            }
        });
    }

    handlePlayerMovement(delta) {
        const maxSpeed = 1000; // Maximum forward speed
        const accelerationRate = 0.03; // Gradual acceleration rate (0-1)
        const momentumDecayRate = 0.98; // Momentum decay when no input (0-1)
        const brakingDecayRate = 0.93; // Harder braking deceleration (0-1)

        // Accelerate forward (upward) - gradually increase speed when W is pressed
        if (this.accelerating) {
            this.playerVelocityY = this.playerVelocityY * (1 - accelerationRate) + (-maxSpeed * accelerationRate);
        }
        // Brake - harder deceleration
        else if (this.braking) {
            this.playerVelocityY *= brakingDecayRate;
            if (Math.abs(this.playerVelocityY) < 10) {
                this.playerVelocityY = 0; // Stop completely when velocity is negligible
            }
        }
        // Idle - apply momentum/natural friction, gradual deceleration
        else {
            this.playerVelocityY *= momentumDecayRate; // Gradually lose momentum
            if (Math.abs(this.playerVelocityY) < 5) {
                this.playerVelocityY = 0; // Stop when velocity is very small
            }
        }

        // Apply calculated velocity to player
        this.player.body.setVelocityY(this.playerVelocityY);

        // Horizontal movement - only allow when car is moving forward, scaled by forward speed
        const baseMoveSPeed = 400;
        const currentForwardSpeed = Math.abs(this.playerVelocityY);
        const speedRatio = currentForwardSpeed / maxSpeed;
        const moveSpeed = baseMoveSPeed * speedRatio;

        if (this.moveLeft) {
            this.player.body.setVelocityX(-moveSpeed);
        } else if (this.moveRight) {
            this.player.body.setVelocityX(moveSpeed);
        } else {
            this.player.body.setVelocityX(0);
        }

        // Clamp player to road bounds
        const minX = this.roadX + 20;
        const maxX = this.roadX + this.roadWidth - 20;
        if (this.player.x < minX) this.player.x = minX;
        if (this.player.x > maxX) this.player.x = maxX;
    }

    spawnTrafficCar() {
        // Random lane selection - 4 lanes between the road edges and 3 lane markings
        const laneWidth = this.roadWidth / 4;
        const lanes = [
            this.roadX + laneWidth * 0.5,
            this.roadX + laneWidth * 1.5,
            this.roadX + laneWidth * 2.5,
            this.roadX + laneWidth * 3.5
        ];
        const laneX = lanes[Math.floor(Math.random() * lanes.length)];

        // Create traffic car at a random distance ahead of player
        const spawnDistance = 800 + Math.random() * 400;
        const trafficCar = this.add.rectangle(laneX, this.player.y - spawnDistance, 40, 60, 0xff6600);
        this.physics.add.existing(trafficCar);
        trafficCar.body.setSize(9, 28.8, true);

        // Traffic moves straight at constant speed
        const trafficSpeed = -this.baseTrafficSpeed * this.speedMultiplier;
        trafficCar.body.setVelocityY(trafficSpeed);

        this.trafficGroup.add(trafficCar);
    }

    handleCollision(player, traffic) {
        // Game over
        this.gameActive = false;

        // Screen shake effect
        this.cameras.main.shake(1000, 0.01);

        // Stop player movement
        player.body.setVelocity(0, 0);
        player.body.setAcceleration(0, 0);

        // Display game over screen
        this.gameOverText.setText('GAME OVER');
        this.restartText.setText(`Time: ${Math.floor(this.survivalTime)}s | Score: ${Math.round(this.score)}\nPress R to Restart`);

        // Disable traffic
        this.trafficGroup.children.entries.forEach(car => {
            car.body.setVelocity(0, 0);
        });
    }
}
