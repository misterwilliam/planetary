
var DRY_MATERIAL = new THREE.SpriteMaterial({
  map: THREE.ImageUtils.loadTexture('images/ground.png')
});

var WET_MATERIAL = new THREE.SpriteMaterial({
  map: THREE.ImageUtils.loadTexture('images/soil.png')
});

class Ground implements Entity{
  sprite = new THREE.Sprite(DRY_MATERIAL);
  waterLevel = 0;
  id : number = -1;
  constructor(public x:number, public y:number) {
    var lc = game.blockToLocal(x, y);
    this.sprite.position.set(lc[0], lc[1], 0);
    this.sprite.scale.set(BLOCK_SIZE, BLOCK_SIZE, 1.0);
  }

  tick() {}

  water(amt:number) {
    this.waterLevel += amt;
    if (this.waterLevel >= 100) {
      this.beWet();
    }
  }

  neighbors() {
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
  }

  beDry() {
    this.sprite.material = DRY_MATERIAL;
  }

  beWet() {
    this.sprite.material = WET_MATERIAL;
  }

  hit() {
    var self = this;
    game.entities.forEach(function(entity: Entity) {
      if (entity instanceof Plant) {
        return;
      }
      var plant = <Plant>(entity);
      if (plant.x == self.x && plant.y == self.y + 1) {
        game.removeEntity(plant);
      }
    });

    game.scene.remove(this.sprite);
    game.terrainGrid.clear(this.x, this.y);
  }

}
