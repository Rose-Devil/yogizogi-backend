let emitImpl = null;

function setEmitter(fn) {
  emitImpl = typeof fn === "function" ? fn : null;
}

function emitToRoom(roomId, event, payload) {
  if (!emitImpl) return;
  emitImpl(roomId, event, payload);
}

module.exports = { setEmitter, emitToRoom };

