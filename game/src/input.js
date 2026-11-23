// Keyboard + touch input. Deterministic state, edge-triggered actions.
export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();
    this.gamepadAxis = { x: 0, y: 0 };
    this._onDown = (e) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
    };
    this._onUp = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.keys.delete(k);
    };
    window.addEventListener('keydown', this._onDown);
    window.addEventListener('keyup', this._onUp);
    window.addEventListener('blur', () => { this.keys.clear(); });
  }
  down(k) { return this.keys.has(k); }
  wasPressed(k) { return this.pressed.has(k); }
  endFrame() { this.pressed.clear(); }
  axis() {
    let x = 0, y = 0;
    if (this.down('a') || this.down('ArrowLeft')) x -= 1;
    if (this.down('d') || this.down('ArrowRight')) x += 1;
    if (this.down('w') || this.down('ArrowUp')) y += 1;
    if (this.down('s') || this.down('ArrowDown')) y -= 1;
    return { x, y };
  }
  dispose() {
    window.removeEventListener('keydown', this._onDown);
    window.removeEventListener('keyup', this._onUp);
  }
}
