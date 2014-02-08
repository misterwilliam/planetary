class Grid<T> {
  private _grid : {[coords:string]: T} = {};
  set(x:number, y:number, value:T) {
    this._grid['' + [x, y]] = value;
  }
  get(x: number, y:number):T {
    return this._grid['' + [x, y]];
  }
  has(x:number, y:number):boolean {
    return ([x,y] + '') in this._grid;
  }
  clear(x:number, y:number) {
    delete this._grid['' + [x, y]];
  }
  forEach(f:(x:number, y:number, value:T)=>void) {
    for (var key in this._grid) {
      var s = key.split(',');
      f(parseInt(s[0], 10), parseInt(s[1], 10), this._grid[key]);
    }
  }

  // Returns list of neighboring grid coordinates. If range is passed then
  // returns list of neighbors withing Manhattan distance range.
  static neighbors(x:number, y:number, range:number):number[][] {
    if (range === undefined) {
      range = 1;
    }
    var neighbors : number[][] = [];
    for (var i = -range; i <= range; i++) {
      for (var j = -range; j <= range; j++) {
        if ((i == 0 && j == 0) || (Math.abs(i) + Math.abs(j) > range)) {
          continue;
        }
        neighbors.push([x + i, y + j]);
      }
    }
    return neighbors;
  }

  static entityNeighbors(entity:Entity, range:number) {
    var block = game.localToBlock(entity.sprite.position.x,
                                  entity.sprite.position.y);
    return Grid.neighbors(block[0], block[1], range);
  }
}

