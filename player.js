function Player (game) {
  var dudeTexture = THREE.ImageUtils.loadTexture('images/dude.png');
  var dudeMaterial = new THREE.SpriteMaterial({ map: dudeTexture });
  this.speedX = -6;
  this.speedY = 3
  this.sprite = new THREE.Sprite(dudeMaterial);
  this.sprite.position.set(0, 100, 0);
  this.sprite.scale.set(4*13, 4*21, 1.0); // imageWidth, imageHeight
  this.direction = -1;
  this.game = game;
};

Player.prototype.tick = function() {
  // Gravity on player
  if (!this.game.onGround(this.sprite)) {
    this.speedY -= 0.3;
  }


  // apply speed to position
  this.sprite.position.x += this.speedX;

  var groundBeneath = this.game.terrainGrid[this.game.getGroundBeneath(this.sprite)];
  this.sprite.position.y += this.speedY;
  var newGroundBeneath = this.game.terrainGrid[this.game.getGroundBeneath(this.sprite)];
  if (groundBeneath != newGroundBeneath) {
    // collide with old ground beneath
    this.sprite.position.y = Math.max(groundBeneath.sprite.position.y, newGroundBeneath.sprite.position.y) + 74;
  }

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
  if (this.game.onGround(this.sprite)) {
    this.speedY = 8;
  }
};
