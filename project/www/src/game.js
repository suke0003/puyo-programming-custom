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
let selectedPauseMenuIndex = 0; // 💡【追加】ポーズメニューの選択インデックス（0:再開, 1:リトライ, 2:一覧に戻る）

// 💡【追加】なぞぷよ用の変数
let currentPuzzleId = null;
let currentPuzzle = null;
let puzzleNextQueueIndex = 0;  // ネクストキューのどこまで使ったかを記録
let puzzleClearConditionMet = false; // クリア条件を満たしたかを記録
let selectedPuzzleResultMenuIndex = 0; // 💡【追加】パズルクリア/失敗画面のメニューインデックス（0:次の問題, 1:一覧に戻る, 2:タイトル）
const PUZZLE_RESULT_MENU_COUNT = 3; // 💡【追加】パズルメニュー項目数

document.addEventListener('keydown', (e) => {
    // 💡【追加】ポーズ中のキーボード操作
    if (isPaused) {
        if (e.keyCode === 38) { // 上向きキー
            selectedPauseMenuIndex = Math.max(0, selectedPauseMenuIndex - 1);
            updatePauseMenuDOM();
        }
        if (e.keyCode === 40) { // 下向きキー
            selectedPauseMenuIndex = Math.min(2, selectedPauseMenuIndex + 1);
            updatePauseMenuDOM();
        }
        if (e.keyCode === 13) { // Enterキー（決定）
            if (selectedPauseMenuIndex === 0) {
                togglePause();
            } else if (selectedPauseMenuIndex === 1) {
                retryGame();
            } else {
                backToPuzzleListFromPause();
            }
        }
        if (e.keyCode === 27) { // ポーズ中にEscが押されたら再開
            togglePause();
        }
        return; // ポーズ中の場合は通常のゲーム入力を行わない
    }

    // 💡【追加】パズルクリア/失敗画面でのキーボード操作
    if (mode === 'puzzleClearWait' || mode === 'puzzleOverWait') {
        if (e.keyCode === 38) { // 上向きキー
            selectedPuzzleResultMenuIndex = Math.max(0, selectedPuzzleResultMenuIndex - 1);
            updatePuzzleResultMenuDOM();
        }
        if (e.keyCode === 40) { // 下向きキー
            selectedPuzzleResultMenuIndex = Math.min(PUZZLE_RESULT_MENU_COUNT - 1, selectedPuzzleResultMenuIndex + 1);
            updatePuzzleResultMenuDOM();
        }
        if (e.keyCode === 13) { // Enterキー（決定）
            selectPuzzleResultMenu(selectedPuzzleResultMenuIndex);
        }
        return;
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

// 💡【追加】タイトル画面でのマウスクリック処理
document.addEventListener('click', (e) => {
    if (mode !== 'title') return;
    
    if (titleSubMode === 'mainMenu') {
        // メニューアイテムのクリック判定
        for (let i = 0; i < MENU_COUNT; i++) {
            const item = document.getElementById(`menu-item-${i}`);
            if (item && item.contains(e.target)) {
                selectedMenuIndex = i;
                updateMenuDOM();
                // クリック時は即座に決定処理を実行
                isEnterPressed = true;
                break;
            }
        }
    } else if (titleSubMode === 'difficultySelect') {
        // 難易度選択アイテムのクリック判定
        for (let i = 0; i < DIFF_COUNT; i++) {
            const item = document.getElementById(`diff-item-${i}`);
            if (item && item.contains(e.target)) {
                selectedDiffIndex = i;
                updateDifficultyDOM();
                // クリック時は即座に決定処理を実行
                isEnterPressed = true;
                break;
            }
        }
    }
});

// 💡【追加】マウスホバーでメニュー選択を変更する機能
document.addEventListener('mousemove', (e) => {
    if (mode !== 'title') return;
    
    if (titleSubMode === 'mainMenu') {
        // メニューアイテムのホバー判定
        for (let i = 0; i < MENU_COUNT; i++) {
            const item = document.getElementById(`menu-item-${i}`);
            if (item && item.contains(e.target)) {
                selectedMenuIndex = i;
                updateMenuDOM();
                break;
            }
        }
    } else if (titleSubMode === 'difficultySelect') {
        // 難易度選択アイテムのホバー判定
        for (let i = 0; i < DIFF_COUNT; i++) {
            const item = document.getElementById(`diff-item-${i}`);
            if (item && item.contains(e.target)) {
                selectedDiffIndex = i;
                updateDifficultyDOM();
                break;
            }
        }
    }
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
    const overlay = document.getElementById('message-overlay');
    
    overlay.style.background = "rgba(0,0,0,0.7)";
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
        // 💡【追加】メニュー表示時にクリック可能にする
        overlay.classList.add('menu-active');
    } else if (titleSubMode === 'difficultySelect') {
        document.getElementById('sub-message').innerText = "SELECT DIFFICULTY & PUSH ENTER";
        document.getElementById('menu-container').style.display = "none";
        document.getElementById('difficulty-container').style.display = "block";
        updateDifficultyDOM();
        // 💡【追加】難易度選択表示時にクリック可能にする
        overlay.classList.add('menu-active');
    }
}

function updateMenuDOM() {
    const menuNames = ["とこぷよ", "スコアアタック", "なぞぷよ"];
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
    
    if (gameType === 'puzzle') {
        // 💡【追加】なぞぷよモードの初期化
        if (currentPuzzle) {
            // 初期盤面をコピー
            for (let y = 0; y < Config.stageRows; y++) {
                for (let x = 0; x < Config.stageCols; x++) {
                    const puyoColor = currentPuzzle.initialBoard[y][x];
                    if (puyoColor > 0) {
                        Stage.board[y][x] = { puyo: puyoColor, element: null };
                    } else {
                        Stage.board[y][x] = null;
                    }
                }
            }
            
            // ネクストキューを設定
            Player.nextPuyoQueue = [...currentPuzzle.nextQueue];
            puzzleNextQueueIndex = 0;
            puzzleClearConditionMet = false;
        }
        
        // UIを表示
        document.getElementById('puzzle-goal-container').style.display = 'block';
        document.getElementById('puzzle-next-list-container').style.display = 'block';
        updatePuzzleGoalDisplay();
        updatePuzzleNextListDisplay();
    } else if (gameType === 'scoreAttack') {
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
    
    if (gameType !== 'puzzle') {
        Player.nextPuyoQueue = [];
    }
    
    Stage.initialize();
    Player.initialize();
    Score.initialize();
    
    // 💡【追加】なぞぷよ時の初期盤面を画面に表示
    if (gameType === 'puzzle') {
        Stage.renderInitialBoard();
        Stage.puyoCount = 0;
        for (let y = 0; y < Config.stageRows; y++) {
            for (let x = 0; x < Config.stageCols; x++) {
                if (Stage.board[y][x]) {
                    Stage.puyoCount++;
                }
            }
        }
    }
    
    document.getElementById('message-overlay').style.background = "rgba(0,0,0,0)";
    document.getElementById('main-message').innerText = "";
    document.getElementById('sub-message').innerText = "";
    document.getElementById('menu-container').style.display = "none"; 
    document.getElementById('difficulty-container').style.display = "none"; 
    
    const rankingContainer = document.getElementById('ranking-container');
    if (rankingContainer) rankingContainer.style.display = "none";
    
    // 💡【追加】ゲーム開始時にメニュー用クラスを削除
    document.getElementById('message-overlay').classList.remove('menu-active');
    
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
    const resumeBtn = document.getElementById('pause-resume-btn');
    const retryBtn = document.getElementById('pause-retry-btn');
    const titleBtn = document.getElementById('pause-title-btn');
    
    if (!resumeBtn || !retryBtn || !titleBtn) return;

    if (selectedPauseMenuIndex === 0) {
        resumeBtn.innerText = '▶ ゲームを再開する';
        resumeBtn.style.color = '#ffffff';
        
        retryBtn.innerText = 'はじめからやりなおす';
        retryBtn.style.color = '#888888';
        
        titleBtn.innerText = 'タイトルに戻る';
        titleBtn.style.color = '#888888';
    } else if (selectedPauseMenuIndex === 1) {
        resumeBtn.innerText = 'ゲームを再開する';
        resumeBtn.style.color = '#888888';
        
        retryBtn.innerText = '▶ はじめからやりなおす';
        retryBtn.style.color = '#ffffff';
        
        titleBtn.innerText = 'タイトルに戻る';
        titleBtn.style.color = '#888888';
    } else {
        resumeBtn.innerText = 'ゲームを再開する';
        resumeBtn.style.color = '#888888';
        
        retryBtn.innerText = 'はじめからやりなおす';
        retryBtn.style.color = '#888888';
        
        titleBtn.innerText = '▶ タイトルに戻る';
        titleBtn.style.color = '#ffffff';
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

// 💡【追加】なぞぷよ一覧に戻る
function backToPuzzleListFromPause() {
    isPaused = false;
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) pauseMenu.style.display = 'none';
    
    document.getElementById('puzzle-goal-container').style.display = 'none';
    document.getElementById('puzzle-next-list-container').style.display = 'none';
    showPuzzleList();
    mode = 'title';
    titleSubMode = 'puzzleSelect';
}

// 💡【追加】なぞぷよの目標表示を更新
function updatePuzzleGoalDisplay() {
    if (!currentPuzzle) return;
    
    const goalText = document.getElementById('puzzle-goal-text');
    if (goalText) {
        let goalString = '';
        if (currentPuzzle.goal.type === 'chain') {
            goalString = `${currentPuzzle.goal.value}連鎖`;
        } else if (currentPuzzle.goal.type === 'color') {
            goalString = `${currentPuzzle.goal.value}色消す`;
        } else if (currentPuzzle.goal.type === 'allClear') {
            goalString = `全消し`;
        }
        goalText.innerText = goalString;
    }
}

// 💡【追加】なぞぷよのネクスト一覧を更新
function updatePuzzleNextListDisplay() {
    if (!currentPuzzle) return;
    
    const nextListContainer = document.getElementById('puzzle-next-list');
    if (nextListContainer) {
        nextListContainer.innerHTML = '';
        
        // 現在のキューインデックスから表示
        const colorMap = { 1: '🔴', 2: '🟢', 3: '🔵', 4: '🟡', 5: '🟣' };
        
        for (let i = puzzleNextQueueIndex; i < currentPuzzle.nextQueue.length; i += 2) {
            const color1 = currentPuzzle.nextQueue[i];
            const color2 = i + 1 < currentPuzzle.nextQueue.length ? currentPuzzle.nextQueue[i + 1] : null;
            
            const pairDiv = document.createElement('div');
            pairDiv.style.fontSize = '12px';
            pairDiv.style.color = '#fff';
            pairDiv.innerText = `${colorMap[color1] || '?'}${color2 ? colorMap[color2] : ''}`;
            
            nextListContainer.appendChild(pairDiv);
        }
    }
}

// 💡【追加】なぞぷよのクリア条件を判定
function checkPuzzleClearCondition() {
    if (!currentPuzzle || puzzleClearConditionMet) return false;
    
    if (currentPuzzle.goal.type === 'chain') {
        if (combinationCount >= currentPuzzle.goal.value) {
            puzzleClearConditionMet = true;
            return true;
        }
    } else if (currentPuzzle.goal.type === 'color') {
        // 色の判定は checkErase 時に計測
        // ここでは保留
    } else if (currentPuzzle.goal.type === 'allClear') {
        if (Stage.puyoCount === 0) {
            puzzleClearConditionMet = true;
            return true;
        }
    }
    
    return false;
}

// 💡【追加】パズル結果画面のメニュー表示を更新
function updatePuzzleResultMenuDOM() {
    let resultContainer = document.getElementById('puzzle-result-menu-container');
    if (!resultContainer) {
        // コンテナが存在しない場合は作成する
        const overlay = document.getElementById('message-overlay');
        const container = document.createElement('div');
        container.id = 'puzzle-result-menu-container';
        container.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(26, 26, 26, 0.95); padding: 40px 30px; border: 4px solid #fff; border-radius: 12px; text-align: center; font-family: sans-serif; min-width: 280px; z-index: 1001;';
        
        container.innerHTML = `
            <div id="puzzle-menu-item-0" onmouseover="hoverPuzzleResultMenu(0)" style="font-size: 22px; color: #fff; margin: 20px 0; cursor: pointer; font-weight: bold;">▶ 次の問題に進む</div>
            <div id="puzzle-menu-item-1" onmouseover="hoverPuzzleResultMenu(1)" style="font-size: 22px; color: #888; margin: 20px 0; cursor: pointer; font-weight: bold;">問題一覧に戻る</div>
            <div id="puzzle-menu-item-2" onmouseover="hoverPuzzleResultMenu(2)" style="font-size: 22px; color: #888; margin: 20px 0; cursor: pointer; font-weight: bold;">タイトルに戻る</div>
        `;
        overlay.appendChild(container);
        resultContainer = container;
    }

    // メニュー項目の見た目を更新
    for (let i = 0; i < PUZZLE_RESULT_MENU_COUNT; i++) {
        const item = document.getElementById(`puzzle-menu-item-${i}`);
        if (item) {
            if (i === selectedPuzzleResultMenuIndex) {
                item.style.color = '#ffffff';
                if (i === 0) {
                    item.innerText = '▶ 次の問題に進む';
                } else if (i === 1) {
                    item.innerText = '▶ 問題一覧に戻る';
                } else {
                    item.innerText = '▶ タイトルに戻る';
                }
            } else {
                item.style.color = '#888888';
                if (i === 0) {
                    item.innerText = '次の問題に進む';
                } else if (i === 1) {
                    item.innerText = '問題一覧に戻る';
                } else {
                    item.innerText = 'タイトルに戻る';
                }
            }
        }
    }
}

// 💡【追加】パズル結果メニューのホバー処理
function hoverPuzzleResultMenu(index) {
    selectedPuzzleResultMenuIndex = index;
    updatePuzzleResultMenuDOM();
}

// 💡【追加】パズル結果メニューの選択処理
function selectPuzzleResultMenu(index) {
    if (index === 0) {
        // 次の問題に進む
        const nextPuzzle = PUZZLES.find(p => p.id === currentPuzzleId + 1);
        if (nextPuzzle) {
            selectPuzzle(nextPuzzle.id);
        } else {
            // 次の問題がない場合は問題一覧に戻る
            showPuzzleList();
            mode = 'title';
            titleSubMode = 'puzzleSelect';
        }
    } else if (index === 1) {
        // 問題一覧に戻る
        document.getElementById('puzzle-goal-container').style.display = 'none';
        document.getElementById('puzzle-next-list-container').style.display = 'none';
        showPuzzleList();
        mode = 'title';
        titleSubMode = 'puzzleSelect';
    } else {
        // タイトルに戻る
        document.getElementById('puzzle-goal-container').style.display = 'none';
        document.getElementById('puzzle-next-list-container').style.display = 'none';
        isTimeUp = false;
        titleSubMode = 'mainMenu';
        showTitleMenu();
        mode = 'title';
    }
}

function loop() {
    // 💡【追加】ポーズ中の場合の処理
    if (isPaused) {
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
                        showPuzzleList();
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
            else if (titleSubMode === 'puzzleSelect') {
                // なぞぷよ一覧選択中
                // ここでは特に処理なし（クリックで直接 selectPuzzle を呼ぶ）
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
                
                // 💡【追加】なぞぷよ用クリア判定
                if (gameType === 'puzzle' && checkPuzzleClearCondition()) {
                    mode = 'puzzleClear';
                    break;
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
                if (gameType === 'puzzle') {
                    // なぞぷよで盤面が積み上がってゲームオーバー
                    mode = 'puzzleOver';
                } else {
                    mode = 'gameOver';
                }
            } else {
                mode = 'playing';
                updatePuzzleNextListDisplay(); // なぞぷよ用ネクスト更新
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

        case 'puzzleClear':
            // 💡【追加】なぞぷよクリア画面
            document.getElementById('message-overlay').style.background = "rgba(0,0,0,0.6)";
            document.getElementById('main-message').innerText = "CLEAR!";
            document.getElementById('sub-message').innerText = "SELECT & PUSH ENTER";
            isEnterPressed = false;
            isUpPressed = false;
            isDownPressed = false;
            selectedPuzzleResultMenuIndex = 0;
            updatePuzzleResultMenuDOM();
            mode = 'puzzleClearWait';
            break;

        case 'puzzleClearWait':
            // なぞぷよクリア画面での操作は keydown イベントで処理
            break;

        case 'puzzleOver':
            // 💡【追加】なぞぷよゲームオーバー画面
            document.getElementById('message-overlay').style.background = "rgba(0,0,0,0.6)";
            document.getElementById('main-message').innerText = "GAME OVER";
            document.getElementById('sub-message').innerText = "SELECT & PUSH ENTER";
            isEnterPressed = false;
            isUpPressed = false;
            isDownPressed = false;
            selectedPuzzleResultMenuIndex = 0;
            updatePuzzleResultMenuDOM();
            mode = 'puzzleOverWait';
            break;

        case 'puzzleOverWait':
            // なぞぷよゲームオーバー画面での操作は keydown イベントで処理
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

    // 💡【修正】通常時のみ、ここでタイマーを更新
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

// 💡【追加】メニュー選択用の関数
function selectMenu(index) {
    if (mode !== 'title' || titleSubMode !== 'mainMenu') return;
    selectedMenuIndex = index;
    updateMenuDOM();
    isEnterPressed = true;
}

// 💡【追加】難易度選択用の関数
function selectDifficulty(index) {
    if (mode !== 'title' || titleSubMode !== 'difficultySelect') return;
    selectedDiffIndex = index;
    updateDifficultyDOM();
    isEnterPressed = true;
}

// 💡【追加】ゲームをやり直す関数
function retryGame() {
    isPaused = false;
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) pauseMenu.style.display = 'none';
    
    resetGame();
}

// 💡【追加】なぞぷよ問題一覧を表示
function showPuzzleList() {
    const overlay = document.getElementById('message-overlay');
    overlay.style.background = "rgba(0,0,0,0.7)";
    document.getElementById('main-message').innerText = "なぞぷよ";
    document.getElementById('sub-message').innerText = "SELECT PUZZLE & CLICK";
    document.getElementById('menu-container').style.display = "none";
    document.getElementById('difficulty-container').style.display = "none";
    
    const puzzleListContainer = document.getElementById('puzzle-list-container');
    const puzzleList = document.getElementById('puzzle-list');
    
    puzzleList.innerHTML = '';
    PUZZLES.forEach((puzzle) => {
        const item = document.createElement('div');
        item.style.padding = "8px";
        item.style.cursor = "pointer";
        item.style.borderRadius = "3px";
        item.style.marginBottom = "5px";
        item.style.backgroundColor = "rgba(255,255,255,0.1)";
        item.innerHTML = `<div onclick="selectPuzzle(${puzzle.id})" style="color: #fff; font-weight: bold;">${puzzle.title}</div><div style="color: #aaa; font-size: 12px;">${puzzle.description}</div>`;
        puzzleList.appendChild(item);
    });
    
    puzzleListContainer.style.display = "block";
    titleSubMode = 'puzzleSelect';
    overlay.classList.add('menu-active');
}

// 💡【追加】なぞぷよを選択
function selectPuzzle(puzzleId) {
    currentPuzzleId = puzzleId;
    currentPuzzle = PUZZLES.find(p => p.id === puzzleId);
    gameType = 'puzzle';
    titleSubMode = 'mainMenu';
    
    document.getElementById('puzzle-list-container').style.display = 'none';

    resetGame();
}
