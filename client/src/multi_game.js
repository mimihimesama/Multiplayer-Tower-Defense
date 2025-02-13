import { Base } from './class/base.js';
import { Monster } from './class/monster.js';
import { Tower } from './class/tower.js';
import Game from './class/Game.js';
import eventHandler from './handlers/index.js';

if (!localStorage.getItem('token')) {
  alert('로그인이 필요합니다.token1번이 없습니다');
  location.href = '/login.html';
}

export let game; // 핸들러의 index.js에서 사용하기 위해 export함
let serverSocket;

const CLIENT_VERSION = '1.0.0';

const canvas = document.getElementById('gameCanvas');
export const ctx = canvas.getContext('2d');

const opponentCanvas = document.getElementById('opponentCanvas');
const opponentCtx = opponentCanvas.getContext('2d');

const progressBarContainer = document.getElementById('progressBarContainer');
const progressBarMessage = document.getElementById('progressBarMessage');
const progressBar = document.getElementById('progressBar');
const loader = document.getElementsByClassName('loader')[0];

// 모달 엘리먼트와 관련된 요소들
const errorModal = document.getElementById('errorModal');
const modalMessage = document.getElementById('modalMessage');
const closeModal = document.getElementsByClassName('close')[0];

// 모달을 여는 함수
export function openModal(message) {
  modalMessage.textContent = message;
  errorModal.style.display = 'block';
}

// 모달을 닫는 함수
function closeModalFunction() {
  errorModal.style.display = 'none';
}

// 모달의 닫기 버튼 클릭 시 모달 닫기
closeModal.onclick = function () {
  closeModalFunction();
};

// 모달 영역 외부 클릭 시 모달 닫기
window.onclick = function (event) {
  if (event.target == errorModal) {
    closeModalFunction();
  }
};

const NUM_OF_MONSTERS = 6; // 몬스터 개수

// 이미지 로딩 파트
const backgroundImage = new Image();
backgroundImage.src = 'images/bg.webp';

export const towerImage = new Image();
towerImage.src = 'images/tower.png';

const baseImage = new Image();
baseImage.src = 'images/base.png';

const pathImage = new Image();
pathImage.src = 'images/path.png';

export const monsterImages = [];
for (let i = 1; i <= NUM_OF_MONSTERS; i++) {
  const img = new Image();
  img.src = `images/monster${i}.png`;
  monsterImages.push(img);
}

let bgm;

function initMap() {
  ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height); // 배경 이미지 그리기
  opponentCtx.drawImage(backgroundImage, 0, 0, opponentCanvas.width, opponentCanvas.height);
  drawPath(game.monsterPath, ctx);
  drawPath(game.opponentMonsterPath, opponentCtx);
  // placeInitialTowers(initialTowerCoords, towers, ctx); // 초기 타워 배치
  // placeInitialTowers(opponentInitialTowerCoords, opponentTowers, opponentCtx); // 상대방 초기 타워 배치
  placeBase(game.basePosition, true);
  placeBase(game.opponentBasePosition, false);
}

function drawPath(path, context) {
  const segmentLength = 10; // 몬스터 경로 세그먼트 길이
  const imageWidth = 30; // 몬스터 경로 이미지 너비
  const imageHeight = 30; // 몬스터 경로 이미지 높이
  const gap = 3; // 몬스터 경로 이미지 겹침 방지를 위한 간격

  for (let i = 0; i < path.length - 1; i++) {
    const startX = path[i].x;
    const startY = path[i].y;
    const endX = path[i + 1].x;
    const endY = path[i + 1].y;

    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY); // 피타고라스 정리로 두 점 사이의 거리를 구함 (유클리드 거리)
    const angle = Math.atan2(deltaY, deltaX); // 두 점 사이의 각도를 tan-1(y/x)로 구해야 함 (자세한 것은 역삼각함수 참고): 삼각함수는 변의 비율! 역삼각함수는 각도를 구하는 것!

    for (let j = gap; j < distance - gap; j += segmentLength) {
      const x = startX + Math.cos(angle) * j; // 다음 이미지 x좌표 계산(각도의 코사인 값은 x축 방향의 단위 벡터 * j를 곱하여 경로를 따라 이동한 x축 좌표를 구함)
      const y = startY + Math.sin(angle) * j; // 다음 이미지 y좌표 계산(각도의 사인 값은 y축 방향의 단위 벡터 * j를 곱하여 경로를 따라 이동한 y축 좌표를 구함)
      drawRotatedImage(pathImage, x, y, imageWidth, imageHeight, angle, context);
    }
  }
}

