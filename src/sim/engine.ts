import { mapSchema, robotSchema, type Device, type MapFile, type RobotDesign } from './schemas';
import type { SimCommand, SimEvent, HubEvent, SimResult, SimSnapshot } from './types';

const FIXED_DT = 1 / 120;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const EPSILON = 0.000001;
export class SimulationTimeLimit extends Error {}

type Point = { x: number; y: number };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const normalizeDegrees = (degrees: number) => {
  let result = degrees % 360;
  if (result > 180) result -= 360;
  if (result <= -180) result += 360;
  return result;
};
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const localToWorld = (pose: { x: number; y: number; heading: number }, local: Point): Point => {
  const cos = Math.cos(pose.heading);
  const sin = Math.sin(pose.heading);
  return { x: pose.x + cos * local.x - sin * local.y, y: pose.y + sin * local.x + cos * local.y };
};
const distanceToSegment = (point: Point, start: Point, end: Point) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared < EPSILON) return distance(point, start);
  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  return distance(point, { x: start.x + t * dx, y: start.y + t * dy });
};
const pointOnSegment = (point: Point, start: Point, end: Point, tolerance: number) => distanceToSegment(point, start, end) <= tolerance;

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '').padStart(6, '0').slice(0, 6);
  return [Number.parseInt(normalized.slice(0, 2), 16), Number.parseInt(normalized.slice(2, 4), 16), Number.parseInt(normalized.slice(4, 6), 16)];
}

function colorName(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  if (r < 45 && g < 45 && b < 45) return 'black';
  if (r > 220 && g > 220 && b > 220) return 'white';
  if (r > 180 && g < 100 && b < 100) return 'red';
  if (r > 170 && g > 150 && b < 90) return 'yellow';
  if (g > r * 1.25 && g > b * 1.15) return 'green';
  if (b > r * 1.25 && b > g * 1.1) return 'blue';
  return 'none';
}

