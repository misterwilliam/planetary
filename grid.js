function Grid() {
  this._grid = {};
};

Grid.prototype.set = function(x, y, value) {
  this._grid[[x, y]] = value;
};

Grid.prototype.get = function(x, y) {
  return this._grid[[x, y]];
};

Grid.prototype.has = function(x, y) {
  return [x,y] in this._grid;
}

Grid.prototype.clear = function(x, y) {
  delete this._grid[[x, y]];
}

// Returns list of neighboring grid coordinates. If range is passed then
// returns list of neighbors withing Manhattan distance range.
Grid.neighbors = function(x, y, range) {
  if (range === undefined) {
    range = 1;
  }
  var neighbors = [];
  for (var i = -range; i <= range; i++) {
    for (var j = -range; j <= range; j++) {
      if ((i == 0 && j == 0) || (Math.abs(i) + Math.abs(j) > range)) {
        continue;
      }
      neighbors.push([x + i, y + j]);
    }
  }
  return neighbors;
};

Grid.entityNeighbors = function(entity, range) {
  var block = game.localToBlock(entity.sprite.position.x,
                                entity.sprite.position.y);
  return Grid.neighbors(block[0], block[1], range);
}