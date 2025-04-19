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
    
    // 최고 점수 로드
    this.loadHighScores();
    
    // UI 요소 생성
    this.createGameUI();
    
    // 이벤트 바인딩
    this.bindEvents();
    
    // 게임 시작
    this.startGame();
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
  }
  
  /**
   * 최고 점수 저장
   */
  saveHighScore(score) {
    // 현재 점수 추가
    this.highScores.push({
      score: Math.floor(score),
      date: new Date().toLocaleDateString()
    });
    
    // 점수 순서대로 정렬
    this.highScores.sort((a, b) => b.score - a.score);
    
    // 상위 5개만 유지
    this.highScores = this.highScores.slice(0, 5);
    
    // 로컬 스토리지에 저장
    localStorage.setItem('waveGameHighScores', JSON.stringify(this.highScores));
    
    // 현재 순위 반환 (0-based)
    return this.highScores.findIndex(item => item.score === Math.floor(score));
  }
  
  /**
   * 게임 UI 생성
   */
  createGameUI() {
    // 게임 컨테이너
    this.gameContainer = document.createElement('div');
    this.gameContainer.className = 'game-container';
    document.body.appendChild(this.gameContainer);
    
    // 점수 표시
    this.scoreDisplay = document.createElement('div');
    this.scoreDisplay.className = 'score-display';
    this.scoreDisplay.textContent = '점수: 0';
    this.gameContainer.appendChild(this.scoreDisplay);
    
    // 최고 점수 표시
    this.highScoreDisplay = document.createElement('div');
    this.highScoreDisplay.className = 'high-score-display';
    this.updateHighScoreDisplay();
    this.gameContainer.appendChild(this.highScoreDisplay);
    
    // 게임 오버 화면
    this.gameOverScreen = document.createElement('div');
    this.gameOverScreen.className = 'game-over-screen';
    
    // 게임 오버 화면 내용
    let gameOverHTML = `
      <h2>게임 오버</h2>
      <p>최종 점수: <span class="final-score">0</span></p>
      <div class="high-scores-container">
        <h3>최고 점수</h3>
        <ol class="high-scores-list"></ol>
      </div>
      <button class="restart-button">다시 시작</button>
    `;
    this.gameOverScreen.innerHTML = gameOverHTML;
    this.gameOverScreen.style.display = 'none';
    this.gameContainer.appendChild(this.gameOverScreen);
    
    // 다시 시작 버튼 이벤트
    this.gameOverScreen.querySelector('.restart-button').addEventListener('click', () => {
      this.restartGame();
    });
  }
  
  /**
   * 최고 점수 표시 업데이트
   */
  updateHighScoreDisplay() {
    // 현재 게임 중 최고 점수 표시
    if (this.highScores.length > 0) {
      let html = `<div class="title">최고 점수</div><ol>`;
      
      this.highScores.slice(0, 5).forEach((score, index) => {
        html += `<li>${score.score} (${score.date})</li>`;
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
    
    // 사이즈 2배 증가 (30~90 사이의 랜덤 크기)
    const size = 30 + Math.random() * 60;
    const halfSize = size / 2;
    
    let x, y;
    let moveX = 0, moveY = 0;
    let obstacleClass = 'obstacle';
    
    // 속도 다양화
    const speedVariation = 1.0 + Math.random() * 2.0;
    
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
    
    // 장애물 SVG 요소 생성
    const obstacle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    obstacle.setAttribute('class', obstacleClass);
    obstacle.setAttribute('width', size);
    obstacle.setAttribute('height', size);
    obstacle.setAttribute('x', x - halfSize);
    obstacle.setAttribute('y', y - halfSize);
    
    // 사이즈에 따른 색상 변경
    if (size < 50) {
      obstacle.setAttribute('fill', '#e91e63'); // 작은 장애물
    } else if (size < 70) {
      obstacle.setAttribute('fill', '#9c27b0'); // 중간 장애물
    } else {
      obstacle.setAttribute('fill', '#673ab7'); // 큰 장애물
    }
    
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
      direction
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
      
      obstacle.element.setAttribute('x', obstacle.x - obstacle.halfSize);
      obstacle.element.setAttribute('y', obstacle.y - obstacle.halfSize);
      
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
      const collisionDistance = 0.5 + obstacle.halfSize * 0.8;
      
      if (distance < collisionDistance) {
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
    
    // 게임 오버 화면에 최종 점수 표시
    this.gameOverScreen.querySelector('.final-score').textContent = finalScore;
    
    // 게임 오버 화면에 최고 점수 리스트 업데이트
    const highScoresList = this.gameOverScreen.querySelector('.high-scores-list');
    highScoresList.innerHTML = '';
    
    this.highScores.forEach((score, index) => {
      const li = document.createElement('li');
      li.textContent = `${score.score} (${score.date})`;
      
      // 현재 점수에 하이라이트 표시
      if (index === rank) {
        li.classList.add('current-score');
      }
      
      highScoresList.appendChild(li);
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
