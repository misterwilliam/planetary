var Grid = (function () {
    function Grid() {
        this._grid = {};
    }
    Grid.prototype.set = function (x, y, value) {
        this._grid['' + [x, y]] = value;
    };
    Grid.prototype.get = function (x, y) {
        return this._grid['' + [x, y]];
    };
    Grid.prototype.has = function (x, y) {
        return ([x, y] + '') in this._grid;
    };
    Grid.prototype.clear = function (x, y) {
        delete this._grid['' + [x, y]];
    };
    Grid.prototype.forEach = function (f) {
        for (var key in this._grid) {
            var s = key.split(',');
            f(parseInt(s[0], 10), parseInt(s[1], 10), this._grid[key]);
        }
    };
    Grid.prototype.getSize = function () {
        var i = 0;
        this.forEach(function () {
            i++;
        });
        return i;
    };

    // Returns list of neighboring grid coordinates. If range is passed then
    // returns list of neighbors withing Manhattan distance range.
    Grid.neighbors = function (x, y, range) {
        if (range === undefined) {
            range = 1;
        }
        var neighbors = [];
        for (var i = -range; i <= range; i++) {
            for (var j = -range; j <= range; j++) {
                if ((i == 0 && j == 0) || (Math.abs(i) + Math.abs(j) > range)) {
                    continue;
                }
                neighbors.push([x + i, y + j]);
            }
        }
        return neighbors;
    };

    Grid.entityNeighbors = function (entity, range) {
        var block = game.localToBlock(entity.sprite.position.x, entity.sprite.position.y);
        return Grid.neighbors(block[0], block[1], range);
    };
    return Grid;
})();
var CreatureSpawner = (function () {
    function CreatureSpawner(game) {
        this.creatureArray = new Array();
        this.i = 0;
        this.game = game;
    }
    // Spawn creatures off screen given the x and y coordinates of the camera (in
    // block coordinates). This is admittedly a suboptimal interface and could be
    // improved.
    CreatureSpawner.prototype.spawnCreatures = function (x, y) {
        var random_number = Math.random();
        if (random_number > 0.95) {
            this.spawnABoar(x);
        }
    };

    // Spawn up to 10 boars randomly position centered around x.
    CreatureSpawner.prototype.spawnABoar = function (x) {
        var random_x_offset = Math.floor((Math.random() * 60) - 30);
        var boar = new Boar(random_x_offset + x, 2);
        this.game.addEntity(boar);

        if (typeof this.creatureArray[this.i] != 'undefined') {
            this.game.removeEntity(this.creatureArray[this.i]);
        }
        this.creatureArray[this.i] = boar;

        this.i++;
        if (this.i > 10) {
            this.i = 0;
        }
    };
    return CreatureSpawner;
})();
var AIR_GENERATOR_MATERIAL = LoadJaggyMaterial('images/air-maker.png');

var AirGenerator = (function () {
    function AirGenerator(x, y) {
        this.x = x;
        this.y = y;
        this.sprite = new THREE.Sprite(AIR_GENERATOR_MATERIAL);
        this.id = -1;
        var lc = game.blockToLocal(x, y);
        this.sprite.position.set(lc[0], lc[1] + 15, -1);
        this.sprite.scale.set(4 * 128, 4 * 128, 1.0);

        var points = Grid.neighbors(x, y, 30);
        for (var i = 0; i < points.length; i++) {
            game.atmosphereController.addAir(points[i][0], points[i][1]);
        }
    }
    AirGenerator.prototype.tick = function () {
    };
    return AirGenerator;
})();
var BOAR_MATERIAL = LoadJaggyMaterial('images/boar.png');

var Boar = (function () {
    function Boar(x, y) {
        this.x = x;
        this.y = y;
        this.sprite = new THREE.Sprite(BOAR_MATERIAL);
        this.id = -1;
        this.decisionTimer = 0;
        var lc = game.blockToLocal(x, y);
        this.sprite.position.set(lc[0], lc[1] + 15, -1);
        this.sprite.scale.set(4 * 32, 4 * 32, 1.0);
    }
    Boar.prototype.tick = function () {
        if (this.decisionTimer == 0) {
            if (Math.random() > 0.5) {
                this.state = "left";
            } else {
                this.state = "right";
            }
        }

        if (this.state == "left") {
            this.sprite.position.x -= 10;
        } else {
            this.sprite.position.x += 10;
        }

        this.decisionTimer++;
        if (this.decisionTimer == 30) {
            this.decisionTimer = 0;
        }
    };
    return Boar;
})();
var GREEN_MATERIAL = LoadJaggyMaterial('images/plant.png');
var BROWN_MATERIAL = LoadJaggyMaterial('images/plant-brown.png');
var BLACK_MATERIAL = LoadJaggyMaterial('images/plant-black.png');

