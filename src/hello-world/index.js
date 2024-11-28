import { Engine } from 'noa-engine';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { Color3 } from '@babylonjs/core/Maths/math.color';

// Engine configuration
var opts = {
    debug: true,
    showFPS: true,
    chunkSize: 32,
    chunkAddDistance: 3.5,
    chunkRemoveDistance: 3.5,
    gravity: [0, -10, 0],
};
var noa = new Engine(opts);

// Materials
var pathColor = [0.5, 0.5, 0.5];
var obstacleColor = [1, 0, 0];
noa.registry.registerMaterial('path', { color: pathColor });
noa.registry.registerMaterial('obstacle', { color: obstacleColor });

// Block types
var pathID = noa.registry.registerBlock(1, { material: 'path' });
var obstacleID = noa.registry.registerBlock(2, { material: 'obstacle' });

// World Generation
function getVoxelID(x, y, z, difficulty) {
    if (y === 0 && Math.abs(x) <= 2) return pathID; // Path
    if (y === 1 && z > 5 && Math.random() < difficulty) return obstacleID; // Obstacles
    return 0; // Empty
}

noa.world.on('worldDataNeeded', function (id, data, x, y, z) {
    for (var i = 0; i < data.shape[0]; i++) {
        for (var j = 0; j < data.shape[1]; j++) {
            for (var k = 0; k < data.shape[2]; k++) {
                var voxelID = getVoxelID(x + i, y + j, z + k, currentDifficulty);
                data.set(i, j, k, voxelID);
            }
        }
    }
    noa.world.setChunkData(id, data);
});

// Player Setup
var player = noa.playerEntity;
var scene = noa.rendering.getScene();

// Create Player Mesh
var playerMesh = CreateBox('player', {}, scene);
playerMesh.scaling.set(1, 2, 1);
playerMesh.material = noa.rendering.makeStandardMaterial();
playerMesh.material.diffuseColor = new Color3(0, 0, 1);
noa.entities.addComponent(player, noa.entities.names.mesh, {
    mesh: playerMesh,
    offset: [0, 1, 0],
});

// Controls
noa.inputs.bind('left', 'KeyA'); // Move left
noa.inputs.bind('right', 'KeyD'); // Move right

// Countdown Logic
let gameStarted = false;
let countdown = 3; // Countdown seconds
let speed = 5; // Initial forward speed
let currentDifficulty = 0.05; // Initial difficulty (0-1)

function startCountdown() {
    console.log("Get ready!");
    const interval = setInterval(() => {
        console.log(countdown > 0 ? countdown : "Go!");
        countdown--;

        if (countdown < 0) {
            clearInterval(interval);
            gameStarted = true;
        }
    }, 1000);
}

startCountdown();

// Player Movement
noa.on('tick', function (dt) {
    if (!gameStarted) return;

    var pos = noa.entities.getPosition(player);
    noa.entities.setPosition(player, [pos[0], pos[1], pos[2] + speed * dt]);

    // Handle lateral movement
    if (noa.inputs.state.left) {
        noa.entities.setPosition(player, [pos[0] - 5 * dt, pos[1], pos[2]]);
    }
    if (noa.inputs.state.right) {
        noa.entities.setPosition(player, [pos[0] + 5 * dt, pos[1], pos[2]]);
    }

    // Collision Detection
    var blockBelow = noa.getBlock(Math.floor(pos[0]), Math.floor(pos[1]) - 1, Math.floor(pos[2]));
    if (blockBelow !== pathID) {
        console.log("Game Over! You fell.");
        resetGame();
        return;
    }

    var blockAhead = noa.getBlock(Math.floor(pos[0]), Math.floor(pos[1]), Math.floor(pos[2] + 1));
    if (blockAhead === obstacleID) {
        console.log("Game Over! You hit an obstacle.");
        resetGame();
        return;
    }

    // Gradually increase difficulty
    speed += 0.01 * dt; // Speed increases over time
    currentDifficulty = Math.min(0.5, currentDifficulty + 0.00005 * dt); // More obstacles appear
});

// Reset Game
function resetGame() {
    gameStarted = false;
    countdown = 3;
    speed = 5;
    currentDifficulty = 0.05;
    noa.entities.setPosition(player, [0, 10, 0]); // Reset position
    startCountdown();
}

// Camera
noa.camera.zoomDistance = 10; // Set the distance behind the player
noa.rendering.getScene().activeCamera.lockedTarget = playerMesh;

/ / Generate initial world
noa.world.manuallyLoadChunk(0, 0, 0);