function drawRotatedImage(image, x, y, width, height, angle, context) {
  context.save();
  context.translate(x + width / 2, y + height / 2);
  context.rotate(angle);
  context.drawImage(image, -width / 2, -height / 2, width, height);
  context.restore();
}

function getRandomPositionNearPath(maxDistance) {
  const segmentIndex = Math.floor(Math.random() * (game.monsterPath.length - 1));
  const startX = game.monsterPath[segmentIndex].x;
  const startY = game.monsterPath[segmentIndex].y;
  const endX = game.monsterPath[segmentIndex + 1].x;
  const endY = game.monsterPath[segmentIndex + 1].y;

  const t = Math.random();
  const posX = startX + t * (endX - startX);
  const posY = startY + t * (endY - startY);

  const offsetX = (Math.random() - 0.5) * 2 * maxDistance;
  const offsetY = (Math.random() - 0.5) * 2 * maxDistance;

  if (posY + offsetY >= canvas.height - 75) {
    return {
      x: posX + offsetX,
      y: posY - 50,
    };
  }

  return {
    x: posX + offsetX,
    y: posY + offsetY,
  };
}

function placeInitialTowers(initialTowerCoords, initialTowers, context) {
  initialTowerCoords.forEach((towerCoords) => {
    const tower = new Tower(towerCoords.x, towerCoords.y);
    initialTowers.push(tower);
    tower.draw(context, towerImage);
  });
}

function placeNewTower() {
  // 타워를 구입할 수 있는 자원이 있을 때 타워 구입 후 랜덤 배치
  // if (game.userGold < game.towerCost) {
  //   alert('골드가 부족합니다.');
  //   return;
  // }
  const { x, y } = getRandomPositionNearPath(200);
  //서버로 포탑 좌표 전달
  sendEvent(6, { x, y });
}

function monsterBomb() {
  sendEvent(70, { itemId: 4 });
}

function baseHeal() {
  sendEvent(70, { itemId: 3 });
}

function towerBomb() {
  sendEvent(70, { itemId: 1 });
}

function placeBase(position, isPlayer) {
  if (isPlayer) {
    game.base = new Base(position.x, position.y, game.baseHp);
    game.base.draw(ctx, baseImage);
  } else {
    game.opponentBase = new Base(position.x, position.y, game.baseHp);
    game.opponentBase.draw(opponentCtx, baseImage, true);
  }
}

function spawnMonster() {
  // TODO. 서버로 몬스터 생성 이벤트 전송
  sendEvent(40, { monsterLevel: game.monsterLevel });
}

