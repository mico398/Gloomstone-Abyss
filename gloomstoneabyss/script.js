"use strict";

const gameContainer = document.getElementById("gameContainer");
const player = document.getElementById("player");
const scoreDisplay = document.getElementById("score");
const gloomstoneDisplay = document.getElementById("gloomstoneCount");
const soulDisplay = document.getElementById("soulCount");
const deathScreen = document.getElementById("deathScreen");
const shopScreen = document.getElementById("shopScreen");
const winScreen = document.getElementById("winScreen");
const restartButton = document.getElementById("restartButton");
const restartButton2 = document.getElementById("restartButton2");
const waveBanner = document.getElementById("waveBanner");
const health = document.getElementById("health");

let maxHealth = 3;
let playerHealth = 3;
let contactDamage = 1;
let lastHitTime = 0;

let speed = 5;
const monsterSpeed = 2;
const keys = {};

let score = 0;
let wave = 1;
let monstersPerWave = 5;
const maxWavesPerLevel = 11;
let activeMonsters = 0;

let isGameOver = false;
let isPaused = false;
let waveScheduled = false;

let souls = 0;
let soulDropChance = 0.5;
let shopWaveInterval = 3;
let soulsOnMap = [];
const shopButtons = document.querySelectorAll(".shopItem");

let gloomstonesOnMap = [];
let gloomstoneCount = 0;

let upgrades = {
    maxHealth: 0,
    speed: 0,
    range: 0,
};

let rangeAttackDistance = 200;

restartButton.addEventListener("click", startGame);
restartButton2.addEventListener("click", startGame);

document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// attack when Space is pressed
document.addEventListener('keydown', function(event) {
    if (event.key === ' ') {
        attack();
    }
});

shopButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const upgrade = btn.dataset.upgrade;
        purchasePowerUp(upgrade);
    });
});

// handle soul and gloomstone pickup
document.addEventListener('keydown', function (event) {
    if (event.key === 'e' || event.key === 'E') {
        collectSoul();
        collectGloomstone()
    }
});

function showWaveBanner(waveNum, callback) {
    waveBanner.textContent = `Wave ${waveNum} starts!`;
    waveBanner.style.display = "block";
    setTimeout(() => {
        waveBanner.style.display = "none";
        callback();
    }, 2000);
}

function startGame() {
    isGameOver = false;
    waveScheduled = false;
    maxHealth = 3;
    playerHealth = 3;
    speed = 5;
    score = 0;
    souls = 0;
    gloomstoneCount = 0;
    wave = 1;
    monstersPerWave = 5;
    activeMonsters = 0;
    upgrades = {
        maxHealth: 0,
        speed: 0,
        range: 0,
    };
    
    scoreDisplay.textContent = "Points: 0";
    soulDisplay.textContent = "Souls: 0";
    gloomstoneDisplay.textContent = "Gloomstones: 0";
    deathScreen.style.display = "none";
    winScreen.style.display = "none";
    shopScreen.style.display = "none";
    
    document.querySelectorAll(".monster").forEach(m => m.remove());
    document.querySelectorAll(".soul").forEach(s => s.remove());
    
    updateHealth();
    startWaves();
    requestAnimationFrame(move);
}

function gameOver() {
    isGameOver = true;
    deathScreen.style.display = "flex";
}

function move() {
    if (isGameOver) return;

    let x = keys["d"] - keys["a"];
    let y = keys["s"] - keys["w"];
    if (x && y) { x *= 0.707; y *= 0.707; }

    player.style.left = `${player.offsetLeft + x * speed}px`;
    player.style.top = `${player.offsetTop + y * speed}px`;

    requestAnimationFrame(move);
}

// handles attack
function attack() {
    if (isGameOver) return;

    const monsters = document.querySelectorAll('.monster');
    monsters.forEach(monster => {
        const { distance } = getCollisionData(monster);

        if (distance < rangeAttackDistance) {
            damageMonster(monster);
        }
    });

    checkWaveEnd();
}


// distance between player and the monster
function getCollisionData(monster) {
    const p = player.getBoundingClientRect();
    const m = monster.getBoundingClientRect();
    const dx = p.left - m.left;
    const dy = p.top - m.top;
    return { distance: Math.sqrt(dx * dx + dy * dy) };
}

// damage monster (remove from game)
function damageMonster(monster) {
    const rect = monster.getBoundingClientRect();
    const x = rect.left;
    const y = rect.top;
    const randomBool = Math.random() < soulDropChance;

    monster.remove();
    activeMonsters--;
    
    // after 15 seconds, souls disappear if not collected
    if(randomBool) {
        createSoul(x, y);

        
            setTimeout(() => {
                const soul = soulsOnMap[0];
                soul.element.remove();
                soulsOnMap.splice(0,1);
                updateSoulDisplay();
            }, 5000);
        
    }
    
    score += 10;
    scoreDisplay.textContent = `Points: ${score}`;

    checkWaveEnd();
}

function flashPlayer() {
    player.style.filter = "brightness(180%)";
    setTimeout(() => player.style.filter = "", 200);
}

