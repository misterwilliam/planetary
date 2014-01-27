
var GREEN_MATERIAL = new THREE.SpriteMaterial({
  map: THREE.ImageUtils.loadTexture('images/plant.png')
});

var BROWN_MATERIAL = new THREE.SpriteMaterial({
  map: THREE.ImageUtils.loadTexture('images/plant-brown.png')
});

var BLACK_MATERIAL = new THREE.SpriteMaterial({
  map: THREE.ImageUtils.loadTexture('images/plant-black.png')
});

function Plant(x, y) {
  this.x = x;
  this.y = y;
  this.sprite = new THREE.Sprite(GREEN_MATERIAL);
  this.sprite.position.set(x * 64, y * 64, 0);
  this.sprite.scale.set(64, 64, 1.0);
  this.ticksSinceLastDrop = 0;
  this.ticksSinceLastDecay = 0;
  this.life = 100;
};

Plant.prototype.tick = function() {
  if (++this.ticksSinceLastDrop == 60) {
    this.dropWater();
    this.ticksSinceLastDrop = 0;
  }
  if (++this.ticksSinceLastDecay == 60 * 5) {
    this.decay(20);
    this.ticksSinceLastDecay = 0;
  }
};

Plant.prototype.dropWater = function() {
  var neighborCoords = game.neighbors(this);
  neighborCoords.forEach(function(coord) {
    var x = coord[0];
    var y = coord[1];
    ground = game.terrainGrid[[x,y]];
    if (ground) {
      ground.water(20);
    }
  });
};

Plant.prototype.decay = function(amt) {
  this.life -= amt;
  if (this.life <= 0) {
    this.sprite.material = BLACK_MATERIAL;
  } else if (this.life <= 50) {
    this.sprite.material = BROWN_MATERIAL;
  }
};