function gameLoop() {
  // 렌더링 시에는 항상 배경 이미지부터 그려야 합니다! 그래야 다른 이미지들이 배경 이미지 위에 그려져요!
  ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height); // 배경 이미지 다시 그리기
  drawPath(game.monsterPath, ctx); // 경로 다시 그리기

  ctx.font = '25px "Trebuchet MS"';
  ctx.fillStyle = 'tomato';
  ctx.fillText(`전체 최고 기록: ${game.highScore}`, 100, 50); // 최고 기록 표시
  ctx.fillStyle = 'aqua';
  ctx.fillText(`나의 최고 기록: ${game.userHighScore}`, 100, 100); // 개인 최고 기록 표시
  ctx.fillStyle = 'white';
  ctx.fillText(`점수: ${game.score}`, 100, 150); // 현재 스코어 표시
  ctx.fillStyle = 'yellow';
  ctx.fillText(`골드: ${game.userGold}`, 100, 200); // 골드 표시
  ctx.fillStyle = 'black';
  ctx.fillText(`현재 레벨: ${game.monsterLevel}`, 100, 250); // 최고 기록 표시
  ctx.fillStyle = 'mintcream';
  ctx.fillText(`나의 게임 랭킹: ${game.userRank}위`, 400, 50); // 나의 랭킹 표시
  ctx.fillStyle = 'mintcream';
  ctx.fillText(`상대방 게임 랭킹: ${game.opponentRank}위`, 400, 100); // 상대방 랭킹 표시

  // 타워 그리기 및 몬스터 공격 처리
  game.towers.forEach((tower) => {
    tower.draw(ctx, towerImage);
    tower.updateCooldown();
    game.monsters.forEach((monster) => {
      const distance = Math.sqrt(Math.pow(tower.x - monster.x, 2) + Math.pow(tower.y - monster.y, 2));
      if (distance < tower.range) {
        tower.attack(monster);
      }
    });
  });
  game.monsters.forEach((monster) => {
    //이 코드가 사라져 있었음 범인 누구임... 원래 부터 없었을 수도 있고
    monster.draw(ctx, false);
  });

  // 몬스터가 공격을 했을 수 있으므로 기지 다시 그리기
  game.base.draw(ctx, baseImage);

  for (let i = game.monsters.length - 1; i >= 0; i--) {
    const monster = game.monsters[i];
    if (monster.hp > 0) {
      const Attacked = monster.move(game.base);
      if (Attacked) {
        const attackedSound = new Audio('sounds/attacked.mp3');
        attackedSound.volume = 0.05;
        attackedSound.play();
        sendEvent(50, { monsterID: monster.monsterID });
        game.monsters.splice(i, 1); //기지 충돌시 삭제는 클라이언트 주도
      }
    } else {
      // TODO. 몬스터 사망 이벤트 전송 => 사망 이벤트도 서버에서 처리해줌
    }
  }

  // 상대방 게임 화면 업데이트
  opponentCtx.drawImage(backgroundImage, 0, 0, opponentCanvas.width, opponentCanvas.height);
  drawPath(game.opponentMonsterPath, opponentCtx); // 상대방 경로 다시 그리기

  game.opponentTowers.forEach((tower) => {
    tower.draw(opponentCtx, towerImage);
    tower.updateCooldown(); // 적 타워의 쿨다운 업데이트
  });

  game.opponentMonsters.forEach((monster) => {
    monster.move(game.opponentBase);
    monster.draw(opponentCtx, true);
  });

  game.opponentBase.draw(opponentCtx, baseImage, true);

  requestAnimationFrame(gameLoop); // 지속적으로 다음 프레임에 gameLoop 함수 호출할 수 있도록 함
}

function initGame() {
  if (game.isInitGame) {
    return;
  }

  bgm = new Audio('sounds/bgm.mp3');
  bgm.loop = true;
  bgm.volume = 0.009;
  bgm.play();

  initMap(); // 맵 초기화 (배경, 몬스터 경로 그리기)
  document.querySelector('#chat_open_btn').style.display = 'block'; //게임 시작 후 채팅창 버튼 생성
  setInterval(spawnMonster, game.monsterSpawnInterval); // 설정된 몬스터 생성 주기마다 몬스터 생성
  gameLoop(); // 게임 루프 최초 실행
  game.isInitGame = true;
}

