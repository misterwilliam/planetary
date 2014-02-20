/// <reference path='lib/three.d.ts'/>
/// <reference path='lib/seedrandom.d.ts'/>

/// <reference path='engine/entity.ts'/>
/// <reference path='engine/grid.ts'/>
/// <reference path='universe/spawner.ts'/>
/// <reference path='universe/entities/air-generator.ts'/>
/// <reference path='universe/entities/boar.ts'/>
/// <reference path='universe/entities/plant.ts'/>
/// <reference path='universe/entities/sandworm.ts'/>
/// <reference path='universe/entities/super-weed.ts'/>
/// <reference path='universe/entities/tree.ts'/>

/// <reference path='consts.ts'/>
/// <reference path='game_model.ts'/>
/// <reference path='ground.ts'/>
/// <reference path='input.ts'/>
/// <reference path='atmosphere.ts'/>
/// <reference path='player.ts'/>
/// <reference path='background.ts'/>

var getNow = (function() {
  if (window.performance && window.performance.now) {
    return window.performance.now.bind(window.performance);
  }
  return function(){return +new Date()};
})();

var tickCount = 0;

// Creates a new SpriteMaterial with nearest-neighbor texture filtering from
// image URL.
function LoadJaggyMaterial(url:string) {
  var texture = THREE.ImageUtils.loadTexture(url);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  return new THREE.SpriteMaterial({map: texture});
};

class Game implements InputListener {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(90, null, 0.1, 1000);
  renderer = new THREE.WebGLRenderer();
  projector = new THREE.Projector();

  gameModel = new GameModel();
  inputController : InputController;  // Set in constructor

  creatureSpawner = new CreatureSpawner(this);

  now = getNow();
  lastTime = getNow();
  unprocessedFrames = 0;

  debug = false;
  groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  atmosphereController = new AtmosphereController(this.scene);
  debugSprites : THREE.Object3D[];
  hasRendered = false;
  removeSprites : {ticks:number; sprite:THREE.Object3D}[] = [];
  cameraDeadzone = new THREE.Vector2(1000, 1000);

  constructor(inputController : InputController) {
    this.inputController = inputController;
    this.camera.position.set(0, 0, 800);
    this.resize();
    document.body.appendChild(this.renderer.domElement);
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.cameraDeadzone = new THREE.Vector2(
        window.innerWidth / 5, window.innerHeight / 5);
    if (tickCount != 0) {
      this.generateVisibleWorld();
    }
  }

  // Begin InputListener interface implementation
  handleKeyUp(event : KeyboardEvent) {
    var key = INPUT_MAP[event.which];
    if (key == 'debug') {
      console.log("debug mode");
      this.toggleDebug();
    }
  }

  handleClick(event : MouseEvent) {
    if (this.debug) {
      var lc = this.ndcToLocal(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1);
      var bc = this.localToBlock(lc.x, lc.y);
      this.addSpriteForTicks(this.outlineBlock(bc[0], bc[1], 0x00ff00), 60);
      var cc = Chunk.blockToChunk(bc);
      var chunk = this.gameModel.terrainStore.getChunk(cc[0], cc[1]);
      this.addSpriteForTicks(game.outlineChunk(chunk, 0x00ff00), 60)
      console.log('clicked block', bc, ' chunk ', cc, ' intrachunk ',
                  chunk.getIntraChunkBlockCoords(bc[0], bc[1]));
    }
  }

  handleClearInput() {
    if (this.debug) {
      console.log('Clear input');
    }
  }
  // End InputListener interface implementation

  addEntity(entity:Entity) {
    this.gameModel.addEntity(entity);
    if (entity.sprite) {
      this.scene.add(entity.sprite);
    }
  }

  removeEntity(entity:Entity) {
    this.gameModel.removeEntity(entity);
    this.scene.remove(entity.sprite);
  }

  addSpriteForTicks(sprite:THREE.Object3D, ticks:number = 1) {
    this.scene.add(sprite);
    this.removeSprites.push({sprite:sprite, ticks:ticks});
  }

