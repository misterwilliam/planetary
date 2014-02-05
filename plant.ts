
var GREEN_MATERIAL = LoadJaggyMaterial('images/plant.png');
var BROWN_MATERIAL = LoadJaggyMaterial('images/plant-brown.png');
var BLACK_MATERIAL = LoadJaggyMaterial('images/plant-black.png');

class Plant implements Entity {
  sprite = new THREE.Sprite(GREEN_MATERIAL);
  ticksSinceLastDrop = 0;
  ticksSinceLastDecay = 0;
  life = 100;
  id = -1;
  constructor(public x:number, public y:number) {
    var lc = game.blockToLocal(x, y);
    this.sprite.position.set(lc[0], lc[1], 0);
    this.sprite.scale.set(64, 64, 1.0);
  }

  tick() {
    if (++this.ticksSinceLastDrop == 60) {
      this.dropWater();
      this.ticksSinceLastDrop = 0;
    }
    if (++this.ticksSinceLastDecay == 60 * 5) {
      this.decay(20);
      this.ticksSinceLastDecay = 0;
    }
  }

  dropWater = function() {
    var neighborCoords = Grid.entityNeighbors(this, 2);
    neighborCoords.forEach(function(coord) {
      var x = coord[0];
      var y = coord[1];
      var ground = game.terrainGrid.get(x, y);
      if (ground) {
        ground.water(20);
      }
    });
  }

  decay(amt:number) {
    this.life -= amt;
    if (this.life <= 0) {
      this.sprite.material = BLACK_MATERIAL;
    } else if (this.life <= 50) {
      this.sprite.material = BROWN_MATERIAL;
    }
  }
}
