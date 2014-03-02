class CreatureSpawner {
  // There are a lot of issues that are relevant to a creature spawner
  // that are being ignored for the time being. Noting for properity,
  // spawner should spawn creatures offscreen within some bounding region
  // from the camera. Spawner should also garbage collect creatures that
  // are outside of some bounding region.
  game : Game;
  creatureArray = new Array();
  i = 0;

  constructor(game : Game) {
    this.game = game;
  }

  // Spawn creatures off screen given the x and y coordinates of the camera (in
  // block coordinates). This is admittedly a suboptimal interface and could be
  // improved.
  spawnCreatures(x : number, y : number) {
    var random_number = Math.random();
    if (random_number > 0.99) {
      this.spawnSomething(x);
    }
  }

  // Spawn up to 4 creatures randomly position centered around x.
  spawnSomething(x : number) {
    var random_x_offset = Math.floor((Math.random() * 60) - 30);
    var random_y_offset = Math.floor((Math.random() * 20) - 10);
    var rand = Math.random();
    var entity : Entity;
    if (rand > 0.5)  {
      entity = new Sandworm(random_x_offset + x, 15 + random_y_offset);
    } else {
      entity = new Boar(random_x_offset + x, 2);
    }
    this.game.addEntity(entity);

    if (typeof this.creatureArray[this.i] != 'undefined') {
      this.game.removeEntity(this.creatureArray[this.i]);
    }
    this.creatureArray[this.i] = entity;

    this.i++;
    if (this.i > 4) {
      this.i = 0;
    }
  }
}