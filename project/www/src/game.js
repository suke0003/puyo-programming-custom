// 起動されたときに呼ばれる関数を登録する
window.addEventListener("load", () => {
    initialize();
    loop();
});

let mode; // ゲームの現在の状況
let frame; // ゲームの現在フレーム
let combinationCount = 0; // 何連鎖かどうか

const chainVoices = [];
const endVoices = [];
let zenkeshiVoice;   
let batankyuVoice;   
let isBatankyuVoicePlayed = false; 

let isEnterPressed = false;
let isUpPressed = false;
let isDownPressed = false;

let selectedMenuIndex = 0;
const MENU_COUNT = 3;

let titleSubMode = 'mainMenu';
let selectedDiffIndex = 0;
const DIFF_COUNT = 3;

// スコアアタック用の変数群
let gameType = 'endless';
let remainingTime = 120;
let isTimeUp = false;
let latestRankInIndex = -1;
let currentHighScore = 0;
let lastTimerUpdateTime = 0;
let isPaused = false; // 💡【追加】ポーズ中かどうかを管理するフラグ
let selectedPauseMenuIndex = 0; // 💡【追加】ポーズメニューの選択インデックス（0:再開, 1:タイトル）

document.addEventListener('keydown', (e) => {
    // 💡【追加】ポーズ中のキーボード操作
    if (isPaused) {
        if (e.keyCode === 38) { // 上向きキー
            selectedPauseMenuIndex = 0;
            updatePauseMenuDOM();
        }
        if (e.keyCode === 40) { // 下向きキー
            selectedPauseMenuIndex = 1;
            updatePauseMenuDOM();
        }
        if (e.keyCode === 13) { // Enterキー（決定）
            if (selectedPauseMenuIndex === 0) {
                togglePause();
            } else {
                backToTitleFromPause();
            }
        }
        if (e.keyCode === 27) { // ポーズ中にEscが押されたら再開
            togglePause();
        }
        return; // ポーズ中の場合は通常のゲーム入力を行わない
    }

    if (e.keyCode === 13) isEnterPressed = true; 
    
    if (e.keyCode === 27) {
        if (mode === 'playing' || mode === 'moving' || mode === 'rotating' || mode === 'fix' || mode === 'checkFall' || mode === 'fall' || mode === 'checkErase' || mode === 'erasing' || mode === 'newPuyo') {
            togglePause();
            return;
        }
    }

    // 💡 修正箇所：ゲームオーバー系モードの時は、矢印キー入力を完全に無視する
    if (mode === 'gameOver' || mode === 'batankyu' || mode === 'retryWait') return;
    
    if (e.keyCode === 38) isUpPressed = true;    
    if (e.keyCode === 40) isDownPressed = true;  
});

document.addEventListener('keyup', (e) => {
    if (e.keyCode === 13) isEnterPressed = false;
    if (e.keyCode === 38) isUpPressed = false;
    if (e.keyCode === 40) isDownPressed = false;
});

function initialize() {
    PuyoImage.initialize();
    Stage.initialize();
    Player.initialize();
    Score.initialize();
    
    for (let i = 1; i <= 19; i++) {
        if (i <= 18) {
            chainVoices[i] = new Audio(`audio/chain${i}.wav`);
            chainVoices[i].preload = 'auto';
        }
        endVoices[i] = new Audio(`audio/chain${i}_end.wav`);
        endVoices[i].preload = 'auto';
    }
    zenkeshiVoice = new Audio(`audio/zenkeshi.wav`);
    zenkeshiVoice.preload = 'auto';
    batankyuVoice = new Audio(`audio/batankyu.wav`);
    batankyuVoice.preload = 'auto';
    
    mode = 'title';
    titleSubMode = 'mainMenu'; 
    frame = 0;

    const ranking = JSON.parse(localStorage.getItem('puyo_ranking')) || [];
    currentHighScore = ranking.length > 0 ? ranking[0].score : 0;

    showTitleMenu();
}

function showTitleMenu() {
    document.getElementById('message-overlay').style.background = "rgba(0,0,0,0.7)";
    document.getElementById('main-message').innerText = "PUYO PUYO";
    
    const rankingContainer = document.getElementById('ranking-container');
    if (rankingContainer) rankingContainer.style.display = "none";
    
    const timerCont = document.getElementById('timer-container');
    const highCont = document.getElementById('highscore-container');
    if (timerCont) timerCont.style.display = "none";
    if (highCont) highCont.style.display = "none";
    
    if (titleSubMode === 'mainMenu') {
        document.getElementById('sub-message').innerText = "SELECT MENU & PUSH ENTER";
        document.getElementById('menu-container').style.display = "block";
        document.getElementById('difficulty-container').style.display = "none";
        updateMenuDOM();
    } else if (titleSubMode === 'difficultySelect') {
        document.getElementById('sub-message').innerText = "SELECT DIFFICULTY & PUSH ENTER";
        document.getElementById('menu-container').style.display = "none";
        document.getElementById('difficulty-container').style.display = "block";
        updateDifficultyDOM();
    }
}

