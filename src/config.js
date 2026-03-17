// Phaser Game Configuration
export const gameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 1200,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    render: {
        context: {
            willReadFrequently: true
        }
    },
    scene: []
};
