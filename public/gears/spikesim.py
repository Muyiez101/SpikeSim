# SpikeSim student-block adapter for the bundled Gears engine. GPL-3.0.
import spike_native, math
_event_mode = False
_waiting = ['move', 'turn', 'tank', 'motor', 'moveFor', 'steerFor', 'motorFor', 'wait', 'beep', 'pattern', 'text', 'tick']

def call(name, *args):
    if _event_mode and name in _waiting:
        return spike_native.begin(name, list(args))
    if _event_mode:
        return spike_native.instant(name, list(args))
    return spike_native.perform(name, list(args))

class Robot:
    def move_cm(self, distance, speed=None): return call('move', distance, speed)
    def turn(self, angle, speed=40): return call('turn', angle, speed)
    def tank(self, left, right, seconds): return call('tank', left, right, seconds)
    def motor(self, port, speed, seconds): return call('motor', port, speed, seconds)
    def set_speed(self, speed): return call('speed', speed)
    def pair(self, left, right): return call('pair', left, right)
    def set_wheel_travel(self, distance): return call('wheelTravel', distance)
    def move_for(self, direction, amount, unit): return call('moveFor', direction, amount, unit)
    def steer_for(self, steering, amount, unit): return call('steerFor', steering, amount, unit)
    def start_moving(self, direction): return call('startMove', direction)
    def start_tank(self, left, right): return call('startTank', left, right)
    def stop_moving(self): return call('stopMove')
    def set_motor_speed(self, port, speed): return call('motorSpeed', port, speed)
    def start_motor(self, port, direction): return call('motorStart', port, direction)
    def stop_motor(self, port): return call('motorStop', port)
    def motor_for(self, port, direction, amount, unit): return call('motorFor', port, direction, amount, unit)
    def motor_position(self, port): return call('motorPosition', port)
    def motor_speed(self, port): return call('motorVelocity', port)
    def reset_motor_position(self, port, value): return call('motorReset', port, value)
    def heading(self): return call('heading')
    def reset_yaw(self, angle): return call('resetYaw', angle)
    def stop_program(self):
        call('stopMove')
        raise SystemExit()

class Sensors:
    def reflection(self, port): return call('reflection', port)
    def distance_cm(self, port): return call('distance', port)
    def color(self, port): return call('color', port)
    def force(self, port): return call('force', port)
    def distance_compare(self, port, operator, value):
        distance = self.distance_cm(port)
        return distance >= 0 and (distance < value if operator == 'LT' else distance > value)
    def set_lights(self, port, values): return call('distanceLights', port, values)

class Hub:
    def button_pressed(self, button): return call('button', button)
    def angle(self, axis): return call('angle', axis)
    def show_image(self, image): return call('image', image)
    def set_pixel(self, x, y, brightness): return call('pixel', x, y, brightness)
    def clear(self): return call('clear')
    def set_light(self, color): return call('light', color)
    def beep(self, frequency, seconds): return call('beep', frequency, seconds)
    def show_pattern(self, pattern, seconds): return call('pattern', pattern, seconds)
    def write(self, text): return call('text', str(text))

class Runloop:
    def __init__(self): self.messages = {}
    def broadcast(self, name): self.messages[name] = self.messages.get(name, 0) + 1
    def message_count(self, name): return self.messages.get(name, 0)
    def run_events(self, starts, watchers):
        global _event_mode
        _event_mode = True
        self.messages = {}
        tasks = [[fn, fn(), None] for fn in starts]
        previous = [False for watcher in watchers]
        try:
            while tasks or watchers:
                for index, watcher in enumerate(watchers):
                    condition, fn = watcher
                    current = condition()
                    if current and current != previous[index] and not any(task[0] == fn for task in tasks):
                        tasks.append([fn, fn(), None])
                    previous[index] = current
                for task in list(tasks):
                    if task[2] is not None and not spike_native.poll(task[2]): continue
                    try: task[2] = next(task[1])
                    except StopIteration: tasks.remove(task)
                spike_native.perform('tick', [])
        finally:
            _event_mode = False
    def report(self, values): return call('variables', values)
    def sleep(self, seconds): return call('wait', seconds)
    def timer(self): return call('timer')
    def reset_timer(self): return call('resetTimer')
    def yield_tick(self): return call('tick')
    def mark(self, block): return call('mark', block)
    def count(self, start, end, step):
        if step == 0: raise ValueError('The counting step cannot be zero.')
        step = abs(step) if start <= end else -abs(step)
        value = start
        while (value <= end if step > 0 else value >= end):
            yield value
            value += step

robot, sensors, hub, runloop = Robot(), Sensors(), Hub(), Runloop()
