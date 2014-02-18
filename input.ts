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
    jump: false, down: false, right: false, left: false, dig:false
  };
  listeners : InputListener[] = [];

  constructor() {
    window.addEventListener('keydown', this.handleKey.bind(this));
    window.addEventListener('keyup', this.handleKey.bind(this));
    window.addEventListener('mousedown', this.click.bind(this));
    window.addEventListener('blur', this.clearInput.bind(this));
  }

  registerListener(listener : InputListener) {
    this.listeners.push(listener);
  }

  handleKey(event : KeyboardEvent) {
    var key = INPUT_MAP[event.which];
    if (!key) {
      console.log('unbound key:', event.which);
    } else if (event.type == 'keydown') {
      this.input[key] = true;
    } else {
      this.input[key] = false;
      for (var i = 0; i < this.listeners.length; i++) {
        this.listeners[i].handleKeyUp(event);
      }
    }
  }

  click(event : MouseEvent) {
    for (var i = 0; i < this.listeners.length; i++) {
      this.listeners[i].handleClick(event);
    }
  }

  clearInput() {
    for (var key in this.input) {
      this.input[key] = false;
    }
  }
}