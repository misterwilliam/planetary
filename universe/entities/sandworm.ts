var SANDWORM_MATERIAL = LoadJaggyMaterial('images/sand-worm.png');

class Sandworm implements Entity {
  sprite = new THREE.Sprite(SANDWORM_MATERIAL);
  id = -1;
  state : string;
  decisionTimer = 0;

  constructor(public x:number, public y:number) {
    var lc = game.blockToLocal(x, y);
    this.sprite.position.set(lc[0], lc[1] + 15, -1);
    this.sprite.scale.set(4 * 64, 4 * 32, 1.0);
  }

  tick() {
    if (this.decisionTimer == 0) {
      if (Math.random() > 0.5) {
        this.state = "left";
      } else {
        this.state = "right";
      }
    }

    if (this.state == "left") {
      this.sprite.position.x -= 1;
      this.sprite.scale.x = -(4*64);
    } else {
      this.sprite.position.x += 1;
      this.sprite.scale.x = (4*64);
    }

    this.decisionTimer++;
    if (this.decisionTimer == 120) {
      this.decisionTimer = 0;
    }
  }

}