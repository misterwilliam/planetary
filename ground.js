
function Ground(x, y, z) {
  console.log('new ground');
  var texture = THREE.ImageUtils.loadTexture('images/ground.png');
  var material = new THREE.SpriteMaterial({ map: texture });
  this.sprite = new THREE.Sprite(material);
  this.sprite.position.set(x, y, z);
  this.sprite.scale.set(64, 64, 1.0);
};
