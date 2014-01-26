var getNow = (function() {
  if (window.performance && window.performance.now) {
    return window.performance.now.bind(window.performance);
  }
  return function(){return +Date()};
})();

function Game(scene, camera, renderer) {
  this.scene = scene;
  this.camera = camera;
  this.renderer = renderer;

  this.now = getNow();
  this.lastTime = getNow();
  this.unprocessedFrames = 0;
};

Game.prototype.handleKeyPress = function(event) {
  var PLAYER_SPEED = 6;
  var JUMP_HEIGHT = 10;
  if (event.which == 119) {  // w
    event.data.playerSprite.position.y += JUMP_HEIGHT;
  } else if (event.which == 115) {  // s
    event.data.playerSprite.position.y -= PLAYER_SPEED;
  } else if (event.which == 100) {  // d
    event.data.playerSprite.position.x += PLAYER_SPEED;
  } else if (event.which == 97) {  // d
    event.data.playerSprite.position.x -= PLAYER_SPEED;
  }
};

Game.prototype.start = function() {
  $(document).on("keypress", this, this.handleKeyPress);

  var dudeTexture = THREE.ImageUtils.loadTexture('images/dude.png');
  var dudeMaterial = new THREE.SpriteMaterial({ map: dudeTexture });
  var sprite = new THREE.Sprite(dudeMaterial);
  sprite.position.set(0, 100, 0);
  sprite.scale.set(4*13, 4*21, 1.0); // imageWidth, imageHeight
  this.playerSprite = sprite;
  var groundTexture = THREE.ImageUtils.loadTexture('images/ground.png');
  var groundMaterial = new THREE.SpriteMaterial({ map: groundTexture });
  for (var i = -30; i < 30; i++) {
    var groundSprite = new THREE.Sprite(groundMaterial);
    groundSprite.position.set(i * 64,-74,0);
    groundSprite.scale.set(64, 64, 1.0);
    this.scene.add(groundSprite);
  }
  this.scene.add(this.playerSprite);

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
  // Gravity on player
  if (this.playerSprite.position.y > 0) {
    this.playerSprite.position.y -= 1;
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
