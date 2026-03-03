// Main game entry point
import { gameConfig } from './config.js';
import { GameScene } from './scenes/GameScene.js';

// Add scenes to config
gameConfig.scene = [GameScene];

// Initialize game
const game = new Phaser.Game(gameConfig);
