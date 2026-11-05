export function wheelEstimate(distanceCm: number, diameterCm: number) {
  if (
    !Number.isFinite(distanceCm) ||
    !Number.isFinite(diameterCm) ||
    distanceCm < 0 ||
    distanceCm > 1000 ||
    diameterCm < 1 ||
    diameterCm > 30
  )
    return null;
  const circumference = Math.PI * diameterCm,
    rotations = distanceCm / circumference;
  return {
    millimetres: distanceCm * 10,
    metres: distanceCm / 100,
    circumference,
    rotations,
    degrees: rotations * 360,
  };
}
export function shorterTurn(current: number, target: number) {
  return ((((target - current + 180) % 360) + 360) % 360) - 180;
}
