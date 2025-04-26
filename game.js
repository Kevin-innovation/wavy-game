class WaveSurferGame extends HTMLElement {
  /**
   * 초기화
   */
  connectedCallback() {
    // 기존 Waves 요소 참조
    this.wavesElement = document.querySelector('a-waves');
    this.svg = this.wavesElement.querySelector('.js-svg');
    
    // 게임 속성
    this.score = 0;
    this.isGameActive = false;
    this.gameSpeed = 0.8;
    this.lastObstacleTime = 0;
    this.gameTime = 0;
    this.obstacleSpawnRate = 2500;
    this.obstacles = [];
    this.lastScoreThreshold = 0;
    this.scoreThreshold = 30;
    
    // 게임 모드 관련 속성 추가
    this.gameMode = 'easy'; // 'easy' 또는 'hard'
    this.deathCount = 0;    // 죽은 횟수 카운트
    this.coins = 0;         // 코인 수
    this.blackBallSize = 0.5; // 기본 검은 공 크기
    this.blackBallSizeMultiplier = {
      easy: 1,
      hard: 10
    };
    this.obstacleData = {
      easy: {
        sizeMultiplier: 1,
        speedMultiplier: 1
      },
      hard: {
        sizeMultiplier: 1.5,
        speedMultiplier: 4
      }
    };
    
    // 상점 아이템 관련 속성
    this.upgradeCount = 0;  // 업그레이드 횟수
    this.upgradeCost = 100; // 기본 업그레이드 비용
    
    // 최고 점수 로드
    this.loadHighScores();
    
    // UI 요소 생성
    this.createGameUI();
    
    // 이벤트 바인딩
    this.bindEvents();
    
    // 게임 모드 선택 화면 표시 (자동 시작 대신)
    this.showModeSelection();
  }
  
  /**
   * 최고 점수 로드
   */
  loadHighScores() {
    // 로컬 스토리지에서 최고 점수 로드
    const highScoresJSON = localStorage.getItem('waveGameHighScores');
    this.highScores = highScoresJSON ? JSON.parse(highScoresJSON) : [];
    
    // 점수가 없으면 기본값 설정
    if (!Array.isArray(this.highScores) || this.highScores.length === 0) {
      this.highScores = [];
    }
    
    // 코인 데이터 로드
    const coinsData = localStorage.getItem('waveGameCoins');
    this.coins = coinsData ? parseInt(coinsData) : 0;
    
    // 업그레이드 횟수 로드
    const upgradeCount = localStorage.getItem('waveGameUpgradeCount');
    this.upgradeCount = upgradeCount ? parseInt(upgradeCount) : 0;

    // 죽은 횟수 로드 - 게임 모드별로 분리
    const easyDeathCount = localStorage.getItem('waveGameEasyDeathCount');
    const hardDeathCount = localStorage.getItem('waveGameHardDeathCount');
    
    this.totalDeathCounts = {
      easy: easyDeathCount ? parseInt(easyDeathCount) : 0,
      hard: hardDeathCount ? parseInt(hardDeathCount) : 0
    };
    
    // 현재 모드에 맞는 죽은 횟수 설정
    this.deathCount = this.totalDeathCounts.easy;
    
    // 업그레이드 비용 계산
    if (this.upgradeCount === 0) {
      this.upgradeCost = 100;
    } else if (this.upgradeCount === 1) {
      this.upgradeCost = 200;
    } else {
      this.upgradeCost = 200 + (this.upgradeCount - 1) * 100;
    }
    
    // 공 크기 배수 업데이트 (업그레이드 횟수에 따라)
    if (this.upgradeCount > 0) {
      this.blackBallSizeMultiplier.hard = Math.max(2, 10 - this.upgradeCount);
    }
  }
  
  /**
   * 죽은 횟수 저장
   */
  saveDeathCount() {
    // 현재 모드에 따라 죽은 횟수 저장
    if (this.gameMode === 'easy') {
      localStorage.setItem('waveGameEasyDeathCount', this.totalDeathCounts.easy.toString());
    } else {
      localStorage.setItem('waveGameHardDeathCount', this.totalDeathCounts.hard.toString());
    }
  }
  
  /**
   * 최고 점수 저장
   */
  saveHighScore(score) {
    // 현재 점수 추가
    this.highScores.push({
      score: Math.floor(score),
      date: new Date().toLocaleDateString(),
      mode: this.gameMode,
      deaths: this.deathCount
    });
    
    // 점수 순서대로 정렬
    this.highScores.sort((a, b) => b.score - a.score);
    
    // 상위 5개만 유지
    this.highScores = this.highScores.slice(0, 5);
    
    // 로컬 스토리지에 저장
    localStorage.setItem('waveGameHighScores', JSON.stringify(this.highScores));
    
    // 하드모드에서 코인 획득
    if (this.gameMode === 'hard') {
      const earnedCoins = Math.floor(score / 10); // 10점당 1코인
      this.addCoins(earnedCoins);
    }
    
    // 현재 순위 반환 (0-based)
    return this.highScores.findIndex(item => item.score === Math.floor(score));
  }
  
  /**
   * 코인 추가 및 저장
   */
  addCoins(amount) {
    this.coins += amount;
    localStorage.setItem('waveGameCoins', this.coins.toString());
    
    // 코인 UI 업데이트
    if (this.coinDisplay) {
      this.coinDisplay.textContent = `코인: ${this.coins}`;
    }
  }
  
  /**
   * 검은 공 크기 감소 아이템 구매
   */
  purchaseBallSizeReduction() {
    // 현재 업그레이드 비용
    const cost = this.upgradeCost;
    
    if (this.coins >= cost && this.blackBallSizeMultiplier.hard > 2) { // 최소 크기는 기본의 2배
      this.coins -= cost;
      this.blackBallSizeMultiplier.hard -= 1; // 크기 10% 감소
      this.upgradeCount += 1; // 업그레이드 횟수 증가
      
      // 다음 업그레이드 비용 계산
      if (this.upgradeCount === 1) {
        this.upgradeCost = 200;
      } else {
        this.upgradeCost = 200 + (this.upgradeCount - 1) * 100;
      }
      
      // 로컬 스토리지에 저장
      localStorage.setItem('waveGameCoins', this.coins.toString());
      localStorage.setItem('waveGameUpgradeCount', this.upgradeCount.toString());
      
      // 공 크기 업데이트
      this.updateBlackBallSize();
      
      // UI 업데이트
      if (this.coinDisplay) {
        this.coinDisplay.textContent = `코인: ${this.coins}`;
      }
      return true;
    }
    
    return false;
  }
  
  /**
   * 검은 공 크기 업데이트
   */
  updateBlackBallSize() {
    const newSize = this.blackBallSize * this.blackBallSizeMultiplier[this.gameMode];
    document.documentElement.style.setProperty('--ball-size', `${newSize}rem`);
  }
  
  /**
   * 게임 모드 선택 화면 표시
   */
  showModeSelection() {
    // 기존 게임 요소 숨기기
    this.scoreDisplay.style.display = 'none';
    this.highScoreDisplay.style.display = 'none';
    
    // 모드 선택 화면
    this.modeSelection = document.createElement('div');
    this.modeSelection.className = 'mode-selection-screen';
    
    let modeHTML = `
      <h2>게임 모드 선택</h2>
      <div class="mode-buttons">
        <button class="mode-button easy-mode">이지 모드</button>
        <button class="mode-button hard-mode">하드 모드</button>
      </div>
      <div class="mode-description">
        <p class="easy-desc">이지 모드: 일반 난이도로 플레이합니다. 죽은 횟수가 기록됩니다.</p>
        <p class="hard-desc">하드 모드: 장애물이 1.5배 커지고 4배 빨라집니다. 점수에 따라 코인을 획득할 수 있습니다.</p>
      </div>
    `;
    
    this.modeSelection.innerHTML = modeHTML;
    this.gameContainer.appendChild(this.modeSelection);
    
    // 모드 선택 버튼 이벤트
    this.modeSelection.querySelector('.easy-mode').addEventListener('click', () => {
      this.setGameMode('easy');
    });
    
    this.modeSelection.querySelector('.hard-mode').addEventListener('click', () => {
      this.setGameMode('hard');
    });
  }
  
  /**
   * 게임 모드 설정
   */
  setGameMode(mode) {
    this.gameMode = mode;
    
    // 모드 선택 화면 제거
    if (this.modeSelection) {
      this.modeSelection.remove();
    }
    
    // UI 요소 보이기
    this.scoreDisplay.style.display = 'block';
    this.highScoreDisplay.style.display = 'block';
    
    // 모드에 따라 검은 공 크기 설정
    this.updateBlackBallSize();
    
    // 모드에 따른 죽은 횟수 설정
    this.deathCount = this.totalDeathCounts[mode];
    
    // 코인 표시 (하드모드일 때만)
    if (mode === 'hard' && !this.coinDisplay) {
      this.coinDisplay = document.createElement('div');
      this.coinDisplay.className = 'coin-display';
      this.coinDisplay.textContent = `코인: ${this.coins}`;
      this.gameInfoContainer.appendChild(this.coinDisplay);
    } else if (this.coinDisplay) {
      this.coinDisplay.style.display = mode === 'hard' ? 'block' : 'none';
    }
    
    // 죽은 횟수 표시 (양쪽 모드 모두에서 표시)
    if (!this.deathDisplay) {
      this.deathDisplay = document.createElement('div');
      this.deathDisplay.className = 'death-display';
      this.deathDisplay.textContent = `죽은 횟수: ${this.deathCount}`;
      this.gameInfoContainer.appendChild(this.deathDisplay);
    } else {
      this.deathDisplay.style.display = 'block';
      this.deathDisplay.textContent = `죽은 횟수: ${this.deathCount}`;
    }
    
    // 게임 시작
    this.startGame();
  }
  
  /**
   * 게임 UI 생성
   */
  createGameUI() {
    // 게임 컨테이너
    this.gameContainer = document.createElement('div');
    this.gameContainer.className = 'game-container';
    document.body.appendChild(this.gameContainer);
    
    // 게임 정보 컨테이너 생성
    this.gameInfoContainer = document.createElement('div');
    this.gameInfoContainer.className = 'game-info-container';
    this.gameContainer.appendChild(this.gameInfoContainer);
    
    // 점수 표시
    this.scoreDisplay = document.createElement('div');
    this.scoreDisplay.className = 'score-display';
    this.scoreDisplay.textContent = '점수: 0';
    this.gameInfoContainer.appendChild(this.scoreDisplay);
    
    // 최고 점수 표시
    this.highScoreDisplay = document.createElement('div');
    this.highScoreDisplay.className = 'high-score-display';
    this.updateHighScoreDisplay();
    this.gameContainer.appendChild(this.highScoreDisplay);
    
    // 게임 오버 화면
    this.gameOverScreen = document.createElement('div');
    this.gameOverScreen.className = 'game-over-screen';
    
    // 게임 오버 화면 기본 템플릿 (실제 내용은 gameOver()에서 업데이트)
    this.gameOverScreen.innerHTML = `
      <h2>게임 오버</h2>
      <p>최종 점수: <span class="final-score">0</span></p>
      <div class="high-scores-container">
        <h3>최고 점수</h3>
        <ol class="high-scores-list"></ol>
      </div>
      <div class="button-container">
        <button class="restart-button">다시 시작</button>
      </div>
    `;
    
    this.gameOverScreen.style.display = 'none';
    this.gameContainer.appendChild(this.gameOverScreen);
  }
  
  /**
   * 최고 점수 표시 업데이트
   */
  updateHighScoreDisplay() {
    // 현재 게임 중 최고 점수 표시
    if (this.highScores.length > 0) {
      let html = `<div class="title">최고 점수</div><ol>`;
      
      this.highScores.slice(0, 5).forEach((score, index) => {
        let scoreText = `${score.score} (${score.date})`;
        
        // 모드 정보 추가
        if (score.mode) {
          scoreText += ` - ${score.mode === 'easy' ? '이지' : '하드'}`;
        }
        
        // 이지모드에서는 죽은 횟수 표시
        if (score.mode === 'easy' && score.deaths !== undefined) {
          scoreText += ` (죽음: ${score.deaths})`;
        }
        
        html += `<li>${scoreText}</li>`;
      });
      
      html += `</ol>`;
      this.highScoreDisplay.innerHTML = html;
    } else {
      this.highScoreDisplay.innerHTML = `<div class="title">최고 점수</div><p>아직 기록이 없습니다</p>`;
    }
  }
  
  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    // 창 크기 변경 시 게임 요소 재조정
    window.addEventListener('resize', () => {
      // 필요한 경우 처리
    });
  }
  
  /**
   * 장애물 생성
   */
  createObstacle() {
    if (!this.isGameActive) return;
    
    const { width, height } = this.wavesElement.bounding;
    
    // 장애물 방향 결정 (상, 하, 좌, 우)
    const directions = ['top', 'right', 'bottom', 'left'];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    
    // 하드모드에서 간헐적으로 원형 장애물 생성 (15% 확률)
    const isCircle = this.gameMode === 'hard' && Math.random() < 0.15;
    
    // 모드에 따른 크기 조정
    const sizeMultiplier = this.obstacleData[this.gameMode].sizeMultiplier;
    const size = (30 + Math.random() * 60) * sizeMultiplier;
    const halfSize = size / 2;
    
    let x, y;
    let moveX = 0, moveY = 0;
    let obstacleClass = isCircle ? 'obstacle circle' : 'obstacle';
    
    // 모드에 따른 속도 조정
    const speedMultiplier = this.obstacleData[this.gameMode].speedMultiplier;
    // 원형 장애물은 매우 빠르게 (3배)
    const circleSpeedMultiplier = 3;
    const finalSpeedMultiplier = isCircle ? circleSpeedMultiplier * speedMultiplier : speedMultiplier;
    const speedVariation = (1.0 + Math.random() * 2.0) * finalSpeedMultiplier;
    
    // 방향에 따라 시작 위치와 이동 방향 결정
    switch(direction) {
      case 'top':
        x = Math.random() * width;
        y = -size;
        moveY = 2.5 * speedVariation;
        obstacleClass += ' vertical';
        break;
      case 'right':
        x = width + size;
        y = Math.random() * height;
        moveX = -2.5 * speedVariation;
        obstacleClass += ' horizontal';
        break;
      case 'bottom':
        x = Math.random() * width;
        y = height + size;
        moveY = -2.5 * speedVariation;
        obstacleClass += ' vertical';
        break;
      case 'left':
        x = -size;
        y = Math.random() * height;
        moveX = 2.5 * speedVariation;
        obstacleClass += ' horizontal';
        break;
    }
    
    // 장애물 SVG 요소 생성 (원 또는 사각형)
    let obstacle;
    if (isCircle) {
      obstacle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      obstacle.setAttribute('class', obstacleClass);
      obstacle.setAttribute('r', halfSize);
      obstacle.setAttribute('cx', x);
      obstacle.setAttribute('cy', y);
    } else {
      obstacle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      obstacle.setAttribute('class', obstacleClass);
      obstacle.setAttribute('width', size);
      obstacle.setAttribute('height', size);
      obstacle.setAttribute('x', x - halfSize);
      obstacle.setAttribute('y', y - halfSize);
    }
    
    // 사이즈와 타입에 따른 색상 변경
    let fillColor;
    if (isCircle) {
      // 원형 장애물의 색상을 빨간색으로 고정
      fillColor = '#f44336'; // 빨간색 (레드)
    } else {
      // 사각형 장애물의 기존 색상 로직
      if (size < 50) {
        fillColor = '#e91e63'; // 작은 장애물
      } else if (size < 70) {
        fillColor = '#9c27b0'; // 중간 장애물
      } else {
        fillColor = '#673ab7'; // 큰 장애물
      }
    }
    
    obstacle.setAttribute('fill', fillColor);
    
    // SVG에 추가
    this.svg.appendChild(obstacle);
    
    // 장애물 객체 추가
    this.obstacles.push({
      element: obstacle,
      x,
      y,
      size,
      halfSize,
      moveX,
      moveY,
      direction,
      isCircle // 원형 여부 추가
    });
  }
  
  /**
   * 다중 장애물 동시 생성
   */
  createMultipleObstacles(count) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.createObstacle();
      }, i * 80);
    }
  }
  
  /**
   * 게임 요소 업데이트
   */
  updateGameElements() {
    if (!this.isGameActive) return;
    
    const { width, height } = this.wavesElement.bounding;
    const { mouse } = this.wavesElement;
    
    // 장애물 업데이트
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.obstacles[i];
      
      // 위치 업데이트
      obstacle.x += obstacle.moveX * this.gameSpeed;
      obstacle.y += obstacle.moveY * this.gameSpeed;
      
      // 원형이면 cx, cy 업데이트, 사각형이면 x, y 업데이트
      if (obstacle.isCircle) {
        obstacle.element.setAttribute('cx', obstacle.x);
        obstacle.element.setAttribute('cy', obstacle.y);
      } else {
        obstacle.element.setAttribute('x', obstacle.x - obstacle.halfSize);
        obstacle.element.setAttribute('y', obstacle.y - obstacle.halfSize);
      }
      
      // 화면을 벗어나면 제거
      if (
        obstacle.x < -obstacle.size * 2 || 
        obstacle.x > width + obstacle.size * 2 || 
        obstacle.y < -obstacle.size * 2 || 
        obstacle.y > height + obstacle.size * 2
      ) {
        obstacle.element.remove();
        this.obstacles.splice(i, 1);
        continue;
      }
      
      // 마우스 커서와 충돌 검사
      const dx = obstacle.x - mouse.sx;
      const dy = obstacle.y - mouse.sy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 충돌 거리 (마우스 커서(검은 점)의 반지름 + 장애물의 반지름)
      // 모드에 따라 충돌 범위 조정
      const cursorRadius = 0.5 * this.blackBallSizeMultiplier[this.gameMode];
      // 하드모드에서는 더 민감한 충돌 판정 (시각적 크기보다 더 큰 판정 범위), 이지모드에서는 약간 여유 있게
      const collisionThreshold = this.gameMode === 'hard' ? 1.5 : 0.8;
      const collisionDistance = cursorRadius * collisionThreshold + obstacle.halfSize * collisionThreshold;
      
      if (distance < collisionDistance) {
        // 죽은 횟수 증가 (모든 모드에서)
        this.deathCount++;
        // 총 죽은 횟수도 증가
        this.totalDeathCounts[this.gameMode]++;
        
        // 로컬 스토리지에 저장
        this.saveDeathCount();
        
        if (this.deathDisplay) {
          this.deathDisplay.textContent = `죽은 횟수: ${this.deathCount}`;
        }
        
        this.gameOver();
        return;
      }
    }
    
    // 점수 증가 (생존 시간에 비례)
    this.score += 0.15 * this.gameSpeed;
    const currentScore = Math.floor(this.score);
    this.scoreDisplay.textContent = `점수: ${currentScore}`;
    
    // 점수 임계값을 넘을 때마다 난이도 증가
    if (currentScore >= this.lastScoreThreshold + this.scoreThreshold) {
      this.lastScoreThreshold = currentScore;
      
      // 게임 속도 증가
      this.gameSpeed += 0.2;
      
      // 장애물 생성 간격 감소
      this.obstacleSpawnRate = Math.max(600, this.obstacleSpawnRate - 400);
      
      // 다중 장애물 생성 (점수가 높을수록 더 많은 장애물)
      const obstacleCount = Math.min(15, 2 + Math.floor(currentScore / this.scoreThreshold));
      this.createMultipleObstacles(obstacleCount);
      
      // 하드모드에서 점수 획득시 코인 지급
      if (this.gameMode === 'hard') {
        const earnedCoins = Math.floor(currentScore / this.scoreThreshold);
        if (earnedCoins > 0) {
          this.addCoins(earnedCoins);
          
          // 코인 획득 이펙트 (나중에 구현)
        }
      }
    }
    
    // 정기적인 게임 속도 미세 증가
    this.gameTime++;
    if (this.gameTime % 1000 === 0) {
      this.gameSpeed += 0.1;
    }
  }
  
  /**
   * 게임 시작
   */
  startGame() {
    this.isGameActive = true;
    this.score = 0;
    this.gameSpeed = 0.8;
    this.gameTime = 0;
    this.obstacleSpawnRate = 2500;
    this.lastScoreThreshold = 0;
    this.scoreDisplay.textContent = '점수: 0';
    this.gameOverScreen.style.display = 'none';
    
    // 죽은 횟수는 초기화하지 않음! (누적됨)
    if (this.deathDisplay) {
      this.deathDisplay.textContent = `죽은 횟수: ${this.deathCount}`;
    }
    
    // 기존 요소 제거
    this.obstacles.forEach(obstacle => obstacle.element.remove());
    this.obstacles = [];
    
    // 초기 장애물 생성
    setTimeout(() => {
      this.createMultipleObstacles(5);
    }, 1000);
    
    // 게임 루프 시작
    this.gameLoop();
  }
  
  /**
   * 게임 오버
   */
  gameOver() {
    this.isGameActive = false;
    
    // 최종 점수
    const finalScore = Math.floor(this.score);
    
    // 최고 점수에 추가하고 순위 확인
    const rank = this.saveHighScore(finalScore);
    
    // 최고 점수 표시 업데이트
    this.updateHighScoreDisplay();
    
    // 게임 오버 화면 업데이트
    // 내용을 처음부터 다시 생성하여 참조 오류 방지
    this.gameOverScreen.innerHTML = `
      <h2>게임 오버</h2>
      <p>최종 점수: <span class="final-score">${finalScore}</span></p>
      <div class="game-over-info">
        <p>모드: ${this.gameMode === 'easy' ? '이지' : '하드'}</p>
        <p>죽은 횟수: ${this.deathCount}</p>
        ${this.gameMode === 'hard' ? 
          `<p>획득한 코인: ${Math.floor(finalScore / 10)}</p>
           <p>총 보유 코인: ${this.coins}</p>` : ''}
      </div>
      <div class="high-scores-container">
        <h3>최고 점수</h3>
        <ol class="high-scores-list"></ol>
      </div>
      <div class="button-container">
        <button class="restart-button">같은 모드로 다시 시작</button>
        <button class="mode-select-button">모드 선택으로 돌아가기</button>
        <button class="shop-button gameover-shop-button">상점</button>
      </div>
    `;
    
    // 최고 점수 리스트 업데이트
    const highScoresList = this.gameOverScreen.querySelector('.high-scores-list');
    
    this.highScores.forEach((score, index) => {
      const li = document.createElement('li');
      let scoreText = `${score.score} (${score.date})`;
      
      // 모드 정보 추가
      if (score.mode) {
        scoreText += ` - ${score.mode === 'easy' ? '이지' : '하드'}`;
      }
      
      // 죽은 횟수 표시 (양쪽 모드에서)
      if (score.deaths !== undefined) {
        scoreText += ` (죽음: ${score.deaths})`;
      }
      
      li.textContent = scoreText;
      
      // 현재 점수에 하이라이트 표시
      if (index === rank) {
        li.classList.add('current-score');
      }
      
      highScoresList.appendChild(li);
    });
    
    // 버튼 이벤트 리스너 추가
    const restartButton = this.gameOverScreen.querySelector('.restart-button');
    const modeSelectButton = this.gameOverScreen.querySelector('.mode-select-button');
    const shopButton = this.gameOverScreen.querySelector('.shop-button');
    
    // 이벤트 리스너 제거 및 다시 추가
    restartButton.addEventListener('click', () => {
      this.restartGame();
    });
    
    modeSelectButton.addEventListener('click', () => {
      this.showModeSelection();
    });
    
    shopButton.addEventListener('click', () => {
      this.showShop();
    });
    
    // 게임 오버 화면 표시
    this.gameOverScreen.style.display = 'block';
  }
  
  /**
   * 게임 다시 시작
   */
  restartGame() {
    this.startGame();
  }
  
  /**
   * 게임 루프
   */
  gameLoop() {
    if (!this.isGameActive) return;
    
    // 요소 업데이트
    this.updateGameElements();
    
    // 장애물 생성 (간격)
    const currentTime = Date.now();
    if (currentTime - this.lastObstacleTime > this.obstacleSpawnRate / this.gameSpeed) {
      this.createObstacle();
      this.lastObstacleTime = currentTime;
    }
    
    // 다음 프레임 요청
    requestAnimationFrame(this.gameLoop.bind(this));
  }
  
  /**
   * 상점 화면 표시
   */
  showShop() {
    // 게임 오버 화면 숨기기
    this.gameOverScreen.style.display = 'none';
    
    // 상점 화면 생성
    const shopScreen = document.createElement('div');
    shopScreen.className = 'shop-screen';
    
    let shopHTML = `
      <h2>상점</h2>
      <p class="shop-coins">보유 코인: ${this.coins}</p>
      <div class="shop-items">
        <div class="shop-item">
          <h3>검은 공 크기 감소</h3>
          <p>하드모드에서 검은 공 크기를 1단계 줄입니다.</p>
          <p>현재 크기: 기본의 ${this.blackBallSizeMultiplier.hard}배</p>
          <p>가격: ${this.upgradeCost} 코인</p>
          <button class="shop-item-button" id="reduce-ball-size">구매하기</button>
        </div>
      </div>
      <button class="back-button">돌아가기</button>
    `;
    
    shopScreen.innerHTML = shopHTML;
    this.gameContainer.appendChild(shopScreen);
    
    // 아이템 구매 버튼 이벤트
    const reduceButton = shopScreen.querySelector('#reduce-ball-size');
    reduceButton.addEventListener('click', () => {
      if (this.purchaseBallSizeReduction()) {
        // 구매 성공
        shopScreen.querySelector('.shop-coins').textContent = `보유 코인: ${this.coins}`;
        shopScreen.querySelector('.shop-item p:nth-child(3)').textContent = `현재 크기: 기본의 ${this.blackBallSizeMultiplier.hard}배`;
        
        // 다음 업그레이드 비용 업데이트
        shopScreen.querySelector('.shop-item p:nth-child(4)').textContent = `가격: ${this.upgradeCost} 코인`;
        
        reduceButton.disabled = this.blackBallSizeMultiplier.hard <= 2 || this.coins < this.upgradeCost;
        
        // 시각적 피드백
        reduceButton.classList.add('purchased');
        reduceButton.textContent = '구매 완료!';
        
        setTimeout(() => {
          reduceButton.classList.remove('purchased');
          if (this.blackBallSizeMultiplier.hard <= 2) {
            reduceButton.textContent = '최소 크기 도달';
          } else if (this.coins < this.upgradeCost) {
            reduceButton.textContent = '코인 부족';
          } else {
            reduceButton.textContent = '구매하기';
          }
        }, 1000);
      } else {
        // 구매 실패
        reduceButton.classList.add('purchase-failed');
        reduceButton.textContent = this.coins < this.upgradeCost ? '코인 부족!' : '최소 크기 도달!';
        
        setTimeout(() => {
          reduceButton.classList.remove('purchase-failed');
          reduceButton.textContent = '구매하기';
        }, 1000);
      }
    });
    
    // 돌아가기 버튼 이벤트
    shopScreen.querySelector('.back-button').addEventListener('click', () => {
      shopScreen.remove();
      this.gameOverScreen.style.display = 'block';
    });
    
    // 버튼 비활성화 상태 설정
    if (this.blackBallSizeMultiplier.hard <= 2) {
      reduceButton.disabled = true;
      reduceButton.textContent = '최소 크기 도달';
    }
    
    if (this.coins < this.upgradeCost) {
      reduceButton.disabled = true;
      reduceButton.textContent = '코인 부족';
    }
  }
}

// 커스텀 요소 정의
customElements.define('wave-surfer-game', WaveSurferGame);

// 게임 초기화 함수
function initGame() {
  // 이전 게임 요소 제거
  const oldGame = document.querySelector('wave-surfer-game');
  if (oldGame) {
    oldGame.remove();
  }
  
  // 새 게임 요소 추가
  const game = document.createElement('wave-surfer-game');
  document.body.appendChild(game);
}

// 페이지 로드 시 게임 시작
window.addEventListener('load', () => {
  // 웨이브 애니메이션이 초기화될 시간을 주기 위해 약간 지연
  setTimeout(initGame, 500);
});
