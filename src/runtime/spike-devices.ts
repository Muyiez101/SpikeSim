import type { DeterministicSimulator } from '../sim/engine';

/** Device state lives for one execution, never between projects or workers. */
export class SpikeDevices {
  readonly active = new Map<string, number>();
  readonly defaults = new Map<string, number>();
  readonly offsets = new Map<string, number>();
  pair: [string, string];
  wheelTravel: number;
  yawOffset = 0;
  constructor(readonly sim: DeterministicSimulator) {
    this.pair = ['left', 'right'].map(side => sim.robot.motors.find(m => m.side === side)?.port ?? '') as [string, string];
    this.wheelTravel = Math.PI * sim.robot.wheelDiameter / 10;
  }
  advance(seconds: number) { this.sim.advanceMotors(seconds, this.active); }
  startPair(left: number, right: number) { this.active.set(this.pair[0], left); this.active.set(this.pair[1], right); }
  stopPair() { this.startPair(0, 0); }
  position(port: string) { return this.sim.motorPosition(port) + (this.offsets.get(port) ?? 0); }
  resetPosition(port: string, value: number) { this.offsets.set(port, value - this.sim.motorPosition(port)); }
  duration(amount: number, unit: string, speed: number) {
    if (unit === 'seconds') return Math.abs(amount);
    const degrees = unit === 'rotations' ? amount * 360 : unit === 'degrees' ? amount
      : amount * (unit === 'inches' ? 2.54 : 1) / this.wheelTravel * 360;
    return Math.abs(degrees / (speed * 10));
  }
}