var Plant = (function () {
    function Plant(x, y) {
        this.x = x;
        this.y = y;
        this.sprite = new THREE.Sprite(GREEN_MATERIAL);
        this.ticksSinceLastDrop = 0;
        this.ticksSinceLastDecay = 0;
        this.life = 100;
        this.id = -1;
        this.dropWater = function () {
            var neighborCoords = Grid.entityNeighbors(this, 2);
            neighborCoords.forEach(function (coord) {
                var x = coord[0];
                var y = coord[1];
                var ground = game.gameModel.terrainGrid.get(x, y);
                if (ground) {
                    ground.water(20);
                }
            });
        };
        var lc = game.blockToLocal(x, y);
        this.sprite.position.set(lc[0], lc[1], 0);
        this.sprite.scale.set(13 * 4, 21 * 4, 1.0);
    }
    Plant.prototype.tick = function () {
        if (++this.ticksSinceLastDrop == 60) {
            this.dropWater();
            this.ticksSinceLastDrop = 0;
        }
        if (++this.ticksSinceLastDecay == 60 * 5) {
            this.decay(20);
            this.ticksSinceLastDecay = 0;
        }
    };

    Plant.prototype.decay = function (amt) {
        this.life -= amt;
        if (this.life <= 0) {
            this.sprite.material = BLACK_MATERIAL;
        } else if (this.life <= 50) {
            this.sprite.material = BROWN_MATERIAL;
        }
    };
    return Plant;
})();
var SUPER_WEED_MATERIAL = LoadJaggyMaterial('images/super-weed.png');
var GROW_CYCLE = 50;

var WEED_GRID = new Grid();
var MAX_WEEDS = 1000;
var num_weeds = 0;

var SuperWeed = (function () {
    function SuperWeed(x, y) {
        this.x = x;
        this.y = y;
        this.sprite = new THREE.Sprite(SUPER_WEED_MATERIAL);
        this.id = -1;
        this.growTimer = GROW_CYCLE;
        this.numSprouts = 0;
        this.age = 0;
        this.x = x;
        this.y = y;
        var lc = game.blockToLocal(x, y);
        this.sprite.position.set(lc[0], lc[1] + 15, -1);
        this.sprite.scale.set(4 * 8, 4 * 8, 1.0);
        WEED_GRID.set(this.x, this.y, this);
        num_weeds++;
    }
    SuperWeed.prototype.tick = function () {
        if (this.numSprouts > 1 || num_weeds > MAX_WEEDS) {
            return;
        }
        this.age++;
        if (this.growTimer == 0) {
            var index = Math.floor(Math.random() * 4);
            var neighbors = Grid.neighbors(this.x, this.y, 1);
            if (this.isHospitable(neighbors[index][0], neighbors[index][1])) {
                var newSuperWeed = new SuperWeed(neighbors[index][0], neighbors[index][1]);
                game.addEntity(newSuperWeed);
                this.numSprouts++;
            }
            this.growTimer = GROW_CYCLE;
        } else {
            this.growTimer--;
        }
    };

    SuperWeed.prototype.isHospitable = function (x, y) {
        var isOkay = !WEED_GRID.has(x, y);
        isOkay = isOkay && (y >= 0);
        isOkay = isOkay && (y < 20);
        return isOkay;
    };
    return SuperWeed;
})();
var MAX_HEIGHT = 7;
var GROW_SPEED = 60;

var BARK_MATERIAL = LoadJaggyMaterial('images/bark.png');
var LEAVES_MATERIAL = LoadJaggyMaterial('images/leaves.png');

var Tree = (function () {
    function Tree(x, y) {
        this.x = x;
        this.y = y;
        this.sprite = new THREE.Sprite(BARK_MATERIAL);
        this.id = -1;
        this.height = 0;
        this.hasLeaves = false;
        this.ticksSinceLastGrow = 0;
        this.grow = function () {
            if (this.height < MAX_HEIGHT) {
                var bark = new THREE.Sprite(BARK_MATERIAL);
                var lc = game.blockToLocal(this.x, this.y + this.height);
                bark.position.set(lc[0], lc[1], -2);
                bark.scale.set(16 * 4, 16 * 4, 1.0);
                game.scene.add(bark);
                this.height++;
            } else if (!this.hasLeaves) {
                var leaves = new THREE.Sprite(LEAVES_MATERIAL);
                var lc = game.blockToLocal(this.x, this.y + this.height);
                leaves.position.set(lc[0], lc[1], -1);
                leaves.scale.set(64 * 4, 32 * 4, 1.0);
                game.scene.add(leaves);
                this.hasLeaves = true;
            }
        };
        this.grow();
    }
    Tree.prototype.tick = function () {
        if (++this.ticksSinceLastGrow == GROW_SPEED) {
            this.grow();
            this.ticksSinceLastGrow = 0;
        }
    };
    return Tree;
})();
var PLAYER_MAX_SPEED = 8;
var PLAYER_ACCELERATION = 0.001;
var JUMP_HEIGHT = 10;
var MAX_CATCHUP = 10;
var BLOCK_SIZE = 32;
var HALF_BLOCK = BLOCK_SIZE / 2;
var CHUNK_SIZE = 16;
var MAGIC_NUMBER = 56;
var GameModel = (function () {
    function GameModel() {
        this.terrainGrid = new Grid();
        this.terrainStore = new TerrainStore(new FlatEarth());
        this._entities = [];
        this.lastEntityId = -1;
    }
    GameModel.prototype.addEntity = function (entity) {
        entity.id = ++this.lastEntityId;
        this._entities[entity.id] = entity;
    };

    GameModel.prototype.removeEntity = function (entity) {
        delete this._entities[entity.id];
    };

    Object.defineProperty(GameModel.prototype, "entities", {
        get: function () {
            return this._entities;
        },
        enumerable: true,
        configurable: true
    });
    return GameModel;
})();
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var DRY_MATERIAL = new THREE.SpriteMaterial({
    map: THREE.ImageUtils.loadTexture('images/ground.png')
});

