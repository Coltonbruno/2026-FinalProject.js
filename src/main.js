// Main game entry point
import { gameConfig } from './config.js';
import { GameScene } from './scenes/GameScene.js';

// Add scenes to config
gameConfig.scene = [GameScene];

// Initialize game
const game = new Phaser.Game(gameConfig);

// Stop the scene immediately after loading so it doesn't auto-play
game.scene.stop('GameScene');

// Global function to start the game
window.startGame = function() {
    const startMenu = document.getElementById('startMenu');
    if (startMenu) {
        startMenu.classList.add('hidden');
    }
    // Start the game scene
    game.scene.start('GameScene');
};

// Global function to return to start menu
window.returnToMenu = function() {
    const startMenu = document.getElementById('startMenu');
    if (startMenu) {
        startMenu.classList.remove('hidden');
    }
    // Stop the game scene
    if (game.scene.isActive('GameScene')) {
        game.scene.stop('GameScene');
    }
};
