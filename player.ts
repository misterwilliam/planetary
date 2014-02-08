var DUDE_MATERIAL = LoadJaggyMaterial('images/dude.png');
var FLASH_MATERIAL = LoadJaggyMaterial('images/flash.png')
var NEGINFINITY = -(1 / 0)
var PAN_DISTANCE = 300;

class Player implements Entity {
  speedX = 0;
  speedY = 0;
  sprite = new THREE.Sprite(DUDE_MATERIAL);
  direction = -1;
  lastDig = -10000;
  flashSprite = new THREE.Sprite(FLASH_MATERIAL);
  id : number = -1;

  constructor(public game:Game) {
    this.teleport(0, 20);
    this.sprite.scale.set(4*13, 4*21, 1.0); // imageWidth, imageHeight
    this.flashSprite.scale.set(4*13, 4*21, 1.0); // imageWidth, imageHeight
  }

  tick() {
    // Move camera with player.
    var cameraOffset = this.sprite.position.x - this.game.camera.position.x;
    if (cameraOffset > PAN_DISTANCE) {
      this.game.panCamera(Math.abs(this.speedX) || 0.5);
    } else if (cameraOffset < -PAN_DISTANCE) {
      this.game.panCamera(-Math.abs(this.speedX) || -0.5);
    }

    // Gravity on player.
    if (!this.game.onGround(this)) {
      this.speedY -= 0.7;
    }

    // Apply speed to position.
    this.sprite.position.x += this.speedX;

    var groundBeneath = this.game.getGroundBeneathEntity(this);
    this.sprite.position.y += this.speedY;
    var newGroundBeneath = this.game.getGroundBeneathEntity(this);
    if (groundBeneath != newGroundBeneath) {
      // collide with old ground beneath
      // we went through groundBeneith, so reset our height to be its.
      var oldGroundY = groundBeneath ?
          groundBeneath.sprite.position.y : NEGINFINITY;
      var newGroundY = newGroundBeneath ?
          newGroundBeneath.sprite.position.y : NEGINFINITY;
      this.sprite.position.y = Math.max(oldGroundY, newGroundY) + MAGIC_NUMBER;
      this.speedY = 0;
    }

    // facing
    if ((this.direction == -1 && this.speedX > 0) ||
        (this.direction == 1 && this.speedX < 0)) {
      this.sprite.scale.x *= -1;
      this.direction *= -1
    }

    // friction
    if (this.speedX) {
      this.speedX *= 0.92;
      if (Math.abs(this.speedX) < 0.50) {
        this.speedX = 0;
      }
    }

    // Highlight the trail of blocks we enter.
    if (game.debug) {
      var bc = game.localToBlock(this.sprite.position.x,
                                    this.sprite.position.y);
      var outline : THREE.Line = game.outlineBlock(bc[0], bc[1]);
      setTimeout(function() {game.scene.remove(outline)}, 500);
    }
  }

  teleport(x:number, y:number) {
    var lc = game.blockToLocal(x, y);
    this.sprite.position.set(lc[0], lc[1], 0);
  }

  jump() {
    if (this.game.onGround(this)) {
      this.speedY = 13;
    }
  }

  dig() {
    var now = getNow();
    if (now - 650 < this.lastDig) {
      return;
    }
    this.lastDig = now;

    var flashSprite = this.flashSprite;
    flashSprite.position.set(this.sprite.position.x,
                             this.sprite.position.y - 30,
                             1);
    game.scene.add(flashSprite);
    setTimeout(function() {
      game.scene.remove(flashSprite);
    }, 100);

    var ground = this.game.getGroundBeneathEntity(this);
    if (ground) {
      ground.hit();
    }
  }
}

