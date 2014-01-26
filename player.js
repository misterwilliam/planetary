function Player () {
  var dudeTexture = THREE.ImageUtils.loadTexture('images/dude.png');
  var dudeMaterial = new THREE.SpriteMaterial({ map: dudeTexture });
  this.sprite = new THREE.Sprite(dudeMaterial);
  this.sprite.position.set(0, 100, 0);
  this.sprite.scale.set(4*13, 4*21, 1.0); // imageWidth, imageHeight
};

Player.prototype.tick = function() {
  // Gravity on player
  if (this.sprite.position.y > 0) {
    this.sprite.position.y -= 1;
  }
}