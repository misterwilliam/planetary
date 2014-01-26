var getNow = (function() {
  if (window.performance && window.performance.now) {
    return window.performance.now.bind(window.performance);
  }
  return function(){return +new Date()};
})();

function Game(scene, camera, renderer) {
  this.scene = scene;
  this.camera = camera;
  this.renderer = renderer;

  this.now = getNow();
  this.lastTime = getNow();
  this.unprocessedFrames = 0;

  this.terrainGrid = {};
};

Game.prototype.handleKeyPress = function(event) {
  var PLAYER_MAX_SPEED = 8;
  var PLAYER_ACCELERATION = 2;
  var JUMP_HEIGHT = 10;

  if (event.which == 119) {  // w
    event.data.player.jump();
  } else if (event.which == 115) {  // s
    event.data.player.sprite.position.y -= PLAYER_SPEED;
  } else if (event.which == 100) {  // d
    event.data.player.speedX += PLAYER_ACCELERATION;
    event.data.player.speedX = Math.max(
        event.data.player.speedX, PLAYER_MAX_SPEED);
  } else if (event.which == 97) {  // d
    event.data.player.speedX -= PLAYER_ACCELERATION;
    event.data.player.speedX = Math.min(
        event.data.player.speedX, -PLAYER_MAX_SPEED);
  } else if (event.which == 32) { // space
    var groundCoord = this.getGroundBeneathPlayer();
    if (groundCoord) {
      var ground = this.terrainGrid[[groundCoord[0], groundCoord[1]]];
      this.scene.remove(ground.sprite);
      delete this.terrainGrid[[groundCoord[0], groundCoord[1]]];
    }
  } else {
    console.log('pushed unknown button ', event.which);
  }
};

Game.prototype.addEntity = function(entity) {
  this.scene.add(entity.sprite);
};

Game.prototype.gridToDisplay = function(x, y) {
  return [x * 64, y * 64];
};

Game.prototype.displayToGrid = function(x, y) {
  return [Math.floor(x / 64), Math.floor(y / 64)];
};

Game.prototype.getGroundBeneathPlayer = function () {
  var coords = this.displayToGrid(this.player.sprite.position.x,
                                  this.player.sprite.position.y);

  var height = coords[1];
  console.log(this.terrainGrid);
  while (!([coords[0], height] in this.terrainGrid)) {
    height -= 1;
  }
  return [coords[0], height];
}

Game.prototype.start = function() {
  this.player = new Player();
  this.addEntity(this.player);

  for (var i = -30; i < 30; i++) {
    for (var j = 0; j > -6; j--) {
      var ground = new Ground(i, j);
      this.terrainGrid[[ground.x, ground.y]] = ground;
      this.addEntity(ground);
    }

    if (Math.random() < 0.5) {
      var plant = new Plant(i * 64, -10, 0);
      this.addEntity(plant);
    }
  }

  $(document).on("keypress", this, this.handleKeyPress.bind(this));
  requestAnimationFrame(this.animate.bind(this));

}
// Called when when we are allowed to render. In general at 60 fps.
Game.prototype.animate = function() {
  this.now = getNow();
  this.unprocessedFrames += (this.now - this.lastTime) * 60.0 / 1000.0; // 60 fps
  this.lastTime = this.now;
  if (this.unprocessedFrames > 10.0) {
    this.unprocessedFrames = 10.0;
  }
  while (this.unprocessedFrames > 1.0) {
    this.tick();
    this.unprocessedFrames -= 1.0;
  }
  this.render();
  requestAnimationFrame(this.animate.bind(this));
}

// Renders a single frame
Game.prototype.render = function() {
  this.renderer.render(this.scene, this.camera);
}

// Single tick of game time (1 frame)
Game.prototype.tick = function() {
  this.player.tick();
  for (var coords in this.terrainGrid) {
    this.terrainGrid[coords].tick();
  }
}

var game; // globally visible for debugging;
$(document).ready(function(){
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(90,
          window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 400);

  var renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  game = new Game(scene, camera, renderer);
  game.start();
});
