function Player () {
  var dudeTexture = THREE.ImageUtils.loadTexture('images/dude.png');
  var dudeMaterial = new THREE.SpriteMaterial({ map: dudeTexture });
  this.speedX = -6;
  this.sprite = new THREE.Sprite(dudeMaterial);
  this.sprite.position.set(0, 100, 0);
  this.sprite.scale.set(4*13, 4*21, 1.0); // imageWidth, imageHeight
  this.direction = -1;
};

Player.prototype.tick = function() {
  // Gravity on player
  if (this.sprite.position.y > 0) {
    this.sprite.position.y -= 1;
  }

  // apply speed to position
  this.sprite.position.x += this.speedX;

  // facing
  if ((this.direction == -1 && this.speedX > 0) ||
      (this.direction == 1 && this.speedX < 0)) {
    this.sprite.scale.x *= -1;
    this.direction *= -1
  }

  // friction
  if (this.speedX) {
    this.speedX *= 0.97;
    if (Math.abs(this.speedX) < 0.50) {
      this.speedX = 0;
    }
  }
};

Player.prototype.jump = function() {
  var JUMP_HEIGHT = 10;
  this.sprite.position.y += JUMP_HEIGHT;
};
