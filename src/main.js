// Main game entry point
import { gameConfig } from './config.js';
import { GameScene } from './scenes/GameScene.js';

// Add scenes to config
gameConfig.scene = [GameScene];

// Initialize game
const game = new Phaser.Game(gameConfig);

// Stop the scene immediately after loading so it doesn't auto-play
game.scene.stop('GameScene');

// Global function to show difficulty menu
window.showDifficulty = function() {
    const difficultyMenu = document.getElementById('difficultyMenu');
    if (difficultyMenu) {
        difficultyMenu.classList.add('visible');
    }
};

// Global function to go back to main menu
window.backToMenu = function() {
    const difficultyMenu = document.getElementById('difficultyMenu');
    if (difficultyMenu) {
        difficultyMenu.classList.remove('visible');
    }
};

// Global function to start the game
window.startGame = function(difficulty = 'medium') {
    const startMenu = document.getElementById('startMenu');
    const difficultyMenu = document.getElementById('difficultyMenu');
    if (startMenu) {
        startMenu.classList.add('hidden');
    }
    if (difficultyMenu) {
        difficultyMenu.classList.remove('visible');
    }
    // Start the game scene with difficulty
    const scene = game.scene.getScene('GameScene');
    scene.difficulty = difficulty;
    game.scene.start('GameScene');
};

// Global function to return to start menu
window.returnToMenu = function() {
    const startMenu = document.getElementById('startMenu');
    const difficultyMenu = document.getElementById('difficultyMenu');
    const pauseMenu = document.getElementById('pauseMenu');
    if (startMenu) {
        startMenu.classList.remove('hidden');
    }
    if (difficultyMenu) {
        difficultyMenu.classList.remove('visible');
    }
    if (pauseMenu) {
        pauseMenu.classList.remove('visible');
    }
    // Stop the game scene
    if (game.scene.isActive('GameScene')) {
        game.scene.stop('GameScene');
    }
    // Hide pause button
    const pauseButton = document.getElementById('pauseButton');
    if (pauseButton) {
        pauseButton.classList.remove('visible');
    }
};

// Global function to toggle pause
window.togglePause = function() {
    const gameScene = game.scene.getScene('GameScene');
    if (gameScene && gameScene.isActive()) {
        gameScene.togglePause();
        
        // Show/hide pause menu
        const pauseMenu = document.getElementById('pauseMenu');
        if (pauseMenu) {
            if (gameScene.isPaused) {
                pauseMenu.classList.add('visible');
            } else {
                pauseMenu.classList.remove('visible');
            }
        }
    }
};

// Leaderboard Management
window.currentLeaderboardTab = 'easy';

// Initialize leaderboard data structure
window.initializeLeaderboard = function() {
    const leaderboardData = localStorage.getItem('leaderboardData');
    if (!leaderboardData) {
        localStorage.setItem('leaderboardData', JSON.stringify({}));
    }
};

// Get leaderboard from localStorage
window.getLeaderboard = function() {
    const data = localStorage.getItem('leaderboardData');
    return data ? JSON.parse(data) : {};
};

// Add or update player score
window.addPlayerScore = function(playerName, difficulty, score) {
    const leaderboard = window.getLeaderboard();
    
    if (!leaderboard[playerName]) {
        leaderboard[playerName] = { easy: 0, medium: 0, hard: 0 };
    }
    
    if (score > leaderboard[playerName][difficulty]) {
        leaderboard[playerName][difficulty] = score;
    }
    
    localStorage.setItem('leaderboardData', JSON.stringify(leaderboard));
};

// Display leaderboard for current tab
window.displayLeaderboard = function(difficulty = 'easy') {
    const leaderboard = window.getLeaderboard();
    const scoresDiv = document.getElementById('leaderboardScores');
    
    if (!scoresDiv) return;
    
    // Get scores for this difficulty and sort
    const scores = [];
    for (const playerName in leaderboard) {
        const score = leaderboard[playerName][difficulty] || 0;
        scores.push({ name: playerName, score: score });
    }
    scores.sort((a, b) => b.score - a.score);
    
    // Display top 10
    let html = '';
    if (scores.length === 0) {
        html = '<div style="color: #999999; padding: 20px; text-align: center;">No scores yet</div>';
    } else {
        scores.slice(0, 10).forEach((entry, index) => {
            html += `
                <div class="leaderboard-entry">
                    <span class="leaderboard-rank">#${index + 1}</span>
                    <span class="leaderboard-name">${entry.name}</span>
                    <span class="leaderboard-score">${entry.score}</span>
                </div>
            `;
        });
    }
    
    scoresDiv.innerHTML = html;
};

// Switch leaderboard tab
window.switchLeaderboardTab = function(difficulty) {
    window.currentLeaderboardTab = difficulty;
    
    // Update tab button styles
    const tabs = document.querySelectorAll('.leaderboard-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    // Display leaderboard for this difficulty
    window.displayLeaderboard(difficulty);
};

// Show player name input modal
window.setUsername = function() {
    const input = document.getElementById('usernameInput');
    const username = input ? input.value.trim() : '';
    
    if (!username) {
        alert('Please enter a username');
        return;
    }
    
    // Store username in localStorage
    localStorage.setItem('playerUsername', username);
    window.currentUsername = username;
    
    // Update display
    const display = document.getElementById('usernameDisplay');
    if (display) {
        display.textContent = `Logged in as: ${username}`;
    }
    
    // Clear input for next change
    input.value = '';
};

// Initialize username on page load
window.initializeUsername = function() {
    const savedUsername = localStorage.getItem('playerUsername');
    window.currentUsername = savedUsername || '';
    
    const input = document.getElementById('usernameInput');
    const display = document.getElementById('usernameDisplay');
    
    if (savedUsername) {
        if (display) {
            display.textContent = `Logged in as: ${savedUsername}`;
        }
    }
};

// Get current username
window.getCurrentUsername = function() {
    return window.currentUsername || localStorage.getItem('playerUsername') || 'Anonymous';
};

// Load and display leaderboard and username on page load
window.addEventListener('DOMContentLoaded', function() {
    window.initializeLeaderboard();
    window.initializeUsername();
    window.displayLeaderboard('easy');
});
