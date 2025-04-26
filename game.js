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
    
    // 개발자 모드 관련 속성
    this.isDeveloperMode = false;
    
    // 색상 관련 속성 추가
    this.ballColors = [
      { name: '검정', color: '#160000', price: 0 },      // 기본 검정
      { name: '빨강', color: '#ff0000', price: 30 },     // 빨강
      { name: '주황', color: '#ff8800', price: 60 },     // 주황
      { name: '노랑', color: '#ffff00', price: 90 },     // 노랑
      { name: '초록', color: '#00ff00', price: 120 },    // 초록
      { name: '파랑', color: '#0088ff', price: 150 },    // 파랑
      { name: '남색', color: '#0000ff', price: 180 },    // 남색
      { name: '보라', color: '#8800ff', price: 210 },    // 보라
      { name: '은색', color: '#c0c0c0', price: 240 },    // 은색
      { name: '금색', color: '#ffd700', price: 270 },    // 금색
      { name: '무지개', color: 'rainbow', price: 300 }   // 무지개(특수)
    ];
    
    // 현재 선택된 색상 (인덱스)
    this.selectedColorIndex = 0;
    
    // 트레일 관련 속성 추가
    // this.hasTrail = false;  // 트레일 해금 여부
    // this.trailColors = [
    //   { name: '없음', color: 'none', price: 0 },       // 트레일 없음
    //   { name: '빨강', color: '#ff0000', price: 10 },   // 빨강
    //   { name: '주황', color: '#ff8800', price: 40 },   // 주황
    //   { name: '노랑', color: '#ffff00', price: 70 },   // 노랑
    //   { name: '초록', color: '#00ff00', price: 100 },  // 초록
    //   { name: '파랑', color: '#0088ff', price: 130 },  // 파랑
    //   { name: '남색', color: '#0000ff', price: 160 },  // 남색
    //   { name: '보라', color: '#8800ff', price: 190 },  // 보라
    //   { name: '은색', color: '#c0c0c0', price: 220 },  // 은색
    //   { name: '금색', color: '#ffd700', price: 250 },  // 금색
    //   { name: '무지개', color: 'rainbow', price: 300 } // 무지개(특수)
    // ];
    
    // 현재 선택된 트레일 색상 (인덱스)
    // this.selectedTrailIndex = 0;
    
    // 트레일 효과를 위한 위치 기록 배열
    // this.trailPositions = [];
    // this.trailMaxLength = 15; // 트레일 길이
    
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
    
    // 선택된 색상 로드
    const selectedColorIndex = localStorage.getItem('waveGameSelectedColor');
    this.selectedColorIndex = selectedColorIndex ? parseInt(selectedColorIndex) : 0;
    
    // 트레일 보유 여부 로드
    // const hasTrail = localStorage.getItem('waveGameHasTrail');
    // this.hasTrail = hasTrail ? hasTrail === 'true' : false;
    
    // 선택된 트레일 색상 로드
    // const selectedTrailIndex = localStorage.getItem('waveGameSelectedTrail');
    // this.selectedTrailIndex = selectedTrailIndex ? parseInt(selectedTrailIndex) : 0;
    
    // 구매한 트레일 색상 로드
    // const purchasedTrails = localStorage.getItem('waveGamePurchasedTrails');
    // this.purchasedTrails = purchasedTrails ? JSON.parse(purchasedTrails) : [0]; // 기본값은 '없음' 상태
    
    // 해금된 색상 로드
    const unlockedColors = localStorage.getItem('waveGameUnlockedColors');
    this.unlockedColors = unlockedColors ? JSON.parse(unlockedColors) : [0]; // 기본값은 '검정' 색상만
    
    // 개발자 모드 상태 로드
    const isDeveloperMode = localStorage.getItem('waveGameDeveloperMode');
    this.isDeveloperMode = isDeveloperMode === 'true';
    
    // 현재 선택된 색상과 트레일 적용
    this.applySelectedColorAndTrail();
  }
  
  /**
   * 선택된 색상 저장
   */
  saveSelectedColor() {
    localStorage.setItem('waveGameSelectedColor', this.selectedColorIndex.toString());
    localStorage.setItem('waveGameUnlockedColors', JSON.stringify(this.unlockedColors));
  }
  
  /**
   * 트레일 설정 저장
   */
  saveTrailSettings() {
    localStorage.setItem('waveGameHasTrail', this.hasTrail.toString());
    localStorage.setItem('waveGameSelectedTrail', this.selectedTrailIndex.toString());
    localStorage.setItem('waveGamePurchasedTrails', JSON.stringify(this.purchasedTrails));
  }
  
  /**
   * 선택된 색상과 트레일 적용
   */
  applySelectedColorAndTrail() {
    // 색상 적용 (무지개 색상 특수 처리)
    if (this.ballColors[this.selectedColorIndex].color === 'rainbow') {
      document.documentElement.style.setProperty('--ball-color', '#ff0000'); // 초기 색상
      document.documentElement.style.setProperty('--ball-rainbow', 'true'); // 무지개 플래그
    } else {
      document.documentElement.style.setProperty('--ball-color', this.ballColors[this.selectedColorIndex].color);
      document.documentElement.style.setProperty('--ball-rainbow', 'false');
    }
    
    // 트레일 적용
    // if (this.hasTrail && this.selectedTrailIndex > 0) {
    //   document.documentElement.style.setProperty('--trail-enabled', 'true');
    //   
    //   // 트레일 색상 적용 (무지개 트레일 특수 처리)
    //   if (this.trailColors[this.selectedTrailIndex].color === 'rainbow') {
    //     document.documentElement.style.setProperty('--trail-color', '#ff0000'); // 초기 색상
    //     document.documentElement.style.setProperty('--trail-rainbow', 'true'); // 무지개 플래그
    //   } else {
    //     document.documentElement.style.setProperty('--trail-color', this.trailColors[this.selectedTrailIndex].color);
    //     document.documentElement.style.setProperty('--trail-rainbow', 'false');
    //   }
    //   
    //   // 트레일 요소 초기화 (새로 시작)
    //   this.initializeTrailElements();
    //   
    // } else {
    //   document.documentElement.style.setProperty('--trail-enabled', 'false');
    //   
    //   // 트레일 요소 제거
    //   this.removeTrailElements();
    // }
    
    console.log("색상 및 트레일 적용:", 
                "공 색상:", this.ballColors[this.selectedColorIndex].color, 
                "트레일:", this.hasTrail, 
                "트레일 색상:", this.hasTrail ? this.trailColors[this.selectedTrailIndex].color : "없음");
  }
  
  /**
   * 트레일 요소 초기화
   */
  initializeTrailElements() {
    // 기존 트레일 요소 제거
    this.removeTrailElements();
    
    // 트레일 위치 배열 초기화
    this.trailPositions = [];
    
    // 트레일 요소 배열 초기화
    this.trailElements = [];
  }
  
  /**
   * 트레일 요소 제거
   */
  removeTrailElements() {
    if (this.trailElements && this.trailElements.length > 0) {
      this.trailElements.forEach(element => {
        if (element && element.parentNode) {
          element.remove();
        }
      });
      this.trailElements = [];
    }
  }
  
  /**
   * 색상 해금
   */
  unlockColor(colorIndex) {
    if (!this.unlockedColors.includes(colorIndex)) {
      this.unlockedColors.push(colorIndex);
      this.saveSelectedColor();
      return true;
    }
    return false;
  }
  
  /**
   * 트레일 구매
   */
  purchaseTrail() {
    console.log("트레일 구매 시도:", this.hasTrail, "코인:", this.coins);
    if (!this.hasTrail && this.coins >= 50) { // 트레일 기본 가격: 50코인
      this.coins -= 50;
      this.hasTrail = true;
      
      // 첫 번째 트레일 색상 자동 구매 및 선택 (기본 빨간색)
      if (!this.purchasedTrails.includes(1)) {
        this.purchasedTrails.push(1);
      }
      this.selectedTrailIndex = 1;
      
      this.saveTrailSettings();
      this.saveCoins();
      this.applySelectedColorAndTrail();
      
      // 코인 UI 업데이트
      if (this.coinDisplay) {
        this.coinDisplay.textContent = `코인: ${this.coins}`;
      }
      
      console.log("트레일 구매 성공:", this.hasTrail, "선택된 트레일:", this.selectedTrailIndex);
      return true;
    }
    console.log("트레일 구매 실패:", this.hasTrail, "코인:", this.coins);
    return false;
  }
  
  /**
   * 트레일 색상 구매
   */
  purchaseTrailColor(colorIndex) {
    const price = this.trailColors[colorIndex].price;
    console.log("트레일 색상 구매 시도:", colorIndex, "가격:", price, "코인:", this.coins);
    
    if (!this.purchasedTrails.includes(colorIndex) && this.coins >= price) {
      this.coins -= price;
      this.purchasedTrails.push(colorIndex);
      this.saveTrailSettings();
      this.saveCoins();
      
      // 코인 UI 업데이트
      if (this.coinDisplay) {
        this.coinDisplay.textContent = `코인: ${this.coins}`;
      }
      
      console.log("트레일 색상 구매 성공:", colorIndex, "구매한 트레일:", this.purchasedTrails);
      return true;
    }
    console.log("트레일 색상 구매 실패:", colorIndex, "구매한 트레일:", this.purchasedTrails);
    return false;
  }
  
  /**
   * 선택된 트레일 색상 변경
   */
  selectTrailColor(colorIndex) {
    if (this.purchasedTrails.includes(colorIndex)) {
      this.selectedTrailIndex = colorIndex;
      this.saveTrailSettings();
      this.applySelectedColorAndTrail();
      return true;
    }
    return false;
  }
  
  /**
   * 선택된 공 색상 변경
   */
  selectBallColor(colorIndex) {
    if (this.unlockedColors.includes(colorIndex)) {
      this.selectedColorIndex = colorIndex;
      this.saveSelectedColor();
      this.applySelectedColorAndTrail();
      return true;
    }
    return false;
  }
  
  /**
   * 코인 저장
   */
  saveCoins() {
    localStorage.setItem('waveGameCoins', this.coins.toString());
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
    
    // 개발자 모드 버튼 추가
    this.createDeveloperButton();
    
    // 트레일 위치 및 요소 초기화
    this.trailPositions = [];
    this.removeTrailElements();
    
    // 색상 및 트레일 설정 적용
    this.applySelectedColorAndTrail();
    
    // 게임 시작
    this.startGame();
  }
  
  /**
   * 개발자 모드 버튼 생성
   */
  createDeveloperButton() {
    // 이미 생성된 버튼이 있다면 제거
    if (this.developerButton && this.developerButton.parentNode) {
      this.developerButton.remove();
    }
    
    // 새 버튼 생성
    this.developerButton = document.createElement('div');
    this.developerButton.className = 'developer-button';
    this.developerButton.innerHTML = '<span>DEV</span>';
    this.developerButton.title = '개발자 모드';
    
    // 클릭 이벤트 명시적으로 추가
    this.developerButton.onclick = (e) => {
      e.stopPropagation(); // 이벤트 버블링 방지
      console.log('개발자 모드 버튼 클릭됨');
      this.checkDeveloperPassword();
    };
    
    // DOM에 추가 (항상 맨 앞에)
    if (this.gameInfoContainer && this.gameInfoContainer.firstChild) {
      this.gameInfoContainer.insertBefore(this.developerButton, this.gameInfoContainer.firstChild);
    } else if (this.gameInfoContainer) {
      this.gameInfoContainer.appendChild(this.developerButton);
    }
  }
  
  /**
   * 패스워드 확인
   */
  checkDeveloperPassword() {
    console.log('패스워드 확인 창 표시');
    const password = prompt('개발자 모드 패스워드를 입력하세요:');
    console.log('입력된 패스워드:', password);
    
    if (password === '4490') {
      console.log('올바른 패스워드 입력됨');
      this.activateDeveloperMode();
      return true;
    } else if (password !== null) {
      console.log('잘못된 패스워드 입력됨');
      alert('패스워드가 올바르지 않습니다.');
    } else {
      console.log('패스워드 입력 취소됨');
    }
    return false;
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
    
    // 기존 트레일 제거 및 초기화
    this.removeTrailElements();
    this.trailPositions = [];
    
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
    
    // 트레일 위치 업데이트
    if (this.hasTrail && this.selectedTrailIndex > 0) {
      this.updateTrailPositions();
    }
    
    // 무지개 색상 효과 업데이트 (if enabled)
    this.updateRainbowEffects();
    
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
   * 공 색상 구매
   */
  purchaseBallColor(colorIndex) {
    const price = this.ballColors[colorIndex].price;
    
    if (!this.unlockedColors.includes(colorIndex) && this.coins >= price) {
      this.coins -= price;
      this.unlockColor(colorIndex);
      this.saveCoins();
      return true;
    }
    return false;
  }
  
  /**
   * 코인 추가 및 저장
   */
  addCoins(amount) {
    this.coins += amount;
    this.saveCoins();
    
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
      this.saveCoins();
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
   * 상점 화면 표시
   */
  showShop() {
    // 게임 오버 화면 숨기기
    this.gameOverScreen.style.display = 'none';
    
    console.log("상점 열기 - 코인:", this.coins, "트레일 보유:", this.hasTrail);
    console.log("선택된 트레일:", this.selectedTrailIndex, "구매한 트레일:", this.purchasedTrails);
    
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
        
        <div class="shop-item">
          <h3>트레일 효과</h3>
          <p>캐릭터가 움직일 때 트레일(꼬리) 효과가 생깁니다.</p>
          <p>상태: ${this.hasTrail ? '구매됨' : '구매 가능'}</p>
          <p>가격: 50 코인</p>
          <button class="shop-item-button" id="purchase-trail" ${this.hasTrail ? 'disabled' : ''}>
            ${this.hasTrail ? '구매됨' : '구매하기'}
          </button>
        </div>
      </div>
      
      <div class="customization-section">
        <h3>공 색상 변경</h3>
        <p>다양한 색상의 공을 구매하세요!</p>
        <div class="color-options">
          ${this.generateColorOptions()}
        </div>
        
        ${this.hasTrail ? `
        <h3>트레일 색상</h3>
        <p>다양한 색상의 트레일을 구매하세요!</p>
        <div class="trail-options">
          ${this.generateTrailOptions()}
        </div>
        ` : ''}
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
    
    // 트레일 구매 버튼 이벤트
    const trailButton = shopScreen.querySelector('#purchase-trail');
    if (trailButton && !this.hasTrail) {
      trailButton.addEventListener('click', () => {
        console.log("트레일 구매 버튼 클릭");
        if (this.purchaseTrail()) {
          // 구매 성공
          console.log("트레일 구매 성공 - UI 업데이트");
          shopScreen.querySelector('.shop-coins').textContent = `보유 코인: ${this.coins}`;
          trailButton.disabled = true;
          trailButton.textContent = '구매됨';
          
          // 트레일 색상 옵션 표시 (페이지 새로고침 없이)
          this.showShop(); // 상점 UI 새로고침
        } else {
          // 구매 실패
          console.log("트레일 구매 실패 - 피드백 표시");
          trailButton.classList.add('purchase-failed');
          trailButton.textContent = this.coins < 50 ? '코인 부족!' : '이미 보유 중!';
          
          setTimeout(() => {
            trailButton.classList.remove('purchase-failed');
            trailButton.textContent = '구매하기';
          }, 1000);
        }
      });
    }
    
    // 색상 옵션 버튼 이벤트
    const colorButtons = shopScreen.querySelectorAll('.ball-color-option');
    colorButtons.forEach((button, index) => {
      // 구매 버튼 이벤트
      const buyButton = button.querySelector('.buy-ball-color');
      if (buyButton) {
        buyButton.addEventListener('click', (e) => {
          e.stopPropagation(); // 상위 클릭 이벤트 전파 방지
          if (this.purchaseBallColor(index)) {
            // 구매 성공
            shopScreen.querySelector('.shop-coins').textContent = `보유 코인: ${this.coins}`;
            this.showShop(); // 상점 UI 새로고침
          } else {
            // 구매 실패
            buyButton.classList.add('purchase-failed');
            buyButton.textContent = '코인 부족!';
            
            setTimeout(() => {
              buyButton.classList.remove('purchase-failed');
              buyButton.textContent = '구매';
            }, 1000);
          }
        });
      }
      
      // 색상 선택 이벤트 (이미 구매한 색상)
      if (this.unlockedColors.includes(index)) {
        button.addEventListener('click', () => {
          if (this.selectBallColor(index)) {
            // 성공적으로 색상 변경
            colorButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
          }
        });
      }
    });
    
    // 트레일 색상 구매/선택 버튼 이벤트
    if (this.hasTrail) {
      const trailColorButtons = shopScreen.querySelectorAll('.trail-color-option');
      trailColorButtons.forEach((button, index) => {
        // 구매 버튼 이벤트
        const buyButton = button.querySelector('.buy-trail-color');
        if (buyButton) {
          buyButton.addEventListener('click', (e) => {
            e.stopPropagation(); // 상위 클릭 이벤트 전파 방지
            if (this.purchaseTrailColor(index)) {
              // 구매 성공
              shopScreen.querySelector('.shop-coins').textContent = `보유 코인: ${this.coins}`;
              this.showShop(); // 상점 UI 새로고침
            } else {
              // 구매 실패
              buyButton.classList.add('purchase-failed');
              buyButton.textContent = '코인 부족!';
              
              setTimeout(() => {
                buyButton.classList.remove('purchase-failed');
                buyButton.textContent = '구매';
              }, 1000);
            }
          });
        }
        
        // 색상 선택 이벤트
        if (this.purchasedTrails.includes(index)) {
          button.addEventListener('click', () => {
            if (this.selectTrailColor(index)) {
              // 성공적으로 색상 변경
              trailColorButtons.forEach(btn => btn.classList.remove('selected'));
              button.classList.add('selected');
            }
          });
        }
      });
    }
    
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
  
  /**
   * 색상 옵션 HTML 생성
   */
  generateColorOptions() {
    let html = '';
    
    this.ballColors.forEach((color, index) => {
      const isUnlocked = this.unlockedColors.includes(index);
      const isSelected = this.selectedColorIndex === index;
      const colorStyle = color.color === 'rainbow' ? 
        'background: linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet);' : 
        `background-color: ${color.color};`;
      
      html += `
        <div class="ball-color-option ${isUnlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''}" 
             data-index="${index}" style="${colorStyle}">
          <span class="color-name">${color.name}</span>
          ${!isUnlocked ? 
            `<span class="price">${color.price} 코인</span>
             <button class="buy-ball-color">구매</button>` : 
            ''}
          ${isSelected ? '<span class="selected-mark">✓</span>' : ''}
        </div>
      `;
    });
    
    return html;
  }
  
  /**
   * 트레일 색상 옵션 HTML 생성
   */
  generateTrailOptions() {
    let html = '';
    
    this.trailColors.forEach((color, index) => {
      if (index === 0) return; // '없음' 옵션 제외
      
      const isPurchased = this.purchasedTrails.includes(index);
      const isSelected = this.selectedTrailIndex === index;
      const colorStyle = color.color === 'rainbow' ? 
        'background: linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet);' : 
        `background-color: ${color.color};`;
      
      html += `
        <div class="trail-color-option ${isPurchased ? 'purchased' : ''} ${isSelected ? 'selected' : ''}" 
             data-index="${index}" style="${colorStyle}">
          <span class="color-name">${color.name}</span>
          ${!isPurchased ? 
            `<span class="price">${color.price} 코인</span>
             <button class="buy-trail-color">구매</button>` : 
            ''}
          ${isSelected ? '<span class="selected-mark">✓</span>' : ''}
        </div>
      `;
    });
    
    return html;
  }
  
  /**
   * 트레일 위치 업데이트
   */
  updateTrailPositions() {
    // 트레일 기능이 활성화되지 않았다면 건너뜀
    if (!this.hasTrail || this.selectedTrailIndex <= 0) return;
    
    // 마우스 위치 참조
    const mouse = { sx: this.mouseX, sy: this.mouseY, v: this.mouseVelocity };
    
    // 토성 고리 효과 매개변수
    const numRings = 2;        // 고리 수 (3 -> 2)
    const ringsPerLayer = 18;  // 각 고리의 입자 수 (12 -> 18)
    
    // 이전 트레일 위치 정리 (배열 크기 제한)
    if (this.trailPositions.length > numRings * ringsPerLayer) {
      this.trailPositions.splice(0, this.trailPositions.length - numRings * ringsPerLayer);
    }
    
    // 마우스 속도 계산
    const velocity = mouse.v || 0;
    const velocityFactor = Math.min(1, velocity / 30);
    
    // 각 고리마다 생성
    for (let ring = 1; ring <= numRings; ring++) {
      // 각 고리의 반지름 (더 큰 값으로 조정)
      const baseRadius = 25 + ring * 20;  // 기존: 20 + ring * 15
      const radius = baseRadius * (1 + velocityFactor * 0.3);  // 속도에 따른 크기 증가
      
      // 고리의 회전 각도 (시간에 따라 변화, 각 고리마다 다른 방향과 속도)
      const time = Date.now() * 0.001;
      const direction = ring % 2 === 0 ? 1 : -1;
      const rotationSpeed = 0.5 + ring * 0.3;  // 회전 속도 증가
      const rotation = (time * rotationSpeed * direction) % (Math.PI * 2);
      
      // 각 고리에 입자 배치
      for (let i = 0; i < ringsPerLayer; i++) {
        // 입자의 각도
        const angle = (i / ringsPerLayer) * Math.PI * 2 + rotation;
        
        // 입자의 위치 계산
        const x = mouse.sx + Math.cos(angle) * radius;
        const y = mouse.sy + Math.sin(angle) * radius;
        
        // 입자 깜빡임 효과 (사인파 사용, 더 강한 효과)
        const blinkSpeed = 2.0 + ring * 0.7;  // 깜빡임 속도 증가
        const blinkPhase = (time * blinkSpeed + i / ringsPerLayer) % 1;
        const blinkFactor = Math.pow((Math.sin(blinkPhase * Math.PI * 2) + 1) / 2, 0.8);  // 더 강한 깜빡임
        
        this.trailPositions.push({
          x: x,
          y: y,
          ring: ring,
          angle: angle,
          blink: blinkFactor,
          v: velocity
        });
      }
    }
    
    // 트레일 요소 업데이트
    this.updateTrailElements();
  }
  
  /**
   * 트레일 요소 업데이트
   */
  updateTrailElements() {
    // 트레일 기능이 활성화되지 않았다면 건너뜀
    if (!this.hasTrail || this.selectedTrailIndex <= 0) return;
    
    // 기존 트레일 요소 참조 또는 새로 생성
    if (!this.trailElements) {
      this.trailElements = [];
    }
    
    // SVG 요소가 제대로 있는지 확인
    if (!this.svg) {
      console.error('SVG 요소를 찾을 수 없습니다!');
      return;
    }
    
    console.log(`트레일 업데이트 중: ${this.trailPositions.length}개 위치, 색상 인덱스: ${this.selectedTrailIndex}`);
    
    // 각 트레일 위치에 대해 요소 생성 또는 업데이트
    for (let i = 0; i < this.trailPositions.length; i++) {
      const pos = this.trailPositions[i];
      
      // 마우스 속도에 따른 효과 조정
      const velocity = pos.v || 0;
      const velocityFactor = Math.min(1, velocity / 30);
      
      const ring = pos.ring || 1;
      const ringFactor = 1 - ((ring - 1) / 3) * 0.15;  // 바깥 고리의 차이 줄임
      
      // 깜빡임 효과 적용
      const blinkFactor = pos.blink || 0.5;
      
      // 속도와 고리, 깜빡임에 따른 효과 계산 (크기 키움)
      const size = 8 * ringFactor * (0.9 + 0.5 * velocityFactor);  // 크기 증가
      const opacity = Math.min(1, 1.0 * ringFactor * blinkFactor * (0.85 + 0.4 * velocityFactor));  // 투명도 증가
      
      // 요소가 없으면 새로 생성
      if (!this.trailElements[i]) {
        const trail = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        trail.setAttribute('class', 'trail-element ring-particle');
        trail.setAttribute('r', size);
        
        // 무지개 트레일인 경우 특수 클래스 추가
        if (this.trailColors[this.selectedTrailIndex].color === 'rainbow') {
          trail.classList.add('rainbow-trail');
        }
        
        this.svg.appendChild(trail);
        this.trailElements[i] = trail;
        console.log(`새 트레일 요소 생성: 인덱스 ${i}, 크기 ${size}, 색상: ${this.trailColors[this.selectedTrailIndex].color}`);
      }
      
      // 위치 및 스타일 업데이트
      const element = this.trailElements[i];
      element.setAttribute('cx', pos.x);
      element.setAttribute('cy', pos.y);
      element.setAttribute('r', size);
      element.setAttribute('opacity', opacity);
      
      // 글로우 효과 추가
      const glowColor = this.trailColors[this.selectedTrailIndex].color === 'rainbow' 
        ? `hsl(${((pos.angle || 0) * 180 / Math.PI + Date.now() * 0.05) % 360}, 100%, 70%)` 
        : this.trailColors[this.selectedTrailIndex].color;
        
      element.setAttribute('fill', glowColor);
      element.setAttribute('filter', 'url(#glow)');
      
      // 요소가 확실히 visible 상태인지 확인
      element.style.display = 'block';
      element.style.visibility = 'visible';
    }
    
    // 트레일 배열보다 많은 요소가 있다면 제거
    while (this.trailElements.length > this.trailPositions.length) {
      const trail = this.trailElements.pop();
      if (trail && trail.parentNode) {
        trail.remove();
      }
    }
    
    // 글로우 필터가 없다면 추가
    this.ensureGlowFilter();
  }
  
  /**
   * SVG 글로우 필터 추가
   */
  ensureGlowFilter() {
    if (!this.svg) return;
    
    // 이미 필터가 존재하는지 확인
    if (this.svg.querySelector('#glow')) return;
    
    // SVG 필터 정의 추가
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'glow');
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');
    
    // 가우시안 블러 필터
    const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    feGaussianBlur.setAttribute('stdDeviation', '3.5');  // 블러 강도 증가
    feGaussianBlur.setAttribute('result', 'coloredBlur');
    
    // 원본과 블러 합성
    const feMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
    const feMergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    feMergeNode1.setAttribute('in', 'coloredBlur');
    const feMergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    feMergeNode2.setAttribute('in', 'SourceGraphic');
    
    feMerge.appendChild(feMergeNode1);
    feMerge.appendChild(feMergeNode2);
    
    filter.appendChild(feGaussianBlur);
    filter.appendChild(feMerge);
    defs.appendChild(filter);
    
    this.svg.appendChild(defs);
    console.log("글로우 필터가 추가되었습니다.");
  }
  
  /**
   * 무지개 효과 업데이트
   */
  updateRainbowEffects() {
    // 현재 시간을 기준으로 무지개 색상 계산
    const time = Date.now() * 0.001;
    
    // 공이 무지개 색상인 경우
    if (this.ballColors[this.selectedColorIndex].color === 'rainbow') {
      const hue = (time * 50) % 360;
      document.documentElement.style.setProperty('--ball-color', `hsl(${hue}, 100%, 50%)`);
      
      // 무지개 클래스 추가 (애니메이션 대신 직접 색상 제어)
      document.querySelector('a-waves:before')?.classList.add('rainbow');
    } else {
      // 무지개가 아닌 경우 클래스 제거
      document.querySelector('a-waves:before')?.classList.remove('rainbow');
    }
    
    // 트레일이 무지개 색상인 경우
    if (this.hasTrail && this.selectedTrailIndex > 0 && this.trailColors[this.selectedTrailIndex].color === 'rainbow') {
      // 각 트레일 요소에 대해 약간 다른 색상 적용 (위치에 따라)
      if (this.trailElements) {
        this.trailElements.forEach((element, index) => {
          if (!element) return;
          
          // 각 요소마다 약간 다른 색상 오프셋 적용
          const offset = index * 30; // 30도씩 색상 변화
          const elementHue = (hue + offset) % 360;
          element.setAttribute('fill', `hsl(${elementHue}, 100%, 50%)`);
        });
      }
    }
  }
  
  /**
   * 개발자 모드 활성화
   */
  activateDeveloperMode() {
    this.isDeveloperMode = true;
    
    // 개발자 모드 상태 저장
    localStorage.setItem('waveGameDeveloperMode', 'true');
    
    // 코인 99999로 설정
    this.coins = 99999;
    this.saveCoins();
    
    // 코인 UI 업데이트
    if (this.coinDisplay) {
      this.coinDisplay.textContent = `코인: ${this.coins}`;
    }
    
    // 모든 색상 해금
    this.ballColors.forEach((color, index) => {
      this.unlockColor(index);
    });
    
    // 모든 트레일 색상 구매
    this.trailColors.forEach((color, index) => {
      if (!this.purchasedTrails.includes(index)) {
        this.purchasedTrails.push(index);
      }
    });
    
    // 트레일 기능 활성화
    this.hasTrail = true;
    
    // 설정 저장
    this.saveTrailSettings();
    
    // 개발자 모드 활성화 메시지
    alert('🚀 개발자 모드가 활성화되었습니다!');
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