// 이미지 로딩 완료 후 서버와 연결하고 게임 초기화
Promise.all([
  new Promise((resolve) => (backgroundImage.onload = resolve)),
  new Promise((resolve) => (towerImage.onload = resolve)),
  new Promise((resolve) => (baseImage.onload = resolve)),
  new Promise((resolve) => (pathImage.onload = resolve)),
  ...monsterImages.map((img) => new Promise((resolve) => (img.onload = resolve))),
]).then(() => {
  serverSocket = io('http://127.0.0.1:5555', {
    auth: {
      token: localStorage.getItem('token'),
    },
  });
  serverSocket.on('connect_error', (err) => {
    if (err.message === 'Authentication error') {
      alert('잘못된 토큰입니다.');
      location.href = '/login.html';
    }
    console.log(err);
  });

  serverSocket.on('matchFound', (data) => {
    // 상대가 매치되면 3초 뒤 게임 시작
    progressBarMessage.textContent = '게임이 3초 뒤에 시작됩니다.';
    game = new Game(data.userId); //유저,상대방 정보가 담긴 인스턴스 객체
    const startGame = new Audio('sounds/start.mp3');
    startGame.volume = 0.1;
    startGame.play();
    let progressValue = 0;
    const progressInterval = setInterval(() => {
      progressValue += 10;
      progressBar.value = progressValue;
      progressBar.style.display = 'block';
      loader.style.display = 'none';

      if (progressValue >= 100) {
        clearInterval(progressInterval);
        progressBarContainer.style.display = 'none';
        progressBar.style.display = 'none';
        buyTowerButton.style.display = 'block';
        buyTowerBombButton.style.display = 'block';
        buyBombButton.style.display = 'block';
        buyHealButton.style.display = 'block';
        canvas.style.display = 'block';
        opponentCanvas.style.display = 'block';
        // TODO. 유저 및 상대방 유저 데이터 초기화
        sendEvent(10);
      }
    }, 300);
  });

  serverSocket.on('initializeGameState', (initialGameData) => {
    if (!game.isInitGame) {
      eventHandler.initializeGameState(initialGameData);
      console.log('게임 초기화 데이터:', game, '출력시간', Date.now());
      initGame();
      document.querySelector('#skill').style.display = 'block';
    }
    eventHandler.opponentMoveEmoji(game.basePosition);
    eventHandler.moveEmoji(game.opponentBasePosition);
  });

  serverSocket.on('updateGameState', (syncData) => {
    eventHandler.updateGameState(syncData);
  });

  serverSocket.on('gameOver', (data) => {
    const winSound = new Audio('sounds/win.mp3');
    const loseSound = new Audio('sounds/lose.mp3');
    winSound.volume = 0.01;
    loseSound.volume = 0.1;

    if (data.isWin) {
      bgm.pause();
      winSound.play().then(() => {
        alert('당신이 게임에서 승리했습니다!');
        // TODO. 게임 종료 이벤트 전송
        sendEvent(99);
        location.reload();
      });
    } else if (data.OpponentForfeit) {
      // bgm.pause();
      winSound.play().then(() => {
        alert('상대방이 게임에서 나갔습니다. 당신이 이겼습니다...');
        // TODO. 게임 종료 이벤트 전송
        sendEvent(99);
        location.reload();
      });
    } else {
      bgm.pause();
      loseSound.play().then(() => {
        alert('아쉽지만 대결에서 패배하셨습니다! 다음 대결에서는 꼭 이기세요!');
        // TODO. 게임 종료 이벤트 전송
        sendEvent(99);
        location.reload();
      });
    }
  });

  //타워 구입 이벤트
  serverSocket.on('makeTower', (data) => {
    eventHandler.makeTower(data);
  });
  serverSocket.on('opponentMakeTower', (data) => {
    eventHandler.makeOpponentTower(data);
  });
  //몬스터 스폰 이벤트
  serverSocket.on('spawnMonster', (data) => {
    eventHandler.spawnMonster(data);
  });
  serverSocket.on('opponentSpawnMonster', (data) => {
    eventHandler.opponentSpawnMonster(data);
  });
  //몬스터 처치 이벤트
  serverSocket.on('monsterDead', (data) => {
    eventHandler.monsterDead(data);
  });
  serverSocket.on('opponentMonsterDead', (data) => {
    eventHandler.opponentMonsterDead(data);
  });

  //타워 공격 이벤트
  serverSocket.on('towerAttack', (data) => {
    eventHandler.towerAttack(data);
  });
  serverSocket.on('opponentTowerAttack', (data) => {
    eventHandler.opponentTowerAttack(data);
  });

  //아이템 타워 파괴
  serverSocket.on('towerDestroy', (data) => {
    eventHandler.itemTowerDestroy(data);
  });

  serverSocket.on('opponentTowerDestroy', (data) => {
    eventHandler.opponentItemTowerDestroy(data);
  });

  //아이템 모든 몬스터 삭제
  serverSocket.on('removeItemMonster', (data) => {
    eventHandler.itemMonsterDead(data);
  });
  serverSocket.on('removeItemOpponentMonster', (data) => {
    eventHandler.opponentItemMonsterDead(data);
  });

  //아이템 베이스 체력 회복
  serverSocket.on('ItemBaseHp', (data) => {
    eventHandler.itemHeal(data);
  });
  //채팅 이벤트
  serverSocket.on('opponentEmoji', (data) => {
    eventHandler.opponentEmoji(data);
  });

  //채팅 입력
  serverSocket.on('chat', (data) => {
    eventHandler.makeChat(data);
  });

  //스킬 공격당함
  serverSocket.on('skillHeat', (data) => {
    eventHandler.skillHeat(data);
  });

  //에러 이벤트
  serverSocket.on('error', (errorResponse) => {
    if (errorResponse === '이미 대기열에 포함되어 있습니다. 다른 아이디로 다시 접속해 주세요.') {
      console.log('실행확인');
      alert(errorResponse);
      location.href = '/login.html';
      return;
    }
    if (
      errorResponse.responseCode === 40001 ||
      errorResponse.responseCode === 50000 ||
      errorResponse.responseCode === 50001
    ) {
      alert(`${errorResponse.data.message} 로그인 페이지로 이동합니다.`);
      location.href = '/login.html';
    }
    openModal(errorResponse.data.message);
  });
});