  // Returns local GL coordinates of the center of a block from block
  // coordinates.
  blockToLocal(x:number, y:number):number[] {
    return [
      (x * BLOCK_SIZE),
      (y * BLOCK_SIZE)
    ];
  }

  // Returns the coords of the top left corner of the given block coords.
  blockToLocalCorner(x:number, y:number):number[] {
    return [
      (x * BLOCK_SIZE) - HALF_BLOCK,
      (y * BLOCK_SIZE) - HALF_BLOCK
    ]
  }

  // Returns nearest block coordinates from local GL coordinates. Right and top
  // blocks win on edges.
  localToBlock(x:number, y:number):number[] {
    return [
      Math.round(x / BLOCK_SIZE),
      Math.round(y / BLOCK_SIZE)
    ];
  }

  // Returns local GL coordinates on the ground plane from normalized device
  // coordinates.
  ndcToLocal(x:number, y:number) {
    if (!this.hasRendered) {
      throw new Error('Must have rendered before calling ndcToLocal');
    }
    var ndc = new THREE.Vector3(x, y, null);
    var raycaster = this.projector.pickingRay(ndc, this.camera);
    return raycaster.ray.intersectPlane(this.groundPlane);
  }

  getGroundBeneathEntity(entity:Entity):Ground {
    var lc = this.localToBlock(entity.sprite.position.x,
                               entity.sprite.position.y);
    var height = lc[1] - 1;
    while (!this.gameModel.terrainGrid.has(lc[0], height)) {
      if (height <= lc[1]-6) {
        return null;
      }
      height -= 1;
    }
    return this.gameModel.terrainGrid.get(lc[0], height);
  }

  start() {
    this.gameModel.player = new Player(this);
    this.addEntity(this.gameModel.player);

    var bgController = new BackgroundController(this.scene);
    bgController.drawBackground();

    var airGenerator = new AirGenerator(5, 7);
    this.addEntity(airGenerator);

    var camera_block_position = this.localToBlock(this.camera.position.x,
        this.camera.position.y);
    this.creatureSpawner.spawnCreatures(camera_block_position[0],
        camera_block_position[1]);

    var superWeed = new SuperWeed(15, 0);
    this.addEntity(superWeed);

    window.addEventListener('resize', this.resize.bind(this));

    this.animate();
  }

  // Called when when we are allowed to render. In general at 60 fps.
  animate() {
    this.now = getNow();
    this.unprocessedFrames += (this.now - this.lastTime) * 60.0 / 1000.0; // 60 fps
    this.lastTime = this.now;
    if (this.unprocessedFrames > MAX_CATCHUP) {
      this.unprocessedFrames = MAX_CATCHUP;
    }
    while (this.unprocessedFrames >= 1.0) {
      this.tick();
      this.unprocessedFrames -= 1.0;
    }
    this.render();
    requestAnimationFrame(this.animate.bind(this));
  }

  // Renders a single frame
  render() {
    this.hasRendered = true;
    this.renderer.render(this.scene, this.camera);
  }

  generateVisibleWorld() {
    var topLeftLc = this.ndcToLocal(-1, 1);
    var bottomRightLc = this.ndcToLocal(1, -1);
    var topLeftBc = this.localToBlock(
        topLeftLc.x - BLOCK_SIZE, topLeftLc.y - BLOCK_SIZE);
    var bottomRightBc = this.localToBlock(
        bottomRightLc.x + BLOCK_SIZE, bottomRightLc.y + BLOCK_SIZE);
    this.generateWorld(topLeftBc, bottomRightBc);
  }