function createEnemy() {
    const monster = document.createElement("div");
    monster.classList.add("monster");
    monster.style.position = "absolute";

    const img = document.createElement("img");
    img.src = "slime.png";
    img.alt = "Monster";
    img.classList.add("monster-img");
    monster.appendChild(img);

    const side = Math.floor(Math.random() * 4);
    if (side === 0) {
        monster.style.left = Math.random() * window.innerWidth + "px";
        monster.style.top = "-30px"; 
    } else if (side === 1) {
        monster.style.left = Math.random() * window.innerWidth + "px";
        monster.style.top = window.innerHeight + "px";
    } else if (side === 2) {
        monster.style.left = "-30px";
        monster.style.top = Math.random() * window.innerHeight + "px";
    } else {
        monster.style.left = window.innerWidth + "px";
        monster.style.top = Math.random() * window.innerHeight + "px";
    }

    gameContainer.appendChild(monster);
    activeMonsters++;

    followPlayer(monster);
}

// make monster follow player
function followPlayer(monster) {
    const p = player.getBoundingClientRect();
    const m = monster.getBoundingClientRect();

    // calculate direction to player
    const dx = p.left - m.left;
    const dy = p.top - m.top;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
        monster.style.left = `${monster.offsetLeft + (dx / distance) * monsterSpeed}px`;
        monster.style.top = `${monster.offsetTop + (dy / distance) * monsterSpeed}px`;
    }

    // update monster's position until it's removed
    if (document.body.contains(monster)) {
        requestAnimationFrame(() => followPlayer(monster));
    }
}

function startWaves() {
    if (wave > maxWavesPerLevel) return;
    
    waveScheduled = true;
    activeMonsters = 0;
    
    if (isPaused) return;
    
    // after 15 seconds, souls disappear if not collected
    if (wave % 2 === 0) {
        createGloomstone();
        setTimeout(() => {
            for (let i = 0; i < gloomstonesOnMap.length; i++) {
                const gloomstones = gloomstonesOnMap[i];
                    gloomstones.element.remove();
                    gloomstonesOnMap.splice(i, 1);
                    updateGloomstoneDisplay();
            }
        }, 5000);
    }
    
    showWaveBanner(wave, () => {
        const batchSize = 3;
        const delay = 2000;
        const batches = Math.ceil(monstersPerWave / batchSize);

        for (let i = 0; i < batches; i++) {
            setTimeout(() => {
                for (let j = 0; j < batchSize && i * batchSize + j < monstersPerWave; j++) {
                    createEnemy();
                }

                if (i === batches - 1) {
                    waveScheduled = false;
                    checkWaveEnd();
                    monstersPerWave = Math.min(Math.round(monstersPerWave * 1.3 + 1), 20);
                    wave++;
                }
            }, i * delay);
        }
    });
}

// check if all monsters are dead and schedule next wave
function checkWaveEnd() {
    if (activeMonsters === 0 && wave <= maxWavesPerLevel && !waveScheduled) {
        waveScheduled = true;
        setTimeout(() => {
            // shop spawns after waves 3, 6, 9, etc.
            if (wave > 2 && (wave - 1) % shopWaveInterval === 0) {
                spawnShop(); // spawn shop after monsters are defeated
            }
            
            if (wave === maxWavesPerLevel) {
                spawnWinScreen();
                return;
            }
            startWaves();
        }, 2000);
    }
}

function checkCollision() {
    const now = Date.now();
    const hitCooldown = 1000;
    const shrink = 10;
    const collisionDistance = 50;

    const p = player.getBoundingClientRect();
    const playerBox = {
        left: p.left + shrink,
        right: p.right - shrink,
        top: p.top + shrink,
        bottom: p.bottom - shrink
    };

    document.querySelectorAll(".monster").forEach(monster => {
        const m = monster.getBoundingClientRect();
        const monsterBox = {
            left: m.left + shrink,
            right: m.right - shrink,
            top: m.top + shrink,
            bottom: m.bottom - shrink
        };

        // distance between player and monster
        const dx = p.left - m.left;
        const dy = p.top - m.top;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // distance is below collision threshold
        const isColliding =
            distance < collisionDistance && 
            playerBox.left < monsterBox.right &&
            playerBox.right > monsterBox.left &&
            playerBox.top < monsterBox.bottom &&
            playerBox.bottom > monsterBox.top;

        if (isColliding && now - lastHitTime > hitCooldown) {
            playerHealth -= contactDamage;
            updateHealth();
            lastHitTime = now;
            flashPlayer();

            if (playerHealth <= 0) gameOver();
        }
    });

    checkWaveEnd();

}

function updateHealth() {
    health.innerHTML = "";
    for (let i = 0; i < playerHealth; i++) {
        const healthpoint = document.createElement("img");
        healthpoint.src = "health.png";
        healthpoint.alt = "Health";
        healthpoint.classList.add("health-icon");
        health.appendChild(healthpoint);
    }
}

