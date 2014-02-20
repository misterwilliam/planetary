var BOAR_MATERIAL = LoadJaggyMaterial('images/boar.png');

class Boar implements Entity {
  sprite = new THREE.Sprite(BOAR_MATERIAL);
  id = -1;
  state : string;
  decisionTimer = 0;

  constructor(public x:number, public y:number) {
    var lc = game.blockToLocal(x, y);
    this.sprite.position.set(lc[0], lc[1] + 15, -1);
    this.sprite.scale.set(4 * 32, 4 * 32, 1.0);
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
      this.sprite.position.x -= 10;
    } else {
      this.sprite.position.x += 10;
    }

    this.decisionTimer++;
    if (this.decisionTimer == 30) {
      this.decisionTimer = 0;
    }
  }

}