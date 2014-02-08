var MAX_HEIGHT = 7;
var GROW_SPEED = 60;

var BARK_MATERIAL = LoadJaggyMaterial('images/bark.png');
var LEAVES_MATERIAL = LoadJaggyMaterial('images/leaves.png');

class Tree implements Entity {
  sprite = new THREE.Sprite(BARK_MATERIAL);
  id = -1;

  height = 0;
  hasLeaves = false;
  ticksSinceLastGrow = 0;

  constructor(public x:number, public y:number) {
    this.grow();
  }

  tick() {
    if (++this.ticksSinceLastGrow == GROW_SPEED) {
      this.grow();
      this.ticksSinceLastGrow = 0;
    }
  }

  grow = function() {
    if (this.height < MAX_HEIGHT) {
      var bark = new THREE.Sprite(BARK_MATERIAL);
      var lc = game.blockToLocal(this.x, this.y + this.height);
      bark.position.set(lc[0], lc[1], -2);
      bark.scale.set(16 * 4, 16 * 4, 1.0);
      game.scene.add(bark);
      this.height++;
    } else if (!this.hasLeaves) {
      var leaves = new THREE.Sprite(LEAVES_MATERIAL);
      var lc = game.blockToLocal(this.x, this.y + this.height);
      leaves.position.set(lc[0], lc[1], -1);
      leaves.scale.set(64 * 4, 32 * 4, 1.0);
      game.scene.add(leaves);
      this.hasLeaves = true;
    }
  }
}
