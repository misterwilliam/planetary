var DUDE_MATERIAL = LoadJaggyMaterial('images/dude.png');
var FLASH_MATERIAL = LoadJaggyMaterial('images/flash.png')
var DUDE_WIDTH = 4 * 13;
var DUDE_HEIGHT = 4 * 21;

var WALK_ACCELERATION = 3;
var JUMP_INITIAL_SPEED = 5;
var JUMP_BOOST = 1.5;
var JUMP_BOOST_TICKS = 7;
var MAX_SPEED = HALF_BLOCK;
var GRAVITY = 0.8;
var FRICTION = 0.8;
var DRAG = 0.98;
var CLICK_RADIUS = 128;

class Player implements Entity {
  speedX = 0;
  speedY = 0;
  sprite = new THREE.Sprite (DUDE_MATERIAL);
  lastDig = -10000;
  flashSprite = new THREE.Sprite(FLASH_MATERIAL);
  id : number = -1;
  onGround = true;
  jumpTicks = 0;
  collisionDetector : BlockCollisionDetector;

  constructor(public game:Game) {
    this.sprite.scale.set(DUDE_WIDTH, DUDE_HEIGHT, 1.0);
    this.flashSprite.scale.set(DUDE_WIDTH, DUDE_HEIGHT, 1.0);
    this.teleport(0, 10);
    this.collisionDetector =
      new BlockCollisionDetector(game.gameModel.terrainGrid);
  }

  tick() {
    var mouse = game.inputController.mouse;
    if (mouse.bc) {
      // Calculate radius from the center of the nearest block, not the true
      // mouse coordinates, so that blocks are either fully selectable or not.
      var lc = game.blockToLocal(mouse.bc[0], mouse.bc[1]);
      if (Math.abs(lc[0] - this.sprite.position.x) <= CLICK_RADIUS &&
          Math.abs(lc[1] - this.sprite.position.y) <= CLICK_RADIUS) {
        if (mouse.click) {
          var block = game.gameModel.terrainGrid.get(mouse.bc[0], mouse.bc[1]);
          if (block) {
            block.hit();
          }
        }
        game.addSpriteForTicks(game.outlineBlock(mouse.bc[0], mouse.bc[1]), 1);
      }
    }

    if (game.inputController.input.right) {
      this.speedX += WALK_ACCELERATION;
      this.sprite.scale.x = -DUDE_WIDTH;
    } else if (game.inputController.input.left) {
      this.speedX -= WALK_ACCELERATION;
      this.sprite.scale.x = DUDE_WIDTH;
    }

    if (this.onGround) {
      this.speedX *= FRICTION;
    } else {
      this.speedY -= GRAVITY;
      this.speedX *= DRAG;
    }

    if (game.inputController.input.jump) {
      if (this.onGround) {
        this.speedY = JUMP_INITIAL_SPEED;
        this.jumpTicks = JUMP_BOOST_TICKS;
      } else if (this.jumpTicks-- > 0) {
        this.speedY *= JUMP_BOOST;
      }
    }

    if (Math.abs(this.speedX) < 0.5) {
      this.speedX = 0;
    } else if (Math.abs(this.speedX) > MAX_SPEED) {
      this.speedX = this.speedX > 0 ? MAX_SPEED : -MAX_SPEED;
    }
    if (Math.abs(this.speedY) > MAX_SPEED) {
      this.speedY = this.speedY > 0 ? MAX_SPEED : -MAX_SPEED;
    }

    var pos = this.sprite.position;
    pos.x += this.speedX
    pos.y += this.speedY;

    this.onGround = false;
    var bounding = game.boundingBox(this.sprite);
    var collisions = this.collisionDetector.collide(
      bounding[0], bounding[1], new THREE.Vector2(this.speedX, this.speedY));
    for (var i = 0; i < collisions.length; i++) {
      var collision = collisions[i];
      var line = collision.line();
      switch (collision.side) {
      case BlockSide.LEFT:
        pos.x = Math.min(pos.x, line - DUDE_WIDTH / 2);
        break;
      case BlockSide.RIGHT:
        pos.x = Math.max(pos.x, line + DUDE_WIDTH / 2);
        break;
      case BlockSide.TOP:
        pos.y = Math.max(pos.y, line + DUDE_HEIGHT / 2);
        this.onGround = true;
        break;
      case BlockSide.BOTTOM:
        pos.y = Math.min(pos.y, line - DUDE_HEIGHT / 2);
        this.jumpTicks = 0;
        break;
      }

      if (game.debug) {
        game.addSpriteForTicks(
          game.outlineBlock(collision.bc[0], collision.bc[1], 0xffff00));
        var segment = collision.segment();
        game.addSpriteForTicks(
          game.drawLine(segment[0], segment[1], 0xff0000), 3);
      }
    }

    if (game.hasRendered) {
      var cameraOffset = this.sprite.position.clone().sub(game.camera.position);
      var cameraMotion = new THREE.Vector2(0,0);
      if (Math.abs(cameraOffset.x) > game.cameraDeadzone.x) {
        cameraMotion.x = cameraOffset.x * 0.1;
      }
      if (Math.abs(cameraOffset.y) > game.cameraDeadzone.y) {
        cameraMotion.y = cameraOffset.y * 0.1;
      }
      game.panCamera(cameraMotion.x, cameraMotion.y);
    }
  }

  teleport(x:number, y:number) {
    var lc = game.blockToLocal(x, y);
    this.sprite.position.set(
      lc[0],
      // Align base of sprite to top of block.
      lc[1] + HALF_BLOCK + (Math.abs(this.sprite.scale.y) / 2),
      0);
  }
}
