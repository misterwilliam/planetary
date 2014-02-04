var DUDE_MATERIAL = LoadJaggyMaterial('images/dude.png');
var FLASH_MATERIAL = LoadJaggyMaterial('images/flash.png')

class Player {
  speedX = 0;
  speedY = 0;
  sprite = new THREE.Sprite(DUDE_MATERIAL);
  direction = -1;
  lastDig = -10000;
  flashSprite = new THREE.Sprite(FLASH_MATERIAL);

  constructor(public game:Game) {
    this.teleport(0, 20);
    this.sprite.scale.set(4*13, 4*21, 1.0); // imageWidth, imageHeight
    this.flashSprite.scale.set(4*13, 4*21, 1.0); // imageWidth, imageHeight
  }

  tick() {
    // Move camera with player
    if (this.sprite.position.x - this.game.camera.position.x > 300) {
      // Pan right with player
      this.game.panCamera(Math.abs(this.speedX));
    } else if (this.sprite.position.x - this.game.camera.position.x < -300) {
      // Pan left with player
      this.game.panCamera(-Math.abs(this.speedX));
    }

    // Gravity on player
    if (!this.game.onGround(this)) {
      this.speedY -= 0.7;
    }

    // apply speed to position
    this.sprite.position.x += this.speedX;

    var groundBeneath = this.game.getGroundBeneathEntity(this);
    this.sprite.position.y += this.speedY;
    var newGroundBeneath = this.game.getGroundBeneathEntity(this);
    if (groundBeneath != newGroundBeneath) {
      // collide with old ground beneath
      // we went through groundBeneith, so reset our height to be its.
      this.sprite.position.y = Math.max(groundBeneath.sprite.position.y, newGroundBeneath.sprite.position.y) + 74;
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
      var outline = game.outlineBlock(bc[0], bc[1]);
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

