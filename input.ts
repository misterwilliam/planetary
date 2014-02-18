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
  87:  'jump',  // w
  83:  'down',  // s
  68:  'right', // d
  65:  'left',  // a
  32:  'dig',   // space
  192: 'debug', // ~
};

interface InputListener {
  handleKeyUp(event : KeyboardEvent): void;
  handleClick(event : MouseEvent): void;
  handleClearInput(): void;
}

class InputController {
  game : Game;

  input = {
    jump: false,
    down: false,
    right: false,
    left: false
  };

  mouse : {
    click: boolean;
    lc: THREE.Vector3;
    bc: number[];
  } = {
    click: false,
    lc: null,
    bc: null
  }

  listeners : InputListener[] = [];

  constructor() {
    window.addEventListener('keydown', this.handleKey.bind(this));
    window.addEventListener('keyup', this.handleKey.bind(this));
    window.addEventListener('mousedown', this.handleMouse.bind(this));
    window.addEventListener('mouseup', this.handleMouse.bind(this));
    window.addEventListener('mousemove', this.handleMouse.bind(this));
    window.addEventListener('blur', this.clearInput.bind(this));
  }

  registerListener(listener : InputListener) {
    this.listeners.push(listener);
  }

  handleKey(event : KeyboardEvent) {
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
  }

  handleMouse(event : MouseEvent) {
    if (event.type === 'mousedown') {
      this.mouse.click = true;
      for (var i = 0; i < this.listeners.length; i++) {
        this.listeners[i].handleClick(event);
      }
    } else if (event.type === 'mouseup') {
      this.mouse.click = false;
    } else if (event.type === 'mousemove') {
      this.mouse.lc = game.ndcToLocal(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1);
      this.mouse.bc =
        game.localToBlock(this.mouse.lc.x, this.mouse.lc.y);
    }
  }

  clearInput() {
    for (var key in this.input) {
      this.input[key] = false;
    }
    this.mouse.click = false;
    this.mouse.lc = null;
    this.mouse.bc = null;
  }
}