/**
 * 1: matchGame, // 현재는 안쓰는중
 * 10: initialData,
 * 6: buyTower,
 * 7: attackTower,
 * 40: spawnMonster,
 * 50: monsterAttackBase,
 *
 */
export const sendEvent = (handlerId, payload) => {
  serverSocket.emit('event', {
    userId: game.userId,
    clientVersion: CLIENT_VERSION,
    handlerId,
    payload,
  });
};

const buyTowerButton = document.createElement('button');
buyTowerButton.textContent = '타워 구입';
buyTowerButton.style.position = 'absolute';
buyTowerButton.style.top = '10px';
buyTowerButton.style.right = '10px';
buyTowerButton.style.padding = '10px 20px';
buyTowerButton.style.fontSize = '16px';
buyTowerButton.style.cursor = 'pointer';
buyTowerButton.style.display = 'none';

buyTowerButton.addEventListener('click', placeNewTower);

document.body.appendChild(buyTowerButton);

const buyTowerBombButton = document.createElement('button');
buyTowerBombButton.textContent = '타워 폭탄 구매';
buyTowerBombButton.style.position = 'absolute';
buyTowerBombButton.style.top = '150px';
buyTowerBombButton.style.right = '150px';
buyTowerBombButton.style.padding = '10px 20px';
buyTowerBombButton.style.fontSize = '16px';
buyTowerBombButton.style.cursor = 'pointer';
buyTowerBombButton.style.display = 'none';

buyTowerBombButton.addEventListener('click', towerBomb);

document.body.appendChild(buyTowerBombButton);

const buyBombButton = document.createElement('button');
buyBombButton.textContent = '폭탄 구매';
buyBombButton.style.position = 'absolute';
buyBombButton.style.top = '60px';
buyBombButton.style.right = '10px';
buyBombButton.style.padding = '10px 20px';
buyBombButton.style.fontSize = '16px';
buyBombButton.style.cursor = 'pointer';
buyBombButton.style.display = 'none';

buyBombButton.addEventListener('click', monsterBomb);

document.body.appendChild(buyBombButton);

const buyHealButton = document.createElement('button');
buyHealButton.textContent = '힐 구매';
buyHealButton.style.position = 'absolute';
buyHealButton.style.top = '60px';
buyHealButton.style.right = '150px';
buyHealButton.style.padding = '10px 20px';
buyHealButton.style.fontSize = '16px';
buyHealButton.style.cursor = 'pointer';
buyHealButton.style.display = 'none';

buyHealButton.addEventListener('click', baseHeal);

document.body.appendChild(buyHealButton);

document.querySelector('#skill').addEventListener('click', () => {
  eventHandler.skill();
});
