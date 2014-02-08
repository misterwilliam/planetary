var PLAYER_MAX_SPEED = 8;
var PLAYER_ACCELERATION = 0.001;
var JUMP_HEIGHT = 10;
var MAX_DEPTH = -6;
var MAX_CATCHUP = 10;
var BLOCK_SIZE = 32;
var MAGIC_NUMBER = 56;
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
var DRY_MATERIAL = new THREE.SpriteMaterial({
    map: THREE.ImageUtils.loadTexture('images/ground.png')
});

var WET_MATERIAL = new THREE.SpriteMaterial({
    map: THREE.ImageUtils.loadTexture('images/soil.png')
});

var TerrainStore = (function () {
    function TerrainStore() {
        this.seed = Math.random();
        this.modifiedChunks = new Grid();
    }
    TerrainStore.prototype.onAdd = function (x, y, ground) {
        var chunk = this.getModifiedChunk(x, y);
        var intrachunkx = x % 64;
        var intrachunky = y % 64;
        chunk.set(intrachunkx, intrachunky, ground);
    };

    TerrainStore.prototype.onRemove = function (x, y) {
        var chunk = this.getModifiedChunk(x, y);
        var intrachunkx = x % 64;
        var intrachunky = y % 64;
        chunk.clear(intrachunkx, intrachunky);
    };

    TerrainStore.prototype.getChunk = function (x, y) {
        var chunkx = Math.floor(x / 64);
        var chunky = Math.floor(y / 64);
        var chunk = this.modifiedChunks.get(chunkx, chunky);
        if (!chunk) {
            chunk = this.generateChunk(chunkx, chunky);
        }
        return chunk;
    };

    TerrainStore.prototype.getModifiedChunk = function (x, y) {
        var chunkx = Math.floor(x / 64);
        var chunky = Math.floor(y / 64);
        var chunk = this.modifiedChunks.get(chunkx, chunky);
        if (!chunk) {
            chunk = this.generateChunk(chunkx, chunky);
            this.modifiedChunks.set(chunkx, chunky, chunk);
        }
        return chunk;
    };

    TerrainStore.prototype.generateChunk = function (x, y) {
        // once we're doing terrain generation, we should do something with the
        // seed and x and y to consistently generate the same terrain here
        var chunk = new Grid();
        if (y > 0) {
            return chunk;
        }
        var baseX = x * 64;
        var baseY = y * 64;
        for (var intrachunkx = 0; intrachunkx < 64; intrachunkx++) {
            for (var intrachunky = 0; intrachunky < 64; intrachunky++) {
                var absoluteX = baseX + intrachunkx;
                var absoluteY = baseY + intrachunky;
                if (absoluteY <= 0) {
                    chunk.set(intrachunkx, intrachunky, new Ground(absoluteX, absoluteY));
                }
            }
        }
    };
    return TerrainStore;
})();

