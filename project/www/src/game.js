// 起動されたときに呼ばれる関数を登録する
window.addEventListener("load", () => {
    // まずステージを整える
    initialize();
    // ゲームを開始する
    loop();
});

let mode; // ゲームの現在の状況
let frame; // ゲームの現在フレーム (1/60秒ごとに1追加される)
let combinationCount = 0; // 何連鎖かどうか

// 🎵 ボイスの遅延を100%防ぐための事前読み込み（プリロード）用配列
const chainVoices = [];
const endVoices = [];
let zenkeshiVoice;   // 🎵 全消しボイス用
let batankyuVoice;   // 🎵 ばたんきゅーボイス用
let isBatankyuVoicePlayed = false; // 🎵 ばたんきゅーボイスの重複再生防止フラグ

// キー入力を監視するための変数
let isEnterPressed = false;
let isUpPressed = false;
let isDownPressed = false;

// メニュー選択位置を管理する変数 (0: とこぷよ, 1: スコアアタック, 2: ログイン)
let selectedMenuIndex = 0;
const MENU_COUNT = 3;

// 🛠️ 難易度選択用の状態管理変数を追加
let titleSubMode = 'mainMenu'; // 'mainMenu'（メイン画面） または 'difficultySelect'（難易度選択画面）
let selectedDiffIndex = 0;
const DIFF_COUNT = 3;

// キーボードの入力を取得するイベントリスナー
document.addEventListener('keydown', (e) => {
    if (e.keyCode === 13) isEnterPressed = true; // ENTER
    if (e.keyCode === 38) isUpPressed = true;    // ↑ 矢印
    if (e.keyCode === 40) isDownPressed = true;  // ↓ 矢印
});
document.addEventListener('keyup', (e) => {
    if (e.keyCode === 13) isEnterPressed = false;
    if (e.keyCode === 38) isUpPressed = false;
    if (e.keyCode === 40) isDownPressed = false;
});

function initialize() {
    // 画像を準備する
    PuyoImage.initialize();
    // ステージを準備する
    Stage.initialize();
    // ユーザー操作の準備をする
    Player.initialize();
    // スコア表示の準備をする
    Score.initialize();
    
    // 🎵 ゲーム起動時に全音声をあらかじめメモリにロードしておく（遅延対策）
    for (let i = 1; i <= 19; i++) {
        if (i <= 18) {
            chainVoices[i] = new Audio(`audio/chain${i}.wav`);
            chainVoices[i].preload = 'auto';
        }
        endVoices[i] = new Audio(`audio/chain${i}_end.wav`);
        endVoices[i].preload = 'auto';
    }
    // 🎵 追加ボイスのロード
    zenkeshiVoice = new Audio(`audio/zenkeshi.wav`);
    zenkeshiVoice.preload = 'auto';
    batankyuVoice = new Audio(`audio/batankyu.wav`);
    batankyuVoice.preload = 'auto';
    
    // 最初はタイトル画面からスタート
    mode = 'title';
    titleSubMode = 'mainMenu'; // 🛠️ 初期状態はメインメニュー
    frame = 0;

    // タイトル画面の初期UI表示
    showTitleMenu();
}