function updateMenuDOM() {
    const menuNames = ["とこぷよ", "スコアアタック", "ログイン"];
    for (let i = 0; i < MENU_COUNT; i++) {
        const item = document.getElementById(`menu-item-${i}`);
        if (item) {
            if (i === selectedMenuIndex) {
                item.innerText = `▶ ${menuNames[i]}`;
                item.style.color = "#fff";
                item.style.fontWeight = "bold";
            } else {
                item.innerText = menuNames[i];
                item.style.color = "#888";
                item.style.fontWeight = "normal";
            }
        }
    }
}

function updateDifficultyDOM() {
    const diffTexts = ["EASY (3 colors)", "NORMAL (4 colors)", "HARD (5 colors)"];
    for (let i = 0; i < DIFF_COUNT; i++) {
        const item = document.getElementById(`diff-item-${i}`);
        if (item) {
            if (i === selectedDiffIndex) {
                item.innerText = `▶ ${diffTexts[i]}`;
                item.style.color = "#ffeb3b"; 
                item.style.fontWeight = "bold";
            } else {
                item.innerText = diffTexts[i];
                item.style.color = "#888";
                item.style.fontWeight = "normal";
            }
        }
    }
}

function resetGame() {
    const stageElement = Stage.stageElement;
    if (stageElement) {
        const puyoImages = stageElement.querySelectorAll('img[src*="puyo"], img[src*="batankyu"]');
        puyoImages.forEach(img => img.remove());
    }
    
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
        while (scoreElement.firstChild) {
            scoreElement.removeChild(scoreElement.firstChild);
        }
    }
    
    for (let y = 0; y < Config.stageRows; y++) {
        for (let x = 0; x < Config.stageCols; x++) {
            Stage.board[y][x] = 0;
        }
    }
    
    if (gameType === 'scoreAttack') {
        Config.puyoColors = 4; 
        remainingTime = 120;   
        isTimeUp = false;
        lastTimerUpdateTime = Date.now(); 
        
        const ranking = JSON.parse(localStorage.getItem('puyo_ranking')) || [];
        currentHighScore = ranking.length > 0 ? ranking[0].score : 0;

        const timerDisp = document.getElementById('timer-display');
        const highDisp = document.getElementById('highscore-display');
        const timerCont = document.getElementById('timer-container');
        const highCont = document.getElementById('highscore-container');
        
        if (timerDisp) timerDisp.innerText = remainingTime;
        if (highDisp) highDisp.innerText = currentHighScore; 
        if (timerCont) timerCont.style.display = "block";
        if (highCont) highCont.style.display = "block";
    } else {
        if (selectedDiffIndex === 0) Config.puyoColors = 3; 
        if (selectedDiffIndex === 1) Config.puyoColors = 4; 
        if (selectedDiffIndex === 2) Config.puyoColors = 5; 
        
        const timerCont = document.getElementById('timer-container');
        const highCont = document.getElementById('highscore-container');
        if (timerCont) timerCont.style.display = "none";
        if (highCont) highCont.style.display = "none";
    }
    
    Player.nextPuyoQueue = [];
    Stage.initialize();
    Player.initialize();
    Score.initialize();
    
    document.getElementById('message-overlay').style.background = "rgba(0,0,0,0)";
    document.getElementById('main-message').innerText = "";
    document.getElementById('sub-message').innerText = "";
    document.getElementById('menu-container').style.display = "none"; 
    document.getElementById('difficulty-container').style.display = "none"; 
    
    const rankingContainer = document.getElementById('ranking-container');
    if (rankingContainer) rankingContainer.style.display = "none";
    
    frame = 0;
    latestRankInIndex = -1;
    isBatankyuVoicePlayed = false; 

    for (let i = 1; i <= 19; i++) {
        if (i <= 18 && chainVoices[i]) {
            chainVoices[i].volume = 0;
            chainVoices[i].play().then(() => { chainVoices[i].pause(); chainVoices[i].volume = 1; chainVoices[i].currentTime = 0; }).catch(e => {});
        }
        if (endVoices[i]) {
            endVoices[i].volume = 0;
            endVoices[i].play().then(() => { endVoices[i].pause(); endVoices[i].volume = 1; endVoices[i].currentTime = 0; }).catch(e => {});
        }
    }
    if (zenkeshiVoice) {
        zenkeshiVoice.volume = 0;
        zenkeshiVoice.play().then(() => { zenkeshiVoice.pause(); zenkeshiVoice.volume = 1; zenkeshiVoice.currentTime = 0; }).catch(e => {});
    }
    if (batankyuVoice) {
        batankyuVoice.volume = 0;
        batankyuVoice.play().then(() => { batankyuVoice.pause(); batankyuVoice.volume = 1; batankyuVoice.currentTime = 0; }).catch(e => {});
    }
    
    // リセット時にキーの押下フラグも綺麗にして誤爆を防ぐ
    isUpPressed = false;
    isDownPressed = false;
    isEnterPressed = false;
    
    mode = 'start';
}

