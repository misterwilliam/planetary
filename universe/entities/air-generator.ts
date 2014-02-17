var AIR_GENERATOR_MATERIAL = LoadJaggyMaterial('images/air-maker.png');

class AirGenerator implements Entity {
  sprite = new THREE.Sprite(AIR_GENERATOR_MATERIAL);
  id = -1;

  constructor(public x:number, public y:number) {
    var lc = game.blockToLocal(x, y);
    this.sprite.position.set(lc[0], lc[1] + 15, -1);
    this.sprite.scale.set(4 * 128, 4 * 128, 1.0);
    
    var points = Grid.neighbors(x, y, 30);
    for (var i = 0; i < points.length; i++) {
      game.atmosphereController.addAir(points[i][0], points[i][1]);
    }
  }

  tick() {
  }

}