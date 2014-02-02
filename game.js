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

// Creates a new SpriteMaterial with nearest-neighbor texture filtering from
// image URL.
function LoadJaggyMaterial(url) {
  var texture = THREE.ImageUtils.loadTexture(url);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  return new THREE.SpriteMaterial({map: texture});
};

function Game() {
  this.scene = new THREE.Scene();
  this.camera = new THREE.PerspectiveCamera(90, null, 0.1, 1000);
  this.camera.position.set(0, 0, 800);
  this.renderer = new THREE.WebGLRenderer();
  this.resize();
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
  this.debug = false;
  this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  this.projector = new THREE.Projector();
};

Game.prototype.resize = function() {
  this.camera.aspect = window.innerWidth / window.innerHeight;
  this.camera.updateProjectionMatrix();
  this.renderer.setSize(window.innerWidth, window.innerHeight);
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
      this.toggleDebug();
    }
  }
};

Game.prototype.clearInput = function() {
  console.log('clearing input');
  for (var key in this.input) {
    this.input[key] = false;
  }
};

Game.prototype.addEntity = function(entity) {
  entity.id = ++this.lastEntityId;
  this.entities[entity.id] = entity;
  this.scene.add(entity.sprite);
};

Game.prototype.removeEntity = function(entity) {
  this.scene.remove(entity.sprite);
  delete this.entities[entity.id];
};

// Returns local GL coordinates of the center of a block from block coordinates.
Game.prototype.blockToLocal = function(x, y) {
  return [
    (x * BLOCK_SIZE),
    (y * BLOCK_SIZE)
  ];
};

// Returns nearest block coordinates from local GL coordinates. Right and top
// blocks win on edges.
Game.prototype.localToBlock = function(x, y) {
  return [
    Math.round(x / BLOCK_SIZE),
    Math.round(y / BLOCK_SIZE)
  ];
};

// Returns local GL coordinates on the ground plane from normalized device
// coordinates.
Game.prototype.ndcToLocal = function(x, y) {
  var ndc = new THREE.Vector3(x, y, null);
  var raycaster = this.projector.pickingRay(ndc, this.camera);
  return raycaster.ray.intersectPlane(this.groundPlane);
};

Game.prototype.click = function(event) {
  if (this.debug) {
    var lc = this.ndcToLocal(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1);
    var bc = this.localToBlock(lc.x, lc.y);
    console.log('clicked block', bc);
    var outline = game.outlineBlock(bc[0], bc[1], 0x00ff00);
    setTimeout(function() {game.scene.remove(outline)}, 1000);
  }
};

Game.prototype.getGroundBeneathEntity = function (entity) {
  var lc = this.localToBlock(entity.sprite.position.x,
                             entity.sprite.position.y);
  var height = lc[1] - 1;
  while (!([lc[0], height] in this.terrainGrid)) {
    if (height <= MAX_DEPTH) {
      return null;
    }
    height -= 1;
  }
  return this.terrainGrid[[lc[0], height]];
};