function handleRankingRegistration(finalScore) {
    let ranking = JSON.parse(localStorage.getItem('puyo_ranking')) || [];
    
    const newRecord = {
        score: finalScore,
        date: new Date().toLocaleDateString()
    };
    
    ranking.push(newRecord);
    ranking.sort((a, b) => b.score - a.score);
    ranking = ranking.slice(0, 10);
    
    latestRankInIndex = ranking.findIndex(record => record === newRecord);
    localStorage.setItem('puyo_ranking', JSON.stringify(ranking));
    
    currentHighScore = ranking.length > 0 ? ranking[0].score : 0;
    
    const listElement = document.getElementById('ranking-list');
    if (listElement) {
        listElement.innerHTML = '';
        ranking.forEach((record, index) => {
            const row = document.createElement('div');
            row.style.padding = "3px 5px";
            row.style.borderRadius = "3px";
            
            if (index === latestRankInIndex) {
                row.style.background = "rgba(255, 235, 59, 0.3)";
                row.style.color = "#ffeb3b";
                row.style.fontWeight = "bold";
                row.innerText = `👑 ${index + 1}位: ${record.score} pts (${record.date})`;
            } else {
                row.innerText = `  ${index + 1}位: ${record.score} pts (${record.date})`;
            }
            listElement.appendChild(row);
        });
    }
    
    const rankingContainer = document.getElementById('ranking-container');
    if (rankingContainer) rankingContainer.style.display = "block";
}

function predictIfChainContinues() {
    const virtualBoard = [];
    for (let y = 0; y < Config.stageRows; y++) {
        virtualBoard[y] = [];
        for (let x = 0; x < Config.stageCols; x++) {
            const isErasing = Stage.erasingPuyoInfoList.some(info => info.x === x && info.y === y);
            if (isErasing) {
                virtualBoard[y][x] = 0;
            } else {
                virtualBoard[y][x] = Stage.board[y][x] ? Stage.board[y][x].puyo : 0;
            }
        }
    }

    for (let x = 0; x < Config.stageCols; x++) {
        let destinationY = Config.stageRows - 1;
        for (let y = Config.stageRows - 1; y >= 0; y--) {
            if (virtualBoard[y][x] !== 0) {
                const puyoColor = virtualBoard[y][x];
                virtualBoard[y][x] = 0;
                virtualBoard[destinationY][x] = puyoColor;
                destinationY--;
            }
        }
    }

    const visited = Array.from({ length: Config.stageRows }, () => Array(Config.stageCols).fill(false));
    
    for (let y = 0; y < Config.stageRows; y++) {
        for (let x = 0; x < Config.stageCols; x++) {
            if (virtualBoard[y][x] !== 0 && !visited[y][x]) {
                const color = virtualBoard[y][x];
                const group = [];
                const queue = [{ x, y }];
                visited[y][x] = true;

                while (queue.length > 0) {
                    const current = queue.shift();
                    group.push(current);

                    const directions = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
                    for (const dir of directions) {
                        const nx = current.x + dir.dx;
                        const ny = current.y + dir.dy;

                        if (nx >= 0 && nx < Config.stageCols && ny >= 0 && ny < Config.stageRows) {
                            if (virtualBoard[ny][nx] === color && !visited[ny][nx]) {
                                visited[ny][nx] = true;
                                queue.push({ x: nx, y: ny });
                            }
                        }
                    }
                }

                if (group.length >= Config.erasePuyoCount) {
                    return true;
                }
            }
        }
    }
    return false;
}

// 💡【追加・修正】ポーズ状態を切り替える関数
function togglePause() {
    isPaused = !isPaused;
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) {
        pauseMenu.style.display = isPaused ? 'block' : 'none';
    }
    if (isPaused) {
        selectedPauseMenuIndex = 0; // ポーズを開いたときは「再開」を初期選択にする
        updatePauseMenuDOM();
    }
}