var WET_MATERIAL = new THREE.SpriteMaterial({
    map: THREE.ImageUtils.loadTexture('images/soil.png')
});

var Chunk = (function (_super) {
    __extends(Chunk, _super);
    function Chunk(chunkX, chunkY) {
        _super.call(this);
        this.chunkX = chunkX;
        this.chunkY = chunkY;
        this.plants = [];
        this.isModified = false;
    }
    Chunk.blockToChunk = function (blockCoords) {
        var chunkx = Math.floor(blockCoords[0] / CHUNK_SIZE);
        var chunky = Math.floor(blockCoords[1] / CHUNK_SIZE);
        return [chunkx, chunky];
    };

    Chunk.prototype.getIntraChunkBlockCoords = function (blockX, blockY) {
        var intrachunkx = blockX % CHUNK_SIZE;
        var intrachunky = blockY % CHUNK_SIZE;
        if (intrachunkx < 0) {
            intrachunkx = intrachunkx + CHUNK_SIZE;
        }
        if (intrachunky < 0) {
            intrachunky = intrachunky + CHUNK_SIZE;
        }
        return [Math.abs(intrachunkx), Math.abs(intrachunky)];
    };
    return Chunk;
})(Grid);

var FlatEarth = (function () {
    function FlatEarth() {
    }
    FlatEarth.prototype.generateChunk = function (chunkX, chunkY) {
        var rng = new Math.seedrandom('loo' + chunkX + ';' + chunkY);

        var chunk = new Chunk(chunkX, chunkY);
        if (chunkY > 0) {
            return chunk;
        }
        var baseX = chunkX * CHUNK_SIZE;
        var baseY = chunkY * CHUNK_SIZE;
        for (var intrachunkx = 0; intrachunkx < CHUNK_SIZE; intrachunkx++) {
            for (var intrachunky = 0; intrachunky < CHUNK_SIZE; intrachunky++) {
                var absoluteX = baseX + intrachunkx;
                var absoluteY = baseY + intrachunky;
                if (absoluteY <= 0) {
                    chunk.set(intrachunkx, intrachunky, new Ground(absoluteX, absoluteY));
                }

                if (absoluteY == 0) {
                    if (rng() < 0.1) {
                        var plant = new Plant(absoluteX, 1);
                        chunk.plants.push(plant);
                    }
                    if (rng() < 0.03) {
                        var tree = new Tree(absoluteX, 1);
                        chunk.plants.push(tree);
                    }
                }
            }
        }
        return chunk;
    };
    return FlatEarth;
})();

var TerrainStore = (function () {
    function TerrainStore(worldGenerator) {
        this.worldGenerator = worldGenerator;
        this.activeChunks = new Grid();
        this.modifiedChunks = new Grid();
    }
    /**
    * Get or generate a chunk of the world.
    */
    TerrainStore.prototype.getChunk = function (chunkX, chunkY) {
        var chunk = this.modifiedChunks.get(chunkX, chunkY);
        if (!chunk) {
            chunk = this.worldGenerator.generateChunk(chunkX, chunkY);
        }

        return chunk;
    };

    TerrainStore.prototype.onRemoveBlock = function (blockX, blockY) {
        var cc = Chunk.blockToChunk([blockX, blockY]);
        var chunk = this.activeChunks.get(cc[0], cc[1]);
        if (!chunk.isModified) {
            chunk.isModified = true;
            this.modifiedChunks.set(cc[0], cc[1], chunk);
        }
        var intbc = chunk.getIntraChunkBlockCoords(blockX, blockY);
        chunk.clear(intbc[0], intbc[1]);
    };

    TerrainStore.prototype.getModifiedChunk = function (x, y) {
        var chunkx = Math.floor(x / CHUNK_SIZE);
        var chunky = Math.floor(y / CHUNK_SIZE);
        var chunk = this.modifiedChunks.get(chunkx, chunky);
        if (!chunk) {
            chunk = this.worldGenerator.generateChunk(chunkx, chunky);
            this.modifiedChunks.set(chunkx, chunky, chunk);
        }
        return chunk;
    };
    return TerrainStore;
})();

