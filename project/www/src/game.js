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

// ENTERキーが押されたか監視するための変数
let isEnterPressed = false;

// キーボードのENTER入力を取得するイベントリスナー
document.addEventListener('keydown', (e) => {
    if (e.keyCode === 13) { // 13はENTERキーのキーコード
        isEnterPressed = true;
    }
});
document.addEventListener('keyup', (e) => {
    if (e.keyCode === 13) {
        isEnterPressed = false;
    }
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
    frame = 0;
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
    
    // 各クラスの状態を初期化し直す
    Player.nextPuyoQueue = [];
    Stage.initialize();
    Player.initialize();
    Score.initialize();
    
    // 画面の文字と背景を消去
    document.getElementById('message-overlay').style.background = "rgba(0,0,0,0)";
    document.getElementById('main-message').innerText = "";
    document.getElementById('sub-message').innerText = "";
    
    frame = 0;
    isBatankyuVoicePlayed = false; // 🎵 フラグをリセット

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
            if (isEnterPressed) {
                console.log("ENTERキーの入力を感知しました！");
                resetGame();
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
                    // 🎵 全消し演出の発生と同時に「全消し！」ボイスを再生
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
            
            // 🎵 ばたんきゅー状態に入った瞬間に、1回だけボイスを再生
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
                resetGame();
            }
            break;
    }
    frame++;
    requestAnimationFrame(loop);
}