function createGloomstone() {
    const gloomstone = document.createElement("div");
    gloomstone.classList.add("gloomstone");
    gloomstone.style.position = "absolute";

    const img = document.createElement("img");
    img.src = "gloomstone.png";
    img.alt = "Gloomstone";
    img.classList.add("gloomstone-img");
    gloomstone.appendChild(img);

    const x = Math.random() * (window.innerWidth - 50);
    const y = Math.random() * (window.innerHeight - 50);

    gloomstone.style.left = `${x}px`;
    gloomstone.style.top = `${y}px`;
    gloomstone.style.width = "128px";
    gloomstone.style.height = "128px";

    gameContainer.appendChild(gloomstone);

    gloomstonesOnMap.push({ x, y, element: gloomstone });
}

function collectGloomstone() {
    for (let i = 0; i < gloomstonesOnMap.length; i++) {
        const gloomstones = gloomstonesOnMap[i];
        if (isPlayerNear(gloomstones)) {
            gloomstones.element.remove();
            gloomstonesOnMap.splice(i, 1);
            gloomstoneCount++;
            updateGloomstoneDisplay();
            break;
        }
    }
}

function updateGloomstoneDisplay() {
    gloomstoneDisplay.textContent = `Gloomstones: ${gloomstoneCount}`;
}
function spawnShop() {
    shopScreen.style.display = "flex";
    
    waveScheduled = true;
    isPaused = true;
    playerHealth = maxHealth;
    updateHealth();
}

function hideShop() {
    shopScreen.style.display = "none";

    // resume game and continue with waves
    isPaused = false;
    waveScheduled = false;

    startWaves();
    playerHealth = maxHealth;
}

function purchasePowerUp(type) {

    const existingMessage = shopScreen.querySelector("h3");
    if (existingMessage) existingMessage.remove();
    
    soulDisplay.textContent = `Souls: ${souls}`;

    switch (type) {
        case 'maxHealth':
            if (souls >= 100) {
                souls -= 100;
                upgrades.maxHealth++;
                maxHealth++;
                playerHealth++;
                updateHealth();
            } else {
                const insufficientSouls = document.createElement("h3");
                insufficientSouls.textContent = 'Not enough souls. You need 100 souls for 1 Max HP. Get to work!';
                shopScreen.appendChild(insufficientSouls);
                return;
            }
            break;

        case 'range':
            if (souls >= 250) {
                souls -= 250;
                upgrades.range++;
                rangeAttackDistance += 50;
            } else {
                const insufficientSouls = document.createElement("h3");
                insufficientSouls.textContent = 'Not enough souls. You need 250 souls for 50 Range. Get to work!';
                shopScreen.appendChild(insufficientSouls);
                return;
            }
            break;

        case 'speed':
            if (souls >= 300) {
                souls -= 300;
                upgrades.speed++;
                speed++;
            } else {
                const insufficientSouls = document.createElement("h3");
                insufficientSouls.textContent = 'Not enough souls. You need 300 souls for 1 Speed. Get to work!';
                shopScreen.appendChild(insufficientSouls);
                return;
            }
            break;
    }

    hideShop()

    soulDisplay.textContent = `Souls: ${souls}`;
    gloomstoneDisplay.textContent = `Gloomstone: ${gloomstoneCount}`;
    scoreDisplay.textContent = `Points: ${score}`;
}

function skipShop() {
    hideShop();
}

const skipButton = document.createElement("button");
skipButton.textContent = "Skip";
skipButton.style.marginTop = "10px";
skipButton.style.fontSize = "1.5rem";
skipButton.style.cursor = "pointer";
skipButton.addEventListener("click", skipShop);

shopScreen.appendChild(skipButton);

function createSoul(x, y) {
    const soul = document.createElement("div");
    soul.classList.add("soul");
    soul.style.position = "absolute";

    const img = document.createElement("img");
    img.src = "soul.png";
    img.alt = "Soul";
    img.classList.add("soul-img");
    soul.appendChild(img);

    soul.style.left = `${x}px`;
    soul.style.top = `${y}px`;
    soul.style.width = '30px';
    soul.style.height = '30px';


    gameContainer.appendChild(soul);
    
    soulsOnMap.push({ x, y, element: soul });
    
}

function collectSoul() {
    for (let i = 0; i < soulsOnMap.length; i++) {
        const soul = soulsOnMap[i];
        if (isPlayerNear(soul)) {
            // add souls to total souls
            souls += 10;
            soul.element.remove();
            soulsOnMap.splice(i, 1);
            updateSoulDisplay();
            break;
        }
    }
}

// check if player is close enough to soul
function isPlayerNear(item) {
    const playerRect = player.getBoundingClientRect();
    const itemRect = item.element.getBoundingClientRect();

    const distance = Math.sqrt(Math.pow(playerRect.left - itemRect.left, 2) + Math.pow(playerRect.top - itemRect.top, 2));
    return distance < 50;
}

function updateSoulDisplay() {
    soulDisplay.textContent = `Souls: ${souls}`;
}

function spawnWinScreen() {
    winScreen.style.display = "flex";
    
    isGameOver = true;
    
    const collectedGloomstone = document.createElement('h2');
    collectedGloomstone.textContent = 'You collected ' + gloomstoneCount + ' out of 5 Gloomstones!';

    winScreen.appendChild(collectedGloomstone);
}

startGame();
setInterval(checkCollision, 100);