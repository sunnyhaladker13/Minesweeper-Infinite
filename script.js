document.addEventListener('DOMContentLoaded', () => {
    const menu = document.getElementById('menu');
    const game = document.getElementById('game');
    const grid = document.getElementById('grid');
    const levelDisplay = document.getElementById('level');
    const timerDisplay = document.getElementById('timer');
    const leaderboardContainer = document.getElementById('leaderboard-container');
    const leaderboardList = document.getElementById('leaderboard-list');
    const gameOverModal = document.getElementById('game-over-modal');
    const finalScoreDisplay = document.getElementById('final-score');
    const playerNameInput = document.getElementById('player-name');
    const submitScoreButton = document.getElementById('submit-score');
    const flagToggle = document.getElementById('flag-toggle');
    const levelProgressBar = document.getElementById('level-progress');
    
    // Add audio elements for better feedback (optional)
    const clickSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    const flagSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
    const explosionSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3');
    const victorySound = new Audio('https://assets.mixkit.co/active_storage/sfx/2563/2563-preview.mp3');
    
    // Set volumes to a reasonable level
    [clickSound, flagSound, explosionSound, victorySound].forEach(sound => {
        sound.volume = 0.3;
    });

    // Google Sheet Web App URL - replace with your deployed web app URL
    const LEADERBOARD_API_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

    let gridSize = 20;
    let level = 1;
    let timer = null;
    let startTime = null;
    let minePositions = new Set();
    let revealedCells = 0;
    let totalMines = 0;
    let totalGameTime = 0;
    let levelTimes = [];
    let flagMode = false;
    let firstClick = true;
    let gameActive = false;
    let gameCompleted = false;

    // Event listeners for menu buttons
    menu.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            gridSize = parseInt(e.target.dataset.size);
            startGame();
        }
    });

    // Update flag toggle to be more obvious
    flagToggle.addEventListener('click', () => {
        flagMode = !flagMode;
        flagToggle.classList.toggle('active', flagMode);
        flagToggle.textContent = flagMode ? 'Mode: Flag 🚩' : 'Mode: Reveal 👆';
        
        // Update cursor style on the grid based on mode
        grid.className = flagMode ? 'flag-mode' : '';
        
        // Add animation effect for mode change
        flagToggle.classList.add('button-pulse');
        setTimeout(() => {
            flagToggle.classList.remove('button-pulse');
        }, 300);
        
        // Play flag sound
        flagSound.currentTime = 0;
        flagSound.play().catch(e => console.log('Audio play prevented:', e));
    });

    // Score submission
    submitScoreButton.addEventListener('click', submitScore);

    function startGame() {
        menu.style.display = 'none';
        game.style.display = 'block';
        leaderboardContainer.style.display = 'none';
        level = 1;
        totalGameTime = 0;
        levelTimes = [];
        gameCompleted = false;
        startLevel();
    }

    function startLevel() {
        levelDisplay.textContent = `Level: ${level} of 10`;
        updateLevelProgressBar();
        timerDisplay.textContent = 'Time: 00:00';
        startTime = null; // Will be set on first click
        firstClick = true;
        if (timer) clearInterval(timer);
        revealedCells = 0;
        totalMines = Math.floor(gridSize * gridSize * (0.1 + (level - 1) * 0.05)); // Increase mine density per level
        createGrid();
        gameActive = true;
    }

    function updateLevelProgressBar() {
        const progressPercentage = ((level - 1) / 10) * 100;
        levelProgressBar.style.width = `${progressPercentage}%`;
    }

    function updateTimer() {
        if (!startTime) return;
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const seconds = String(elapsed % 60).padStart(2, '0');
        timerDisplay.textContent = `Time: ${minutes}:${seconds}`;
    }

    function placeMines(firstClickIndex) {
        minePositions = new Set();
        // Ensure first clicked cell and its surroundings are safe
        const safeArea = getSurroundingIndices(firstClickIndex);
        safeArea.push(firstClickIndex); // Add the clicked cell itself
        
        while (minePositions.size < totalMines) {
            const position = Math.floor(Math.random() * gridSize * gridSize);
            if (!safeArea.includes(position)) {
                minePositions.add(position);
            }
        }
    }

    function getSurroundingIndices(index) {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        const surroundingIndices = [];

        for (let r = -1; r <= 1; r++) {
            for (let c = -1; c <= 1; c++) {
                if (r === 0 && c === 0) continue;
                const newRow = row + r;
                const newCol = col + c;
                if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize) {
                    surroundingIndices.push(newRow * gridSize + newCol);
                }
            }
        }

        return surroundingIndices;
    }

    function createGrid() {
        grid.innerHTML = '';
        grid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        grid.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

        for (let i = 0; i < gridSize * gridSize; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.index = i;
            
            // Add hover effect
            cell.addEventListener('mouseenter', () => {
                if (!gameActive) return;
                if (!cell.classList.contains('revealed')) {
                    cell.classList.add('hover');
                }
            });
            
            cell.addEventListener('mouseleave', () => {
                cell.classList.remove('hover');
            });
            
            // Use click event for both desktop and mobile
            cell.addEventListener('click', (e) => {
                if (!gameActive) return;
                
                // Add click animation
                cell.classList.add('cell-clicked');
                setTimeout(() => {
                    cell.classList.remove('cell-clicked');
                }, 200);
                
                if (flagMode) {
                    e.preventDefault();
                    toggleFlag(cell);
                } else {
                    handleCellClick(i);
                }
            });
            
            // Right click for desktop
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (!gameActive) return;
                toggleFlag(cell);
            });
            
            // For mobile - long press to flag if not in flag mode
            let longPressTimer;
            cell.addEventListener('touchstart', (e) => {
                if (!gameActive) return;
                
                // Visual feedback for touch
                cell.classList.add('touch-active');
                
                longPressTimer = setTimeout(() => {
                    if (!flagMode) { // Only do this if not already in flag mode
                        toggleFlag(cell);
                    }
                    cell.classList.remove('touch-active');
                }, 500);
            });
            
            cell.addEventListener('touchend', () => {
                cell.classList.remove('touch-active');
                clearTimeout(longPressTimer);
            });
            
            cell.addEventListener('touchmove', () => {
                cell.classList.remove('touch-active');
                clearTimeout(longPressTimer);
            });
            
            grid.appendChild(cell);
        }
    }

    function handleCellClick(index) {
        const cell = grid.children[index];
        if (cell.classList.contains('flag')) return; // Prevent clicking on flagged cells
        
        if (firstClick) {
            firstClick = false;
            startTime = Date.now();
            timer = setInterval(updateTimer, 1000);
            placeMines(index); // Ensure first click is always safe
        }
        
        // Play click sound
        clickSound.currentTime = 0;
        clickSound.play().catch(e => console.log('Audio play prevented:', e));
        
        revealCell(index);
    }

    function revealCell(index) {
        const cell = grid.children[index];
        if (cell.classList.contains('revealed') || cell.classList.contains('flag')) return;

        if (minePositions.has(index)) {
            cell.classList.add('mine');
            cell.classList.add('exploded'); // Mark the cell that caused the explosion
            cell.textContent = '💣';
            
            // Play explosion sound
            explosionSound.currentTime = 0;
            explosionSound.play().catch(e => console.log('Audio play prevented:', e));
            
            endGame(false);
            return;
        }

        // Add reveal animation
        cell.classList.add('reveal-animation');
        setTimeout(() => {
            cell.classList.remove('reveal-animation');
        }, 300);
        
        cell.classList.add('revealed');
        revealedCells++;

        const adjacentMines = countAdjacentMines(index);
        if (adjacentMines > 0) {
            cell.textContent = adjacentMines;
            // Add color classes based on mine count
            cell.classList.add(`mines-${adjacentMines}`);
        } else {
            // For zero adjacent mines, leave the cell empty
            cell.textContent = '';
            revealAdjacentCells(index);
        }

        if (revealedCells === gridSize * gridSize - totalMines) {
            // Play victory sound
            victorySound.currentTime = 0;
            victorySound.play().catch(e => console.log('Audio play prevented:', e));
            endGame(true);
        }
    }

    function countAdjacentMines(index) {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        let count = 0;

        for (let r = -1; r <= 1; r++) {
            for (let c = -1; c <= 1; c++) {
                if (r === 0 && c === 0) continue;
                const newRow = row + r;
                const newCol = col + c;
                if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize) {
                    const newIndex = newRow * gridSize + newCol;
                    if (minePositions.has(newIndex)) count++;
                }
            }
        }

        return count;
    }

    function revealAdjacentCells(index) {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;

        for (let r = -1; r <= 1; r++) {
            for (let c = -1; c <= 1; c++) {
                if (r === 0 && c === 0) continue;
                const newRow = row + r;
                const newCol = col + c;
                if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize) {
                    const newIndex = newRow * gridSize + newCol;
                    revealCell(newIndex);
                }
            }
        }
    }

    function toggleFlag(cell) {
        if (cell.classList.contains('revealed')) return;

        // Add animation for flag toggle
        cell.classList.add('flag-animation');
        setTimeout(() => {
            cell.classList.remove('flag-animation');
        }, 300);

        if (cell.classList.contains('flag')) {
            cell.classList.remove('flag');
            cell.textContent = '';
        } else {
            cell.classList.add('flag');
            cell.textContent = '🚩';
            
            // Play flag sound
            flagSound.currentTime = 0;
            flagSound.play().catch(e => console.log('Audio play prevented:', e));
        }
    }

    function endGame(won) {
        gameActive = false;
        clearInterval(timer);
        
        // Calculate level time
        const levelTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        levelTimes.push(levelTime);
        totalGameTime += levelTime;
        
        if (won) {
            // Add victory animation to the grid
            grid.classList.add('victory-animation');
            setTimeout(() => {
                grid.classList.remove('victory-animation');
            }, 1000);
            
            // Mark all mines with flags when won
            minePositions.forEach(index => {
                const cell = grid.children[index];
                if (!cell.classList.contains('flag')) {
                    cell.classList.add('flag');
                    cell.textContent = '🚩';
                }
            });
            
            if (level < 10) {
                setTimeout(() => {
                    level++;
                    startLevel();
                }, 1000);
            } else {
                gameCompleted = true;
                showGameOver(true);
            }
        } else {
            // Add shake animation to the grid on game over
            grid.classList.add('shake-animation');
            setTimeout(() => {
                grid.classList.remove('shake-animation');
            }, 500);
            
            // First show incorrectly flagged cells (not containing mines)
            for (let i = 0; i < grid.children.length; i++) {
                const cell = grid.children[i];
                if (cell.classList.contains('flag') && !minePositions.has(parseInt(i))) {
                    cell.classList.add('wrong-flag');
                    cell.textContent = '❌';
                }
            }
            
            // Then reveal all unflagged mines
            minePositions.forEach(index => {
                const cell = grid.children[index];
                if (!cell.classList.contains('flag')) {
                    cell.classList.add('mine');
                    cell.textContent = '💣';
                }
            });
            
            // Always show game over modal when game ends
            showGameOver(false);
        }
    }
    
    function formatTime(seconds) {
        const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
        const remainingSeconds = String(seconds % 60).padStart(2, '0');
        return `${minutes}:${remainingSeconds}`;
    }
    
    function showGameOver(completed) {
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        
        if (completed) {
            modalTitle.textContent = 'Congratulations!';
            modalMessage.textContent = `You completed all 10 levels in ${formatTime(totalGameTime)}!`;
        } else {
            modalTitle.textContent = 'Game Over';
            modalMessage.textContent = `You reached level ${level} of 10. Total time: ${formatTime(totalGameTime)}`;
        }
        
        finalScoreDisplay.textContent = `Final Score: ${completed ? 'All levels completed' : `Level ${level}/10`} - Time: ${formatTime(totalGameTime)}`;
        gameOverModal.style.display = 'flex';
        
        // Focus the name input
        setTimeout(() => {
            playerNameInput.focus();
        }, 500);
        
        // Fetch and display leaderboard
        fetchLeaderboard();
    }
    
    async function submitScore() {
        const playerName = playerNameInput.value.trim().substring(0, 3).toUpperCase();
        if (!playerName) {
            alert('Please enter your 3-character name');
            return;
        }
        
        submitScoreButton.disabled = true;
        submitScoreButton.textContent = 'Submitting...';
        
        const scoreData = {
            name: playerName,
            gridSize: gridSize,
            level: gameCompleted ? 10 : level,
            totalTime: totalGameTime,
            completed: gameCompleted
        };
        
        try {
            // Check if API URL is configured
            if (LEADERBOARD_API_URL.includes('YOUR_SCRIPT_ID')) {
                throw new Error('Leaderboard API not configured');
            }
            
            const response = await fetch(LEADERBOARD_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(scoreData),
                mode: 'no-cors' // Add this for CORS handling with Google Scripts
            });
            
            submitScoreButton.textContent = 'Score Submitted!';
            // Refresh leaderboard
            fetchLeaderboard();
        } catch (error) {
            console.error('Error submitting score:', error);
            submitScoreButton.textContent = 'Error - Try Again';
            submitScoreButton.disabled = false;
            
            if (error.message === 'Leaderboard API not configured') {
                alert('Leaderboard functionality is not available in demo mode.');
                submitScoreButton.textContent = 'Demo Mode - No Submit';
            }
        }
    }
    
    async function fetchLeaderboard() {
        try {
            // Check if API URL is configured
            if (LEADERBOARD_API_URL.includes('YOUR_SCRIPT_ID')) {
                throw new Error('Leaderboard API not configured');
            }
            
            const response = await fetch(LEADERBOARD_API_URL);
            const data = await response.json();
            
            if (data && data.leaderboard) {
                displayLeaderboard(data.leaderboard);
            }
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            leaderboardList.innerHTML = '<li class="error">Could not load leaderboard</li>';
            
            // If in demo mode, show sample data
            if (error.message === 'Leaderboard API not configured') {
                const sampleData = [
                    { name: 'AAA', gridSize: 10, level: 10, totalTime: 300, completed: true },
                    { name: 'BBB', gridSize: 10, level: 8, totalTime: 250, completed: false },
                    { name: 'CCC', gridSize: 20, level: 10, totalTime: 500, completed: true },
                ];
                displayLeaderboard(sampleData);
            }
        }
    }
    
    function displayLeaderboard(leaderboardData) {
        leaderboardList.innerHTML = '';
        
        // Group by grid size
        const leaderboardBySize = {};
        leaderboardData.forEach(entry => {
            if (!leaderboardBySize[entry.gridSize]) {
                leaderboardBySize[entry.gridSize] = [];
            }
            leaderboardBySize[entry.gridSize].push(entry);
        });
        
        // Sort each group by completion status (completed first) then by level (higher first) then by time (lower first)
        Object.keys(leaderboardBySize).forEach(size => {
            leaderboardBySize[size].sort((a, b) => {
                if (a.completed !== b.completed) return b.completed - a.completed;
                if (a.level !== b.level) return b.level - a.level;
                return a.totalTime - b.totalTime;
            });
        });
        
        // Create header
        const headerLi = document.createElement('li');
        headerLi.classList.add('leaderboard-header');
        headerLi.innerHTML = '<span>Name</span><span>Grid</span><span>Level</span><span>Time</span>';
        leaderboardList.appendChild(headerLi);
        
        // Display top scores
        const gridSizes = Object.keys(leaderboardBySize).sort((a, b) => a - b);
        gridSizes.forEach(size => {
            const sizeHeader = document.createElement('li');
            sizeHeader.classList.add('size-header');
            sizeHeader.textContent = `${size}x${size} Grid`;
            leaderboardList.appendChild(sizeHeader);
            
            // Get top 3 for each grid size
            leaderboardBySize[size].slice(0, 3).forEach((entry, index) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="rank">${index + 1}</span>
                    <span class="name">${entry.name}</span>
                    <span class="grid">${entry.gridSize}x${entry.gridSize}</span>
                    <span class="level">${entry.level}/10</span>
                    <span class="time">${formatTime(entry.totalTime)}</span>
                `;
                leaderboardList.appendChild(li);
            });
        });
        
        leaderboardContainer.style.display = 'block';
    }
    
    // Start initial leaderboard fetch
    fetchLeaderboard();
    
    // Add ability to restart game from game over modal
    document.getElementById('restart-game').addEventListener('click', () => {
        gameOverModal.style.display = 'none';
        menu.style.display = 'flex';
        game.style.display = 'none';
    });
});