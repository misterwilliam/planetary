var INPUT_MAP = {
  87:  'jump',  // w
  83:  'down',  // s
  68:  'right', // d
  65:  'left',  // a
  32:  'dig',   // space
  192: 'debug', // ~
};

class InputController {
  game : Game;
  input = {
    jump: false, down: false, right: false, left: false, dig:false
  };
  listeners : Array<InputListener>;

  constructor(game : Game) {
    this.game = game;
    window.addEventListener('keydown', this.handleKey.bind(this));
    window.addEventListener('keyup', this.handleKey.bind(this));
    window.addEventListener('mousedown', this.click.bind(this));
    window.addEventListener('blur', this.clearInput.bind(this));
  }

  handleKey(event : KeyboardEvent) {
    var key = INPUT_MAP[event.which];
    if (!key) {
      console.log('unbound key:', event.which);
    } else if (event.type == 'keydown') {
      this.input[key] = true;
    } else {
      this.input[key] = false;
      if (key == 'debug') {
        this.game.toggleDebug();
      }
    }
  }

  click(event : MouseEvent) {
    if (this.game.debug) {
      var lc = this.game.ndcToLocal(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1);
      var bc = this.game.localToBlock(lc.x, lc.y);
      this.game.addSpriteForTicks(this.game.outlineBlock(bc[0], bc[1], 0x00ff00), 60);
      var cc = Chunk.blockToChunk(bc);
      var chunk = this.game.terrainStore.getChunk(cc[0], cc[1]);
      this.game.addSpriteForTicks(game.outlineChunk(chunk, 0x00ff00), 60)
      console.log('clicked block', bc, ' chunk ', cc, ' intrachunk ',
                  chunk.getIntraChunkBlockCoords(bc[0], bc[1]));
    }
  }

  clearInput() {
    for (var key in this.input) {
      this.input[key] = false;
    }
  }
}

interface InputListener {
  handleKey(event : KeyboardEvent): void;
  handleClick(event : MouseEvent): void;
  handleClearInput(): void;
}