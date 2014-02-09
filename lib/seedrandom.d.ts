interface SeedRandomStatic {
    new (seed:string):SeedRandom;
  }
interface SeedRandom {
  ():number;
}

interface Math {
  seedrandom : SeedRandomStatic;
}
