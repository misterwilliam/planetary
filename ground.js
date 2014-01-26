
var DRY_MATERIAL = new THREE.SpriteMaterial({
  map: THREE.ImageUtils.loadTexture('images/ground.png')
});

var WET_MATERIAL = new THREE.SpriteMaterial({
  map: THREE.ImageUtils.loadTexture('images/soil.png')
});

function Ground(x, y) {
  this.x = x;
  this.y = y;
  this.sprite = new THREE.Sprite(DRY_MATERIAL);
  this.sprite.position.set(x * 64, -74 + (64 * y), 0);
  this.sprite.scale.set(64, 64, 1.0);

  this.waterLevel = 0;
  this.t = 0;
};

Ground.prototype.tick = function() {
  if (++this.t == 60) {
    if (this.sprite.material == DRY_MATERIAL) {
      this.beWet();
    } else {
      this.beDry();
    }
    this.t = 0;
  }
};

Ground.prototype.neighbors = function() {
  return [
    [this.x + 1, this.y + 1],
    [this.x + 1, this.y - 1],
    [this.x + 1, this.y],
    [this.x - 1, this.y + 1]
    [this.x - 1, this.y - 1],
    [this.x - 1, this.y],
    [this.x,     this.y + 1],
    [this.x,     this.y - 1],
  ];
};

Ground.prototype.beDry = function() {
  this.sprite.material = DRY_MATERIAL;
};

Ground.prototype.beWet = function() {
  this.sprite.material = WET_MATERIAL;
};