var Ground = (function () {
    function Ground(x, y) {
        this.x = x;
        this.y = y;
        this.sprite = new THREE.Sprite(DRY_MATERIAL);
        this.waterLevel = 0;
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
        var self = this;
        game.entities.forEach(function (entity) {
            if (entity instanceof Plant) {
                return;
            }
            var plant = (entity);
            if (plant.x == self.x && plant.y == self.y + 1) {
                game.removeEntity(plant);
            }
        });

        game.scene.remove(this.sprite);
        game.terrainGrid.clear(this.x, this.y);
    };
    return Ground;
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
                var ground = game.terrainGrid.get(x, y);
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
var DUDE_MATERIAL = LoadJaggyMaterial('images/dude.png');
var FLASH_MATERIAL = LoadJaggyMaterial('images/flash.png');
var PAN_DISTANCE = 300;

var Player = (function () {
    function Player(game) {
        this.game = game;
        this.speedX = 0;
        this.speedY = 0;
        this.sprite = new THREE.Sprite(DUDE_MATERIAL);
        this.direction = -1;
        this.lastDig = -10000;
        this.flashSprite = new THREE.Sprite(FLASH_MATERIAL);
        this.id = -1;
        this.teleport(0, 20);
        this.sprite.scale.set(4 * 13, 4 * 21, 1.0); // imageWidth, imageHeight
        this.flashSprite.scale.set(4 * 13, 4 * 21, 1.0); // imageWidth, imageHeight
    }
    Player.prototype.tick = function () {
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
            this.sprite.position.y = Math.max(groundBeneath.sprite.position.y, newGroundBeneath.sprite.position.y) + MAGIC_NUMBER;
            this.speedY = 0;
        }

        // facing
        if ((this.direction == -1 && this.speedX > 0) || (this.direction == 1 && this.speedX < 0)) {
            this.sprite.scale.x *= -1;
            this.direction *= -1;
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
            var bc = game.localToBlock(this.sprite.position.x, this.sprite.position.y);
            var outline = game.outlineBlock(bc[0], bc[1]);
            setTimeout(function () {
                game.scene.remove(outline);
            }, 500);
        }
    };

    Player.prototype.teleport = function (x, y) {
        var lc = game.blockToLocal(x, y);
        this.sprite.position.set(lc[0], lc[1], 0);
    };

    Player.prototype.jump = function () {
        if (this.game.onGround(this)) {
            this.speedY = 13;
        }
    };

    Player.prototype.dig = function () {
        var now = getNow();
        if (now - 650 < this.lastDig) {
            return;
        }
        this.lastDig = now;

        var flashSprite = this.flashSprite;
        flashSprite.position.set(this.sprite.position.x, this.sprite.position.y - 30, 1);
        game.scene.add(flashSprite);
        setTimeout(function () {
            game.scene.remove(flashSprite);
        }, 100);

        var ground = this.game.getGroundBeneathEntity(this);
        if (ground) {
            ground.hit();
        }
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
/// <reference path='consts.ts'/>
/// <reference path='grid.ts'/>
/// <reference path='ground.ts'/>
/// <reference path='atmosphere.ts'/>
/// <reference path='plant.ts'/>
/// <reference path='tree.ts'/>
/// <reference path='player.ts'/>
/// <reference path='background.ts'/>
var INPUT_MAP = {
    87: 'jump',
    83: 'down',
    68: 'right',
    65: 'left',
    32: 'dig',
    192: 'debug'
};

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
    function Game() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(90, null, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.now = getNow();
        this.lastTime = getNow();
        this.unprocessedFrames = 0;
        this.input = {
            jump: false, down: false, right: false, left: false, dig: false
        };
        this.lastEntityId = -1;
        this.entities = [];
        this.terrainGrid = new Grid();
        this.debug = false;
        this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        this.projector = new THREE.Projector();
        this.atmosphereController = new AtmosphereController(this.scene);
        this.camera.position.set(0, 0, 800);
        this.resize();
        document.body.appendChild(this.renderer.domElement);
    }
    Game.prototype.resize = function () {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if (tickCount != 0) {
            this.generateVisibleWorld();
        }
    };

    Game.prototype.handleInput = function () {
        if (this.input.jump) {
            this.player.jump();
        } else if (this.input.down) {
            // do nothing
        }

        if (this.input.right) {
            this.player.speedX += PLAYER_ACCELERATION;
            this.player.speedX = Math.max(this.player.speedX, PLAYER_MAX_SPEED);
        } else if (this.input.left) {
            this.player.speedX -= PLAYER_ACCELERATION;
            this.player.speedX = Math.min(this.player.speedX, -PLAYER_MAX_SPEED);
        }

        if (this.input.dig) {
            this.player.dig();
        }
    };

    Game.prototype.handleKey = function (event) {
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
    };

    Game.prototype.clearInput = function () {
        console.log('clearing input');
        for (var key in this.input) {
            this.input[key] = false;
        }
    };

    Game.prototype.addEntity = function (entity) {
        entity.id = ++this.lastEntityId;
        this.entities[entity.id] = entity;
        if (entity.sprite) {
            this.scene.add(entity.sprite);
        }
    };

    Game.prototype.removeEntity = function (entity) {
        this.scene.remove(entity.sprite);
        delete this.entities[entity.id];
    };

    // Returns local GL coordinates of the center of a block from block
    // coordinates.
    Game.prototype.blockToLocal = function (x, y) {
        return [
            (x * BLOCK_SIZE),
            (y * BLOCK_SIZE)
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
        var ndc = new THREE.Vector3(x, y, null);
        var raycaster = this.projector.pickingRay(ndc, this.camera);
        return raycaster.ray.intersectPlane(this.groundPlane);
    };

    Game.prototype.click = function (event) {
        if (this.debug) {
            var lc = this.ndcToLocal((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
            var bc = this.localToBlock(lc.x, lc.y);
            console.log('clicked block', bc);
            var outline = game.outlineBlock(bc[0], bc[1], 0x00ff00);
            setTimeout(function () {
                game.scene.remove(outline);
            }, 1000);
        }
    };

    Game.prototype.getGroundBeneathEntity = function (entity) {
        var lc = this.localToBlock(entity.sprite.position.x, entity.sprite.position.y);
        var height = lc[1] - 1;
        while (!this.terrainGrid.has(lc[0], height)) {
            if (height <= MAX_DEPTH) {
                return null;
            }
            height -= 1;
        }
        return this.terrainGrid.get(lc[0], height);
    };

    Game.prototype.start = function () {
        this.player = new Player(this);
        this.addEntity(this.player);

        var bgController = new BackgroundController(this.scene);
        bgController.drawBackground();

        window.addEventListener('keydown', this.handleKey.bind(this));
        window.addEventListener('keyup', this.handleKey.bind(this));
        window.addEventListener('blur', this.clearInput.bind(this));
        window.addEventListener('resize', this.resize.bind(this));
        window.addEventListener('mousedown', this.click.bind(this));

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
        this.renderer.render(this.scene, this.camera);
    };

    Game.prototype.generateVisibleWorld = function () {
        var topLeftLc = this.ndcToLocal(-1, 1);
        var bottomRightLc = this.ndcToLocal(1, -1);
        var topLeftBc = this.localToBlock(topLeftLc.x, topLeftLc.y);
        var bottomRightBc = this.localToBlock(bottomRightLc.x, bottomRightLc.y);
        this.generateWorld(topLeftBc, bottomRightBc);
    };

    Game.prototype.generateWorld = function (topLeft, bottomRight) {
        this.plants = [];
        var numNew = 0;
        for (var x = topLeft[0]; x <= bottomRight[0]; x++) {
            for (var y = Math.min(topLeft[1], -1); y >= bottomRight[1]; y--) {
                if (this.terrainGrid.has(x, y)) {
                    continue;
                }
                numNew++;
                var ground = new Ground(x, y);
                this.terrainGrid.set(x, y, ground);
                this.addEntity(ground);
                if (y == -1) {
                    if (Math.random() < 0.1) {
                        var plant = new Plant(x, 0);
                        this.addEntity(plant);
                        this.plants.push(plant);

                        // Add air around plants
                        this.atmosphereController.addAir(x, 0);
                        var points = Grid.neighbors(x, 0, 2);
                        for (var i = 0; i < points.length; i++) {
                            this.atmosphereController.addAir(points[i][0], points[i][1]);
                        }
                    }
                    if (Math.random() < 0.03) {
                        var tree = new Tree(x, 0);
                        this.addEntity(tree);
                    }
                }
            }
        }
        if (this.debug && numNew > 0) {
            console.log('generated', numNew, 'blocks', 'from', topLeft, 'to', bottomRight);
        }
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
        this.handleInput();
        if (tickCount == 1) {
            this.generateVisibleWorld();
        }
        for (var id in this.entities) {
            this.entities[id].tick();
        }
        this.terrainGrid.forEach(function (x, y, ground) {
            ground.tick();
        });
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
    };

    Game.prototype.toggleDebug = function () {
        this.debug = !this.debug;

        if (this.debug) {
            this.debugSprites = [];

            // Origin block.
            this.debugSprites.push(this.outlineBlock(0, 0, 0x0000ff));

            // Origin lines.
            this.debugSprites.push(this.drawLine([0, 300], [0, -300], 0xff0000));
            this.debugSprites.push(this.drawLine([300, 0], [-300, 0], 0xff0000));
        } else {
            var self = this;
            this.debugSprites.forEach(function (sprite) {
                self.scene.remove(sprite);
            });
        }
    };

    Game.prototype.drawLine = function (from, to, color) {
        var material = new THREE.LineBasicMaterial({ color: color || null });
        var geometry = new THREE.Geometry();
        geometry.vertices.push(new THREE.Vector3(from[0], from[1], 1));
        geometry.vertices.push(new THREE.Vector3(to[0], to[1], 1));
        var line = new THREE.Line(geometry, material);
        this.scene.add(line);
        return line;
    };

    Game.prototype.drawRect = function (cornerA, cornerB, color) {
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
        var lc = this.blockToLocal(x, y);
        return this.drawRect([lc[0] - BLOCK_SIZE / 2, lc[1] - BLOCK_SIZE / 2], [lc[0] + BLOCK_SIZE / 2, lc[1] + BLOCK_SIZE / 2], color);
    };
    return Game;
})();

var game;
window.addEventListener('load', function () {
    game = new Game();
    game.start();
    if (document.URL.indexOf('debug') != -1) {
        game.toggleDebug();
    }
});
//# sourceMappingURL=main.js.map