Game.prototype.neighbors = function(entity) {
  var block = this.localToBlock(entity.sprite.position.x,
                                entity.sprite.position.y);
  var x = block[0];
  var y = block[1];
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
  var BACKGROUND_MATERIAL = LoadJaggyMaterial('images/mountains.png');
  for (var x = -30; x < 30; x++) {
    var background_sprite = new THREE.Sprite(BACKGROUND_MATERIAL);
    background_sprite.position.set(x * 640 * 2, 640 - 100, -200);
    background_sprite.scale.set(640*2, 640*2, 1.0); // imageWidth, imageHeight
    this.scene.add(background_sprite);
  }

  window.addEventListener('keydown', this.handleKey.bind(this));
  window.addEventListener('keyup', this.handleKey.bind(this));
  window.addEventListener('blur', this.clearInput.bind(this));
  window.addEventListener('resize', this.resize.bind(this));
  window.addEventListener('mousedown', this.click.bind(this));

  this.animate();
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

Game.prototype.generateVisibleWorld = function() {
  var topLeftLc = this.ndcToLocal(-1, 1);
  var bottomRightLc = this.ndcToLocal(1, -1);
  var topLeftBc = this.localToBlock(topLeftLc.x, topLeftLc.y);
  var bottomRightBc = this.localToBlock(bottomRightLc.x, bottomRightLc.y);
  this.generateWorld(topLeftBc, bottomRightBc);
};

Game.prototype.generateWorld = function(topLeft, bottomRight) {
  this.plants = [];
  var numNew = 0;
  for (var x = topLeft[0]; x <= bottomRight[0]; x++) {
    for (var y = Math.min(topLeft[1], -1); y >= bottomRight[1]; y--) {
      if ([x,y] in this.terrainGrid) {
        continue;
      }
      numNew++;
      var ground = new Ground(x, y);
      this.terrainGrid[[x, y]] = ground;
      this.addEntity(ground);
      if (y == -1 && Math.random() < 0.5) {
        var plant = new Plant(x, 0);
        this.addEntity(plant);
        this.plants.push(plant);
      }
    }
  }
  if (this.debug && numNew > 0) {
    console.log('generated', numNew, 'blocks',
                'from', topLeft, 'to', bottomRight);
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
  this.handleInput();
  if (tickCount == 0) {
    this.generateVisibleWorld();
  }
  for (var id in this.entities) {
    this.entities[id].tick();
  }
  for (var bc in this.terrainGrid) {
    this.terrainGrid[bc].tick();
  }
  tickCount++;
};

Game.prototype.panCamera = function(x, y) {
  if (x != null) {
    this.camera.position.x += x;
  }
  if (y != null) {
    this.camera.position.y += y;
  }
  this.generateVisibleWorld();
}

Game.prototype.toggleDebug = function() {
  this.debug = !this.debug;

  if (this.debug) {
    this.debugSprites = [];

    // Origin block.
    this.debugSprites.push(
      this.outlineBlock(0, 0, 0x0000ff));

    // Origin lines.
    this.debugSprites.push(
      this.drawLine([0, 300], [0, -300], 0xff0000));
    this.debugSprites.push(
      this.drawLine([300, 0], [-300, 0], 0xff0000));

  } else {
    var self = this;
    this.debugSprites.forEach(function(sprite) {
      self.scene.remove(sprite);
    });
  }
};

Game.prototype.drawLine = function(from, to, color) {
  var material = new THREE.LineBasicMaterial({color: color || null});
  var geometry = new THREE.Geometry();
  geometry.vertices.push(new THREE.Vector3(from[0], from[1], 1));
  geometry.vertices.push(new THREE.Vector3(to[0], to[1], 1));
  var line = new THREE.Line(geometry, material);
  this.scene.add(line);
  return line;
};

Game.prototype.drawRect = function(cornerA, cornerB, color) {
  var material = new THREE.LineBasicMaterial({color: color || null});
  var geometry = new THREE.Geometry();
  geometry.vertices.push(new THREE.Vector3(cornerA[0], cornerA[1], 1));
  geometry.vertices.push(new THREE.Vector3(cornerB[0], cornerA[1], 1));
  geometry.vertices.push(new THREE.Vector3(cornerB[0], cornerB[1], 1));
  geometry.vertices.push(new THREE.Vector3(cornerA[0], cornerB[1], 1));
  geometry.vertices.push(new THREE.Vector3(cornerA[0], cornerA[1], 1));
  var box = new THREE.Line(geometry, material);
  this.scene.add(box);
  return box;
};

Game.prototype.outlineBlock = function(x, y, color) {
  var lc = this.blockToLocal(x, y);
  return this.drawRect(
    [lc[0] - BLOCK_SIZE / 2, lc[1] - BLOCK_SIZE / 2],
    [lc[0] + BLOCK_SIZE / 2, lc[1] + BLOCK_SIZE / 2],
    color);
};