export class DeterministicSimulator {
  readonly map: MapFile;
  readonly robot: RobotDesign;
  readonly seed: number;
  private pose = { x: 0, y: 0, heading: 0 };
  private wheelDegrees = [0, 0];
  private time = 0;
  private events: (SimEvent | HubEvent)[] = [];
  private snapshots: SimSnapshot[] = [];
  private sensors: Record<string, number | string> = {};
  private enteredZones = new Set<string>();
  private hubMatrix = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 0));
  private hubColor = '#1fa971';
  private armDegrees = 0;
  private distanceLights: Record<string, number[]> = {};
  private lastSnapshotTime = -Infinity;
  private objectPos = new Map<string, { x: number; y: number }>();
  private lastObjectTouch = new Map<string, number>();
  private maxSeconds: number;

  constructor(input: { map: MapFile; robot: RobotDesign; seed?: number; maxSeconds?: number }) {
    this.maxSeconds = input.maxSeconds ?? Infinity;
    this.map = mapSchema.parse(input.map);
    this.robot = robotSchema.parse(input.robot);
    this.seed = input.seed ?? 1;
    this.reset();
  }

  reset() {
    this.pose = { x: this.map.spawn.x, y: this.map.spawn.y, heading: this.map.spawn.heading * DEG_TO_RAD };
    this.wheelDegrees = [0, 0];
    this.time = 0;
    this.events = [];
    this.snapshots = [];
    this.sensors = {};
    this.enteredZones = new Set<string>();
    this.hubMatrix = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 0));
    this.hubColor = '#1fa971';
    this.armDegrees = 0;
    this.distanceLights = {};
    this.lastSnapshotTime = -Infinity;
    this.objectPos = new Map(this.map.objects.map((object) => [object.id, { x: object.x, y: object.y }]));
    this.lastObjectTouch = new Map();
    this.recordSnapshot(true);
  }

  run(commands: SimCommand[]): SimResult {
    for (const command of commands) this.execute(command);
    this.recordSnapshot(true);
    return { end: this.snapshots[this.snapshots.length - 1], snapshots: this.snapshots, events: this.events, sensors: { ...this.sensors } };
  }

  private execute(command: SimCommand) {
    if (command.type === 'move') {
      const target = Math.abs(command.distanceMm);
      const direction = Math.sign(command.distanceMm) || 1;
      const startPose = { ...this.pose };
      const travelled = this.advanceUntil((moved) => moved >= target, direction * command.speedPercent, direction * command.speedPercent);
      const exactPose = { x: startPose.x + Math.cos(startPose.heading) * command.distanceMm, y: startPose.y + Math.sin(startPose.heading) * command.distanceMm, heading: startPose.heading };
      if (travelled >= target && this.canOccupy(exactPose)) this.pose = exactPose;
      this.recordSnapshot(true);
    } else if (command.type === 'turn') {
      const target = Math.abs(command.degrees) * DEG_TO_RAD;
      const direction = Math.sign(command.degrees) || 1;
      const startHeading = this.pose.heading;
      let turned = 0;
      let previousHeading = this.pose.heading;
      this.advanceUntil(() => turned >= target, -direction * command.speedPercent, direction * command.speedPercent, () => {
        const delta = normalizeDegrees((this.pose.heading - previousHeading) * RAD_TO_DEG) * DEG_TO_RAD;
        turned += Math.abs(delta);
        previousHeading = this.pose.heading;
      });
      this.pose.heading = startHeading + command.degrees * DEG_TO_RAD;
      this.recordSnapshot(true);
    } else if (command.type === 'tank') {
      this.advanceFor(command.durationMs / 1000, command.leftPercent, command.rightPercent);
    } else if (command.type === 'wait') {
      this.advanceFor(command.durationMs / 1000, 0, 0);
    } else if (command.type === 'motor') {
      const motor = this.robot.motors.find((item) => item.port === command.port);
      if (motor?.side === 'arm') this.armDegrees += command.speedPercent * 10 * command.durationMs / 1000;
      this.advanceFor(command.durationMs / 1000, motor?.side === 'left' ? command.speedPercent : 0, motor?.side === 'right' ? command.speedPercent : 0);
    } else if (command.type === 'matrix') {
      const patterns = { smile: ['00000', '01010', '00000', '10001', '01110'], heart: ['01010', '11111', '11111', '01110', '00100'], arrow: ['00100', '01100', '11111', '01100', '00100'], check: ['00001', '00010', '10100', '01000', '00000'] };
      this.hubMatrix = patterns[command.image].map((row) => [...row].map((value) => Number(value) * 100));
      this.recordSnapshot(true);
    } else if (command.type === 'pixel') {
      this.hubMatrix[command.y][command.x] = command.brightness;
      this.recordSnapshot(true);
    } else if (command.type === 'clearMatrix') {
      this.hubMatrix = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 0));
      this.recordSnapshot(true);
    } else if (command.type === 'light') {
      this.hubColor = ({ red: '#ef4444', yellow: '#facc15', green: '#22c55e', blue: '#3b82f6', purple: '#a855f7', white: '#ffffff', off: '#263047' } as Record<string, string>)[command.color] ?? '#263047';
      this.recordSnapshot(true);
    } else if (command.type === 'beep') {
      this.events.push({ type: 'sound', data: { t: this.time, frequency: command.frequency, durationMs: command.durationMs } });
      this.advanceFor(command.durationMs / 1000, 0, 0);
    } else {
      this.recordSnapshot(true);
    }
  }

  private advanceUntil(done: (distance: number) => boolean, leftPercent: number, rightPercent: number, afterStep?: () => void) {
    let progress = 0;
    let stalledSteps = 0;
    for (let i = 0; i < 120 * 60 && !done(progress); i += 1) {
      const before = { x: this.pose.x, y: this.pose.y };
      this.advanceOne(leftPercent, rightPercent);
      progress += distance(before, this.pose);
      if (distance(before, this.pose) < EPSILON) stalledSteps += 1;
      else stalledSteps = 0;
      afterStep?.();
      if (stalledSteps > 60) break;
    }
    return progress;
  }

  private advanceFor(seconds: number, leftPercent: number, rightPercent: number) {
    const steps = Math.ceil(Math.max(0, seconds) / FIXED_DT);
    for (let i = 0; i < steps; i += 1) this.advanceOne(leftPercent, rightPercent);
  }

  /** Advance concurrently active motors in the same deterministic physics step. */
  advanceMotors(seconds: number, speeds: ReadonlyMap<string, number>) {
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 60) throw new RangeError('Motor duration');
    const speed = (side: string) => speeds.get(this.robot.motors.find(m => m.side === side)?.port ?? '') ?? 0;
    for (let i = 0; i < Math.ceil(seconds / FIXED_DT); i++) {
      this.armDegrees += speed('arm') * 10 * FIXED_DT;
      this.advanceOne(speed('left'), speed('right'));
    }
  }

  motorPosition(port: string) {
    const side = this.robot.motors.find(m => m.port === port)?.side;
    return side === 'left' ? this.wheelDegrees[0] : side === 'right' ? this.wheelDegrees[1] : this.armDegrees;
  }

  setDistanceLights(port: string, values: number[]) {
    this.distanceLights[port] = [...values];
    this.recordSnapshot(true);
  }

  private advanceOne(leftPercent: number, rightPercent: number) {
    if (this.time + FIXED_DT > this.maxSeconds + EPSILON) throw new SimulationTimeLimit();
    const left = clamp(leftPercent, -100, 100);
    const right = clamp(rightPercent, -100, 100);
    const wheelCircumference = Math.PI * this.robot.wheelDiameter;
    const leftMmPerSecond = (left * 10 / 360) * wheelCircumference;
    const rightMmPerSecond = (right * 10 / 360) * wheelCircumference;
    const linear = (leftMmPerSecond + rightMmPerSecond) / 2;
    const angular = (rightMmPerSecond - leftMmPerSecond) / this.robot.trackWidth;
    const nextHeading = this.pose.heading + angular * FIXED_DT;
    const nextPose = { x: this.pose.x + linear * Math.cos(this.pose.heading) * FIXED_DT, y: this.pose.y + linear * Math.sin(this.pose.heading) * FIXED_DT, heading: nextHeading };
    const moved = this.canOccupy(nextPose);
    if (moved) {
      this.pushObjects(nextPose, { x: nextPose.x - this.pose.x, y: nextPose.y - this.pose.y }, false);
      this.pose = nextPose;
      this.wheelDegrees[0] += (left * 10) * FIXED_DT;
      this.wheelDegrees[1] += (right * 10) * FIXED_DT;
      this.checkZones();
    } else {
      this.pushObjects(this.pose, { x: 0, y: 0 }, true);
      if (Math.abs(linear) > EPSILON || Math.abs(angular) > EPSILON) {
        if (!this.events.some((event) => event.type === 'collision' && event.data.wall === 'boundary' && Math.abs(this.time - this.lastSnapshotTime) < FIXED_DT * 2)) this.events.push({ type: 'collision', data: { wall: 'boundary' } });
      }
    }
    this.time += FIXED_DT;
    this.recordSnapshot();
  }

  private canOccupy(pose: { x: number; y: number; heading: number }) {
    const radius = Math.hypot(this.robot.width, this.robot.length) / 2;
    if (pose.x < radius || pose.x > this.map.size.width - radius || pose.y < radius || pose.y > this.map.size.height - radius) return false;
    for (const wall of this.map.walls) {
      for (let i = 1; i < wall.points.length; i += 1) {
        const start = { x: wall.points[i - 1][0], y: wall.points[i - 1][1] };
        const end = { x: wall.points[i][0], y: wall.points[i][1] };
        if (distanceToSegment(pose, start, end) < radius + wall.thickness / 2) return false;
      }
    }
    return true;
  }

  /** Objects with physics: the robot pushes them instead of being blocked. */
  private pushObjects(pose: { x: number; y: number; heading: number }, moved: { x: number; y: number }, wasBlocked: boolean) {
    const robotRadius = Math.hypot(this.robot.width, this.robot.length) / 2;
    const travelLength = Math.hypot(moved.x, moved.y);
    const travel = travelLength > EPSILON ? { x: moved.x / travelLength, y: moved.y / travelLength } : null;
    for (const object of this.map.objects) {
      const current = this.objectPos.get(object.id) ?? { x: object.x, y: object.y };
      const gap = distance(pose, current) - robotRadius - object.size / 2;
      if (gap >= 0) continue;
      // Only objects in the direction of travel get pushed, so a robot
      // sliding past a box does not drag it sideways.
      const dx = current.x - pose.x;
      const dy = current.y - pose.y;
      const length = Math.hypot(dx, dy) || 1;
      if (!wasBlocked && travel && (dx / length) * travel.x + (dy / length) * travel.y < 0.3) continue;
      if (wasBlocked || travel) {
        const pushDistance = -gap;
        const next = { x: current.x + (dx / length) * pushDistance, y: current.y + (dy / length) * pushDistance };
        const objectRadius = object.size / 2;
        next.x = clamp(next.x, objectRadius, this.map.size.width - objectRadius);
        next.y = clamp(next.y, objectRadius, this.map.size.height - objectRadius);
        const hitWall = this.map.walls.some((wall) =>
          wall.points.slice(1).some((_, index) =>
            distanceToSegment(next, { x: wall.points[index][0], y: wall.points[index][1] }, { x: wall.points[index + 1][0], y: wall.points[index + 1][1] }) < objectRadius + wall.thickness / 2,
          ),
        );
        if (!hitWall) {
          this.objectPos.set(object.id, next);
          const lastTouch = this.lastObjectTouch.get(object.id) ?? -Infinity;
          if (this.time - lastTouch >= 0.5) {
            this.events.push({ type: 'collision', data: { object: object.id } });
            this.lastObjectTouch.set(object.id, this.time);
          }
        }
      }
    }
  }

  private checkZones() {
    for (const zone of this.map.zones) {
      const inside = zone.shape === 'circle' ? distance(this.pose, zone) <= zone.r : Math.abs(this.pose.x - zone.x) <= zone.w / 2 && Math.abs(this.pose.y - zone.y) <= zone.h / 2;
      if (inside && !this.enteredZones.has(zone.id)) {
        this.enteredZones.add(zone.id);
        this.events.push({ type: 'zoneEnter', data: { zone: zone.id, tags: zone.tags } });
      }
    }
  }

  readSensor(port: string): number | string {
    const device = this.robot.devices.find((item) => item.port === port);
    if (!device) return 'none';
    const result = this.sampleSensor(device);
    this.sensors[port] = result;
    this.events.push({ type: 'sensor', data: { port, sensor: device.type, value: result } });
    return result;
  }

  private sampleSensor(device: Device): number | string {
    return device.type === 'color' ? this.readColor(device) : device.type === 'distance' ? this.readDistance(device) : device.type === 'force' ? this.readForce(device) : normalizeDegrees(this.pose.heading * RAD_TO_DEG);
  }

  private readColor(device: Device) {
    const point = localToWorld(this.pose, device);
    for (const layer of this.map.surface.layers) {
      if (layer.type === 'patch' && layer.shape === 'rect' && Math.abs(point.x - layer.x) <= (layer.w ?? 0) / 2 && Math.abs(point.y - layer.y) <= (layer.h ?? 0) / 2) return colorName(layer.color);
      if (layer.type === 'patch' && layer.shape === 'circle' && distance(point, layer) <= (layer.r ?? 0)) return colorName(layer.color);
      if (layer.type === 'line' && layer.points.some((_, index) => index > 0 && pointOnSegment(point, { x: layer.points[index - 1][0], y: layer.points[index - 1][1] }, { x: layer.points[index][0], y: layer.points[index][1] }, (device.footprint ?? 12) / 2 + layer.width / 2))) return colorName(layer.color);
    }
    return colorName(this.map.surface.base);
  }

  private readDistance(device: Device) {
    const origin = localToWorld(this.pose, device);
    const angle = this.pose.heading + device.heading * DEG_TO_RAD;
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    const maxRange = device.range ?? 2000;
    let closest = maxRange;
    for (const wall of this.map.walls) for (let i = 1; i < wall.points.length; i += 1) closest = Math.min(closest, raySegmentDistance(origin, direction, { x: wall.points[i - 1][0], y: wall.points[i - 1][1] }, { x: wall.points[i][0], y: wall.points[i][1] }));
    for (const object of this.liveObjects()) closest = Math.min(closest, rayCircleDistance(origin, direction, object, object.size / 2));
    return closest >= maxRange ? -1 : Math.round(closest);
  }

  private readForce(device: Device) {
    // The bumper must meet the same collision hull used by canOccupy.
    const radius = Math.hypot(this.robot.width, this.robot.length) / 2;
    const bearing = Math.atan2(device.y, device.x);
    const point = localToWorld(this.pose, { x: Math.cos(bearing) * radius, y: Math.sin(bearing) * radius });
    const pressed = this.map.walls.some((wall) => wall.points.slice(1).some((_, index) => distanceToSegment(point, { x: wall.points[index][0], y: wall.points[index][1] }, { x: wall.points[index + 1][0], y: wall.points[index + 1][1] }) < wall.thickness / 2 + 2));
    return pressed ? 10 : 0;
  }

  snapshot(): SimSnapshot { return this.makeSnapshot([]); }

  private recordSnapshot(force = false) {
    if (!force && this.time - this.lastSnapshotTime < 1 / 30) return;
    const snapshot = this.makeSnapshot(this.events.slice(-4));
    this.snapshots.push(snapshot);
    this.lastSnapshotTime = this.time;
  }

  private liveObjects() {
    return this.map.objects.map((object) => {
      const live = this.objectPos.get(object.id);
      return { ...object, x: live?.x ?? object.x, y: live?.y ?? object.y };
    });
  }

  private makeSnapshot(events: (SimEvent | HubEvent)[]): SimSnapshot {
    return { t: Number(this.time.toFixed(9)), robot: { x: Number(this.pose.x.toFixed(6)), y: Number(this.pose.y.toFixed(6)), heading: Number(this.pose.heading.toFixed(9)), wheels: this.wheelDegrees.map((value) => Number(value.toFixed(6))), arms: [this.armDegrees] }, objects: this.liveObjects().map((object) => ({ id: object.id, x: Number(object.x.toFixed(4)), y: Number(object.y.toFixed(4)), heading: 0 })), hub: { matrix: this.hubMatrix.map((row) => [...row]), statusColor: this.hubColor, ...(Object.keys(this.distanceLights).length ? {distanceLights: structuredClone(this.distanceLights)} : {}) }, sensors: Object.fromEntries(this.robot.devices.map((device) => [device.port, this.sampleSensor(device)])), events };
  }
}

function raySegmentDistance(origin: Point, direction: Point, start: Point, end: Point): number {
  const segment = { x: end.x - start.x, y: end.y - start.y };
  const denominator = direction.x * segment.y - direction.y * segment.x;
  if (Math.abs(denominator) < EPSILON) return Infinity;
  const delta = { x: start.x - origin.x, y: start.y - origin.y };
  const rayDistance = (delta.x * segment.y - delta.y * segment.x) / denominator;
  const segmentDistance = (delta.x * direction.y - delta.y * direction.x) / denominator;
  return rayDistance >= 0 && segmentDistance >= 0 && segmentDistance <= 1 ? rayDistance : Infinity;
}

function rayCircleDistance(origin: Point, direction: Point, centre: Point, radius: number): number {
  const offset = { x: centre.x - origin.x, y: centre.y - origin.y };
  const projection = offset.x * direction.x + offset.y * direction.y;
  const perpendicular = Math.sqrt(Math.max(0, offset.x * offset.x + offset.y * offset.y - projection * projection));
  if (perpendicular > radius || projection < 0) return Infinity;
  return projection - Math.sqrt(radius * radius - perpendicular * perpendicular);
}
