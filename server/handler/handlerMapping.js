import { matchGame } from './match.handler.js';
import connectionTest from './test.handler.js';
import initialData from './init.handler.js';
import { spawnMonster } from './monster.handler.js';
import { endGame } from './game.handler.js';

const handlerMappings = {
  1: matchGame, //현재는 안쓰는중
  10: initialData,
  //   5: initTower,
  //   6: buyTower, //사용중
  //   7: attackTower,
  //   8: refundTower,
  //   9: upgradeTower,
  //   12: removeMonster,
  //   13: damageMonster,
  //   14: monsterAttackBase,
  //   15: checkForBreak,
  20: endGame,
  40: spawnMonster,
  999: connectionTest,
};

export default handlerMappings;