var Ground = (function () {
    function Ground(x, y) {
        this.x = x;
        this.y = y;
        this.sprite = new THREE.Sprite(DRY_MATERIAL);
        this.waterLevel = 0;
        this.health = 5;
        this.id = -1;
        var lc = game.blockToLocal(x, y);
        this.sprite.position.set(lc[0], lc[1], 0);
        this.sprite.scale.set(BLOCK_SIZE, BLOCK_SIZE, 1.0);
    }
    Ground.prototype.tick = function () {
    };

    Ground.prototype.water = function (amt) {
        this.waterLevel += amt;
        if (this.waterLevel >= 100) {
            this.beWet();
        }
    };

    Ground.prototype.neighbors = function () {
        return [
            [this.x + 1, this.y + 1],
            [this.x + 1, this.y - 1],
            [this.x + 1, this.y],
            [this.x - 1, this.y + 1][this.x - 1, this.y - 1],
            [this.x - 1, this.y],
            [this.x, this.y + 1],
            [this.x, this.y - 1]
        ];
    };

    Ground.prototype.beDry = function () {
        this.sprite.material = DRY_MATERIAL;
    };

    Ground.prototype.beWet = function () {
        this.sprite.material = WET_MATERIAL;
    };

    Ground.prototype.hit = function () {
        if (--this.health <= 0) {
            this.destroy();
        }
    };

    Ground.prototype.destroy = function () {
        game.scene.remove(this.sprite);
        game.gameModel.terrainGrid.clear(this.x, this.y);
        game.gameModel.terrainStore.onRemoveBlock(this.x, this.y);
    };
    return Ground;
})();
// For most use cases, checking the state of the InputController.input is what
// is desired for knowing the current state of the input.
//
// Example:
// var input = new InputController();
// if (input.input.jump) { ... }
//
// Classes that want to listen to input events should implement the
// InputListener interface and register themselves as listeners with the
// InputController.
//
// Example:
// class MyClass implement InputListener {
//   handleKey(event : KeyboardEvent) { ... }
//   handleClick(event : MouseEvent) { ... }
//   handleClearInput() { ... }
// }
// var c = new MyClass();
// var input = new InputController();
// input.registerListener(c);
var INPUT_MAP = {
    87: 'jump',
    83: 'down',
    68: 'right',
    65: 'left',
    32: 'dig',
    192: 'debug'
};

