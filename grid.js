function Grid() {

};

// Returns list of neighboring grid coordinates
Grid.neighbors = function(x, y, range) {
  if (range === undefined) {
    range = 1;
  }
  var neighbors = [];
  for (var i = -range; i <= range; i++) {
    for (var j = -range; j <= range; j++) {
      if (i == 0 && j == 0) {
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