// Game Scene Module - Street Driving Game
export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        this.load.image('player', 'assets/car.png');
        this.load.image('traffic', 'assets/traffic.png');
        this.load.image('traffic2', 'assets/traffic2.png');
        this.load.image('traffic3', 'assets/traffic3.png');
    }

    create() {
        // ========== GAME STATE ==========
        this.gameActive = true;
        this.score = 0;
        this.highScore = localStorage.getItem('highScore') ? parseInt(localStorage.getItem('highScore')) : 0;
        this.survivalTime = 0;
        this.speedMultiplier = 1;
        this.trafficSpawnRate = 200; // milliseconds between spawns
        this.baseTrafficSpeed = 400;

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
        this.counterText = this.add.text(20, 200, 'Score: 0\nTime: 0s\nHigh Score: 0', {
            font: 'bold 24px Arial',
            fill: '#ffff00'
        }).setScrollFactor(0);

        this.speedText = this.add.text(20, 80, 'Speed: 0', {
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
            fill: '#ffff00',
            align: 'center'
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
        this.counterText.setText(`Score: ${Math.round(this.score)}\nTime: ${Math.floor(this.survivalTime)}s\nHigh Score: ${Math.round(this.highScore)}`);

        // Increase difficulty every 10 seconds
        this.difficultyTimer += delta;
        if (this.difficultyTimer > 10000) {
            this.difficultyTimer = 0;
            this.spawnInterval = Math.max(100, this.spawnInterval - 30);
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
        this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);

        // Increase score based on survival and speed
        this.score += (displaySpeed * 0.1 * delta) / 1000;

        // ========== SPAWN TRAFFIC ==========
        if (this.playerVelocityY !== 0) {
            this.trafficSpawnTimer += delta;
            if (this.trafficSpawnTimer > this.spawnInterval) {
                this.trafficSpawnTimer = 0;
                this.spawnTrafficCar();
            }
        } else {
            // Reset timer when idle so traffic doesn't immediately spawn when player moves again
            this.trafficSpawnTimer = 0;
        }

        // ========== UPDATE TRAFFIC ==========
        this.trafficGroup.children.entries.forEach(car => {
            // Check if car is visible on screen
            const isOnScreen = car.y > this.player.y - 800 && car.y < this.player.y + 800;
            
            // Handle lane changes for lane-changer cars
            if (car.isLaneChanger && !car.hasChangedLane) {
                // Mark when car becomes visible
                if (isOnScreen && !car.isVisibleOnScreen) {
                    car.isVisibleOnScreen = true;
                    car.visibleTimer = 0;
                }
                
                // Once visible, count down and change lanes
                if (car.isVisibleOnScreen) {
                    car.visibleTimer = (car.visibleTimer || 0) + delta;
                    if (car.visibleTimer > car.laneChangeRandomDelay) {
                        car.hasChangedLane = true;
                        // Calculate new lane index
                        let newLaneIndex = car.laneIndex + car.laneChangeDirection;
                        // Keep within bounds
                        if (newLaneIndex < 0) newLaneIndex = 0;
                        if (newLaneIndex > 3) newLaneIndex = 3;
                        // Only change if it's a different lane
                        if (newLaneIndex !== car.laneIndex) {
                            car.laneIndex = newLaneIndex;
                            const newX = car.lanes[newLaneIndex];
                            // Smoothly move to new lane over 1/4 second
                            this.tweens.add({
                                targets: car,
                                x: newX,
                                duration: 250,
                                ease: 'Linear'
                            });
                        }
                    }
                }
            }
            
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
        const laneWidth = this.roadWidth / 4;
        const car = this.add.sprite(this.roadX + laneWidth * 2.5, 9500, 'player');
        this.physics.add.existing(car);
        car.setScale(1);
        car.body.setSize(80, 103, true);
        car.body.setBounce(0);
        car.body.setDrag(0.5);
        car.body.setMaxVelocity(1000, 1000);
        car.body.setCollideWorldBounds(true);
        car.setAlpha(1);
        car.setTint(0xffffff);
        car.setDepth(10);
        return car;
    }

    setupInput() {
        this.keys = {
            w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
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
    }

    handlePlayerMovement(delta) {
        const maxSpeed = 1000; // Maximum forward speed
        const accelerationRate = 0.03; // Gradual acceleration rate (0-1)
        const momentumDecayRate = 0.98; // Momentum decay when no input (0-1)
        const brakingDecayRate = 0.97; // Harder braking deceleration (0-1)

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
        const laneIndex = Math.floor(Math.random() * lanes.length);
        const laneX = lanes[laneIndex];

        // Create traffic car at a random distance ahead of player
        const spawnDistance = 800 + Math.random() * 400;
        const trafficTypes = ['traffic', 'traffic2', 'traffic3'];
        const trafficType = trafficTypes[Math.floor(Math.random() * 3)];
        const trafficCar = this.add.sprite(laneX, this.player.y - spawnDistance, trafficType);
        this.physics.add.existing(trafficCar);
        trafficCar.body.setSize(9, 28.8, true);
        trafficCar.setAlpha(1);

        // Traffic moves straight at constant speed
        const trafficSpeed = this.baseTrafficSpeed * this.speedMultiplier;
        trafficCar.body.setVelocityY(trafficSpeed);

        // 1 in 5 chance to be a lane changer
        trafficCar.isLaneChanger = Math.random() < 0.2;
        trafficCar.hasChangedLane = false;
        trafficCar.laneIndex = laneIndex;
        trafficCar.laneWidth = this.roadWidth / 4;
        trafficCar.lanes = lanes;
        trafficCar.isVisibleOnScreen = false;
        trafficCar.laneChangeDirection = Math.random() < 0.5 ? -1 : 1; // -1 for left, 1 for right
        trafficCar.laneChangeRandomDelay = 1000 + Math.random() * 3000; // Random delay between 1-4 seconds after becoming visible

        this.trafficGroup.add(trafficCar);
    }

    handleCollision(player, traffic) {
        // Game over
        this.gameActive = false;

        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', Math.round(this.highScore));
        }

        // Screen shake effect for 3 seconds
        this.cameras.main.shake(3000, 0.01);

        // Stop player movement
        player.body.setVelocity(0, 0);
        player.body.setAcceleration(0, 0);

        // Disable traffic
        this.trafficGroup.children.entries.forEach(car => {
            car.body.setVelocity(0, 0);
        });

        // Return to menu after 3 seconds
        this.time.delayedCall(3000, () => {
            window.returnToMenu();
        });
    }
}

