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
let selectedPauseMenuIndex = 0; // 💡【追加】ポーズメニューの選択インデックス
let pauseMenuCount = 3; // 💡【追加】ポーズメニューの項目数（通常3、なぞぷよ時4）

// 💡【追加】なぞぷよ用の変数
let currentPuzzleId = null;
let currentPuzzle = null;
let puzzleListSelectedIndex = 0; // なぞぷよ一覧での選択インデックス
let puzzleNextQueueIndex = 0;  // ネクストキューのどこまで使ったかを記録
let puzzleClearConditionMet = false; // クリア条件を満たしたかを記録
let puzzleSolutionMatched = false; // 💡【追加】正解パターン一致フラグ
let selectedPuzzleResultMenuIndex = 0; // 💡【追加】パズルクリア/失敗画面のメニューインデックス（0:次の問題, 1:一覧に戻る, 2:タイトル）
const PUZZLE_RESULT_MENU_COUNT = 3; // 💡【追加】パズルメニュー項目数

document.addEventListener('keydown', (e) => {
    console.log('GAME keydown', e.keyCode, 'mode=', mode, 'titleSubMode=', titleSubMode);
    // 💡【追加】ポーズ中のキーボード操作
    if (isPaused) {
        if (e.keyCode === 38) { // 上向きキー
            selectedPauseMenuIndex = Math.max(0, selectedPauseMenuIndex - 1);
            updatePauseMenuDOM();
        }
        if (e.keyCode === 40) { // 下向きキー
            selectedPauseMenuIndex = Math.min(pauseMenuCount - 1, selectedPauseMenuIndex + 1);
            updatePauseMenuDOM();
        }
        if (e.keyCode === 13) { // Enterキー（決定）
            selectPauseMenu(selectedPauseMenuIndex);
        }
        if (e.keyCode === 27) { // ポーズ中にEscが押されたら再開
            togglePause();
        }
        return; // ポーズ中の場合は通常のゲーム入力を行わない
    }

    // タイトル画面でなぞぷよ一覧選択中のキーボード操作
    if (mode === 'title' && titleSubMode === 'puzzleSelect') {
        if (e.keyCode === 38) { // 上
            e.preventDefault();
            // 上に移動（ループ）
            const puzzleList = document.getElementById('puzzle-list');
            if (puzzleList && puzzleList.children.length > 0) {
                puzzleListSelectedIndex = (puzzleListSelectedIndex - 1 + puzzleList.children.length) % puzzleList.children.length;
                updatePuzzleListSelectionDOM();
            }
        } else if (e.keyCode === 40) { // 下
            e.preventDefault();
            const puzzleList = document.getElementById('puzzle-list');
            if (puzzleList && puzzleList.children.length > 0) {
                puzzleListSelectedIndex = (puzzleListSelectedIndex + 1) % puzzleList.children.length;
                updatePuzzleListSelectionDOM();
            }
        } else if (e.keyCode === 13) { // Enter
            e.preventDefault();
            const puzzleList = document.getElementById('puzzle-list');
            if (puzzleList && puzzleList.children.length > 0) {
                const selectedItem = puzzleList.children[puzzleListSelectedIndex];
                const pid = selectedItem ? selectedItem.getAttribute('data-puzzle-id') : null;
                if (pid) {
                    selectPuzzle(parseInt(pid, 10));
                }
            }
        }
        return; // タイトルモードの他の処理は行わない
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

    // 同期：Player.keyStatus にも反映しておく（Player のリスナが何らかの理由で効かない場合にも対応）
    if (typeof Player !== 'undefined' && Player.keyStatus) {
        if (e.keyCode === 37) Player.keyStatus.left = true;
        if (e.keyCode === 39) Player.keyStatus.right = true;
        if (e.keyCode === 38) Player.keyStatus.up = true;
        if (e.keyCode === 40) Player.keyStatus.down = true;
    }
    // グローバルフラグ（Player.falling 内のフォールバック参照用）
    window.isLeftPressed = (e.keyCode === 37) || window.isLeftPressed;
    window.isRightPressed = (e.keyCode === 39) || window.isRightPressed;
    window.isUpPressed = (e.keyCode === 38) || window.isUpPressed;
    window.isDownPressed = (e.keyCode === 40) || window.isDownPressed;
});

document.addEventListener('keyup', (e) => {
    if (e.keyCode === 13) isEnterPressed = false;
    if (e.keyCode === 38) isUpPressed = false;
    if (e.keyCode === 40) isDownPressed = false;
    if (typeof Player !== 'undefined' && Player.keyStatus) {
        if (e.keyCode === 37) Player.keyStatus.left = false;
        if (e.keyCode === 39) Player.keyStatus.right = false;
        if (e.keyCode === 38) Player.keyStatus.up = false;
        if (e.keyCode === 40) Player.keyStatus.down = false;
    }
    if (e.keyCode === 37) window.isLeftPressed = false;
    if (e.keyCode === 39) window.isRightPressed = false;
    if (e.keyCode === 38) window.isUpPressed = false;
    if (e.keyCode === 40) window.isDownPressed = false;
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

    const goalCont = document.getElementById('puzzle-goal-container');
    const puzzleNextCont = document.getElementById('puzzle-next-list-container');
    if (goalCont) goalCont.style.display = 'none';
    if (puzzleNextCont) puzzleNextCont.style.display = 'none';

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
    // 画面上のぷよ画像を消す（DOMクリア）
    const stageElement = Stage.stageElement;
    if (stageElement) {
        const puyoImages = stageElement.querySelectorAll('img[src*="puyo"], img[src*="batankyu"]');
        puyoImages.forEach(img => img.remove());
    }

    // スコア要素をクリア
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
        while (scoreElement.firstChild) {
            scoreElement.removeChild(scoreElement.firstChild);
        }
    }

    // --- 基盤初期化を先に行う ---
    Stage.initialize();
    Player.initialize();
    Score.initialize();

    // 連鎖／消去関連の残骸を完全に初期化（これが重要）
    combinationCount = 0;
    // Stage の落下・消去リストを空にする
    if (Stage) {
        Stage.fallingPuyoList = [];
        Stage.erasingPuyoInfoList = [];
        Stage.isChainMode = false;
        Stage.chainCount = 0;
        // 全消し演出がもし出ていたら消す
        if (Stage.hideZenkeshi) Stage.hideZenkeshi();
    }

    // なぞぷよ専用初期化
    if (gameType === 'puzzle') {
        if (currentPuzzle) {
            for (let y = 0; y < Config.stageRows; y++) {
                for (let x = 0; x < Config.stageCols; x++) {
                    const puyoColor = (currentPuzzle.initialBoard[y] && currentPuzzle.initialBoard[y][x]) || 0;
                    if (puyoColor > 0) {
                        Stage.board[y][x] = { puyo: puyoColor, element: null };
                    } else {
                        Stage.board[y][x] = null;
                    }
                }
            }
            Player.nextPuyoQueue = [];
            puzzleNextQueueIndex = 0;
            puzzleClearConditionMet = false;
            puzzleSolutionMatched = false;
        }

        const goalCont = document.getElementById('puzzle-goal-container');
        const nextListCont = document.getElementById('puzzle-next-list-container');
        if (goalCont) goalCont.style.display = 'block';
        if (nextListCont) nextListCont.style.display = 'block';
        updatePuzzleGoalDisplay();
        updatePuzzleNextListDisplay();

        Stage.renderInitialBoard();
        Stage.puyoCount = 0;
        for (let y = 0; y < Config.stageRows; y++) {
            for (let x = 0; x < Config.stageCols; x++) {
                if (Stage.board[y][x]) Stage.puyoCount++;
            }
        }
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

    // UI リセット
    const overlay = document.getElementById('message-overlay');
    if (overlay) overlay.style.background = "rgba(0,0,0,0)";
    const mainMessage = document.getElementById('main-message');
    if (mainMessage) mainMessage.innerText = "";
    const subMessage = document.getElementById('sub-message');
    if (subMessage) subMessage.innerText = "";
    const menuContainer = document.getElementById('menu-container');
    if (menuContainer) menuContainer.style.display = "none";
    const diffContainer = document.getElementById('difficulty-container');
    if (diffContainer) diffContainer.style.display = "none";

    const rankingContainer = document.getElementById('ranking-container');
    if (rankingContainer) rankingContainer.style.display = "none";

    if (overlay) overlay.classList.remove('menu-active');

    frame = 0;
    latestRankInIndex = -1;
    isBatankyuVoicePlayed = false;

    // 音声プリロード処理等は既存通り（省略せず残す）
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

    isUpPressed = false;
    isDownPressed = false;
    isEnterPressed = false;
    window.isUpPressed = false;
    window.isDownPressed = false;

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

// 💡【修正】ポーズ状態を切り替える関数
function togglePause() {
    isPaused = !isPaused;
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) {
        pauseMenu.style.display = isPaused ? 'block' : 'none';
    }
    
    if (isPaused) {
        selectedPauseMenuIndex = 0;
        updatePauseMenuDOM();
    } else {
        // ポーズ解除時に Player のキー入力状態をリセットして誤動作を防ぐ
        if (typeof Player !== 'undefined' && Player.clearKeyStatus) {
            Player.clearKeyStatus();
        }
        // そしてゲーム全体のグローバルキーもリセット
        isUpPressed = false;
        isDownPressed = false;
        window.isUpPressed = false;
        window.isDownPressed = false;
    }
}

// 💡【修正】ゲーム中のポーズボタン表示制御
function updatePauseButtonVisibility() {
    const pauseBtn = document.getElementById('pause-btn');
    if (!pauseBtn) return;
    
    // ゲーム中のモードをチェック
    const isGamePlaying = (mode === 'playing' || mode === 'moving' || mode === 'rotating' || 
                          mode === 'fix' || mode === 'checkFall' || mode === 'fall' || 
                          mode === 'checkErase' || mode === 'erasing' || mode === 'newPuyo');
    
    if (isGamePlaying) {
        pauseBtn.style.display = 'block';
    } else {
        pauseBtn.style.display = 'none';
    }
}

// 💡【追加】ポーズメニューの項目数を設定
function setPauseMenuCount() {
    if (gameType === 'puzzle') {
        pauseMenuCount = 4; // 再開、リトライ、一覧に戻る、タイトル
    } else {
        pauseMenuCount = 3; // 再開、リトライ、タイトル
    }
}

// 💡【追加】ポーズメニューの選択処理を一元化
function selectPauseMenu(index) {
    if (index === 0) {
        togglePause();
    } else if (index === 1) {
        retryGame();
    } else if (gameType === 'puzzle' && index === 2) {
        // なぞぷよモード：一覧に戻る
        backToPuzzleListFromPause();
    } else if ((gameType === 'puzzle' && index === 3) || (gameType !== 'puzzle' && index === 2)) {
        // タイトルに戻る
        backToTitleFromPause();
    }
}

// 💡【修正】ポーズメニューの選択状態（見た目）を更新する関数 - すべてのボタン処理を統一
function updatePauseMenuDOM() {
    const resumeBtn = document.getElementById('pause-resume-btn');
    const retryBtn = document.getElementById('pause-retry-btn');
    const listBtn = document.getElementById('pause-list-btn');
    const titleBtn = document.getElementById('pause-title-btn');
    
    if (!resumeBtn || !retryBtn || !titleBtn) return;

    // 💡【修正】まず全てのボタンをリセット
    const buttons = [resumeBtn, retryBtn, titleBtn];
    if (listBtn) buttons.splice(2, 0, listBtn);
    
    buttons.forEach(btn => {
        btn.style.color = '#888888';
        btn.style.fontWeight = 'normal';
    });

    // テキストをリセット
    resumeBtn.innerText = 'ゲームを再開する';
    retryBtn.innerText = 'はじめからやりなおす';
    if (listBtn) listBtn.innerText = '問題一覧に戻る';
    titleBtn.innerText = 'タイトルに戻る';

    // 💡【修正】なぞぷよモード時はリスト項目を表示、通常モード時は非表示
    if (listBtn) {
        listBtn.style.display = gameType === 'puzzle' ? 'block' : 'none';
    }

    // 💡【修正】選択中の項目に▶を付ける（正確なインデックスチェック）
    if (selectedPauseMenuIndex === 0) {
        resumeBtn.innerText = '▶ ゲームを再開する';
        resumeBtn.style.color = '#ffffff';
        resumeBtn.style.fontWeight = 'bold';
    } 
    else if (selectedPauseMenuIndex === 1) {
        retryBtn.innerText = '▶ はじめからやりなおす';
        retryBtn.style.color = '#ffffff';
        retryBtn.style.fontWeight = 'bold';
    } 
    else if (selectedPauseMenuIndex === 2) {
        if (gameType === 'puzzle' && listBtn) {
            // なぞぷよモード時：インデックス2は「問題一覧に戻る」
            listBtn.innerText = '▶ 問題一覧に戻る';
            listBtn.style.color = '#ffffff';
            listBtn.style.fontWeight = 'bold';
        } else if (gameType !== 'puzzle') {
            // 通常モード時：インデックス2は「タイトルに戻る」
            titleBtn.innerText = '▶ タイトルに戻る';
            titleBtn.style.color = '#ffffff';
            titleBtn.style.fontWeight = 'bold';
        }
    } 
    else if (selectedPauseMenuIndex === 3 && gameType === 'puzzle') {
        // なぞぷよモード時のみ存在：インデックス3は「タイトルに戻る」
        titleBtn.innerText = '▶ タイトルに戻る';
        titleBtn.style.color = '#ffffff';
        titleBtn.style.fontWeight = 'bold';
    }
}

// 💡【修正】マウスがメニューの上に乗ったときに選択インデックスを合わせる関数
function hoverPauseMenu(index) {
    selectedPauseMenuIndex = index;
    updatePauseMenuDOM();
}

// 💡【修正】ポーズメニューアイテムをクリックするための関数
function clickPauseMenu(index) {
    selectedPauseMenuIndex = index;
    updatePauseMenuDOM();
    selectPauseMenu(index);
}

function backToTitleFromPause() {
    isPaused = false;
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) pauseMenu.style.display = 'none';
    if (typeof Player !== 'undefined' && Player.clearKeyStatus) Player.clearKeyStatus();
    window.isUpPressed = false; window.isDownPressed = false;
    document.getElementById('message-overlay').classList.remove('menu-active');
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
    if (typeof Player !== 'undefined' && Player.clearKeyStatus) Player.clearKeyStatus();
    window.isUpPressed = false; window.isDownPressed = false;
    document.getElementById('message-overlay').classList.remove('menu-active');
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
    const parentContainer = document.getElementById('puzzle-next-list-container');
    const container = document.getElementById('puzzle-next-list');
    if (!container || !parentContainer) return;

    // 見た目：なぞぷよ専用は背景透明（通常NEXTは別枠）
    parentContainer.style.background = 'transparent';
    parentContainer.style.boxShadow = 'none';
    parentContainer.style.borderRadius = '0';
    parentContainer.style.padding = '6px 0';
    parentContainer.style.position = 'relative';
    parentContainer.style.zIndex = '10';

    container.innerHTML = '';

    const IMG_SIZE = Math.max(20, Math.floor(Config.puyoImgWidth * 0.5));

    // 全キューを固定表示（消費済みは薄くする）
    // 表示は列（横）ごとで、各列は縦: [番号][movable][center]
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'row';
    wrapper.style.gap = '10px';
    wrapper.style.alignItems = 'flex-start';

    for (let pos = 0; pos < currentPuzzle.nextQueue.length; pos += 2) {
        const centerColor = currentPuzzle.nextQueue[pos] || 0;
        const movableColor = (pos + 1 < currentPuzzle.nextQueue.length) ? currentPuzzle.nextQueue[pos + 1] : 0;

        const col = document.createElement('div');
        col.style.display = 'flex';
        col.style.flexDirection = 'column';
        col.style.alignItems = 'center';
        col.style.padding = '4px 8px';
        // 罫線（左）を入れる
        if (pos > 0) col.style.borderLeft = '1px solid rgba(0,0,0,0.08)';

        // 残りペア数（番号）
        const remainingPairs = Math.ceil((currentPuzzle.nextQueue.length - pos) / 2);
        const numDiv = document.createElement('div');
        numDiv.style.fontSize = '12px';
        numDiv.style.color = '#666';
        numDiv.style.marginBottom = '6px';
        numDiv.innerText = String(remainingPairs);
        col.appendChild(numDiv);

        // 画像ヘルパー：position を static にして親コンテナのレイアウトに従わせる
        const createSmall = (color) => {
            if (!color) {
                const ph = document.createElement('div');
                ph.style.width = IMG_SIZE + 'px';
                ph.style.height = IMG_SIZE + 'px';
                ph.style.borderRadius = '50%';
                ph.style.background = 'rgba(255,255,255,0.03)';
                ph.style.marginBottom = '4px';
                return ph;
            }
            const elem = PuyoImage.getPuyo(color);
            let img;
            try {
                img = elem.cloneNode(true);
            } catch (e) {
                img = elem;
            }
            img.style.width = IMG_SIZE + 'px';
            img.style.height = IMG_SIZE + 'px';
            img.style.position = 'static'; // ここが重要（盤面への absolute 重なりを防ぐ）
            img.style.left = '';
            img.style.top = '';
            img.style.marginBottom = '4px';
            return img;
        };

        const movableEl = createSmall(movableColor);
        const centerEl = createSmall(centerColor);

        // consumption: if this pair is already consumed (pos < puzzleNextQueueIndex) -> dim
        if (pos < puzzleNextQueueIndex) {
            col.style.opacity = '0.35';
        }

        col.appendChild(movableEl);
        col.appendChild(centerEl);
        wrapper.appendChild(col);
    }

    container.appendChild(wrapper);
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
        container.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(26, 26, 26, 0.95); padding: 40px 30px; border: 4px solid #fff; border-radius: 12px; text-align: center; z-index: 9998;';
        
        container.innerHTML = `
            <div id="puzzle-menu-item-0" onclick="clickPuzzleResultMenu(0)" onmouseover="hoverPuzzleResultMenu(0)" style="font-size: 22px; color: #fff; margin: 20px 0; cursor: pointer; font-weight: bold; min-width: 280px; min-height: 28px;">▶ 次の問題に進む</div>
            <div id="puzzle-menu-item-1" onclick="clickPuzzleResultMenu(1)" onmouseover="hoverPuzzleResultMenu(1)" style="font-size: 22px; color: #888; margin: 20px 0; cursor: pointer; font-weight: bold; min-width: 280px; min-height: 28px;">問題一覧に戻る</div>
            <div id="puzzle-menu-item-2" onclick="clickPuzzleResultMenu(2)" onmouseover="hoverPuzzleResultMenu(2)" style="font-size: 22px; color: #888; margin: 20px 0; cursor: pointer; font-weight: bold; min-width: 280px; min-height: 28px;">タイトルに戻る</div>
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

// 💡【追加】パズル結果メニューのクリック処理
function clickPuzzleResultMenu(index) {
    selectedPuzzleResultMenuIndex = index;
    updatePuzzleResultMenuDOM();
    selectPuzzleResultMenu(index);
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

// 💡【修正】スコアアタック用タイマー更新関数（ポーズ中も表示を更新）
function updateScoreAttackTimer() {
    if (gameType !== 'scoreAttack' || isTimeUp) return;
    
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

function loop() {
    // 💡【追加】ポーズボタンの表示制御
    updatePauseButtonVisibility();
    
    // 💡【修正】スコアアタックのタイマーはポーズ中も進める（表示も更新）
    if (gameType === 'scoreAttack' && !isTimeUp && (mode === 'playing' || mode === 'moving' || mode === 'rotating' || mode === 'fix' || mode === 'checkFall' || mode === 'fall' || mode === 'checkErase' || mode === 'erasing' || mode === 'newPuyo' || isPaused)) {
        updateScoreAttackTimer();
    }
    
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
                
                // 💡【修正】正解パターン一致フラグが立っていて、連鎖が終わりそうなら
                if (gameType === 'puzzle' && puzzleSolutionMatched && !willChainContinue) {
                    // 連鎖が終わる → CLEAR画面へ
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
                    // ネクストが尽きた、または盤面満杯
                    // 💡【修正】正解パターン一致フラグをチェック
                    if (puzzleSolutionMatched) {
                        // すでにCLEAR確定フラグが立っている → 最終確認
                        // （実際にはここに来る前に puzzleClear に遷移している）
                        mode = 'puzzleClear';
                    } else {
                        // 正解パターンと一致しなかった → FAILED
                        mode = 'puzzleOver';
                    }
                } else {
                    mode = 'gameOver';
                }
            } else {
                mode = 'playing';
                updatePuzzleNextListDisplay();
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
            const overlay = document.getElementById('message-overlay');
            if (overlay) overlay.style.background = "rgba(0,0,0,0.6)";
            document.getElementById('main-message').innerText = "CLEAR!";
            document.getElementById('sub-message').innerText = "SELECT & PUSH ENTER";
            isEnterPressed = false;
            isUpPressed = false;
            isDownPressed = false;
            selectedPuzzleResultMenuIndex = 0;
            updatePuzzleResultMenuDOM();
            if (overlay) overlay.classList.add('menu-active');
            mode = 'puzzleClearWait';
            break;

        case 'puzzleClearWait':
            // なぞぷよクリア画面での操作は keydown イベントで処理
            break;

        case 'puzzleOver':
            // 💡【追加】なぞぷよゲームオーバー画面
            document.getElementById('message-overlay').style.background = "rgba(0,0,0,0.6)";
            document.getElementById('main-message').innerText = "MISS";
            document.getElementById('sub-message').innerText = "SELECT & PUSH ENTER";
            isEnterPressed = false;
            isUpPressed = false;
            isDownPressed = false;
            selectedPuzzleResultMenuIndex = 0;
            updatePuzzleResultMenuDOM();
            if (overlay) overlay.classList.add('menu-active');
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

    // Stage の中身をクリアしてから resetGame を呼ぶ
    if (Stage) {
        Stage.fallingPuyoList = [];
        Stage.erasingPuyoInfoList = [];
        Stage.isChainMode = false;
        Stage.chainCount = 0;
        if (Stage.hideZenkeshi) Stage.hideZenkeshi();
    }

    if (typeof Player !== 'undefined' && Player.clearKeyStatus) Player.clearKeyStatus();
    isUpPressed = false; isDownPressed = false; isEnterPressed = false;
    window.isUpPressed = false; window.isDownPressed = false;

    const overlay = document.getElementById('message-overlay');
    if (overlay) overlay.classList.remove('menu-active');

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
    PUZZLES.forEach((puzzle, idx) => {
        const item = document.createElement('div');
        item.style.padding = "8px";
        item.style.cursor = "pointer";
        item.style.borderRadius = "3px";
        item.style.marginBottom = "5px";
        item.style.backgroundColor = "rgba(255,255,255,0.1)";
        item.style.color = "#fff";
        item.style.fontWeight = "bold";
        item.style.fontSize = "14px";
        item.setAttribute('data-index', idx);
        item.setAttribute('data-puzzle-id', puzzle.id);
        item.tabIndex = 0; // フォーカス可能にしてキーボードアクセスを可能にする

        // 内部表示（タイトル＋説明）
        const titleDiv = document.createElement('div');
        titleDiv.innerText = puzzle.title;
        titleDiv.style.fontWeight = 'bold';
        titleDiv.style.color = '#fff';
        const descDiv = document.createElement('div');
        descDiv.innerText = puzzle.description;
        descDiv.style.color = '#aaa';
        descDiv.style.fontSize = '12px';

        item.appendChild(titleDiv);
        item.appendChild(descDiv);

        // クリック時に確実に selectPuzzle を呼ぶ
        item.addEventListener('click', () => {
            selectPuzzle(puzzle.id);
        });

        // ホバーで見た目を選択に合わせる
        item.addEventListener('mouseover', () => {
            puzzleListSelectedIndex = idx;
            updatePuzzleListSelectionDOM();
        });

        puzzleList.appendChild(item);
    });
    
    puzzleListContainer.style.display = "block";
    titleSubMode = 'puzzleSelect';
    overlay.classList.add('menu-active');

    // 初期選択をリセットして見た目を反映
    puzzleListSelectedIndex = 0;
    updatePuzzleListSelectionDOM();
}

// 💡【追加】なぞぷよを選択
function selectPuzzle(puzzleId) {
    currentPuzzleId = puzzleId;
    currentPuzzle = PUZZLES.find(p => p.id === puzzleId);
    gameType = 'puzzle';
    titleSubMode = 'mainMenu';

    document.getElementById('puzzle-list-container').style.display = 'none';

    setPauseMenuCount();
    resetGame();
}

// 💡【修正】ぷよが固定された直後に呼ぶ判定関数
function checkPuzzleSolutionMatchAtFixTime() {
    if (!currentPuzzle || !currentPuzzle.solutionBoard) return false;
    
    // ぷよが固定された直後なので、まだ消去処理は始まっていない
    // その時点のボード配置を比較
    for (let y = 0; y < Config.stageRows; y++) {
        for (let x = 0; x < Config.stageCols; x++) {
            const currentCell = Stage.board[y][x];
            const solutionCell = currentPuzzle.solutionBoard[y][x];
            
            const currentPuyo = currentCell ? currentCell.puyo : 0;
            const solutionPuyo = solutionCell || 0;
            
            if (currentPuyo !== solutionPuyo) {
                return false;
            }
        }
    }
    
    return true;
}

// 💡【追加】ネクストキューが全て使い切られたかをチェック
function isPuzzleNextQueueExhausted() {
    return puzzleNextQueueIndex >= currentPuzzle.nextQueue.length;
}

function updatePuzzleListSelectionDOM() {
    const puzzleList = document.getElementById('puzzle-list');
    if (!puzzleList) return;
    const items = puzzleList.children;
    for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (i === puzzleListSelectedIndex) {
            it.style.outline = '2px solid #ffeb3b';
            it.style.backgroundColor = 'rgba(255,255,255,0.18)';
        } else {
            it.style.outline = 'none';
            it.style.backgroundColor = 'rgba(255,255,255,0.1)';
        }
    }
}
