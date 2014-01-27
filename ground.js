
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
  this.sprite.position.set(x * 64, 64 * y, 0);
  this.sprite.scale.set(64, 64, 1.0);

  this.waterLevel = 0;
};

Ground.prototype.tick = function() {
};

Ground.prototype.water = function(amt) {
  this.waterLevel += amt;
  if (this.waterLevel >= 100) {
    this.beWet();
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
