import type { MapFile, Zone } from '../sim/map-types';
import type { SimResult } from '../sim/types';
import type { MissionFile, MissionGoal } from './schemas';
import { en } from '../shared/strings/en';

export type GoalResult = {
  goal: MissionGoal;
  passed: boolean;
  label: string;
};

export type MissionResult = {
  passed: boolean;
  stars: 0 | 1 | 2 | 3;
  goals: GoalResult[];
  runSeconds: number;
  xp: number;
};

const pointInZone = (x: number, y: number, zone: Zone): boolean =>
  zone.shape === 'circle'
    ? Math.hypot(x - zone.x, y - zone.y) <= zone.r
    : Math.abs(x - zone.x) <= zone.w / 2 && Math.abs(y - zone.y) <= zone.h / 2;

export const missionGoalLabel = (goal: MissionGoal): string => {
  switch (goal.type) {
    case 'reachZone':
      return en.missionGoals.reachZone(goal.zone);
    case 'reachZoneWithTag':
      return en.missionGoals.reachTag(goal.tag);
    case 'pushObjectToZone':
      return en.missionGoals.pushObject(goal.object, goal.zone);
    case 'pushObjectWithTagToZone':
      return en.missionGoals.pushTag(goal.tag, goal.zone);
    case 'stayInZone':
      return en.missionGoals.stay(goal.zone, goal.durationMs);
    case 'avoidZone':
      return en.missionGoals.avoidZone(goal.zone);
    case 'avoidCollisions':
      return en.missionGoals.avoidCollisions;
    case 'maxTime':
      return en.missionGoals.maxTime(goal.seconds);
    case 'minTime': return en.missionGoals.minTime(goal.seconds);
    case 'stopInZone': return en.missionGoals.stopInZone(goal.zone);
    case 'visitInOrder': return en.missionGoals.visitInOrder(goal.zones);
    case 'headingWithin': return en.missionGoals.heading(goal.degrees, goal.tolerance);
    case 'usesBlock': return en.missionGoals.usesBlock(en.blocks.addNames[goal.block as keyof typeof en.blocks.addNames] ?? en.studio.concepts[goal.block as keyof typeof en.studio.concepts] ?? goal.block);
    case 'matrixLit': return en.missionGoals.matrix;
    case 'soundPlayed': return en.missionGoals.sound;
    case 'sensorAtEnd': return en.missionGoals.sensor(goal.port, goal.value);
    case 'sensorBetween': return en.missionGoals.sensorRange(goal.port, goal.min, goal.max);
    case 'sensorSeen': return en.missionGoals.sensorSeen(goal.port, goal.value);
    case 'variableEquals': return en.missionGoals.variable(goal.name, goal.value);
  }
};

const zoneEnter = (result: SimResult, zone: string) =>
  result.events.some((event) => event.type === 'zoneEnter' && event.data.zone === zone);

const zoneEnterWithTag = (result: SimResult, tag: string) =>
  result.events.some((event) => event.type === 'zoneEnter' && event.data.tags.includes(tag));

const zoneShape = (map: MapFile, zone: string) => map.zones.find((item) => item.id === zone);
const SNAPSHOT_TOLERANCE = 1 / 30 + 0.001;

/**
 * Checks every goal of a mission against a finished simulation run.
 * Pure function: same run, same verdict.
 */