// 💡【追加】ポーズメニューの選択状態（見た目）を更新する関数
function updatePauseMenuDOM() {
    // 💡 選択状態（selectedPauseMenuIndex）に応じて、テキストの「▶」と色を綺麗に切り替える
    const resumeBtn = document.getElementById('pause-resume-btn');
    const titleBtn = document.getElementById('pause-title-btn');
    
    if (!resumeBtn || !titleBtn) return;

    if (selectedPauseMenuIndex === 0) {
        // 「ゲームを再開する」が選択されているとき
        resumeBtn.innerText = '▶ ゲームを再開する';
        resumeBtn.style.color = '#ffffff'; // ホワイト
        
        titleBtn.innerText = 'タイトルに戻る';
        titleBtn.style.color = '#888888'; // グレー
    } else {
        // 「タイトルに戻る」が選択されているとき
        resumeBtn.innerText = 'ゲームを再開する';
        resumeBtn.style.color = '#888888'; // グレー
        
        titleBtn.innerText = '▶ タイトルに戻る';
        titleBtn.style.color = '#ffffff'; // ホワイト
    }
}

// 💡【追加】マウスがメニューの上に乗った（ホバーした）ときに選択インデックスを合わせる関数
function hoverPauseMenu(index) {
    selectedPauseMenuIndex = index;
    updatePauseMenuDOM();
}

function backToTitleFromPause() {
    isPaused = false;
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) pauseMenu.style.display = 'none';
    
    isTimeUp = false;
    titleSubMode = 'mainMenu'; 
    showTitleMenu();
    mode = 'title';
}