// 📋 タイトル画面用のメニュー表示を更新する関数
function showTitleMenu() {
    document.getElementById('message-overlay').style.background = "rgba(0,0,0,0.7)";
    document.getElementById('main-message').innerText = "PUYO PUYO";
    
    // 🛠️ サブモードに応じて表示するHTMLコンテナを切り替える
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

// 📋 選択しているメニューの見た目（色の濃さや矢印）を切り替える関数
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

// 📋 🛠️ 新規追加：選択している難易度メニューの見た目を更新する関数
function updateDifficultyDOM() {
    const diffTexts = ["Easy (3 colors)", "Normal (4 colors)", "Hard (5 colors)"];
    for (let i = 0; i < DIFF_COUNT; i++) {
        const item = document.getElementById(`diff-item-${i}`);
        if (item) {
            if (i === selectedDiffIndex) {
                item.innerText = `▶ ${diffTexts[i]}`;
                item.style.color = "#ffeb3b"; // 選択中は見やすいように黄色にハイライト
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
    // ステージ上のぷよおよびばたんきゅーの画像要素をすべて削除
    const stageElement = Stage.stageElement;
    if (stageElement) {
        const puyoImages = stageElement.querySelectorAll('img[src*="puyo"], img[src*="batankyu"]');
        puyoImages.forEach(img => img.remove());
    }
    
    // スコア表示のHTML要素をすべて削除
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
        while (scoreElement.firstChild) {
            scoreElement.removeChild(scoreElement.firstChild);
        }
    }
    
    // ステージの状態を管理する配列のデータを初期化
    for (let y = 0; y < Config.stageRows; y++) {
        for (let x = 0; x < Config.stageCols; x++) {
            Stage.board[y][x] = 0;
        }
    }
    
    // 🛠️ 選択された難易度インデックスに応じて、出現するぷよの色数を動的に設定
    if (selectedDiffIndex === 0) Config.puyoColors = 3; // Easy
    if (selectedDiffIndex === 1) Config.puyoColors = 4; // Normal
    if (selectedDiffIndex === 2) Config.puyoColors = 5; // Hard
    
    // 各クラスの状態を初期化し直す
    Player.nextPuyoQueue = [];
    Stage.initialize();
    Player.initialize();
    Score.initialize();
    
    // 画面の文字、メニュー、背景を消去
    document.getElementById('message-overlay').style.background = "rgba(0,0,0,0)";
    document.getElementById('main-message').innerText = "";
    document.getElementById('sub-message').innerText = "";
    document.getElementById('menu-container').style.display = "none"; 
    document.getElementById('difficulty-container').style.display = "none"; // 🛠️ 難易度枠も隠す
    
    frame = 0;
    isBatankyuVoicePlayed = false; 

    // 🎵 【最初の1回目遅延対策】ユーザーがENTERを押した瞬間に全ボイスのブラウザデコードを強制完了
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
    
    // ゲーム開始状態へ
    mode = 'start';
}

// 🔮 実際の盤面を汚さずに「次の連鎖が続くか」を100%正確に先読みする関数
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

function loop() {
    switch(mode) {
        case 'title':
            // ─── ① メインメニュー選択中の処理 ───
            if (titleSubMode === 'mainMenu') {
                if (isUpPressed) {
                    isUpPressed = false; // 押しっぱなし防止
                    selectedMenuIndex = (selectedMenuIndex - 1 + MENU_COUNT) % MENU_COUNT;
                    updateMenuDOM();
                }
                if (isDownPressed) {
                    isDownPressed = false; // 押しっぱなし防止
                    selectedMenuIndex = (selectedMenuIndex + 1) % MENU_COUNT;
                    updateMenuDOM();
                }

                // ENTERが押された時の決定処理
                if (isEnterPressed) {
                    isEnterPressed = false; // 💡 押しっぱなしによる次画面の即暴発を防ぐためにフラグクリア
                    if (selectedMenuIndex === 0) {
                        // 「とこぷよ」選択時は難易度選択のサブモードへ移行
                        titleSubMode = 'difficultySelect';
                        selectedDiffIndex = 1; // デフォルトカーソルをNormal(4色)に設定
                        showTitleMenu();
                    } else if (selectedMenuIndex === 1) {
                        console.log("スコアアタック が選択されました（機能は後日実装）");
                    } else if (selectedMenuIndex === 2) {
                        console.log("ログイン が選択されました（機能は後日実装）");
                    }
                }
            }
            // ─── ② 🛠️ 難易度選択中の処理 ───
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
                    isEnterPressed = false; // フラグクリア
                    // 難易度が決定したのでメインメニューの状態に戻し、ゲームを開始
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
                        chainVoices[combinationCount].play().catch(e => console.log("連鎖中ボイス再生エラー:", e));
                    }
                } else {
                    if (combinationCount <= 19 && endVoices[combinationCount]) {
                        endVoices[combinationCount].currentTime = 0;
                        endVoices[combinationCount].play().catch(e => console.log("決め台詞ボイス再生エラー:", e));
                    }
                }
            } else {
                if(Stage.puyoCount == 0 && combinationCount > 0) {
                    Stage.showZenkeshi();
                    Score.addScore(2100);
                    if (zenkeshiVoice) {
                        zenkeshiVoice.currentTime = 0;
                        zenkeshiVoice.play().catch(e => console.log("全消しボイス再生エラー:", e));
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
            PuyoImage.batankyu(frame);
            Player.batankyu();
            
            if (!isBatankyuVoicePlayed && batankyuVoice) {
                isBatankyuVoicePlayed = true;
                batankyuVoice.currentTime = 0;
                batankyuVoice.play().catch(e => console.log("ばたんきゅーボイス再生エラー:", e));
            }

            if (frame - PuyoImage.gameOverFrame > 120) {
                document.getElementById('message-overlay').style.background = "rgba(0,0,0,0.6)";
                document.getElementById('main-message').innerText = "GAME OVER";
                document.getElementById('sub-message').innerText = "PUSH ENTER TO RETRY";
                mode = 'retryWait';
            }
            break;

        case 'retryWait':
            if (isEnterPressed) {
                // 💡 押しっぱなし貫通バグ防止：タイトルに戻る瞬間にENTERフラグを即座に消去
                isEnterPressed = false;
                titleSubMode = 'mainMenu'; // リトライ時は必ず最初のメインメニューからやり直せるように初期化
                showTitleMenu();
                mode = 'title';
            }
            break;
    }
    frame++;
    requestAnimationFrame(loop);
}