export const checkMission = (
  mission: MissionFile,
  result: SimResult,
  map: MapFile,
  execution?: { usedBlocks?: string[]; variables?: Record<string, number | string | boolean> },
): MissionResult => {
  const goals: GoalResult[] = mission.goals.map((goal) => {
    let passed = false;
    switch (goal.type) {
      case 'reachZone':
        passed = zoneEnter(result, goal.zone);
        break;
      case 'reachZoneWithTag':
        passed = zoneEnterWithTag(result, goal.tag);
        break;
      case 'pushObjectToZone': {
        const object = result.end.objects.find((item) => item.id === goal.object);
        const zone = zoneShape(map, goal.zone);
        passed = Boolean(object && zone && pointInZone(object.x, object.y, zone));
        break;
      }
      case 'pushObjectWithTagToZone': {
        const zone = zoneShape(map, goal.zone);
        const objectIds = new Set(map.objects.filter((item) => item.tags?.includes(goal.tag)).map((item) => item.id));
        passed =
          zone !== undefined &&
          result.end.objects.some((item) => objectIds.has(item.id) && pointInZone(item.x, item.y, zone));
        break;
      }
      case 'stayInZone': {
        const zone = zoneShape(map, goal.zone);
        if (zone === undefined) {
          passed = false;
          break;
        }
        // Contiguous dwell: only continuous time inside the zone counts.
        // Leaving and returning does not credit the time spent outside.
        let best = 0;
        let start: number | null = null;
        let previousT: number | null = null;
        for (const snapshot of result.snapshots) {
          const inside = pointInZone(snapshot.robot.x, snapshot.robot.y, zone);
          if (inside) {
            if (start === null) start = snapshot.t;
            else if (previousT !== null && snapshot.t > previousT + 0.5) {
              // Gap in the recorded stream means the run was cut; start over.
              start = snapshot.t;
            }
          } else if (start !== null) {
            best = Math.max(best, snapshot.t - start);
            start = null;
          }
          previousT = snapshot.t;
        }
        if (start !== null) best = Math.max(best, result.end.t - start);
        passed = best + SNAPSHOT_TOLERANCE >= goal.durationMs / 1000;
        break;
      }
      case 'avoidZone':
        passed = !zoneEnter(result, goal.zone);
        break;
      case 'avoidCollisions':
        passed = !result.events.some((event) => event.type === 'collision');
        break;
      case 'maxTime':
        passed = result.end.t <= goal.seconds;
        break;
      case 'minTime': passed = result.end.t >= goal.seconds - 0.001; break;
      case 'stopInZone': {
        const zone = zoneShape(map, goal.zone);
        passed = Boolean(zone && pointInZone(result.end.robot.x, result.end.robot.y, zone)); break;
      }
      case 'visitInOrder': {
        let index = 0;
        for (const snapshot of result.snapshots) {
          const zone = zoneShape(map, goal.zones[index]);
          if (zone && pointInZone(snapshot.robot.x, snapshot.robot.y, zone)) index++;
          if (index === goal.zones.length) break;
        }
        passed = index === goal.zones.length; break;
      }
      case 'headingWithin': passed = Math.abs(((result.end.robot.heading * 180 / Math.PI - goal.degrees + 540) % 360 + 360) % 360 - 180) <= goal.tolerance; break;
      case 'usesBlock': passed = Boolean(execution?.usedBlocks?.includes(goal.block)); break;
      case 'matrixLit': passed = result.snapshots.some(snapshot => snapshot.hub.matrix.some(row => row.some(value => value > 0))); break;
      case 'soundPlayed': passed = result.events.some(event => event.type === 'sound' && event.data.durationMs > 0); break;
      case 'sensorAtEnd': passed = result.end.sensors[goal.port] === goal.value; break;
      case 'sensorBetween': {
        const value = result.end.sensors[goal.port]; passed = typeof value === 'number' && value >= goal.min && value <= goal.max; break;
      }
      case 'sensorSeen': passed = result.snapshots.some(snapshot => snapshot.sensors[goal.port] === goal.value); break;
      case 'variableEquals': passed = execution?.variables?.[goal.name] === goal.value; break;
    }
    return { goal, passed, label: missionGoalLabel(goal) };
  });

  const allPassed = goals.every((item) => item.passed);
  const runSeconds = result.end.t;
  let stars: 0 | 1 | 2 | 3 = 0;
  if (allPassed) {
    stars = 1;
    if (runSeconds <= mission.timeLimits.threeStars) stars = 3;
    else if (runSeconds <= mission.timeLimits.twoStars) stars = 2;
  }
  const xp = stars * 20 + goals.filter((item) => item.passed).length * 5;
  return { passed: allPassed, stars, goals, runSeconds, xp };
};