var InputController = (function () {
    function InputController() {
        this.input = {
            jump: false,
            down: false,
            right: false,
            left: false
        };
        this.mouse = {
            click: false,
            lc: null,
            bc: null
        };
        this.listeners = [];
        window.addEventListener('keydown', this.handleKey.bind(this));
        window.addEventListener('keyup', this.handleKey.bind(this));
        window.addEventListener('mousedown', this.handleMouse.bind(this));
        window.addEventListener('mouseup', this.handleMouse.bind(this));
        window.addEventListener('mousemove', this.handleMouse.bind(this));
        window.addEventListener('blur', this.clearInput.bind(this));
    }
    InputController.prototype.registerListener = function (listener) {
        this.listeners.push(listener);
    };

    InputController.prototype.handleKey = function (event) {
        var key = INPUT_MAP[event.which];
        if (!key) {
            console.log('unbound key:', event.which);
        } else if (event.type === 'keydown') {
            this.input[key] = true;
        } else if (event.type === 'keyup') {
            this.input[key] = false;
            for (var i = 0; i < this.listeners.length; i++) {
                this.listeners[i].handleKeyUp(event);
            }
        }
    };

    InputController.prototype.handleMouse = function (event) {
        if (event.type === 'mousedown') {
            this.mouse.click = true;
            for (var i = 0; i < this.listeners.length; i++) {
                this.listeners[i].handleClick(event);
            }
        } else if (event.type === 'mouseup') {
            this.mouse.click = false;
        } else if (event.type === 'mousemove') {
            this.mouse.lc = game.ndcToLocal((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
            this.mouse.bc = game.localToBlock(this.mouse.lc.x, this.mouse.lc.y);
        }
    };

    InputController.prototype.clearInput = function () {
        for (var key in this.input) {
            this.input[key] = false;
        }
        this.mouse.click = false;
        this.mouse.lc = null;
        this.mouse.bc = null;
    };
    return InputController;
})();
var ATMOS_MAT = new THREE.MeshBasicMaterial({ color: 0x1e1e1e });
ATMOS_MAT.transparent = true;
ATMOS_MAT.blending = THREE.CustomBlending;
ATMOS_MAT.blendSrc = (THREE.DstColorFactor);
ATMOS_MAT.blendDst = (THREE.DstAlphaFactor);
ATMOS_MAT.blendEquation = THREE.AddEquation;

var ATMOS_SHAPE = new THREE.PlaneGeometry(BLOCK_SIZE, BLOCK_SIZE);

var AtmosphereController = (function () {
    function AtmosphereController(scene) {
        this.scene = scene;
        this.grid = new Grid();
    }
    AtmosphereController.prototype.addAir = function (x, y) {
        if (this.grid.has(x, y)) {
            return;
        }
        this.grid.set(x, y, "air");
        var mesh = new THREE.Mesh(ATMOS_SHAPE, ATMOS_MAT);
        var lc = game.blockToLocal(x, y);
        mesh.position.set(lc[0], lc[1], -10);
        this.scene.add(mesh);
    };
    return AtmosphereController;
})();
var DUDE_MATERIAL = LoadJaggyMaterial('images/dude.png');
var FLASH_MATERIAL = LoadJaggyMaterial('images/flash.png');
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

var Player = (function () {
    function Player(game) {
        this.game = game;
        this.speedX = 0;
        this.speedY = 0;
        this.sprite = new THREE.Sprite(DUDE_MATERIAL);
        this.lastDig = -10000;
        this.flashSprite = new THREE.Sprite(FLASH_MATERIAL);
        this.id = -1;
        this.onGround = true;
        this.jumpTicks = 0;
        this.sprite.scale.set(DUDE_WIDTH, DUDE_HEIGHT, 1.0);
        this.flashSprite.scale.set(DUDE_WIDTH, DUDE_HEIGHT, 1.0);
        this.teleport(0, 10);
    }
    Player.prototype.tick = function () {
        var _this = this;
        var mouse = game.inputController.mouse;
        if (mouse.bc) {
            // Calculate radius from the center of the nearest block, not the true
            // mouse coordinates, so that blocks are either fully selectable or not.
            var lc = game.blockToLocal(mouse.bc[0], mouse.bc[1]);
            if (Math.abs(lc[0] - this.sprite.position.x) <= CLICK_RADIUS && Math.abs(lc[1] - this.sprite.position.y) <= CLICK_RADIUS) {
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
        pos.x += this.speedX;
        pos.y += this.speedY;

        this.onGround = false;
        var bounding = game.boundingBox(this.sprite);
        var collisions = this.game.blockCollisions(bounding[0], bounding[1]);
        collisions.forEach(function (bc) {
            if (game.debug) {
                game.addSpriteForTicks(game.outlineBlock(bc[0], bc[1], 0xffff00));
            }
            var lc = game.blockToLocal(bc[0], bc[1]);

            // To know how to react to this collision, we need to figure out which of
            // its 4 sides we would have hit first, given our previous position.
            //
            // We can eliminate 1 side from each axis using our direction. E.g. we
            // couldn't have hit the bottom if we're moving down, or the left if
            // we're moving left.
            //
            // Then we decide which of the 2 remaining sides we hit first by comparing
            // block penetration time on each axis.
            var timeX = Infinity;
            if (_this.speedX > 0) {
                timeX = (bounding[1][0] - (lc[0] - HALF_BLOCK)) / _this.speedX;
            } else if (_this.speedX < 0) {
                timeX = ((lc[0] + HALF_BLOCK) - bounding[0][0]) / -_this.speedX;
            }

            var timeY = Infinity;
            if (_this.speedY > 0) {
                timeY = (bounding[0][1] - (lc[1] - HALF_BLOCK)) / _this.speedY;
            } else if (_this.speedY < 0) {
                timeY = ((lc[1] + HALF_BLOCK) - bounding[1][1]) / -_this.speedY;
            }

            if (timeX < timeY) {
                if (_this.speedX > 0) {
                    // Ignore collision with a side that has an adjacent block, since its
                    // an "inside" edge.
                    if (!game.gameModel.terrainGrid.has(bc[0] - 1, bc[1])) {
                        pos.x = Math.min(pos.x, (lc[0] - HALF_BLOCK) - DUDE_WIDTH / 2);
                        if (game.debug) {
                            game.addSpriteForTicks(game.drawLine([lc[0] - HALF_BLOCK, lc[1] + HALF_BLOCK], [lc[0] - HALF_BLOCK, lc[1] - HALF_BLOCK], 0xff0000), 3);
                        }
                    }
                } else {
                    if (!game.gameModel.terrainGrid.has(bc[0] + 1, bc[1])) {
                        pos.x = Math.max(pos.x, (lc[0] + HALF_BLOCK) + DUDE_WIDTH / 2);
                        if (game.debug) {
                            game.addSpriteForTicks(game.drawLine([lc[0] + HALF_BLOCK, lc[1] + HALF_BLOCK], [lc[0] + HALF_BLOCK, lc[1] - HALF_BLOCK], 0xff0000), 3);
                        }
                    }
                }
            } else {
                if (_this.speedY > 0) {
                    if (!game.gameModel.terrainGrid.has(bc[0], bc[1] - 1)) {
                        pos.y = Math.min(pos.y, (lc[1] - HALF_BLOCK) - DUDE_HEIGHT / 2);
                        _this.jumpTicks = 0;
                        if (game.debug) {
                            game.addSpriteForTicks(game.drawLine([lc[0] + HALF_BLOCK, lc[1] - HALF_BLOCK], [lc[0] - HALF_BLOCK, lc[1] - HALF_BLOCK], 0xff0000), 3);
                        }
                    }
                } else {
                    if (!game.gameModel.terrainGrid.has(bc[0], bc[1] + 1)) {
                        pos.y = Math.max(pos.y, (lc[1] + HALF_BLOCK) + DUDE_HEIGHT / 2);
                        _this.onGround = true;
                        if (game.debug) {
                            game.addSpriteForTicks(game.drawLine([lc[0] + HALF_BLOCK, lc[1] + HALF_BLOCK], [lc[0] - HALF_BLOCK, lc[1] + HALF_BLOCK], 0xff0000), 3);
                        }
                    }
                }
            }
        });

        if (game.hasRendered) {
            var cameraOffset = this.sprite.position.clone().sub(game.camera.position);
            var cameraMotion = new THREE.Vector2(0, 0);
            if (Math.abs(cameraOffset.x) > game.cameraDeadzone.x) {
                cameraMotion.x = cameraOffset.x * 0.1;
            }
            if (Math.abs(cameraOffset.y) > game.cameraDeadzone.y) {
                cameraMotion.y = cameraOffset.y * 0.1;
            }
            game.panCamera(cameraMotion.x, cameraMotion.y);
        }
    };

    Player.prototype.teleport = function (x, y) {
        var lc = game.blockToLocal(x, y);
        this.sprite.position.set(lc[0], lc[1] + HALF_BLOCK + (Math.abs(this.sprite.scale.y) / 2), 0);
    };
    return Player;
})();
var BACKGROUND_TEXTURE = THREE.ImageUtils.loadTexture("images/mountains.png");
var BACKGROUND_MATERIAL = new THREE.MeshBasicMaterial({ map: BACKGROUND_TEXTURE });

var BackgroundController = (function () {
    function BackgroundController(scene) {
        this.scene = scene;
    }
    BackgroundController.prototype.drawBackground = function () {
        for (var x = -30; x < 30; x++) {
            var meshBg = new THREE.Mesh(new THREE.PlaneGeometry(640 * 2, 640 * 2), BACKGROUND_MATERIAL);
            meshBg.position.set(x * 640 * 2, 640 - 100, -200);
            this.scene.add(meshBg);
        }
    };
    return BackgroundController;
})();
/// <reference path='lib/three.d.ts'/>
/// <reference path='lib/seedrandom.d.ts'/>
/// <reference path='engine/entity.ts'/>
/// <reference path='engine/grid.ts'/>
/// <reference path='universe/spawner.ts'/>
/// <reference path='universe/entities/air-generator.ts'/>
/// <reference path='universe/entities/boar.ts'/>
/// <reference path='universe/entities/plant.ts'/>
/// <reference path='universe/entities/super-weed.ts'/>
/// <reference path='universe/entities/tree.ts'/>
/// <reference path='consts.ts'/>
/// <reference path='game_model.ts'/>
/// <reference path='ground.ts'/>
/// <reference path='input.ts'/>
/// <reference path='atmosphere.ts'/>
/// <reference path='player.ts'/>
/// <reference path='background.ts'/>
var getNow = (function () {
    if (window.performance && window.performance.now) {
        return window.performance.now.bind(window.performance);
    }
    return function () {
        return +new Date();
    };
})();

var tickCount = 0;

// Creates a new SpriteMaterial with nearest-neighbor texture filtering from
// image URL.
function LoadJaggyMaterial(url) {
    var texture = THREE.ImageUtils.loadTexture(url);
    texture.magFilter = texture.minFilter = THREE.NearestFilter;
    return new THREE.SpriteMaterial({ map: texture });
}
;

var Game = (function () {
    function Game(inputController) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(90, null, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.projector = new THREE.Projector();
        this.gameModel = new GameModel();
        this.creatureSpawner = new CreatureSpawner(this);
        this.now = getNow();
        this.lastTime = getNow();
        this.unprocessedFrames = 0;
        this.debug = false;
        this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        this.atmosphereController = new AtmosphereController(this.scene);
        this.hasRendered = false;
        this.removeSprites = [];
        this.cameraDeadzone = new THREE.Vector2(1000, 1000);
        this.inputController = inputController;
        this.camera.position.set(0, 0, 800);
        this.resize();
        document.body.appendChild(this.renderer.domElement);
    }
    Game.prototype.resize = function () {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.cameraDeadzone = new THREE.Vector2(window.innerWidth / 5, window.innerHeight / 5);
        if (tickCount != 0) {
            this.generateVisibleWorld();
        }
    };

    // Begin InputListener interface implementation
    Game.prototype.handleKeyUp = function (event) {
        var key = INPUT_MAP[event.which];
        if (key == 'debug') {
            console.log("debug mode");
            this.toggleDebug();
        }
    };

    Game.prototype.handleClick = function (event) {
        if (this.debug) {
            var lc = this.ndcToLocal((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
            var bc = this.localToBlock(lc.x, lc.y);
            this.addSpriteForTicks(this.outlineBlock(bc[0], bc[1], 0x00ff00), 60);
            var cc = Chunk.blockToChunk(bc);
            var chunk = this.gameModel.terrainStore.getChunk(cc[0], cc[1]);
            this.addSpriteForTicks(game.outlineChunk(chunk, 0x00ff00), 60);
            console.log('clicked block', bc, ' chunk ', cc, ' intrachunk ', chunk.getIntraChunkBlockCoords(bc[0], bc[1]));
        }
    };

    Game.prototype.handleClearInput = function () {
        if (this.debug) {
            console.log('Clear input');
        }
    };

    // End InputListener interface implementation
    Game.prototype.addEntity = function (entity) {
        this.gameModel.addEntity(entity);
        if (entity.sprite) {
            this.scene.add(entity.sprite);
        }
    };

    Game.prototype.removeEntity = function (entity) {
        this.gameModel.removeEntity(entity);
        this.scene.remove(entity.sprite);
    };

    Game.prototype.addSpriteForTicks = function (sprite, ticks) {
        if (typeof ticks === "undefined") { ticks = 1; }
        this.scene.add(sprite);
        this.removeSprites.push({ sprite: sprite, ticks: ticks });
    };

    // Returns local GL coordinates of the center of a block from block
    // coordinates.
    Game.prototype.blockToLocal = function (x, y) {
        return [
            (x * BLOCK_SIZE),
            (y * BLOCK_SIZE)
        ];
    };

    // Returns the coords of the top left corner of the given block coords.
    Game.prototype.blockToLocalCorner = function (x, y) {
        return [
            (x * BLOCK_SIZE) - HALF_BLOCK,
            (y * BLOCK_SIZE) - HALF_BLOCK
        ];
    };

    // Returns nearest block coordinates from local GL coordinates. Right and top
    // blocks win on edges.
    Game.prototype.localToBlock = function (x, y) {
        return [
            Math.round(x / BLOCK_SIZE),
            Math.round(y / BLOCK_SIZE)
        ];
    };

    // Returns local GL coordinates on the ground plane from normalized device
    // coordinates.
    Game.prototype.ndcToLocal = function (x, y) {
        if (!this.hasRendered) {
            throw new Error('Must have rendered before calling ndcToLocal');
        }
        var ndc = new THREE.Vector3(x, y, null);
        var raycaster = this.projector.pickingRay(ndc, this.camera);
        return raycaster.ray.intersectPlane(this.groundPlane);
    };

    Game.prototype.getGroundBeneathEntity = function (entity) {
        var lc = this.localToBlock(entity.sprite.position.x, entity.sprite.position.y);
        var height = lc[1] - 1;
        while (!this.gameModel.terrainGrid.has(lc[0], height)) {
            if (height <= lc[1] - 6) {
                return null;
            }
            height -= 1;
        }
        return this.gameModel.terrainGrid.get(lc[0], height);
    };

    Game.prototype.start = function () {
        this.gameModel.player = new Player(this);
        this.addEntity(this.gameModel.player);

        var bgController = new BackgroundController(this.scene);
        bgController.drawBackground();

        var airGenerator = new AirGenerator(5, 7);
        this.addEntity(airGenerator);

        var camera_block_position = this.localToBlock(this.camera.position.x, this.camera.position.y);
        this.creatureSpawner.spawnCreatures(camera_block_position[0], camera_block_position[1]);

        var superWeed = new SuperWeed(15, 0);
        this.addEntity(superWeed);

        window.addEventListener('resize', this.resize.bind(this));

        this.animate();
    };

    // Called when when we are allowed to render. In general at 60 fps.
    Game.prototype.animate = function () {
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
    };

    // Renders a single frame
    Game.prototype.render = function () {
        this.hasRendered = true;
        this.renderer.render(this.scene, this.camera);
    };

    Game.prototype.generateVisibleWorld = function () {
        var topLeftLc = this.ndcToLocal(-1, 1);
        var bottomRightLc = this.ndcToLocal(1, -1);
        var topLeftBc = this.localToBlock(topLeftLc.x - BLOCK_SIZE, topLeftLc.y - BLOCK_SIZE);
        var bottomRightBc = this.localToBlock(bottomRightLc.x + BLOCK_SIZE, bottomRightLc.y + BLOCK_SIZE);
        this.generateWorld(topLeftBc, bottomRightBc);
    };

    Game.prototype.generateWorld = function (topLeft, bottomRight) {
        var _this = this;
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

        this.gameModel.terrainStore.activeChunks.forEach(function (x, y, chunk) {
            if (x < topLeftChunkCoords[0] || x > bottomRightChunkCoords[0] || y > topLeftChunkCoords[1] || y < bottomRightChunkCoords[1]) {
                _this.removeChunk(chunk);
            }
        });

        if (this.debug && numNew > 0) {
            console.log('generated', numNew, 'blocks', 'from', topLeft, 'to', bottomRight);
        }
    };

    Game.prototype.addChunk = function (chunk) {
        var _this = this;
        this.gameModel.terrainStore.activeChunks.set(chunk.chunkX, chunk.chunkY, chunk);
        chunk.forEach(function (x, y, ground) {
            _this.gameModel.terrainGrid.set(ground.x, ground.y, ground);
            _this.addEntity(ground);
        });
        chunk.plants.forEach(function (plant) {
            _this.addEntity(plant);

            // Add air around plants
            _this.atmosphereController.addAir(plant.x, 0);
            var points = Grid.neighbors(plant.x, 0, 2);
            for (var i = 0; i < points.length; i++) {
                _this.atmosphereController.addAir(points[i][0], points[i][1]);
            }
        });
    };

    Game.prototype.removeChunk = function (chunk) {
        var _this = this;
        this.gameModel.terrainStore.activeChunks.clear(chunk.chunkX, chunk.chunkY);
        chunk.forEach(function (x, y, ground) {
            _this.gameModel.terrainGrid.clear(ground.x, ground.y);
            _this.removeEntity(ground);
        });
        chunk.plants.forEach(function (plant) {
            _this.removeEntity(plant);
            // TODO: remove atmosphere from around plants,
            //       or just in the chunk in general?
        });
    };

    // Compute the local GL rectangle corresponding to the visual boundary of a
    // sprite at its current position.
    Game.prototype.boundingBox = function (sprite) {
        var xCenter = sprite.position.x;
        var yCenter = sprite.position.y;
        var width = Math.abs(sprite.scale.x);
        var height = Math.abs(sprite.scale.y);
        var topLeft = [xCenter - width / 2, yCenter + height / 2];
        var bottomRight = [xCenter + width / 2, yCenter - height / 2];
        return [topLeft, bottomRight];
    };

    // Find the set of solid blocks which are fully or partially inside the given
    // rectangle. Blocks touching but outside are not considered collisions.
    Game.prototype.blockCollisions = function (topLeftLc, bottomRightLc) {
        // We round "in" on edges.
        var nearestTopLeftBc = [
            Math.round(topLeftLc[0] / BLOCK_SIZE),
            Math.ceil((topLeftLc[1] / BLOCK_SIZE) - 0.5)
        ];
        var nearestBottomRightBc = [
            Math.ceil((bottomRightLc[0] / BLOCK_SIZE) - 0.5),
            Math.round(bottomRightLc[1] / BLOCK_SIZE)
        ];
        var blocks = [];
        for (var x = nearestTopLeftBc[0]; x <= nearestBottomRightBc[0]; x++) {
            for (var y = nearestTopLeftBc[1]; y >= nearestBottomRightBc[1]; y--) {
                if (this.gameModel.terrainGrid.has(x, y)) {
                    blocks.push([x, y]);
                }
            }
        }
        return blocks;
    };

    Game.prototype.onGround = function (entity) {
        var ground = this.getGroundBeneathEntity(entity);
        if (!ground) {
            return false;
        }
        return entity.sprite.position.y - (ground.sprite.position.y + MAGIC_NUMBER) < 1;
    };

    // Single tick of game time (1 frame)
    Game.prototype.tick = function () {
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
    };

    Game.prototype.panCamera = function (x, y) {
        if (x != null) {
            this.camera.position.x += x;
        }
        if (y != null) {
            this.camera.position.y += y;
        }
        this.generateVisibleWorld();

        var camera_block_position = this.localToBlock(this.camera.position.x, this.camera.position.y);
        this.creatureSpawner.spawnCreatures(camera_block_position[0], camera_block_position[1]);
    };

    Game.prototype.toggleDebug = function () {
        this.debug = !this.debug;

        if (this.debug) {
            this.debugSprites = [];

            // Origin block.
            this.debugSprites.push(this.outlineBlock(0, 0, 0x0000ff));
            // Origin lines.
            // this.debugSprites.push(
            //   this.drawLine([0, 300], [0, -300], 0xff0000));
            // this.debugSprites.push(
            //   this.drawLine([300, 0], [-300, 0], 0xff0000));
        } else {
            var self = this;
            this.debugSprites.forEach(function (sprite) {
                self.scene.remove(sprite);
            });
        }
    };

    Game.prototype.drawLine = function (from, to, color) {
        if (typeof color === "undefined") { color = null; }
        var material = new THREE.LineBasicMaterial({ color: color || null });
        var geometry = new THREE.Geometry();
        geometry.vertices.push(new THREE.Vector3(from[0], from[1], 1));
        geometry.vertices.push(new THREE.Vector3(to[0], to[1], 1));
        var line = new THREE.Line(geometry, material);
        this.scene.add(line);
        return line;
    };

    Game.prototype.drawRect = function (cornerA, cornerB, color) {
        if (typeof color === "undefined") { color = null; }
        var material = new THREE.LineBasicMaterial({ color: color || null });
        var geometry = new THREE.Geometry();
        geometry.vertices.push(new THREE.Vector3(cornerA[0], cornerA[1], 1));
        geometry.vertices.push(new THREE.Vector3(cornerB[0], cornerA[1], 1));
        geometry.vertices.push(new THREE.Vector3(cornerB[0], cornerB[1], 1));
        geometry.vertices.push(new THREE.Vector3(cornerA[0], cornerB[1], 1));
        geometry.vertices.push(new THREE.Vector3(cornerA[0], cornerA[1], 1));
        var box = new THREE.Line(geometry, material);
        this.scene.add(box);
        return box;
    };

    Game.prototype.outlineBlock = function (x, y, color) {
        return this.drawRect(this.blockToLocalCorner(x, y), this.blockToLocalCorner(x + 1, y + 1), color);
    };

    Game.prototype.outlineChunk = function (chunk, color) {
        var topLeftBlockX = chunk.chunkX * CHUNK_SIZE;
        var topLeftBlockY = chunk.chunkY * CHUNK_SIZE;
        var bottomRightBlockX = (chunk.chunkX + 1) * CHUNK_SIZE;
        var bottomRightBlockY = (chunk.chunkY + 1) * CHUNK_SIZE;
        var tlLc = this.blockToLocalCorner(topLeftBlockX, topLeftBlockY);
        var brLc = this.blockToLocalCorner(bottomRightBlockX, bottomRightBlockY);
        return this.drawRect(tlLc, brLc, color);
    };
    return Game;
})();

var game;
window.addEventListener('load', function () {
    var inputController = new InputController();
    game = new Game(inputController);
    inputController.registerListener(game);
    game.start();
    if (document.URL.indexOf('debug') != -1) {
        game.toggleDebug();
    }
});
//# sourceMappingURL=main.js.map