  generateWorld(topLeft:number[], bottomRight:number[]) {
    var numNew = 0;
    var topLeftChunkCoords = Chunk.blockToChunk(topLeft);
    var bottomRightChunkCoords = Chunk.blockToChunk(bottomRight);
    for (var x = topLeftChunkCoords[0]; x <= bottomRightChunkCoords[0]; x++) {
      for (var y = topLeftChunkCoords[1]; y >= bottomRightChunkCoords[1]; y--) {
        if (!this.gameModel.terrainStore.activeChunks.has(x, y)) {
          this.addChunk(this.gameModel.terrainStore.getChunk(x, y));
        }
      }
    }

    this.gameModel.terrainStore.activeChunks.forEach((x, y, chunk) => {
      if (x < topLeftChunkCoords[0] || x > bottomRightChunkCoords[0] ||
          y > topLeftChunkCoords[1] || y < bottomRightChunkCoords[1]) {
        this.removeChunk(chunk);
      }
    });

    if (this.debug && numNew > 0) {
      console.log('generated', numNew, 'blocks',
                  'from', topLeft, 'to', bottomRight);
    }
  }

  addChunk(chunk:Chunk) {
    this.gameModel.terrainStore.activeChunks.set(chunk.chunkX, chunk.chunkY, chunk);
    chunk.forEach((x, y, ground) => {
      this.gameModel.terrainGrid.set(ground.x, ground.y, ground);
      this.addEntity(ground);
    });
    chunk.plants.forEach((plant) => {
      this.addEntity(plant);

      // Add air around plants
      this.atmosphereController.addAir(plant.x, 0);
      var points = Grid.neighbors(plant.x, 0, 2);
      for (var i = 0; i < points.length; i++) {
        this.atmosphereController.addAir(points[i][0], points[i][1]);
      }
    });
  }

  removeChunk(chunk:Chunk) {
    this.gameModel.terrainStore.activeChunks.clear(chunk.chunkX, chunk.chunkY);
    chunk.forEach((x, y, ground) => {
      this.gameModel.terrainGrid.clear(ground.x, ground.y);
      this.removeEntity(ground);
    });
    chunk.plants.forEach((plant) => {
      this.removeEntity(plant);
      // TODO: remove atmosphere from around plants,
      //       or just in the chunk in general?
    });
  }

  // Compute the local GL rectangle corresponding to the visual boundary of a
  // sprite at its current position.
  boundingBox(sprite:THREE.Object3D):number[][] {
    var xCenter = sprite.position.x;
    var yCenter = sprite.position.y;
    var width = Math.abs(sprite.scale.x);
    var height = Math.abs(sprite.scale.y);
    var topLeft = [xCenter - width / 2, yCenter + height / 2];
    var bottomRight = [xCenter + width / 2, yCenter - height / 2];
    return [topLeft, bottomRight];
  }

  // Find the set of solid blocks which are fully or partially inside the given
  // rectangle. Blocks touching but outside are not considered collisions.
  blockCollisions(topLeftLc:number[], bottomRightLc:number[]):number[][] {
    // We round "in" on edges.
    var nearestTopLeftBc = [
      Math.round(topLeftLc[0] / BLOCK_SIZE),
      Math.ceil((topLeftLc[1] / BLOCK_SIZE) - 0.5)
    ];
    var nearestBottomRightBc = [
      Math.ceil((bottomRightLc[0] / BLOCK_SIZE) - 0.5),
      Math.round(bottomRightLc[1] / BLOCK_SIZE)
    ];
    var blocks : number[][] = [];
    for (var x = nearestTopLeftBc[0]; x <= nearestBottomRightBc[0]; x++) {
      for (var y = nearestTopLeftBc[1]; y >= nearestBottomRightBc[1]; y--) {
        if (this.gameModel.terrainGrid.has(x, y)) {
          blocks.push([x,y]);
        }
      }
    }
    return blocks;
  }

  onGround(entity:Entity) : boolean {
    var ground = this.getGroundBeneathEntity(entity);
    if (!ground) {
      return false;
    }
    return entity.sprite.position.y - (ground.sprite.position.y + MAGIC_NUMBER) < 1;
  }

