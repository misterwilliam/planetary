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
    if (random_number > 0.95) {
      this.spawnABoar(x);
    }
  }

  // Spawn up to 10 boars randomly position centered around x.
  spawnABoar(x : number) {
    var random_x_offset = Math.floor((Math.random() * 60) - 30);
    var boar = new Boar(random_x_offset + x, 2);
    this.game.addEntity(boar);

    if (typeof this.creatureArray[this.i] != 'undefined') {
      this.game.removeEntity(this.creatureArray[this.i]);
    }
    this.creatureArray[this.i] = boar;

    this.i++;
    if (this.i > 10) {
      this.i = 0;
    }
  }
}