function loop() {
    // 💡【追加】ポーズ中の場合の処理
    if (isPaused) {
        // スコアアタックモードの場合のみ、ポーズ中であってもタイマーの減少処理を実行する
        if (gameType === 'scoreAttack' && !isTimeUp) {
            const now = Date.now();
            if (now - lastTimerUpdateTime >= 1000) {
                remainingTime--;
                lastTimerUpdateTime += 1000;
                if (remainingTime <= 0) {
                    remainingTime = 0;
                    isTimeUp = true; 
                    // タイムアップしたら自動的にポーズを解除してゲームオーバー側へ進める
                    togglePause(); 
                }
                const timerDisp = document.getElementById('timer-display');
                if (timerDisp) timerDisp.innerText = remainingTime;
            }
        }
        // ゲーム自体の進行（switch(mode)）は実行せずに次フレームへリクエスト
        frame++;
        requestAnimationFrame(loop);
        return;
    }
    switch(mode) {
        case 'title':
            if (titleSubMode === 'mainMenu') {
                if (isUpPressed) {
                    isUpPressed = false; 
                    selectedMenuIndex = (selectedMenuIndex - 1 + MENU_COUNT) % MENU_COUNT;
                    updateMenuDOM();
                }
                if (isDownPressed) {
                    isDownPressed = false; 
                    selectedMenuIndex = (selectedMenuIndex + 1) % MENU_COUNT;
                    updateMenuDOM();
                }

                if (isEnterPressed) {
                    isEnterPressed = false; 
                    if (selectedMenuIndex === 0) {
                        gameType = 'endless'; 
                        titleSubMode = 'difficultySelect';
                        selectedDiffIndex = 1; 
                        showTitleMenu();
                    } else if (selectedMenuIndex === 1) {
                        gameType = 'scoreAttack'; 
                        titleSubMode = 'mainMenu';
                        resetGame(); 
                    } else if (selectedMenuIndex === 2) {
                        console.log("ログイン が選択されました");
                    }
                }
            }
            else if (titleSubMode === 'difficultySelect') {
                if (isUpPressed) {
                    isUpPressed = false;
                    selectedDiffIndex = (selectedDiffIndex - 1 + DIFF_COUNT) % DIFF_COUNT;
                    updateDifficultyDOM();
                }
                if (isDownPressed) {
                    isDownPressed = false;
                    selectedDiffIndex = (selectedDiffIndex + 1) % DIFF_COUNT;
                    updateDifficultyDOM();
                }

                if (isEnterPressed) {
                    isEnterPressed = false; 
                    titleSubMode = 'mainMenu';
                    resetGame();
                }
            }
            break;

        case 'start':
            mode = 'checkFall';
            break;

        case 'checkFall':
            if(Stage.checkFall()) {
                mode = 'fall';
            } else {
                mode = 'checkErase';
            }
            break;

        case 'fall':
            if(!Stage.fall()) {
                mode = 'checkErase';
            }
            break;

        case 'checkErase':
            const eraseInfo = Stage.checkErase(frame);
            if(eraseInfo) {
                mode = 'erasing';
                combinationCount++;
                Score.calculateScore(combinationCount, eraseInfo.piece, eraseInfo.color, eraseInfo.puyoGroups);
                Stage.hideZenkeshi();

                const willChainContinue = predictIfChainContinues();

                if (willChainContinue) {
                    if (combinationCount <= 18 && chainVoices[combinationCount]) {
                        chainVoices[combinationCount].currentTime = 0;
                        chainVoices[combinationCount].play().catch(e => {});
                    }
                } else {
                    if (combinationCount <= 19 && endVoices[combinationCount]) {
                        endVoices[combinationCount].currentTime = 0;
                        endVoices[combinationCount].play().catch(e => {});
                    }
                }
            } else {
                if(Stage.puyoCount == 0 && combinationCount > 0) {
                    Stage.showZenkeshi();
                    Score.addScore(2100);
                    if (zenkeshiVoice) {
                        zenkeshiVoice.currentTime = 0;
                        zenkeshiVoice.play().catch(e => {});
                    }
                }
                combinationCount = 0;
                mode = 'newPuyo';
            }
            break;

        case 'erasing':
            if(!Stage.erasing(frame)) {
                mode = 'checkFall';
            }
            break;

        case 'newPuyo':
            if (gameType === 'scoreAttack' && isTimeUp) {
                mode = 'gameOver'; 
                break;
            }

            if(!Player.createNewPuyo()) {
                mode = 'gameOver';
            } else {
                mode = 'playing';
            }
            break;

        case 'playing':
            const action = Player.playing(frame);
            mode = action;
            break;

        case 'moving':
            if(!Player.moving(frame)) {
                mode = 'playing';
            }
            break;

        case 'rotating':
            if(!Player.rotating(frame)) {
                mode = 'playing';
            }
            break;

        case 'fix':
            Player.fix();
            mode = 'checkFall';
            break;

        case 'gameOver':
            PuyoImage.prepareBatankyu(frame);
            mode = 'batankyu';
            break;

        case 'batankyu':
            // 💡 演出中に入ってしまったフラグをクリア
            isUpPressed = false;
            isDownPressed = false;
            isEnterPressed = false;

            PuyoImage.batankyu(frame);
            Player.batankyu();
            
            if (!isBatankyuVoicePlayed && batankyuVoice) {
                isBatankyuVoicePlayed = true;
                batankyuVoice.currentTime = 0;
                batankyuVoice.play().catch(e => {});
            }

            if (frame - PuyoImage.gameOverFrame > 120) {
                document.getElementById('message-overlay').style.background = "rgba(0,0,0,0.6)";
                
                if (gameType === 'scoreAttack' && isTimeUp) {
                    document.getElementById('main-message').innerText = "TIME UP";
                } else {
                    document.getElementById('main-message').innerText = "GAME OVER";
                }
                
                document.getElementById('sub-message').innerText = "PUSH ENTER TO RETRY";
                
                if (gameType === 'scoreAttack') {
                    handleRankingRegistration(Score.score);
                }
                
                isEnterPressed = false;
                isUpPressed = false;
                isDownPressed = false;
                mode = 'retryWait';
            }
            break;

        case 'retryWait':
            // 💡 リトライ待機画面中もフラグを強制クリア
            isUpPressed = false;
            isDownPressed = false;
            
            if (isEnterPressed) {
                isEnterPressed = false;
                titleSubMode = 'mainMenu'; 
                showTitleMenu();
                mode = 'title';
            }
            break;
    }

    // 💡【修正】通常時（!isPaused）のみ、ここでタイマーを更新する（ポーズ中のスコアタタイマーは上部で処理しているため）
    if (!isPaused && gameType === 'scoreAttack' && !isTimeUp && (mode === 'playing' || mode === 'moving' || mode === 'rotating' || mode === 'fix' || mode === 'checkFall' || mode === 'fall' || mode === 'checkErase' || mode === 'erasing' || mode === 'newPuyo')) {
        const now = Date.now();
        if (now - lastTimerUpdateTime >= 1000) {
            remainingTime--;
            lastTimerUpdateTime += 1000;
            if (remainingTime <= 0) {
                remainingTime = 0;
                isTimeUp = true; 
            }
            const timerDisp = document.getElementById('timer-display');
            if (timerDisp) timerDisp.innerText = remainingTime;
        }
    }

    frame++;
    requestAnimationFrame(loop);
}
