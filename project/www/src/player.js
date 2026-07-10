class Player {
    // static centerPuyo;
    // static movablePuyo;
    // static puyoStatus;
    // static centerPuyoElement;
    // static movablePuyoElement;

    // static groundFrame;
    // static keyStatus;

    // static actionStartFrame;
    // static moveSource;
    // static moveDestination;
    // static rotateBeforeLeft;
    // static rotateAfterLeft;
    // static rotateFromRotation;

static initialize () {
        // キーボードの入力を確認する
        this.keyStatus = {
            right: false,
            left: false,
            up: false,
            down: false
        };
        
        // NEXTぷよを管理するキュー（配列）を初期化
        this.nextPuyoQueue = [];

        // ブラウザのキーボードの入力を取得するイベントリスナを登録する
        document.addEventListener('keydown', (e) => {
            // キーボードが押された場合
            switch(e.keyCode) {
                case 37: // 左向きキー
                    this.keyStatus.left = true;
                    break;
                case 38: // 上向きキー
                    this.keyStatus.up = true;
                    break;
                case 39: // 右向きキー
                    this.keyStatus.right = true;
                    break;
                case 40: // 下向きキー
                    this.keyStatus.down = true;
                    break;
            }
        });
        document.addEventListener('keyup', (e) => {
            // キーボードが離された場合
            switch(e.keyCode) {
                case 37: // 左向きキー
                    this.keyStatus.left = false;
                    break;
                case 38: // 上向きキー
                    this.keyStatus.up = false;
                    break;
                case 39: // 右向きキー
                    this.keyStatus.right = false;
                    break;
                case 40: // 下向きキー
                    this.keyStatus.down = false;
                    break;
            }
        });
        // タッチ操作追加
        this.touchPoint = {
          xs: 0,
          ys: 0,
          xe: 0,
          ye: 0
        }
        document.addEventListener('touchstart', (e) => {
            this.touchPoint.xs = e.touches[0].clientX
            this.touchPoint.ys = e.touches[0].clientY
        })
        document.addEventListener('touchmove', (e) => {
            // 指が少し動いた時は無視
            if (Math.abs(e.touches[0].clientX - this.touchPoint.xs) < 20 &&
                Math.abs(e.touches[0].clientY - this.touchPoint.ys) < 20
            ) {
                return
            }

            // 指の動きをからジェスチャーによるkeyStatusプロパティを更新
            this.touchPoint.xe = e.touches[0].clientX
            this.touchPoint.ye = e.touches[0].clientY
            const {xs, ys, xe, ye} = this.touchPoint
            gesture(xs, ys, xe, ye)


            this.touchPoint.xs = this.touchPoint.xe
            this.touchPoint.ys = this.touchPoint.ye
        })
        document.addEventListener('touchend', (e) => {
            this.keyStatus.up = false
            this.keyStatus.down = false
            this.keyStatus.left = false
            this.keyStatus.right = false
        })

        // ジェスチャーを判定して、keyStatusプロパティを更新する関数
        const gesture = (xs, ys, xe, ye) => {
            const horizonDirection = xe - xs;
            const verticalDirection = ye - ys;

            if (Math.abs(horizonDirection) < Math.abs(verticalDirection)) {
                // 縦方向
                if (verticalDirection < 0) {
                    // up
                    this.keyStatus.up = true
                    this.keyStatus.down = false
                    this.keyStatus.left = false
                    this.keyStatus.right = false
                } else if (0 <= verticalDirection) {
                    // down
                    this.keyStatus.up = false
                    this.keyStatus.down = true
                    this.keyStatus.left = false
                    this.keyStatus.right = false
                }
            } else {
                // 横方向
                if (horizonDirection < 0) {
                    // left
                    this.keyStatus.up = false
                    this.keyStatus.down = false
                    this.keyStatus.left = true
                    this.keyStatus.right = false
                } else if (0 <= horizonDirection) {
                    // right
                    this.keyStatus.up = false
                    this.keyStatus.down = false
                    this.keyStatus.left = false
                    this.keyStatus.right = true
                }
            }
        }
    }

    // ぷよ設置確認＆生成
    static createNewPuyo () {
        // ぷよぷよが置けるかどうか、1番上の段の左から3つ目を確認する
        if(Stage.board[1][2]) {
            // 空白でない場合は新しいぷよを置けない
            return false;
        }

        const puyoColors = Math.max(1, Math.min(5, Config.puyoColors));

        // 💡【修正】なぞぷよモード時はネクストキューを使用、それ以外はランダム生成
        if (gameType === 'puzzle') {
            // なぞぷよモード：currentPuzzle.nextQueue から取り出す
            if (puzzleNextQueueIndex >= currentPuzzle.nextQueue.length) {
                // ネクストキューが尽きた場合は、ネクストキューの最後の値をループさせる
                puzzleNextQueueIndex = currentPuzzle.nextQueue.length - 1;
            }
            
            // 2個分ぷよを取り出す
            this.centerPuyo = currentPuzzle.nextQueue[puzzleNextQueueIndex];
            this.movablePuyo = currentPuzzle.nextQueue[puzzleNextQueueIndex + 1];
            puzzleNextQueueIndex += 2;
        } else {
            // 通常モード：ランダムでネクストを生成
            // キュー（次以降のぷよのストック）が3手先分（計6個）に満たない場合、補充する
            while (this.nextPuyoQueue.length < 6) {
                this.nextPuyoQueue.push(Math.floor(Math.random() * puyoColors) + 1);
            }

            // キューの先頭から「今落ちるぷよ」の2個を取り出す（取り出した分、後ろが自動で詰まる）
            this.centerPuyo = this.nextPuyoQueue.shift();
            this.movablePuyo = this.nextPuyoQueue.shift();
        }

        // 【ここから画面描画の準備】
        // 新しい操作用ぷよ画像を作成する
        this.centerPuyoElement = PuyoImage.getPuyo(this.centerPuyo);
        this.movablePuyoElement = PuyoImage.getPuyo(this.movablePuyo);
        Stage.stageElement.appendChild(this.centerPuyoElement);
        Stage.stageElement.appendChild(this.movablePuyoElement);

        // ぷよの初期配置を定める
        this.puyoStatus = {
            x: 2, // 中心ぷよの位置: 左から2列目
            y: 0, // 画面上部ギリギリから出てくる
            left: 2 * Config.puyoImgWidth,
            top: 0,
            dx: 0, // 動くぷよの相対位置: 動くぷよは上方向にある
            dy: -1, 
            rotation: 90 // 動くぷよの角度は90度（上向き）
        };
        // 接地時間はゼロ
        this.groundFrame = 0;
        // ぷよを描画
        this.setPuyoPosition();

        // NEXT1・NEXT2の画像をHTML上に描画（UI反映）
        this.showNextPuyo(); 

        return true;
    }

    static setPuyoPosition () {
        this.centerPuyoElement.style.left = this.puyoStatus.left + 'px';
        this.centerPuyoElement.style.top = (this.puyoStatus.top - Config.puyoImgHeight) + 'px';
        const x = this.puyoStatus.left + Math.cos(this.puyoStatus.rotation * Math.PI / 180) * Config.puyoImgWidth;
        const y = (this.puyoStatus.top - Config.puyoImgHeight) - Math.sin(this.puyoStatus.rotation * Math.PI / 180) * Config.puyoImgHeight;
        this.movablePuyoElement.style.left = x + 'px';
        this.movablePuyoElement.style.top = y + 'px';
    }

    static falling (isDownPressed) {
        // 現状の場所の下にブロックがあるかどうか確認する
        let isBlocked = false;
        let x = this.puyoStatus.x;
        let y = this.puyoStatus.y;
        let dx = this.puyoStatus.dx;
        let dy = this.puyoStatus.dy;
        if(y + 1 >= Config.stageRows || Stage.board[y + 1][x] || (y + dy + 1 >= 0 && (y + dy + 1 >= Config.stageRows || Stage.board[y + dy + 1][x + dx]))) {
            isBlocked = true;
        }
        if(!isBlocked) {
            // 下にブロックがないなら自由落下してよい。プレイヤー操作中の自由落下処理をする
            this.puyoStatus.top += Config.playerFallingSpeed;
            if(isDownPressed) {
                // 下キーが押されているならもっと加速する
                this.puyoStatus.top += Config.playerDownSpeed;
            }
            
            // 💡 【重要修正】現在の落下蓄積(top)が、現在のマス(y)の底辺を超えたかどうかを正しく判定します
            if(Math.floor(this.puyoStatus.top / Config.puyoImgHeight) > y) {
                // ブロックの境を超えたので、再チェックする
                if(isDownPressed) {
                    Score.addScore(1);
                }
                y += 1;
                this.puyoStatus.y = y;
                
                // 接地・ブロック衝突の再判定
                if(y + 1 >= Config.stageRows || Stage.board[y + 1][x] || (y + dy + 1 >= 0 && (y + dy + 1 >= Config.stageRows || Stage.board[y + dy + 1][x + dx]))) {
                    isBlocked = true;
                }
                if(!isBlocked) {
                    this.groundFrame = 0;
                    return;
                } else {
                    // 境を超えたらブロックにぶつかった。位置を調節して、接地を開始する
                    // 💡 余計な引き算はせず、現在の y の位置にぴったり合わせます
                    this.puyoStatus.top = y * Config.puyoImgHeight;
                    this.groundFrame = 1;
                    return;
                }
            } else {
                // 自由落下で特に問題がなかった。次回も自由落下を続ける
                this.groundFrame = 0;
                return;
            }
        }
        if(this.groundFrame == 0) {
            // 初接地である。接地を開始する
            this.groundFrame = 1;
            return;
        } else {
            this.groundFrame++;
            if(this.groundFrame > Config.playerGroundFrame) {
                return true;
            }
        }

    }
    static playing(frame) {
        // まず自由落下を確認する
        // 下キーが押されていた場合、それ込みで自由落下させる
        if(this.falling(this.keyStatus.down)) {
            // 落下が終わっていたら、ぷよを固定する
            this.setPuyoPosition();
            return 'fix';
        }
        this.setPuyoPosition();
        if(this.keyStatus.right || this.keyStatus.left) {
            // 左右のの確認をする
            const cx = (this.keyStatus.right) ? 1 : -1;
            const x = this.puyoStatus.x;
            const y = this.puyoStatus.y;
            const mx = x + this.puyoStatus.dx;
            const my = y + this.puyoStatus.dy;
            // その方向にブロックがないことを確認する
            // まずは自分の左右を確認
            let canMove = true;
            if(y < 0 || x + cx < 0 || x + cx >= Config.stageCols || Stage.board[y][x + cx]) {
                if(y >= 0) {
                    canMove = false;
                }
            }
            if(my < 0 || mx + cx < 0 || mx + cx >= Config.stageCols || Stage.board[my][mx + cx]) {
                if(my >= 0) {
                    canMove = false;
                }
            }
            // 接地していない場合は、さらに1個下のブロックの左右も確認する
            if(this.groundFrame === 0) {
                if(y + 1 < 0 || x + cx < 0 || x + cx >= Config.stageCols || Stage.board[y + 1][x + cx]) {
                    if(y + 1 >= 0) {
                        canMove = false;
                    }
                }
                if(my + 1 < 0 || mx + cx < 0 || mx + cx >= Config.stageCols || Stage.board[my + 1][mx + cx]) {
                    if(my + 1 >= 0) {
                        canMove = false;
                    }
                }
            }

            if(canMove) {         
                // 動かすことが出来るので、移動先情報をセットして移動状態にする       
                this.actionStartFrame = frame;
                this.moveSource = x * Config.puyoImgWidth;
                this.moveDestination = (x + cx) * Config.puyoImgWidth;
                this.puyoStatus.x += cx;
                return 'moving';
            }
        } else if(this.keyStatus.up) {
            // 回転を確認する
            // 回せるかどうかは後で確認。まわすぞ
            const x = this.puyoStatus.x;
            const y = this.puyoStatus.y;
            const mx = x + this.puyoStatus.dx;
            const my = y + this.puyoStatus.dy;
            const rotation = this.puyoStatus.rotation;
            let canRotate = true;

            let cx = 0;
            let cy = 0;
            if(rotation === 0) {
                // 右から上には100% 確実に回せる。何もしない
            } else if(rotation === 90) {
                // 上から左に回すときに、左にブロックがあれば右に移動する必要があるのでまず確認する
                if(y + 1 < 0 || x - 1 < 0 || x - 1 >= Config.stageCols || Stage.board[y + 1][x - 1]) {
                    if(y + 1 >= 0) {
                        // ブロックがある。右に1個ずれる
                        cx = 1;
                    }
                }
                // 右にずれる必要がある時、右にもブロックがあれば回転出来ないので確認する
                if(cx === 1) {
                    if(y + 1 < 0 || x + 1 < 0 || y + 1 >= Config.stageRows || x + 1 >= Config.stageCols || Stage.board[y + 1][x + 1]) {
                        if(y + 1 >= 0) {
                            // ブロックがある。回転出来なかった
                            canRotate = false;
                        }
                    }
                }
            } else if(rotation === 180) {
                // 左から下に回す時には、自分の下か左下にブロックがあれば1個上に引き上げる。まず下を確認する
                if(y + 2 < 0 || y + 2 >= Config.stageRows || Stage.board[y + 2][x]) {
                    if(y + 2 >= 0) {
                        // ブロックがある。上に引き上げる
                        cy = -1;
                    }
                }
                // 左下も確認する
                if(y + 2 < 0 || y + 2 >= Config.stageRows || x - 1 < 0 || Stage.board[y + 2][x - 1]) {
                    if(y + 2 >= 0) {
                        // ブロックがある。上に引き上げる
                        cy = -1;
                    }
                }
            } else if(rotation === 270) {
                // 下から右に回すときは、右にブロックがあれば左に移動する必要があるのでまず確認する
                if(y + 1 < 0 || x + 1 < 0 || x + 1 >= Config.stageCols || Stage.board[y + 1][x + 1]) {
                    if(y + 1 >= 0) {
                        // ブロックがある。左に1個ずれる
                        cx = -1;
                    }
                }
                // 左にずれる必要がある時、左にもブロックがあれば回転出来ないので確認する
                if(cx === -1) {
                    if(y + 1 < 0 || x - 1 < 0 || x - 1 >= Config.stageCols || Stage.board[y + 1][x - 1]) {
                        if(y + 1 >= 0) {
                            // ブロックがある。回転出来なかった
                            canRotate = false;
                        }
                    }
                }
            }
            
            if(canRotate) {
                // 上に移動する必要があるときは、一気にあげてしまう
                if(cy === -1) {
                    if(this.groundFrame > 0) {
                        // 接地しているなら1段引き上げる
                        this.puyoStatus.y -= 1;
                        this.groundFrame = 0;
                    }
                    // 💡 余計な引き算を消し、移動後のy座標にそのまま高さを掛けます
                    this.puyoStatus.top = this.puyoStatus.y * Config.puyoImgHeight;
                }
                // 回すことが出来るので、回転後の情報をセットして回転状態にする
                this.actionStartFrame = frame;
                this.rotateBeforeLeft = x * Config.puyoImgHeight;
                this.rotateAfterLeft = (x + cx) * Config.puyoImgHeight;
                this.rotateFromRotation = this.puyoStatus.rotation;
                // 次の状態を先に設定しておく
                this.puyoStatus.x += cx;
                const distRotation = (this.puyoStatus.rotation + 90) % 360;
                const dCombi = [[1, 0], [0, -1], [-1, 0], [0, 1]][distRotation / 90];
                this.puyoStatus.dx = dCombi[0];
                this.puyoStatus.dy = dCombi[1];
                return 'rotating';
            }
        }
        return 'playing';
    }
    static moving(frame) {
        // 移動中も自然落下はさせる
        this.falling();
        const ratio = Math.min(1, (frame - this.actionStartFrame) / Config.playerMoveFrame);
        this.puyoStatus.left = ratio * (this.moveDestination - this.moveSource) + this.moveSource;
        this.setPuyoPosition();
        if(ratio === 1) {
            return false;
        }
        return true;
    }
    static rotating(frame) {
        // 回転中も自然落下はさせる
        this.falling();
        const ratio = Math.min(1, (frame - this.actionStartFrame) / Config.playerRotateFrame);
        this.puyoStatus.left = (this.rotateAfterLeft - this.rotateBeforeLeft) * ratio + this.rotateBeforeLeft;
        this.puyoStatus.rotation = this.rotateFromRotation + ratio * 90;
        this.setPuyoPosition();
        if(ratio === 1) {
            this.puyoStatus.rotation = (this.rotateFromRotation + 90) % 360;
            return false;
        }
        return true;
    }

    static fix() {
        // 現在のぷよをステージ上に配置する
        const x = this.puyoStatus.x;
        const y = this.puyoStatus.y;
        const dx = this.puyoStatus.dx;
        const dy = this.puyoStatus.dy;
        if(y >= 0) {
            // 画面外のぷよは消してしまう
            Stage.setPuyo(x, y, this.centerPuyo);
            Stage.puyoCount++;
        }
        if(y + dy >= 0) {
            // 画面外のぷよは消してしまう
            Stage.setPuyo(x + dx, y + dy, this.movablePuyo);
            Stage.puyoCount++;
        }
        // 操作用に作成したぷよ画像を消す
        Stage.stageElement.removeChild(this.centerPuyoElement);
        Stage.stageElement.removeChild(this.movablePuyoElement);
        this.centerPuyoElement = null;
        this.movablePuyoElement = null;
    }

    static batankyu() {
    }

    static showNextPuyo () {
        const next1Box = document.getElementById('next1-box');
        const next2Box = document.getElementById('next2-box');
        if (!next1Box || !next2Box) return;

        // 一度古いNEXTの画像をクリアする
        next1Box.innerHTML = '';
        next2Box.innerHTML = '';

        // 💡【修正】なぞぷよモード時は currentPuzzle.nextQueue から取得、それ以外は this.nextPuyoQueue から取得
        let n1_center, n1_movable, n2_center, n2_movable;

        if (gameType === 'puzzle') {
            // なぞぷよモード
            n1_center = currentPuzzle.nextQueue[puzzleNextQueueIndex];
            n1_movable = currentPuzzle.nextQueue[puzzleNextQueueIndex + 1];
            n2_center = currentPuzzle.nextQueue[puzzleNextQueueIndex + 2];
            n2_movable = currentPuzzle.nextQueue[puzzleNextQueueIndex + 3];
        } else {
            // 通常モード
            n1_center = this.nextPuyoQueue[0];
            n1_movable = this.nextPuyoQueue[1];
            n2_center = this.nextPuyoQueue[2];
            n2_movable = this.nextPuyoQueue[3];
        }

        // 各画像にサイズを強制適用する補助関数
        const styleNextPuyo = (img, topPx) => {
            img.style.position = 'absolute';
            img.style.left = '0px';
            img.style.top = topPx + 'px';
            img.style.width = '60px';   // ◀ 画像の幅を32pxに縮小固定
            img.style.height = '60px';  // ◀ 画像の高さを32pxに縮小固定
        };

        // --- NEXT1の画像生成と配置 ---
        const img1_c = PuyoImage.getPuyo(n1_center);
        const img1_m = PuyoImage.getPuyo(n1_movable);
        styleNextPuyo(img1_c, 60); // 軸ぷよ（下）
        styleNextPuyo(img1_m, 0);  // 動くぷよ（上）
        next1Box.appendChild(img1_c);
        next1Box.appendChild(img1_m);

        // --- NEXT2の画像生成と配置 ---
        const img2_c = PuyoImage.getPuyo(n2_center);
        const img2_m = PuyoImage.getPuyo(n2_movable);
        styleNextPuyo(img2_c, 60); // 軸ぷよ（下）
        styleNextPuyo(img2_m, 0);  // 動くぷよ（上）
        next2Box.appendChild(img2_c);
        next2Box.appendChild(img2_m);
    }
}
