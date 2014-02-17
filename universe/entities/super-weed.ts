var SUPER_WEED_MATERIAL = LoadJaggyMaterial('images/super-weed.png');
var GROW_CYCLE = 50;

var WEED_GRID = new Grid<Entity>();
var MAX_WEEDS = 1000;
var num_weeds = 0;

class SuperWeed implements Entity {
  sprite = new THREE.Sprite(SUPER_WEED_MATERIAL);
  id = -1;
  growTimer = GROW_CYCLE;
  numSprouts = 0;
  age = 0;

  constructor(public x:number, public y:number) {
    this.x = x;
    this.y = y;
    var lc = game.blockToLocal(x, y);
    this.sprite.position.set(lc[0], lc[1] + 15, -1);
    this.sprite.scale.set(4 * 8, 4 * 8, 1.0);
    WEED_GRID.set(this.x, this.y, this);
    num_weeds++;
  }

  tick() {
    if (this.numSprouts > 1 || num_weeds > MAX_WEEDS) {
      return;
    }
    this.age++;
    if (this.growTimer == 0) {
      var index = Math.floor(Math.random() * 4);
      var neighbors = Grid.neighbors(this.x, this.y, 1);
      if (this.isHospitable(neighbors[index][0], neighbors[index][1])) {
        var newSuperWeed = new SuperWeed(neighbors[index][0], neighbors[index][1]);
        game.addEntity(newSuperWeed);
        this.numSprouts++;
      }
      this.growTimer = GROW_CYCLE;
    } else {
      this.growTimer--;
    }
  }

  isHospitable(x:number, y:number) : boolean {
    var isOkay : boolean = !WEED_GRID.has(x, y);
    isOkay = isOkay && (y >= 0);
    isOkay = isOkay && (y < 20);
    return isOkay;
  }

}