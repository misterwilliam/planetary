var PLAYER_MAX_SPEED = 8;
var PLAYER_ACCELERATION = 0.001;
var JUMP_HEIGHT = 10;
var MAX_DEPTH = -6;
var MAX_CATCHUP = 10;
var BLOCK_SIZE = 64;

var getNow = (function() {
  if (window.performance && window.performance.now) {
    return window.performance.now.bind(window.performance);
  }
  return function(){return +new Date()};
})();

function Game() {
  this.scene = new THREE.Scene();
  this.camera = new THREE.PerspectiveCamera(
    90, window.innerWidth/window.innerHeight, 0.1, 1000);
  this.camera.position.set(0, 0, 800);
  this.renderer = new THREE.WebGLRenderer();
  this.renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(this.renderer.domElement);

  this.now = getNow();
  this.lastTime = getNow();
  this.unprocessedFrames = 0;
  this.input = {
    jump: false, down: false, right: false, left: false, dig:false
  };

  this.lastEntityId = -1;
  this.entities = [];
  this.terrainGrid = {};
  this.drawDebug();
};

Game.prototype.handleInput = function() {
  if (this.input.jump) {
    this.player.jump();
  } else if (this.input.down) {
    // do nothing
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

  if (this.input.dig) {
    this.player.dig();
  }
};

Game.INPUT_MAP = {
  87:  'jump',  // w
  83:  'down',  // s
  68:  'right', // d
  65:  'left',  // a
  32:  'dig',   // space
  192: 'debug', // ~
};

Game.prototype.handleKey = function(event) {
  var key = Game.INPUT_MAP[event.which];
  if (!key) {
    console.log('unbound key:', event.which);
  } else if (event.type == 'keydown') {
    this.input[key] = true;
  } else {
    this.input[key] = false;
    if (key == 'debug') {
      this.drawDebug();
    }
  }
}

Game.prototype.addEntity = function(entity) {
  entity.id = ++this.lastEntityId;
  this.entities[entity.id] = entity;
  this.scene.add(entity.sprite);
};

Game.prototype.removeEntity = function(entity) {
  this.scene.remove(entity.sprite);
  delete this.entities[entity.id];
};

Game.prototype.gridToDisplay = function(x, y) {
  return [x * BLOCK_SIZE, y * BLOCK_SIZE];
};

Game.prototype.displayToGrid = function(x, y) {
  return [Math.floor(x / BLOCK_SIZE), Math.floor(y / BLOCK_SIZE)];
};

Game.prototype.getGroundBeneathEntity = function (entity) {
  var coords = this.displayToGrid(entity.sprite.position.x,
                                  entity.sprite.position.y);

  var height = coords[1]-1;
  while (!([coords[0], height] in this.terrainGrid)) {
    if (height <= MAX_DEPTH) {
      return null;
    }
    height -= 1;
  }
  return this.terrainGrid[[coords[0], height]];
};

Game.prototype.neighbors = function(entity) {
  var coords = this.displayToGrid(entity.sprite.position.x,
                                  entity.sprite.position.y);
  var x = coords[0];
  var y = coords[1];
  return [
    [x + 1, y + 1],
    [x + 1, y - 1],
    [x + 1, y],
    [x - 1, y + 1],
    [x - 1, y - 1],
    [x - 1, y],
    [x,     y + 1],
    [x,     y - 1],
  ];
};

Game.prototype.start = function() {
  this.player = new Player(this);
  this.addEntity(this.player);

  // Add background
  var BACKGROUND_MATERIAL = new THREE.SpriteMaterial({
    map: THREE.ImageUtils.loadTexture('images/mountains.png')
  });
  for (var x = -30; x < 30; x++) {
    var background_sprite = new THREE.Sprite(BACKGROUND_MATERIAL);
    background_sprite.position.set(x * 640 * 2, 640 - 100, -200);
    background_sprite.scale.set(640*2, 640*2, 1.0); // imageWidth, imageHeight
    this.scene.add(background_sprite);
  }

  this.generateWorld();

  window.addEventListener('keydown', this.handleKey.bind(this));
  window.addEventListener('keyup', this.handleKey.bind(this));
  requestAnimationFrame(this.animate.bind(this));
}

// Called when when we are allowed to render. In general at 60 fps.
Game.prototype.animate = function() {
  this.now = getNow();
  this.unprocessedFrames += (this.now - this.lastTime) * 60.0 / 1000.0; // 60 fps
  this.lastTime = this.now;
  if (this.unprocessedFrames > MAX_CATCHUP) {
    this.unprocessedFrames = MAX_CATCHUP;
  }
  while (this.unprocessedFrames >= 1.0) {
    this.tick();
    this.unprocessedFrames -= 1.0;
  }
  this.render();
  requestAnimationFrame(this.animate.bind(this));
}

// Renders a single frame
Game.prototype.render = function() {
  this.renderer.render(this.scene, this.camera);
};

Game.prototype.generateWorld = function() {
  this.plants = [];
  for (var x = -30; x < 30; x++) {
    for (var y = -1; y > -6; y--) {
      var ground = new Ground(x, y);
      this.terrainGrid[[x, y]] = ground;
      this.addEntity(ground);
    }

    if (Math.random() < 0.5) {
      var plant = new Plant(x, 0);
      this.addEntity(plant);
      this.plants.push(plant);
    }
  }
};

Game.prototype.onGround = function(entity) {
  var ground = this.getGroundBeneathEntity(entity);
  if (!ground) {
    return false;
  }
  return entity.sprite.position.y - (ground.sprite.position.y + 74) < 1;
};

var tickCount = 0;
// Single tick of game time (1 frame)
Game.prototype.tick = function() {
  tickCount ++;
  if (tickCount % 60 == 0) {
    // console.log(this.onGround())
  }
  this.handleInput();
  for (var id in this.entities) {
    this.entities[id].tick();
  }
  for (var coords in this.terrainGrid) {
    this.terrainGrid[coords].tick();
  }
};

Game.prototype.drawDebug = function() {
  // Origin block.
  this.outlineBlock(0, 0, 0x0000ff);

  // Origin lines.
  this.drawLine([0, 300], [0, -300], 0xff0000);
  this.drawLine([300, 0], [-300, 0], 0xff0000);
};

Game.prototype.drawLine = function(from, to, color) {
  var material = new THREE.LineBasicMaterial({color: color || null});
  var geometry = new THREE.Geometry();
  geometry.vertices.push(new THREE.Vector3(from[0], from[1], 10));
  geometry.vertices.push(new THREE.Vector3(to[0], to[1], 10));
  var line = new THREE.Line(geometry, material);
  this.scene.add(line);
  return line;
};

Game.prototype.drawRect = function(cornerA, cornerB, color) {
  var material = new THREE.LineBasicMaterial({color: color || null});
  var geometry = new THREE.Geometry();
  geometry.vertices.push(new THREE.Vector3(cornerA[0], cornerA[1], 10));
  geometry.vertices.push(new THREE.Vector3(cornerB[0], cornerA[1], 10));
  geometry.vertices.push(new THREE.Vector3(cornerB[0], cornerB[1], 10));
  geometry.vertices.push(new THREE.Vector3(cornerA[0], cornerB[1], 10));
  geometry.vertices.push(new THREE.Vector3(cornerA[0], cornerA[1], 10));
  var box = new THREE.Line(geometry, material);
  this.scene.add(box);
  return box;
};

Game.prototype.outlineBlock = function(x, y, color) {
  return this.drawRect(
    [x * BLOCK_SIZE, y * BLOCK_SIZE],
    [x * BLOCK_SIZE + BLOCK_SIZE, y * BLOCK_SIZE + BLOCK_SIZE],
    color);
};
