
class BlockCollisionDetector {
  constructor(private grid:Grid<Ground>) {
  }

  collide(topLeftLC:number[],
          bottomRightLC:number[],
          velocity : THREE.Vector2) : BlockCollision[] {

    // In the first phase, we find the set of solid blocks which are fully or
    // partially inside the given rectangle. Blocks touching but outside are not
    // considered collisions, hence the rounding "in".

    var blocks : number[][] = [];
    var topLeftBC = [
      Math.round(topLeftLC[0] / BLOCK_SIZE),
      Math.ceil((topLeftLC[1] / BLOCK_SIZE) - 0.5)
    ];
    var bottomRightBC = [
      Math.ceil((bottomRightLC[0] / BLOCK_SIZE) - 0.5),
      Math.round(bottomRightLC[1] / BLOCK_SIZE)
    ];
    for (var x = topLeftBC[0]; x <= bottomRightBC[0]; x++) {
      for (var y = topLeftBC[1]; y >= bottomRightBC[1]; y--) {
        if (this.grid.has(x, y)) {
          blocks.push([x, y]);
        }
      }
    }

    // To know how to react to each collision, we need to figure out which of
    // its 4 sides we would have hit first, given our velocity.
    //
    // We can eliminate 1 side from each axis using our direction. E.g. we
    // couldn't have hit the bottom if we're moving down, or the left if we're
    // moving left.
    //
    // Then we decide which of the 2 remaining sides we hit first by comparing
    // block penetration time on each axis.

    var collisions:BlockCollision[] = [];
    for (var i = 0; i < blocks.length; i++) {
      var bc = blocks[i];
      var lc = game.blockToLocal(bc[0], bc[1]);

      var timeX = Infinity;
      if (velocity.x > 0) {  // Moving right.
        timeX = (bottomRightLC[0] - (lc[0] - HALF_BLOCK)) / velocity.x;
      } else if (velocity.x < 0) {  // Moving left.
        timeX = ((lc[0] + HALF_BLOCK) - topLeftLC[0]) / -velocity.x;
      }

      var timeY = Infinity;
      if (velocity.y > 0) {  // Moving down.
        timeY = (topLeftLC[1] - (lc[1] - HALF_BLOCK)) / velocity.y;
      } else if (velocity.y < 0) {  // Moving up.
        timeY = ((lc[1] + HALF_BLOCK) - bottomRightLC[1]) / -velocity.y;
      }

      var side:BlockSide = null;
      if (timeX < timeY) {
        if (velocity.x > 0) {
          // Ignore collision with a side that has an adjacent block, since it's
          // an "inside" edge.
          if (!this.grid.has(bc[0] - 1, bc[1])) {
            side = BlockSide.LEFT;
          }
        } else {
          if (!this.grid.has(bc[0] + 1, bc[1])) {
            side = BlockSide.RIGHT;
          }
        }
      } else {
        if (velocity.y > 0) {
          if (!this.grid.has(bc[0], bc[1] - 1)) {
            side = BlockSide.BOTTOM;
          }
        } else {
          if (!this.grid.has(bc[0], bc[1] + 1)) {
            side = BlockSide.TOP;
          }
        }
      }

      if (side !== null) {
        collisions.push(new BlockCollision(bc, side));
      }
    }

    return collisions;
  }
}

enum BlockSide {
  LEFT,
  RIGHT,
  TOP,
  BOTTOM
}

class BlockCollision {
  constructor(public bc:number[], public side:BlockSide) {
  }

  // Returns the X (LEFT, RIGHT) or Y (TOP, BOTTOM) GL coordinate of the edge
  // that was hit.
  line() : number {
    switch (this.side) {
    case BlockSide.LEFT:
      return this.bc[0] * BLOCK_SIZE - HALF_BLOCK;
    case BlockSide.RIGHT:
      return this.bc[0] * BLOCK_SIZE + HALF_BLOCK;
    case BlockSide.TOP:
      return this.bc[1] * BLOCK_SIZE + HALF_BLOCK;
    case BlockSide.BOTTOM:
      return this.bc[1] * BLOCK_SIZE - HALF_BLOCK;
    }
  }

  // Returns the line segment of the edge that was hit in GL coordinates.
  segment() : number[][] {
    switch (this.side) {
    case BlockSide.LEFT:
      return [
        [this.line(), this.bc[1] * BLOCK_SIZE + HALF_BLOCK],
        [this.line(), this.bc[1] * BLOCK_SIZE - HALF_BLOCK]
      ];
    case BlockSide.RIGHT:
      return [
        [this.line(), this.bc[1] * BLOCK_SIZE + HALF_BLOCK],
        [this.line(), this.bc[1] * BLOCK_SIZE - HALF_BLOCK]
      ];
    case BlockSide.TOP:
      return [
        [this.bc[0] * BLOCK_SIZE + HALF_BLOCK, this.line()],
        [this.bc[0] * BLOCK_SIZE - HALF_BLOCK, this.line()]
      ];
    case BlockSide.BOTTOM:
      return [
        [this.bc[0] * BLOCK_SIZE + HALF_BLOCK, this.line()],
        [this.bc[0] * BLOCK_SIZE - HALF_BLOCK, this.line()]
      ];
    }
  }
}
