import { addMatch, getMatchPlayers, clearMatchPlayers } from '../models/match.model.js';
import { v4 as uuid } from 'uuid';

export const matchGame = async (userId, socket, io) => {
  const MatchArray = getMatchPlayers();
  const duplicateUsers = MatchArray.filter((item) => item.userId === userId);

  if (duplicateUsers.length > 0) {
    socket.isMatchOverlap = true;
    socket.emit('matchOverlap', {
      message: '중복된 유저입니다.',
    });
    return;
  }

  // 중복된 유저가 없으면 addMatch에 추가
  addMatch(userId, socket.id);
  console.log('최종 대기열:', MatchArray); //테스트 코드

  const players = getMatchPlayers();

  if (MatchArray.length >= 2) {
    const roomName = uuid(); // 방 번호의 규칙을 알 수 없도록

    const player1 = players[0];
    const player2 = players[1];

    io.sockets.sockets.get(player1.socketId).join(roomName);
    io.sockets.sockets.get(player2.socketId).join(roomName);

    // 클라이언트에 매치가 성사되었음을 알림
    io.to(player1.socketId).emit('matchFound', {
      userId: player1.userId,
    });
    io.to(player2.socketId).emit('matchFound', {
      userId: player2.userId,
    });

    clearMatchPlayers();

    const handlePlayerDisconnect = (socket) => {
      io.to(roomName).emit('opponentLeft', { message: '상대방이 게임을 나갔습니다.' });
    };

    io.sockets.sockets.get(player1.socketId).on('disconnect', () => handlePlayerDisconnect(socket));
    io.sockets.sockets.get(player2.socketId).on('disconnect', () => handlePlayerDisconnect(socket));
  }
};
