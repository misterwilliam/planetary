
//
// game.ts
//

class Game {
  input : Input;
  camera : Camera;
  scene : THREE.Scene;
  player : Player;
  planet : Planet;
  debug : Debug;
  private tickers : Ticklish[];

  start() : void;
  private onAnimationFrame(timestamp : number) : void;
  private draw() : void;

  private tick() : void {
    this.player.tick();
    for (var i = 0; i < this.tickers.length; i++) {
      this.tickers[i].tick();
    }
    this.debug.tick();
  }
}

interface Ticklish {
  tick() : void;
}


//
// input.ts
//

class Input {
  bindings : { [keyNum:string] : Button };
  button : ButtonMap;
  cursor : Cursor;

  private onKey(event : KeyboardEvent) : void;
  private onMouse(event : MouseEvent) : void;
  private onBlur(event : FocusEvent) : void;
}

enum Button {
  LEFT,
  RIGHT,
  JUMP,
  PRIMARY,  // As in primary action/attack; left click.
  SECONDARY,
  DEBUG
}

class ButtonMap {
  left = false;
  right = false;
  jump = false;
  primary = false;
  secondary = false;
  debug = false;
}

class Cursor {
  gl : GLPoint;
  block : BlockCoords;
}


//
// camera.ts
//

class Camera {
  private threeCamera : THREE.OrthographicCamera;

  private onWindowResize(event : Event) : void;
  pan(x?:number, y?:number) : void;
  center(bc : BlockCoords) : void;
  visibleBlocks() : BlockBox;
  ndcToGL(ndcX:number, ndcY:number) : GLPoint;
}


//
// coordinates.ts
//

class GLPoint extends THREE.Vector2 {
  constructor(public x : number, public y : number);

  toBlock() : BlockCoords;
}

class BlockCoords {
  constructor(public x : number, public y : number);

  toChunk() : ChunkCoords;
  toGLCenter() : GLPoint;
  toGLTopLeft() : GLPoint;
  toGLBox() : GLBox;
}

class ChunkCoords {
  constructor(public x : number, public y : number);

  toGLBox() : GLBox;
}

class GLBox {
  constructor(public topLeft : GLPoint,
              public bottomRight : GLPoint);
}

class BlockBox {
  constructor(public topLeft : BlockCoords,
              public bottomRight : BlockCoords);
}


//
// player.ts
//

class Player {
  constructor(private input : Input,
              private camera : Camera);
  private velocity : THREE.Vector2;

  tick() : void;
  glHitBox() : GLBox;
}


//
// debug.ts
//

class Debug {
  active = false;
  private sprites : {sprite:THREE.Object3D, removeInTicks:number}[];

  toggle() : void;
  tick() : void;
  drawBox(box : GLBox,
          color : number,
          forTicks : number = 1) : void;
  drawLine(from : GLPoint, to : GLPoint,
           color : number,
           forTicks : number = 1) : void;
}


//
// planet.ts
//

class Planet {
  constructor(private seed : string,
              private worldGenerator : WorldGenerator);
  private rng : SeedRandom;
  private activeChunks : Grid<Chunk>;
  private modifiedChunks : Grid<Chunk>;

  getBlock(coords : BlockCoords) : Block;

  // Ensure that some rectangle of blocks exists and is available. Internally
  // generates or recalls corresponding chunks.
  activateBlocks(range : BlockBox);
}

class Block {
  constructor(private Chunk : chunk,
              public coords : BlockCoords)

  destroy() : void;
}

class Chunk {
  constructor(private Planet : planet,
              public coords : ChunkCoords);
  removeBlock(coords : BlockCoords);
}


//
// worldgen.ts
//

interface WorldGenerator {
  generateChunk(rng : SeedRandom,
                coords : ChunkCoords) : Chunk;
}

class FlatEarth implements WorldGenerator {
}


//
// collision.ts
//

class BlockCollisionDetector {
  constructor(private Grid<Block> grid);
  collide(GLBox : hitBox, velocity : THREE.Vector2) : BlockCollision[];
}

BlockCollision {
  constructor(public blockCoords : BlockCoords,
              public side : Side);
  // Returns the X (LEFT, RIGHT) or Y (TOP, BOTTOM) GL coordinate of the line
  // that was hit.
  glCoordinate() : number;
}

enum Side {
  LEFT,
  RIGHT
  TOP,
  BOTTOM
}
