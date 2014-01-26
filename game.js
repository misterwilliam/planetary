var PLAYER_MAX_SPEED = 8;
var PLAYER_ACCELERATION = 0.001;
var JUMP_HEIGHT = 10;


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
  this.lastMined = -10000;
  this.unprocessedFrames = 0;
  this.input = {
    jump: false, down: false, right: false, left: false, mine:false
  };

  this.terrainGrid = {};
};

Game.prototype.handleInput = function() {
  if (this.input.jump) {
    this.player.jump();
  } else if (this.input.down) {
    this.player.sprite.position.y -= 10;
  }

  if (this.input.right) {
    this.player.speedX += PLAYER_ACCELERATION;
    this.player.speedX = Math.max(
        this.player.speedX, PLAYER_MAX_SPEED);
  }  else if (this.input.left) {
    this.player.speedX -= PLAYER_ACCELERATION;
    this.player.speedX = Math.min(
        this.player.speedX, -PLAYER_MAX_SPEED);
  }

  if (this.input.mine) {
    var now = getNow();
    if (now - 1000 < this.lastMined) {
      return;
    }
    this.lastMined = now;

    var groundCoord = this.getGroundBeneathPlayer();
    if (groundCoord) {
      var ground = this.terrainGrid[[groundCoord[0], groundCoord[1]]];
      this.scene.remove(ground.sprite);
      delete this.terrainGrid[[groundCoord[0], groundCoord[1]]];
    }
  }
};

Game.prototype.handleKey = function(event) {
  var key = {
    87: 'jump', // w
    83: 'down', // s
    68: 'right', // d
    65: 'left', // a
    32: 'mine', // space
  }[event.which]

  if (event.type == 'keydown') {
    this.input[key] = true;
  } else {
    this.input[key] = false;
  }
}

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

  $(document).on("keydown", this, this.handleKey.bind(this));
  $(document).on("keyup", this, this.handleKey.bind(this));
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

var tickCount = 0;
// Single tick of game time (1 frame)
Game.prototype.tick = function() {
  tickCount ++;
  if (tickCount % 60 == 0) {
    // console.log(this.input);
  }
  this.handleInput();
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
