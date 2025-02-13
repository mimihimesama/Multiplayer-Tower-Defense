const users = [];

export const addUser = async (userId, init, socket) => {
  const newUser = {
    userId: userId,
    userGold: init.data.userGold,
    baseHp: init.data.baseHp,
    towerCost: init.data.towerCost,
    monsterLevel: init.data.monsterLevel,
    monsterSpawnInterval: init.data.monsterSpawnInterval,
    score: init.data.score,
    socketId: socket,
  };
  users[userId] = newUser;
};

export const removeUser = (socketId) => {
  const index = users.findIndex((user) => user.socketId === socketId);
  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
};

export const getUser = () => {
  return users;
};

export const getUserById = (userId) => {
  return users[userId];
};
