/// <reference path='lib/three.d.ts'/>
/// <reference path='lib/seedrandom.d.ts'/>
/// <reference path='consts.ts'/>
/// <reference path='grid.ts'/>
/// <reference path='ground.ts'/>
/// <reference path='air-generator.ts'/>
/// <reference path='atmosphere.ts'/>
/// <reference path='boar.ts'/>
/// <reference path='plant.ts'/>
/// <reference path='super-weed.ts'/>
/// <reference path='tree.ts'/>
/// <reference path='player.ts'/>
/// <reference path='background.ts'/>

var INPUT_MAP = {
  87:  'jump',  // w
  83:  'down',  // s
  68:  'right', // d
  65:  'left',  // a
  32:  'dig',   // space
  192: 'debug', // ~
};

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

interface Entity {
  tick():void;
  sprite : THREE.Sprite;
  id : number
}

interface BlockAlignedEntity extends Entity {
  // x and y are in blockspace
  x: number;
  y: number;
}

class Game {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(90, null, 0.1, 1000);
  renderer = new THREE.WebGLRenderer();
  now = getNow();
  lastTime = getNow();
  unprocessedFrames = 0;
  input = {
    jump: false, down: false, right: false, left: false, dig:false
  };
  lastEntityId = -1;
  entities : Entity[] = [];
  terrainGrid = new Grid<Ground>();
  debug = false;
  groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  projector = new THREE.Projector();
  atmosphereController = new AtmosphereController(this.scene);
  player : Player;
  plants : Plant[] = [];
  debugSprites : THREE.Object3D[];
  terrainStore = new TerrainStore(new FlatEarth());
  hasRendered = false;
  removeSprites : {ticks:number; sprite:THREE.Object3D}[] = [];
  cameraDeadzone = new THREE.Vector2(1000, 1000);

  constructor() {
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

  handleKey(event:KeyboardEvent) {
    var key = INPUT_MAP[event.which];
    if (!key) {
      console.log('unbound key:', event.which);
    } else if (event.type == 'keydown') {
      this.input[key] = true;
    } else {
      this.input[key] = false;
      if (key == 'debug') {
        this.toggleDebug();
      }
    }
  }

  clearInput() {
    if (this.debug) {
      console.log('clearing input');
    }
    for (var key in this.input) {
      this.input[key] = false;
    }
  }

  addEntity(entity:Entity) {
    entity.id = ++this.lastEntityId;
    this.entities[entity.id] = entity;
    if (entity.sprite) {
      this.scene.add(entity.sprite);
    }
  }

  removeEntity(entity:Entity) {
    this.scene.remove(entity.sprite);
    delete this.entities[entity.id];
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

  click(event:MouseEvent) {
    if (this.debug) {
      var lc = this.ndcToLocal(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1);
      var bc = this.localToBlock(lc.x, lc.y);
      this.addSpriteForTicks(game.outlineBlock(bc[0], bc[1], 0x00ff00), 60);
      var cc = Chunk.blockToChunk(bc);
      var chunk = this.terrainStore.getChunk(cc[0], cc[1]);
      this.addSpriteForTicks(game.outlineChunk(chunk, 0x00ff00), 60)
      console.log('clicked block', bc, ' chunk ', cc, ' intrachunk ',
                  chunk.getIntraChunkBlockCoords(bc[0], bc[1]));
    }
  }

  getGroundBeneathEntity(entity:Entity):Ground {
    var lc = this.localToBlock(entity.sprite.position.x,
                               entity.sprite.position.y);
    var height = lc[1] - 1;
    while (!this.terrainGrid.has(lc[0], height)) {
      if (height <= lc[1]-6) {
        return null;
      }
      height -= 1;
    }
    return this.terrainGrid.get(lc[0], height);
  }

  start() {
    this.player = new Player(this);
    this.addEntity(this.player);

    var bgController = new BackgroundController(this.scene);
    bgController.drawBackground();

    var airGenerator = new AirGenerator(5, 7);
    this.addEntity(airGenerator);

    var boar = new Boar(-5, 2);
    this.addEntity(boar);

    var superWeed = new SuperWeed(15, 0);
    this.addEntity(superWeed);

    window.addEventListener('keydown', this.handleKey.bind(this));
    window.addEventListener('keyup', this.handleKey.bind(this));
    window.addEventListener('blur', this.clearInput.bind(this));
    window.addEventListener('resize', this.resize.bind(this));
    window.addEventListener('mousedown', this.click.bind(this));

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
        if (!this.terrainStore.activeChunks.has(x, y)) {
          this.addChunk(this.terrainStore.getChunk(x, y));
        }
      }
    }

    this.terrainStore.activeChunks.forEach((x, y, chunk) => {
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
    this.terrainStore.activeChunks.set(chunk.chunkX, chunk.chunkY, chunk);
    chunk.forEach((x, y, ground) => {
      this.terrainGrid.set(ground.x, ground.y, ground);
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
    this.terrainStore.activeChunks.clear(chunk.chunkX, chunk.chunkY);
    chunk.forEach((x, y, ground) => {
      this.terrainGrid.clear(ground.x, ground.y);
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
        if (this.terrainGrid.has(x, y)) {
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
    for (var id in this.entities) {
      this.entities[id].tick();
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
  game = new Game();
  game.start();
  if (document.URL.indexOf('debug') != -1) {
    game.toggleDebug();
  }
});
