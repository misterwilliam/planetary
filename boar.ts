var BOAR_MATERIAL = LoadJaggyMaterial('images/boar.png');

class Boar implements Entity {
  sprite = new THREE.Sprite(BOAR_MATERIAL);
  id = -1;

  constructor(public x:number, public y:number) {
    var lc = game.blockToLocal(x, y);
    this.sprite.position.set(lc[0], lc[1] + 15, -1);
    this.sprite.scale.set(4 * 32, 4 * 32, 1.0);
  }

  tick() {
  }

}