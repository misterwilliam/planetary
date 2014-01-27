
function Plant(x, y) {
  this.x = x;
  this.y = y;
  var texture = THREE.ImageUtils.loadTexture('images/plant.png');
  var material = new THREE.SpriteMaterial({ map: texture });
  this.sprite = new THREE.Sprite(material);
  this.sprite.position.set(x * 64, y * 64, 0);
  this.sprite.scale.set(64, 64, 1.0);
  this.ticksSinceLastDrop = 0;
};

Plant.prototype.tick = function() {
  if (++this.ticksSinceLastDrop == 60) {
    this.dropWater();
    this.ticksSinceLastDrop = 0;
  }
};

Plant.prototype.dropWater = function() {
  var neighborCoords = game.neighbors(this);
  neighborCoords.forEach(function(coord) {
    var x = coord[0];
    var y = coord[1];
    ground = game.terrainGrid[[x,y]];
    if (ground) {
      ground.water(50);
    }
  });
};
