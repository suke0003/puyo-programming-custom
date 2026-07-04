class Stage {
    // static stageElement;
    // static scoreElement;
    // static zenkeshiImage;
    // static board;
    // static puyoCount;
    // static fallingPuyoList = [];
    // static eraseStartFrame;
    // static erasingPuyoInfoList = [];
    
    static isChainMode = false;     // 💡 【追加】現在、連鎖の最中かどうかを記憶するフラグ（初期値はfalse）
    static chainCount = 0;          // 💡 【追加】現在の連鎖数を記憶する変数
    static isEffectShown = false;   // 💡 【追加】この連鎖の文字をすでに表示したかを管理するフラグ

    static initialize() {
        // HTML からステージの元となる要素を取得し、大きさを設定する
        const stageElement = document.getElementById("stage");
        stageElement.style.width = Config.puyoImgWidth * Config.stageCols + 'px';
        stageElement.style.height = Config.puyoImgHeight * Config.stageRows + 'px';
        stageElement.style.backgroundColor = Config.stageBackgroundColor;
        this.stageElement = stageElement;
        
        const zenkeshiImage = document.getElementById("zenkeshi");
        zenkeshiImage.width = Config.puyoImgWidth * 6;
        zenkeshiImage.style.position = 'absolute';
        zenkeshiImage.style.display = 'none';        
        this.zenkeshiImage = zenkeshiImage;
        stageElement.appendChild(zenkeshiImage);

        const scoreElement = document.getElementById("score");
        scoreElement.style.backgroundColor = Config.scoreBackgroundColor;
        scoreElement.style.top = Config.puyoImgHeight * Config.stageRows + 'px';
        scoreElement.style.width = Config.puyoImgWidth * Config.stageCols + 'px';
        scoreElement.style.height = Config.fontHeight + "px";
        this.scoreElement = scoreElement;

        // メモリを準備する
        this.board = [
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
        ];
        let puyoCount = 0;
        for(let y = 0; y < Config.stageRows; y++) {
            const line = this.board[y] || (this.board[y] = []);
            for(let x = 0; x < Config.stageCols; x++) {
                const puyo = line[x];
                if(puyo >= 1 && puyo <= 5) {
                    // line[x] = {puyo: puyo, element: this.setPuyo(x, y, puyo)};
                    this.setPuyo(x, y, puyo);
                    puyoCount++;
                } else {
                    line[x] = null;
                }
            }
        }
        this.puyoCount = puyoCount;
    }

    // 画面とメモリ両方に puyo をセットする
    static setPuyo(x, y, puyo) {
        // 画像を作成し配置する
        const puyoImage = PuyoImage.getPuyo(puyo);
        puyoImage.style.left = x * Config.puyoImgWidth + "px";
        puyoImage.style.top = y * Config.puyoImgHeight + "px";
        this.stageElement.appendChild(puyoImage);
        // メモリにセットする
        this.board[y][x] = {
            puyo: puyo,
            element: puyoImage
        }
    }

    // 自由落下をチェックする
    static checkFall() {
        this.fallingPuyoList.length = 0;
        let isFalling = false;
        // 下の行から上の行を見ていく
        for(let y = Config.stageRows - 2; y >= 0; y--) { 
            const line = this.board[y];
            for(let x = 0; x < line.length; x++) {
                if(!this.board[y][x]) {
                    // このマスにぷよがなければ次
                    continue;
                }
                if(!this.board[y + 1][x]) {
                    // このぷよは落ちるので、取り除く
                    let cell = this.board[y][x];
                    this.board[y][x] = null;
                    let dst = y;
                    while(dst + 1 < Config.stageRows && this.board[dst + 1][x] == null) {
                        dst++;
                    }
                    // 最終目的地に置く
                    this.board[dst][x] = cell;
                    // 落ちるリストに入れる
                    this.fallingPuyoList.push({
                        element: cell.element,
                        position: y * Config.puyoImgHeight,
                        destination: dst * Config.puyoImgHeight,
                        falling: true
                    });
                    // 落ちるものがあったことを記録しておく
                    isFalling = true;
                }
            }
        }
        
        // 💡 【修正】ここにあった chainCount = 0 などのリセット処理をすべて削除します！
        if (!isFalling) {
            this.isChainMode = false; 
        }
        
        return isFalling;
    }
    
    // 自由落下させる
    static fall() {
        let isFalling = false;
        
        // 💡 【追加】連鎖モードならゆっくり(8)、ちぎりなら超高速(16)に速度を自動切り替え
        const currentSpeed = this.isChainMode ? Config.chainFallingSpeed : Config.freeFallingSpeed;

        for(const fallingPuyo of this.fallingPuyoList) {
            if(!fallingPuyo.falling) {
                // すでに自由落下が終わっている
                continue;
            }
            let position = fallingPuyo.position;
            
            // 💡 現在の状態に合わせた速度（currentSpeed）を加算する
            position += currentSpeed;
            
            if(position >= fallingPuyo.destination) {
                // 自由落下終了
                position = fallingPuyo.destination;
                fallingPuyo.falling = false;
            } else {
                // まだ落下しているぷよがあることを記録する
                isFalling = true;
            }
            // 新しい位置を保存する
            fallingPuyo.position = position;
            // ぷよを動かす
            fallingPuyo.element.style.top = position + 'px';
        }
        return isFalling;
    }

    // 消せるかどうか判定する
    static checkErase(startFrame) {
        this.eraseStartFrame = startFrame;
        this.erasingPuyoInfoList.length = 0;

        // 💡 【追加】連鎖モードではない（プレイヤーが操作してちぎり等も終わった）状態で
        // 新しく checkErase が呼ばれた＝「完全に新しい手番の1連鎖目」なので、ここで連鎖数と文字フラグをリセットする
        if (!this.isChainMode) {
            this.chainCount = 0;
            this.isEffectShown = false;
        }

        // 何色のぷよを消したかを記録する
        const erasedPuyoColor = {};

        // 隣接ぷよを確認する関数内関数を作成
        const sequencePuyoInfoList = [];
        const existingPuyoInfoList = [];
        const checkSequentialPuyo = (x, y) => {
            // ぷよがあるか確認する
            const orig = this.board[y][x];
            if(!orig) {
                // ないなら何もしない
                return;
            }
            // あるなら一旦退避して、メモリ上から消す
            const puyo = this.board[y][x].puyo;
            sequencePuyoInfoList.push({
                x: x,
                y: y,
                cell: this.board[y][x]
            });
            this.board[y][x] = null;

            // 四方向の周囲ぷよを確認する
            const direction = [[0, 1], [1, 0], [0, -1], [-1, 0]];
            for(let i = 0; i < direction.length; i++) {
                const dx = x + direction[i][0];
                const dy = y + direction[i][1];
                if(dx < 0 || dy < 0 || dx >= Config.stageCols || dy >= Config.stageRows) {
                    // ステージの外にはみ出た
                    continue;
                }
                const cell = this.board[dy][dx];
                if(!cell || cell.puyo !== puyo) {
                    // ぷよの色が違う
                    continue;
                }
                // そのぷよのまわりのぷよも消せるか確認する
                checkSequentialPuyo(dx, dy);
            };
        };
        
        // 実際に削除できるかの確認を行う
        const puyoGroups = []; // 今回同時に消える塊ごとの個数を記録する配列
        for(let y = 0; y < Config.stageRows; y++) {
            for(let x = 0; x < Config.stageCols; x++) {
                sequencePuyoInfoList.length = 0;
                const puyoColor = this.board[y][x] && this.board[y][x].puyo;
                checkSequentialPuyo(x, y);
                if(sequencePuyoInfoList.length == 0 || sequencePuyoInfoList.length < Config.erasePuyoCount) {
                    // 連続して並んでいる数が足りなかったので消さない
                    if(sequencePuyoInfoList.length) {
                        // 退避していたぷよを消さないリストに追加する
                        existingPuyoInfoList.push(...sequencePuyoInfoList);
                    }
                } else {
                    // これらは消して良いので消すリストに追加する
                    this.erasingPuyoInfoList.push(...sequencePuyoInfoList);
                    erasedPuyoColor[puyoColor] = true;
                    puyoGroups.push(sequencePuyoInfoList.length); // 実際に消えた1つの塊の個数を記録（例: 4）
                }
            }
        }
        this.puyoCount -= this.erasingPuyoInfoList.length;

        // 消さないリストに入っていたぷよをメモリに復帰させる
        for(const info of existingPuyoInfoList) {
            this.board[info.y][info.x] = info.cell;
        }
    
        if(this.erasingPuyoInfoList.length) {
            
            this.isChainMode = true;

            // 💡 【修正】条件をこれだけにします（eraseStartFrameの比較を無くしました）
            // これにより、連鎖中（isChainMode=true）のまま2連鎖目、3連鎖目が始まった瞬間を確実に捉えられます
            if (!this.isEffectShown) {
                this.isEffectShown = true; // 重複表示を防止
                this.chainCount++;         // 連鎖数を進める（1➔2➔3...）
                
                // 消えるぷよ全体の中心座標（平均値）を計算
                let sumX = 0;
                let sumY = 0;
                for (const info of this.erasingPuyoInfoList) {
                    sumX += info.x;
                    sumY += info.y;
                }
                
                if (this.erasingPuyoInfoList.length > 0) {
                    const avgX = (sumX / this.erasingPuyoInfoList.length) * Config.puyoImgWidth + (Config.puyoImgWidth / 2);
                    const avgY = (sumY / this.erasingPuyoInfoList.length) * Config.puyoImgHeight + (Config.puyoImgHeight / 2);

                    // エフェクトを表示
                    this.showChainEffect(this.chainCount, avgX, avgY);
                }
            }

            // ゲームの進行に必要なデータは毎回必ずreturn
            return {
                piece: this.erasingPuyoInfoList.length,
                color: Object.keys(erasedPuyoColor).length,
                puyoGroups: puyoGroups 
            };
        }

        // 💡 【ここを追加】ぷよが1つも消えなかった＝連鎖が完全に終了した瞬間なので、連鎖モードを終了します
        this.isChainMode = false;
        
        return null;
    }
    
    // 消すアニメーションをする
    static erasing(frame) {
        const elapsedFrame = frame - this.eraseStartFrame;
        const ratio = elapsedFrame / Config.eraseAnimationDuration;
        if(ratio > 1) {

            // 💡 【追加】1つ前の連鎖のアニメーションが完全に終わったので、
            // 次の連鎖（2連鎖目など）の文字を表示できるようにフラグをクリアする！
            this.isEffectShown = false;

            // アニメーションを終了する
            for(const info of this.erasingPuyoInfoList) {
                var element = info.cell.element;
                this.stageElement.removeChild(element);
            }
            return false;
        } else if(ratio > 0.75) {
            for(const info of this.erasingPuyoInfoList) {
                var element = info.cell.element;
                element.style.display = 'block';
            }
            return true;
        } else if(ratio > 0.50) {
            for(const info of this.erasingPuyoInfoList) {
                var element = info.cell.element;
                element.style.display = 'none';
            }
            return true;
        } else if(ratio > 0.25) {
            for(const info of this.erasingPuyoInfoList) {
                var element = info.cell.element;
                element.style.display = 'block';
            }
            return true;
        } else {
            for(const info of this.erasingPuyoInfoList) {
                var element = info.cell.element;
                element.style.display = 'none';
            }
            return true;
        }
    }

    static showZenkeshi() {
        // 全消しを表示する
        this.zenkeshiImage.style.display = 'block';
        this.zenkeshiImage.style.opacity = '1';
        const startTime = Date.now();
        const startTop = Config.puyoImgHeight * Config.stageRows;
        const endTop = Config.puyoImgHeight * Config.stageRows / 3;
        const animation = () => {
            const ratio = Math.min((Date.now() - startTime) / Config.zenkeshiDuration, 1);
            this.zenkeshiImage.style.top = (endTop - startTop) * ratio + startTop + 'px';
            if(ratio !== 1) {
                requestAnimationFrame(animation);
            }
        };
        animation();
    }
    static hideZenkeshi() {
        // 全消しを消去する
        const startTime = Date.now();
        const animation = () => {
            const ratio = Math.min((Date.now() - startTime) / Config.zenkeshiDuration, 1);
            this.zenkeshiImage.style.opacity = String(1 - ratio);
            if(ratio !== 1) {
                requestAnimationFrame(animation);
            } else {
                this.zenkeshiImage.style.display = 'none';
            }
        };
        animation();
    }
    
    // 💡 【修正】画面外へのはみ出しガードの数値を最適化
    static showChainEffect(count, x, y) {
        // 表示する要素を作成
        const effectElement = document.createElement('div');
        effectElement.className = 'chain-text';
        effectElement.innerHTML = `<span>${count}</span>れんさ!`;
        
        // 💡 【ここを調整】
        // 文字の横幅（中心から左右に広がる分）を考慮して、ガードの最小値を広げます。
        // ステージの最大幅を正確に計算し、両端での見切れを100%防ぎます。
        const stageWidth = Config.puyoImgWidth * Config.stageCols;
        
        const minX = 65;               // ◀ 左端のガードを40から65pxに強化（「〇」が見切れるのを防ぐ）
        const maxX = stageWidth - 75;  // ◀ 右端のガードを「ステージ幅 - 75px」に強化（「さ!」が見切れるのを防ぐ）
        const minY = 40;               // 上端のガードも少しだけ下に調整
        
        // 計算した安全な位置に座標を固定する
        const posX = Math.max(minX, Math.min(maxX, x));
        const posY = Math.max(minY, y);
        
        // 計算した位置を設定
        effectElement.style.left = posX + 'px';
        effectElement.style.top = posY + 'px';
        
        // ステージの子要素として画面に追加
        this.stageElement.appendChild(effectElement);
        
        // アニメーション（0.8秒）が終わったら自動で削除
        setTimeout(() => {
            effectElement.remove();
        }, 800);
    }
}
Stage.fallingPuyoList = [];
Stage.erasingPuyoInfoList = [];
