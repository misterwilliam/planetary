
var DRY_MATERIAL = new THREE.SpriteMaterial({
  map: THREE.ImageUtils.loadTexture('images/ground.png')
});

var WET_MATERIAL = new THREE.SpriteMaterial({
  map: THREE.ImageUtils.loadTexture('images/soil.png')
});

interface WorldGenerator {
  generateChunk(chunkX:number, chunkY:number):Chunk;
}

class Chunk extends Grid<Ground> {
  plants : Plant[] = [];
  constructor(public chunkX:number, public chunkY:number) {
    super();
  }

  static blockToChunk(blockCoords: number[]):number[] {
    var chunkx = Math.floor(blockCoords[0] / CHUNK_SIZE);
    var chunky = Math.floor(blockCoords[1] / CHUNK_SIZE);
    return [chunkx, chunky];
  }
}

class FlatEarth implements WorldGenerator {

  generateChunk(chunkX:number, chunkY:number) {
    var rng = new Math.seedrandom('loo');
    // once we're doing terrain generation, we should do something with the
    // seed and chunkX and chunkY to consistently generate the same terrain here
    var chunk = new Chunk(chunkX, chunkY);
    if (chunkY > 0) {
      return chunk;  // pure empty air
    }
    var baseX = chunkX * CHUNK_SIZE;
    var baseY = chunkY * CHUNK_SIZE;
    for (var intrachunkx = 0; intrachunkx < CHUNK_SIZE; intrachunkx++) {
      for (var intrachunky = 0; intrachunky < CHUNK_SIZE; intrachunky++) {
        var absoluteX = baseX + intrachunkx;
        var absoluteY = baseY + intrachunky;
        if (absoluteY <= 0) { // below ground, there's ground
          chunk.set(intrachunkx, intrachunky, new Ground(absoluteX, absoluteY));
        }

        if (absoluteY == 0 && rng() < 0.1) {
          var plant = new Plant(absoluteX, 1);
          chunk.plants.push(plant);
        }

      }
    }
    return chunk;
  }
}

class TerrainStore {
  modifiedChunks = new Grid<Chunk>();
  constructor(public worldGenerator:WorldGenerator) {}

  onAdd(x:number, y:number, ground:Ground) {
    var chunk = this.getModifiedChunk(x,y);
    var intrachunkx = x % CHUNK_SIZE;
    var intrachunky = y % CHUNK_SIZE;
    chunk.set(intrachunkx, intrachunky, ground);
  }

  onRemove(x:number, y:number) {
    var chunk = this.getModifiedChunk(x,y);
    var intrachunkx = x % CHUNK_SIZE;
    var intrachunky = y % CHUNK_SIZE;
    chunk.clear(intrachunkx, intrachunky);
  }

  /**
    * Get or generate a chunk of the world.
    */
  getChunk(chunkX:number, chunkY:number) {
    var chunk = this.modifiedChunks.get(chunkX, chunkY);
    if (!chunk) {
      chunk = this.worldGenerator.generateChunk(chunkX, chunkY);
    }

    return chunk;
  }

  private getModifiedChunk(x:number, y:number) {
    var chunkx = Math.floor(x / CHUNK_SIZE);
    var chunky = Math.floor(y / CHUNK_SIZE);
    var chunk = this.modifiedChunks.get(chunkx, chunky);
    if (!chunk) {
      chunk = this.worldGenerator.generateChunk(chunkx, chunky);
      this.modifiedChunks.set(chunkx, chunky, chunk)
    }
    return chunk;
  }

}

class Ground implements Entity{
  sprite = new THREE.Sprite(DRY_MATERIAL);
  waterLevel = 0;
  id : number = -1;
  constructor(public x:number, public y:number) {
    var lc = game.blockToLocal(x, y);
    this.sprite.position.set(lc[0], lc[1], 0);
    this.sprite.scale.set(BLOCK_SIZE, BLOCK_SIZE, 1.0);
  }

  tick() {}

  water(amt:number) {
    this.waterLevel += amt;
    if (this.waterLevel >= 100) {
      this.beWet();
    }
  }

  neighbors() {
    return [
      [this.x + 1, this.y + 1],
      [this.x + 1, this.y - 1],
      [this.x + 1, this.y],
      [this.x - 1, this.y + 1]
      [this.x - 1, this.y - 1],
      [this.x - 1, this.y],
      [this.x,     this.y + 1],
      [this.x,     this.y - 1],
    ];
  }

  beDry() {
    this.sprite.material = DRY_MATERIAL;
  }

  beWet() {
    this.sprite.material = WET_MATERIAL;
  }

  hit() {
    var self = this;
    game.entities.forEach(function(entity: Entity) {
      if (entity instanceof Plant) {
        return;
      }
      var plant = <Plant>(entity);
      if (plant.x == self.x && plant.y == self.y + 1) {
        game.removeEntity(plant);
      }
    });

    game.scene.remove(this.sprite);
    game.terrainGrid.clear(this.x, this.y);
  }

}