  // Single tick of game time (1 frame)
  tick() {
    if (this.hasRendered) {
      this.generateVisibleWorld();
    }
    for (var id in this.gameModel.entities) {
      this.gameModel.entities[id].tick();
    }
    for (var i = 0; i < this.removeSprites.length; i++) {
      var remove = this.removeSprites[i];
      if (remove.ticks-- == 0) {
        this.scene.remove(remove.sprite);
        this.removeSprites.splice(i--, 1);
      }
    }
    if (this.debug && tickCount % 600 == 10) {
      console.log(this.scene.children.length, " objects in scene");
    }
    tickCount++;
  }

  panCamera(x?:number, y?:number) {
    if (x != null) {
      this.camera.position.x += x;
    }
    if (y != null) {
      this.camera.position.y += y;
    }
    this.generateVisibleWorld();
    
    var camera_block_position = this.localToBlock(this.camera.position.x,
        this.camera.position.y);
    this.creatureSpawner.spawnCreatures(camera_block_position[0],
        camera_block_position[1]);
  }

  toggleDebug() {
    this.debug = !this.debug;

    if (this.debug) {
      this.debugSprites = [];

      // Origin block.
      this.debugSprites.push(
        this.outlineBlock(0, 0, 0x0000ff));

      // Origin lines.
      // this.debugSprites.push(
      //   this.drawLine([0, 300], [0, -300], 0xff0000));
      // this.debugSprites.push(
      //   this.drawLine([300, 0], [-300, 0], 0xff0000));
    } else {
      var self = this;
      this.debugSprites.forEach(function(sprite) {
        self.scene.remove(sprite);
      });
    }
  }

  drawLine(from:number[], to:number[], color:number=null) : THREE.Line {
    var material = new THREE.LineBasicMaterial({color: color || null});
    var geometry = new THREE.Geometry();
    geometry.vertices.push(new THREE.Vector3(from[0], from[1], 1));
    geometry.vertices.push(new THREE.Vector3(to[0], to[1], 1));
    var line = new THREE.Line(geometry, material);
    this.scene.add(line);
    return line;
  }

  drawRect(cornerA:number[], cornerB:number[], color:number=null) : THREE.Line {
    var material = new THREE.LineBasicMaterial({color: color || null});
    var geometry = new THREE.Geometry();
    geometry.vertices.push(new THREE.Vector3(cornerA[0], cornerA[1], 1));
    geometry.vertices.push(new THREE.Vector3(cornerB[0], cornerA[1], 1));
    geometry.vertices.push(new THREE.Vector3(cornerB[0], cornerB[1], 1));
    geometry.vertices.push(new THREE.Vector3(cornerA[0], cornerB[1], 1));
    geometry.vertices.push(new THREE.Vector3(cornerA[0], cornerA[1], 1));
    var box = new THREE.Line(geometry, material);
    this.scene.add(box);
    return box;
  }

  outlineBlock(x:number, y:number, color?:number) : THREE.Line {
    return this.drawRect(
      this.blockToLocalCorner(x, y),
      this.blockToLocalCorner(x+1, y+1),
      color);
  }

  outlineChunk(chunk:Chunk, color?:number) {
    var topLeftBlockX = chunk.chunkX * CHUNK_SIZE;
    var topLeftBlockY = chunk.chunkY * CHUNK_SIZE;
    var bottomRightBlockX = (chunk.chunkX + 1) * CHUNK_SIZE;
    var bottomRightBlockY = (chunk.chunkY + 1) * CHUNK_SIZE;
    var tlLc = this.blockToLocalCorner(topLeftBlockX, topLeftBlockY);
    var brLc = this.blockToLocalCorner(bottomRightBlockX, bottomRightBlockY)
    return this.drawRect(tlLc, brLc, color);
  }
}

var game : Game;
window.addEventListener('load', function() {
  var inputController = new InputController();
  game = new Game(inputController);
  inputController.registerListener(game);
  game.start();
  if (document.URL.indexOf('debug') != -1) {
    game.toggleDebug();
  }
});
