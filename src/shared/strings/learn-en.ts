import { advancedLessons, advancedMediaNotes } from './learn-advanced-en';
export const learningEnglish = {
  gyroBlockName: 'face target',
  gyroVideoHelp:
    'This successful recording shows the original gyro turn. Your editable example puts the same correction loop inside a My Block with a target input.',
  codeWalk: 'Read the code together',
  yawTool: 'Try a turning arrow',
  currentYaw: 'Current yaw (°)',
  targetYaw: 'Target yaw (°)',
  shortTurn: 'Shorter turn to the target',
  yawDirection:
    'The arrow shows the current facing direction. Zero is the chosen starting direction; it is not compass north.',
  rightTurn: 'Turn right',
  leftTurn: 'Turn left',
  noTurn: 'Already facing the target',
  conversionTool: 'Try the wheel calculator',
  travelCm: 'Travel distance (cm)',
  diameterCm: 'Wheel diameter (cm)',
  conversionHelp:
    'Use one length unit throughout the calculation. This estimate assumes direct drive and no slipping.',
  conversionInvalid: 'Enter a distance from 0 to 1,000 cm and a wheel diameter from 1 to 30 cm.',
  millimetres: 'Millimetres',
  metres: 'Metres',
  circumference: 'Distance per wheel rotation',
  wheelRotations: 'Wheel rotations',
  wheelDegrees: 'Wheel degrees',
  calculation: 'How we worked it out',
  roundingHelp:
    'Wheel estimates are rounded for display. Keep the full value in your calculator until the last step so rounding does not change the next answer.',
  objective: 'By the end of this lesson',
  path: 'Your learning path',
  lessonNumber: (n: number) => `Lesson ${n}`,
  openNamed: (name: string) => `Open lesson: ${name}`,
  closeExperiment: 'Back to the lesson',
  goalPassed: 'Example goal reached',
  goalMissed: 'Compare this result with the example. Which change explains the difference?',
  runResult: 'Your experiment result',
  noRun: 'Run the experiment to collect your own evidence.',
  variables: 'Values at the end',
  mediaError: 'The video could not load. You can use the written example and try the blocks below.',
  conflict:
    'Lesson progress changed in another window. Choose which version to keep before saving.',
  useSaved: 'Use progress from the other window',
  keepMine: 'Keep my progress from this window',
  keepConfirm: 'Replace the other window’s lesson progress with this window’s version?',
  correct: 'Correct',
  tryAgain: 'Try another answer',
  imageAlt: (title: string, step: number) => `${title}: recorded simulation, view ${step}`,
  captionLanguage: 'English',
  exportError: 'The experiment could not be exported. Reduce the number of blocks and try again.',
  title: 'Learn by making the robot do something',
  intro:
    'Understand one idea, predict what will happen, then test it. You can change the example and try again.',
  search: 'Find a lesson or term',
  lessons: 'Lessons',
  glossary: 'Glossary',
  all: 'All lessons',
  filter: 'Show lessons',
  unfinished: 'Still to complete',
  lessonCount: (n: number) => `${n} ${n === 1 ? 'lesson' : 'lessons'} shown`,
  termCount: (n: number) => `${n} ${n === 1 ? 'term' : 'terms'} shown`,
  clearFilters: 'Show all lessons',
  noCompleted: 'No completed lessons match yet. Run a lesson experiment and answer its understanding check to complete one.',
  noUnfinished: 'No unfinished lessons match. Choose All lessons to revisit an example, or change your search.',
  beginner: 'Start here',
  next: 'Next lesson',
  back: 'All lessons',
  minutes: (n: number) => `${n} minute lesson`,
  progress: (n: number, total: number) => `${n} of ${total} lessons completed`,
  completed: 'Completed',
  continue: 'Continue learning',
  open: 'Open lesson',
  empty: 'No matches. Try a word such as turn, sensor or loop.',
  story: 'Imagine this',
  idea: 'How it works',
  steps: 'Read the example',
  predict: 'Make a prediction',
  checkPrediction: 'Check prediction',
  watch: 'Watch it happen',
  videoHelp:
    'This is a successful run of the supplied example. Pause or slow it down, then compare your own run.',
  stills: 'Look closely',
  before: 'Start of the example',
  during: 'During the example',
  after: 'Near the finish',
  jump: (label: string) => `Jump to ${label.toLowerCase()}`,
  closeImage: 'Close screenshot',
  imageHint: 'Open a larger screenshot',
  captions: 'What to watch',
  speed: 'Video speed',
  try: 'Try this example',
  reset: 'Restore example blocks',
  resetConfirm: 'Replace your changes in this lesson with its original example?',
  sandbox: 'Your lesson experiment',
  sandboxHelp:
    'This experiment has its own blocks. Changes here do not replace your Home or Free play projects.',
  showBlocks: 'Blocks',
  showPython: 'See Python',
  pythonNote:
    'This is the simulator’s Python helper code. It explains the block logic; it is read-only here and needs adaptation for the official SPIKE Python API.',
  change: 'Change one thing',
  compare: 'What to compare',
  mistakes: 'If it does not work',
  realRobot: 'On a physical robot',
  check: 'Check your understanding',
  checkAnswer: 'Check answer',
  finishHint: 'Run the example, then answer the check correctly to complete this lesson.',
  runDone: 'You have run this lesson’s experiment.',
  success: 'Lesson complete. You can keep experimenting or move on.',
  words: 'Useful words',
  selectBlock: 'Select a block to see its explanation.',
  changed: 'Your edited example',
  original: 'Original example',
  openWorkspace: 'Keep this as a project',
  projectSaved: 'The lesson was copied into a separate named project file.',
  saveProject: 'Download experiment',
  saveError: 'Lesson progress could not be saved. It is kept for this session; try saving again.',
  invalidProgress:
    'Saved lesson progress could not be read. You can still learn here; the unread record has been kept.',
  retrySave: 'Try saving lesson progress again',
  freshProgress: 'Start new lesson progress',
  freshConfirm: 'Replace the unread lesson-progress record? This does not delete robot projects.',
  loadError: 'The lesson could not be opened. Choose another lesson and try again.',
  mediaNotes: {
    ...advancedMediaNotes,
    move: [
      'The robot starts to the left of the landing pad, with its front facing the pad.',
      'Both wheels carry the robot across the mat. The 58 cm value controls the length of this trip.',
      'The robot is stopped inside the landing pad. Compare this position after changing speed.',
    ],
    turn: [
      'The robot begins facing across the mat. Forward means the direction its front faces.',
      'At the corner it turns left. The example uses −90°, changing heading before the next move.',
      'The final short move follows the new heading into the upper marked area.',
    ],
    events: [
      'Before the run, the virtual hub display is dark. Watch the small hub at the bottom right.',
      'A heart lights up on the hub. This output shows that the start stack has begun.',
      'The robot has reached the pad with the heart still displayed. Output and movement followed the same stack.',
    ],
    loops: [
      'The robot starts at one corner of the four marked points.',
      'It is partway through the square. The same move-and-turn pair is used at every corner.',
      'The robot is back near its starting point. Compare both position and heading.',
    ],
    distance: [
      'There is a large gap between the front sensor and the far wall.',
      'The robot approaches the wall. The program changes to a slower speed near its first threshold.',
      'The robot has stopped with a gap in front. Use the live E reading when you try the experiment.',
    ],
    colour: [
      'The red marker is ahead of the robot, outside the downward sensor’s viewing area.',
      'The front of the robot approaches the red patch. The sensor must reach the surface to read its colour.',
      'The robot has stopped at the marker and the hub shows a heart. The program assigned that action to red.',
    ],
    decisions: [
      'The robot starts on white. That makes this example’s colour question true.',
      'The robot moves toward the marked circle because the Then branch was selected.',
      'The robot has stopped after its 30 cm move. Try a false condition to see why it stays at the start instead.',
    ],
    variables: [
      'The robot begins before the delivery point. The program resets its counter to zero.',
      'The repeated short moves carry it along the route. Each call also adds one to deliveries.',
      'The robot is stopped after three trips. Run the editable example to inspect the final deliveries value of 3.',
    ],
    functions: [
      'The four marked points show the square the robot will follow.',
      'Each side and turn comes from another call to the same corner definition.',
      'Four calls have brought the robot close to its start. Change the definition to resize all four sides.',
    ],
    attachments: [
      'The fork is low and lined up with the gap under the raised pallet.',
      'The robot has approached and the fork supports the load. Watch the pallet as motor C raises the mechanism.',
      'The pallet remains supported. Compare the start and finish; the live goal checks height and holding time.',
    ],
    debugging: [
      'The finish circle is ahead. Reaching it is only the first part of this task.',
      'The robot has reached the circle and is waiting. A single screenshot cannot prove the length of the stay.',
      'The robot is still in the circle at the end. Compare the timer and the full interval when changing the wait.',
    ],
    line: [
      'The robot starts at the left of the course. Its two downward sensors travel on opposite sides of the line.',
      'The robot follows a bend. New brightness readings change the difference between its wheel speeds.',
      'The robot is parked near the finish circle. An encoder limit ends this particular calibrated course.',
    ],
  },
  glossaryEntries: {
    argument: {
      term: 'Argument',
      meaning: 'A value supplied when an instruction or My Block is called.',
      example: 'In travel(20), the call gives the value 20 to the distance input.',
    },
    indentation: {
      term: 'Indentation',
      meaning: 'Spaces at the start of a Python line that show which group it belongs to.',
      example: 'Lines indented below a loop belong inside the loop, like blocks inside Repeat.',
    },
    yaw: {
      term: 'Yaw',
      meaning: 'The angle that describes turning left or right around the upright axis.',
      example:
        'Stand still and turn to face the next wall. Your yaw changes while your position stays the same.',
    },
    gyro: {
      term: 'Gyro',
      meaning: 'A sensor that measures rotation. The hub uses it to track changes in angle.',
      example: 'Read yaw before and after a turn to check how much the robot rotated.',
    },
    tolerance: {
      term: 'Tolerance',
      meaning: 'A small allowed difference between a target and a measured result.',
      example: 'A 0.5° tolerance accepts a heading that is at most half a degree from the target.',
    },
    circumference: {
      term: 'Circumference',
      meaning: 'The distance all the way around a circle.',
      example:
        'A rolling wheel travels about one circumference per full wheel rotation if it does not slip.',
    },
    sequence: {
      term: 'Sequence',
      meaning: 'The order in which instructions run.',
      example:
        'Put “move”, then “turn” in a stack to drive before turning. Swap them and the route changes.',
    },
    centimetre: {
      term: 'Centimetre (cm)',
      meaning: 'A unit of length. Ten millimetres make one centimetre.',
      example: 'A 30 cm ruler is a useful way to picture a robot moving 30 cm.',
    },
    speed: {
      term: 'Speed',
      meaning: 'How quickly something moves. A higher motor percentage asks for faster motion.',
      example:
        'Walking and running can cover the same 20 metres. The distance stays the same; the time changes.',
    },
    motor: {
      term: 'Motor',
      meaning: 'A device that turns electrical energy into rotation.',
      example: 'Two motors drive the wheels. Another motor can raise a fork or turn an arm.',
    },
    port: {
      term: 'Port',
      meaning: 'A labelled connection between the hub and a motor or sensor.',
      example:
        'A block reading E expects the distance sensor on E. Changing the letter does not move the device.',
    },
    degree: {
      term: 'Degree (°)',
      meaning: 'A unit for measuring a turn. A full turn is 360°.',
      example:
        'Turning a quarter of the way around, like facing the next wall of a square room, is 90°.',
    },
    heading: {
      term: 'Heading / yaw',
      meaning:
        'The direction the robot faces around the floor. Reset yaw sets a new zero direction.',
      example:
        'A robot can turn 90° while staying in the same place. Its heading changes, but its position barely changes.',
    },
    event: {
      term: 'Event',
      meaning: 'Something that starts a stack of instructions.',
      example:
        '“When program starts” begins when you press Run. A hub-button event begins when that button is pressed.',
    },
    loop: {
      term: 'Loop',
      meaning: 'A structure that repeats the instructions inside it.',
      example:
        'Repeat “deliver one book” three times to make three deliveries without copying the whole stack.',
    },
    condition: {
      term: 'Condition',
      meaning: 'A question whose answer is true or false.',
      example: '“Is the distance less than 20 cm?” becomes true when an obstacle is close enough.',
    },
    sensor: {
      term: 'Sensor',
      meaning: 'A device that measures something about the robot or its surroundings.',
      example:
        'A distance sensor measures ahead; a downward colour sensor reads the floor beneath its small viewing area.',
    },
    reflection: {
      term: 'Reflected light',
      meaning: 'How much light comes back from a surface, shown as a percentage.',
      example:
        'A white mat usually reflects more light than black tape. Comparing readings can help find a line’s edge.',
    },
    threshold: {
      term: 'Threshold',
      meaning: 'The value where a program changes its decision.',
      example:
        'With a 20 cm threshold, a reading of 19 cm passes “less than 20”; a reading of 21 cm does not.',
    },
    variable: {
      term: 'Variable',
      meaning: 'A named place to keep a value that the program can read or change.',
      example:
        'A variable called deliveries can start at 0, then increase after each completed trip.',
    },
    function: {
      term: 'My Block / function',
      meaning: 'A named group of instructions that another part of the program can call.',
      example: 'Define “corner” as move 20 cm and turn 90°. Every call runs that same group.',
    },
    parameter: {
      term: 'Parameter',
      meaning: 'A value given to a reusable instruction so it can do a different-sized job.',
      example:
        'A travel block can receive 20 for one trip and 30 for another, while sharing the same instructions.',
    },
    attachment: {
      term: 'Attachment',
      meaning: 'A tool fitted to the robot for a particular job.',
      example:
        'A pusher moves a box along the floor. Forks go underneath a load so a powered lift can raise it.',
    },
    encoder: {
      term: 'Encoder',
      meaning: 'A measurement of how far a motor shaft has turned.',
      example:
        'One wheel rotation is 360 motor degrees. Floor distance also depends on wheel size and slipping.',
    },
    debugging: {
      term: 'Debugging',
      meaning:
        'Finding why a program behaves differently from your plan, then testing a correction.',
      example:
        'If the robot turns the wrong way, check the turn sign before changing every distance.',
    },
    feedback: {
      term: 'Feedback',
      meaning: 'Using a new measurement to adjust what the robot does next.',
      example:
        'A line follower reads the floor repeatedly and corrects its steering instead of following one fixed turn.',
    },
    python: {
      term: 'Python',
      meaning:
        'A text programming language. In this simulator, the Python view shows helper calls generated from your blocks.',
      example:
        'Indented lines belong inside a loop or decision. A physical SPIKE hub uses its own documented API.',
    },
  },
  content: {
    ...advancedLessons,
    move: {
      title: 'Give clear directions',
      tag: 'Movement',
      summary: 'Separate where the robot goes from how quickly it gets there.',
      objective: 'Explain what distance and speed each change.',
      story:
        'You are sending a small trolley from a classroom door to a desk. “Go over there” is not enough for a robot. It needs a direction, a distance, and a speed.',
      explanation: [
        'Blocks in a connected stack run from top to bottom. The start block is the entry point. A move block drives both wheels together, then finishes when its requested travel is complete. A loose block outside the stack does not become the next instruction.',
        'Distance describes how far to travel. Speed describes how quickly to try to travel. If you keep a 58 cm distance and lower the speed, the intended destination stays the same, but the trip takes longer. Driving for a fixed number of seconds is different: then changing speed also changes the distance.',
        'A negative distance means travel backward. It does not turn the robot around. Check the number and the unit together: 5 cm is not the same as five wheel rotations.',
      ],
      steps: [
        'Start with the robot facing the landing pad.',
        'The example asks for 58 cm of forward travel. Both drive wheels turn together.',
        'The robot stops inside the pad. Notice the gap between the robot and the surrounding walls.',
      ],
      prediction: {
        prompt: 'Keep the distance at 58 cm and lower the speed. What should change?',
        options: [
          'The robot aims for a nearer point.',
          'The trip takes longer, with the same intended end point.',
          'The robot turns left.',
        ],
        correct: 1,
        feedback: [
          'A fixed-distance move still asks for 58 cm. Speed is a separate setting.',
          'Yes. Distance sets the travel; speed affects how long it takes.',
          'A straight move does not request a turn. Changing its speed changes timing.',
        ],
      },
      experiment: 'Run the original. Then lower only the speed on the move block and run again.',
      compare:
        'Compare the destination and the timer. Reset before each run so the starting conditions match.',
      mistakes: [
        ['It travels backward.', 'Check whether the distance is negative.'],
        ['Nothing happens.', 'Connect the move block beneath the start block.'],
      ],
      quiz: {
        prompt: 'Which instruction asks for a short backward trip?',
        options: ['Move −10 cm.', 'Turn −10°.', 'Wait 10 seconds.'],
        correct: 0,
        feedback: [
          'Correct. The minus sign reverses this distance move.',
          'That changes direction, rather than asking for 10 cm of backward travel.',
          'Waiting gives time to pass without requesting a trip.',
        ],
      },
      physical:
        'A real trolley may stop slightly differently on carpet and tile. Wheel slip and load affect the result. Measure the end position and adjust one value at a time.',
      terms: ['sequence', 'centimetre', 'speed', 'motor'],
    },
    turn: {
      title: 'Turn before the next street',
      tag: 'Angles',
      summary: 'Use the robot’s direction to plan a route around a corner.',
      objective: 'Distinguish turning from moving, and recognise a quarter turn.',
      story:
        'Imagine giving a friend directions through school: walk along the corridor, turn right, then walk to the library. The order matters. Turning first would send your friend into a different corridor.',
      explanation: [
        'A turn changes the direction the robot faces. It is measured in degrees, not centimetres. A 90° turn is a quarter turn; 180° faces the opposite direction; 360° turns all the way around.',
        'The turn block turns the drive wheels in opposite directions. In these blocks, a positive turn is right and a negative turn is left. Direction is always from the robot’s point of view. A robot facing you has its right side on your left.',
        'After turning, the next forward move follows the robot’s new heading. Do not describe a route only as screen-left or screen-right: the camera can move while the robot’s instructions stay the same.',
      ],
      steps: [
        'Look at the robot’s front before running.',
        'Watch the first straight section, then the change of heading at the corner.',
        'The next straight section follows the new direction and reaches the marked area.',
      ],
      prediction: {
        prompt: 'What does a 180° turn do?',
        options: [
          'Moves forward 180 cm.',
          'Faces the robot in the opposite direction.',
          'Repeats the next block 180 times.',
        ],
        correct: 1,
        feedback: [
          'Centimetres measure travel. Degrees measure a turn.',
          'Yes. Half of a full 360° turn faces the opposite way.',
          'Repeating is controlled by a loop, not a turn angle.',
        ],
      },
      experiment:
        'Run the route: move 58 cm, turn left −90°, then move 12 cm. Change −90° to +90° and predict the new route before running.',
      compare:
        'Watch the robot’s nose at the corner. Restore the original blocks after checking the difference.',
      mistakes: [
        [
          'It takes the wrong branch.',
          'Check the turn sign and the robot’s heading before that block.',
        ],
        [
          'The route is shifted.',
          'Reset the field. Starting from the previous finish changes the route.',
        ],
      ],
      quiz: {
        prompt: 'A robot travels forward after a right turn. Which direction does “forward” mean?',
        options: [
          'Always toward the top of the screen.',
          'Always toward where it started.',
          'The direction the robot is now facing.',
        ],
        correct: 2,
        feedback: [
          'The camera does not define the robot’s forward direction.',
          'Returning to the start needs its own planned turn and distance.',
          'Correct. Forward moves follow the robot’s current heading.',
        ],
      },
      physical:
        'Attachments and uneven tyre grip can affect turning. The gyro helps measure heading; it does not tell you where the robot is on the mat.',
      terms: ['degree', 'heading', 'sequence'],
    },
    events: {
      title: 'Start, signal, then move',
      tag: 'Events and output',
      summary: 'Use a clear start and a visible signal to tell a story.',
      objective: 'Explain how an event starts a stack and how its sequence controls output.',
      story:
        'A school lift lights up and makes a sound before its doors move. Those signals help people understand what is happening. Your robot can also show a picture or beep before beginning a trip.',
      explanation: [
        '“When program starts” is an event block. Pressing Run begins the connected stack. The light and sound blocks are outputs: they tell you something, while sensors are inputs that measure something.',
        'In this example, the robot shows a heart, makes a short sound, then travels to the landing pad. A signal is useful when testing: it can show that the program reached a particular point. It does not prove that the robot completed every earlier physical task.',
        'Separate event stacks can respond to a hub button or sensor while the program is running. Be careful if two stacks control the same wheels: one stack can change what the other asked the wheels to do. Start with one movement stack while learning.',
      ],
      steps: [
        'Find the single program-start block.',
        'Watch the hub signal at the beginning of the recording. Sound is optional; the picture is also visible.',
        'The movement follows the signal blocks and ends at the pad.',
      ],
      prediction: {
        prompt: 'Move the heart block below the move block. When should the heart appear?',
        options: [
          'After the move finishes.',
          'Before the program starts.',
          'Only when a colour sensor sees red.',
        ],
        correct: 0,
        feedback: [
          'Yes. Its new position puts it after the movement in this stack.',
          'A block in this stack runs after the start event.',
          'This stack has no colour condition controlling the heart.',
        ],
      },
      experiment:
        'Move the picture block to the end of the stack. Run with sound off and check whether you can still tell when the robot finishes.',
      compare: 'Compare the time when the picture changes with the time when the wheels stop.',
      mistakes: [
        [
          'The picture never appears.',
          'Make sure its block is connected inside the running stack.',
        ],
        [
          'The wheels behave unpredictably.',
          'Check for a second event stack giving competing movement instructions.',
        ],
      ],
      quiz: {
        prompt: 'Which item is an output from the robot?',
        options: [
          'A distance reading.',
          'A downward colour reading.',
          'A picture shown on the hub.',
        ],
        correct: 2,
        feedback: [
          'That is an input used to understand the surroundings.',
          'That is a sensor input.',
          'Correct. The robot produces the picture as an output.',
        ],
      },
      physical:
        'Use both a visible and an audible signal when useful. A classroom can be noisy, and some students may not hear a beep.',
      terms: ['event', 'sequence', 'sensor', 'port'],
    },
    loops: {
      title: 'Repeat a useful pattern',
      tag: 'Loops',
      summary: 'Build a square from one corner repeated four times.',
      objective: 'Identify exactly which blocks repeat and how often.',
      story:
        'To mark the boundary of a small garden, you walk one side and turn at its corner. You do the same two actions four times. A loop gives your robot that same reusable pattern.',
      explanation: [
        'A repeat block runs the blocks inside its opening the requested number of times. A block connected below the loop runs after the whole loop finishes. This difference matters when you want a beep at every corner, or just one beep at the end.',
        'The square example repeats “move 25 cm, turn 90°” four times. Four sides use 100 cm of straight travel. The four quarter turns add to 360°, so the robot should finish close to its starting position and heading.',
        'A loop saves copying, but it also makes a change affect every repetition. Changing the distance inside this loop changes all four sides. A forever loop has no repeat count; it needs a condition or the Stop control to end its work.',
      ],
      steps: [
        'Find the two blocks inside Repeat.',
        'Watch the robot repeat the same straight-and-turn pattern at each corner.',
        'Near the finish, compare its position and direction with the start.',
      ],
      prediction: {
        prompt: 'Put a beep inside the four-repeat loop. How many times should it beep?',
        options: ['Once.', 'Four times.', 'It cannot beep inside a loop.'],
        correct: 1,
        feedback: [
          'A beep below the loop would run once. Inside, it repeats.',
          'Yes. The blocks inside run once for each of the four repetitions.',
          'A loop can repeat sound blocks as well as movement blocks.',
        ],
      },
      experiment:
        'Change Repeat from 4 to 3. Predict the missing side, then run the edited example.',
      compare: 'Check the end position and heading, not just whether the robot moved.',
      mistakes: [
        ['Only the move repeats.', 'Check that the turn is inside the loop too.'],
        [
          'It circles endlessly.',
          'Use Repeat for a counted route; check whether you chose Forever.',
        ],
      ],
      quiz: {
        prompt: 'Repeat “move 15 cm” three times. What total forward distance is requested?',
        options: ['15 cm.', '18 cm.', '45 cm.'],
        correct: 2,
        feedback: [
          'That is the distance of one repetition.',
          'The repeat count multiplies the travel; it is not added to it.',
          'Correct. 15 + 15 + 15 is 45 cm.',
        ],
      },
      physical:
        'Small errors can accumulate at every corner. Measure the final gap and heading before deciding which value to adjust.',
      terms: ['loop', 'sequence', 'degree'],
    },
    distance: {
      title: 'Stop before you bump',
      tag: 'Distance sensing',
      summary: 'Let a measurement decide when to stop.',
      objective: 'Explain a threshold and why reading a sensor must be connected to an action.',
      story:
        'When you park a bicycle beside a wall, you look at the gap and slow down as you approach. You do not always ride for exactly three seconds. A distance sensor can help a robot respond to the actual gap.',
      explanation: [
        'The distance sensor on E looks ahead. Its reading is a distance, not the distance the robot has travelled. The sensor sits in front of the robot’s centre, so a 20 cm sensor reading does not mean the centre is 20 cm from the wall.',
        'A threshold turns the reading into a question: “Is the distance less than 25 cm?” A Wait until block checks that question repeatedly. It does not stop wheels that are already running. The Stop moving block is the instruction that brakes them.',
        'This example approaches at a moderate speed, slows when the gap becomes small, then stops near the final threshold. Slowing near the target gives the sensor and braking time to react. A reading of −1 means no valid target is detected; it should not be treated as an obstacle one centimetre away.',
      ],
      steps: [
        'Start moving, then watch the gap shrink.',
        'The first distance condition changes the approach to a slower movement.',
        'The second condition is followed by Stop moving; the robot remains short of the wall.',
      ],
      prediction: {
        prompt: 'The wheels are running and Wait until becomes true. What stops them?',
        options: [
          'The sensor automatically switches off all motors.',
          'The Stop moving block that follows.',
          'The wall must stop them.',
        ],
        correct: 1,
        feedback: [
          'A sensor supplies a reading. The program must decide what to do.',
          'Yes. The condition lets execution continue to the stop instruction.',
          'The purpose of this program is to stop before contact.',
        ],
      },
      experiment: 'Increase the final stopping threshold by 5 cm. Reset and run the example.',
      compare:
        'The robot should stop with a larger gap. Compare the sensor reading with the distance from the robot’s front.',
      mistakes: [
        [
          'It drives past the threshold.',
          'Check that Stop moving is after Wait until, and try a slower approach.',
        ],
        [
          'The sensor seems wrong.',
          'Check port E and whether it faces the object. A missed target can return −1.',
        ],
      ],
      quiz: {
        prompt: 'Is 19 cm less than a 20 cm threshold?',
        options: [
          'Yes: the condition is true.',
          'No: only 20 cm is accepted.',
          'Only if the robot is moving.',
        ],
        correct: 0,
        feedback: [
          'Correct. 19 is below 20.',
          '“Less than” accepts values below the threshold. Equality is a different comparison.',
          'The comparison uses the reading; movement is a separate action.',
        ],
      },
      physical:
        'Narrow, angled or soft objects can be difficult to detect. Test several approaches, leave a margin and do not depend on one perfect reading.',
      terms: ['sensor', 'threshold', 'condition', 'port'],
    },
    colour: {
      title: 'Read a colour marker',
      tag: 'Colour sensing',
      summary: 'Use a floor marker as a signal to the program.',
      objective: 'Explain what the colour sensor sees and how a colour condition works.',
      story:
        'A delivery robot follows a route with coloured stopping markers. A red marker can mean “this is the drop-off point”. The robot will only react if its program gives that colour a meaning.',
      explanation: [
        'A downward colour sensor reads a small area beneath it. It cannot see the whole mat or know that a red square is nearby. The sensor must reach the marker. Because it is mounted ahead of the axle, it can reach the colour before the robot’s centre does.',
        'The pointed “D is colour red?” block fits inside Wait until or If. Its result is true or false. The round colour-reading block reports a colour value, which can be used inside a comparison. Matching these shapes is part of building a complete condition.',
        'Colour and reflected light are related but different readings. Colour tries to name the surface, such as red or white. Reflected light measures brightness. A line follower often uses brightness differences to make small steering corrections.',
      ],
      steps: [
        'The robot starts moving while its colour sensor is over the plain mat.',
        'The repeated colour check waits until D sees the red patch.',
        'The program stops the wheels and shows a heart after reaching the marker.',
      ],
      prediction: {
        prompt:
          'A red patch is beside the robot but not under its downward sensor. Must the sensor report red?',
        options: [
          'Yes, it sees the whole mat.',
          'Yes, red always stops a robot.',
          'No, it reads its small viewing area.',
        ],
        correct: 2,
        feedback: [
          'A downward sensor sees only a small area below it.',
          'Colours have no automatic action. The program defines the response.',
          'Correct. The sensor has to pass over the marker.',
        ],
      },
      experiment:
        'Replace red with a colour that is absent from the route. Predict why the condition will not finish, then stop the test before the robot reaches the wall.',
      compare:
        'Restore red and compare. A forever-false condition needs a safe way to stop testing.',
      mistakes: [
        [
          'The condition will not connect.',
          'Use the pointed colour question, or place the round reading inside a comparison.',
        ],
        ['It misses the patch.', 'Check the chosen port and where that sensor sits on the robot.'],
      ],
      quiz: {
        prompt:
          'Which reading is useful for comparing how bright black tape and a white mat appear?',
        options: ['Reflected light.', 'Motor position.', 'The timer.'],
        correct: 0,
        feedback: [
          'Correct. It measures brightness as a percentage.',
          'Motor position measures shaft rotation.',
          'The timer measures elapsed time, not surface brightness.',
        ],
      },
      physical:
        'Lighting, sensor height and shiny surfaces can change readings. Test samples on the real mat instead of assuming every sensor will return identical values.',
      terms: ['sensor', 'reflection', 'condition', 'port'],
    },
    decisions: {
      title: 'Choose what happens next',
      tag: 'If and else',
      summary: 'Use a true-or-false question to choose an action.',
      objective: 'Distinguish a one-time decision from repeatedly waiting for a condition.',
      story:
        'At a school crossing, you check the signal before stepping forward. If it is safe, you go. Otherwise, you stay put. A robot needs both the question and the action written in its program.',
      explanation: [
        'An If block checks its condition when execution reaches it. If the condition is true, the blocks inside Then run. If it is false, those blocks are skipped and the stack continues. It does not keep checking forever on its own.',
        'An If–else block gives the false case its own instructions. Exactly one branch runs for that check. To keep reacting as the surroundings change, put the decision in a loop with a short wait, or use a suitable sensor event.',
        'The supplied example checks whether D sees white. On its starting surface that condition is true, so the robot moves into the chosen lane. The example has no Else branch: a false result simply skips the move. You can add an Else branch to give visible feedback for that case.',
      ],
      steps: [
        'Read the colour question before the movement.',
        'On the default white start, the Then branch runs.',
        'The robot completes its 30 cm move. The decision itself did not repeat during that trip.',
      ],
      prediction: {
        prompt:
          'Change the condition from white to red, keeping the white start. What does this If-only example do?',
        options: [
          'Skips the move inside Then.',
          'Waits until a red marker arrives.',
          'Runs Then and Else together.',
        ],
        correct: 0,
        feedback: [
          'Yes. A false If condition skips its body.',
          'That would require Wait until or a loop that checks again.',
          'This example has no Else, and an If–else chooses only one branch per check.',
        ],
      },
      experiment:
        'Try the false condition. Then use the If block’s settings to add Else and put a picture there.',
      compare: 'Run each case from Reset. Check that only the selected branch gives its output.',
      mistakes: [
        [
          'It does not respond to a later change.',
          'An If checks once each time it is reached. Use a repeated check for continuous reactions.',
        ],
        [
          'Both actions seem to happen.',
          'Check whether one action is below the whole decision instead of inside a branch.',
        ],
      ],
      quiz: {
        prompt: 'When an If–else condition is false, which branch runs?',
        options: ['Then.', 'Else.', 'Both branches.'],
        correct: 1,
        feedback: [
          'Then is the true case.',
          'Correct. Else handles the false case.',
          'Only one branch runs for that condition check.',
        ],
      },
      physical:
        'Choose a safe false-case action. “No object detected” and “safe to drive” are not always the same thing.',
      terms: ['condition', 'loop', 'event'],
    },
    variables: {
      title: 'Keep count like a scoreboard',
      tag: 'Variables',
      summary: 'Store a value and update it as the robot works.',
      objective: 'Explain the difference between setting a value and changing it.',
      story:
        'You are counting books carried from a shelf to three desks. A scoreboard starts at zero and adds one after each delivery. A variable gives the robot a place to keep that count.',
      explanation: [
        'A variable has a name and a current value. “Set deliveries to 0” replaces its old value. “Change deliveries by 1” adds one to the value already there. These instructions do different jobs.',
        'The example resets the counter before a three-repeat loop. Each delivery call moves 10 cm and adds one. The values are 0 before the loop, then 1, 2 and 3 after the successive trips. If you put the reset inside the loop, the counter would keep going back to zero.',
        'A counter records what the program did. It does not prove that a real book arrived safely. For physical delivery you may also need a sensor or a check of the load’s position. Give variables clear names so you know what they actually represent.',
      ],
      steps: [
        'Find Set deliveries to 0 before the loop.',
        'Each call runs the same short move and increases the count.',
        'After three calls, the program’s deliveries value is 3 and it has requested 30 cm of travel.',
      ],
      prediction: {
        prompt:
          'What happens if Set deliveries to 0 is placed inside the loop, just before adding 1?',
        options: [
          'The final value becomes 30.',
          'The final value is still 3.',
          'The final value is 1.',
        ],
        correct: 2,
        feedback: [
          'The counter stores deliveries, not the total centimetres.',
          'Resetting inside the loop loses the previous count each time.',
          'Yes. Each repetition resets to 0 and then adds 1.',
        ],
      },
      experiment:
        'Change the repeat count from 3 to 2. Predict both the total distance and the final counter value.',
      compare:
        'The robot requests 20 cm and the counter finishes at 2. Compare those two different quantities.',
      mistakes: [
        ['The count is always 1.', 'Move the reset before the loop.'],
        [
          'The count grows twice per trip.',
          'Look for a second Change block in the delivery definition or calling stack.',
        ],
      ],
      quiz: {
        prompt: 'The current score is 4. Change score by 2 produces what value?',
        options: ['2.', '6.', '42.'],
        correct: 1,
        feedback: [
          'Set score to 2 would replace it. Change adds to it.',
          'Correct. 4 + 2 is 6.',
          'These are numbers being added, not text being joined.',
        ],
      },
      physical:
        'A wheel encoder is another kind of count, measuring rotation. It can increase even when a wheel slips, so its meaning is different from “successful deliveries”.',
      terms: ['variable', 'loop', 'function', 'encoder'],
    },
    functions: {
      title: 'Teach one reusable skill',
      tag: 'My Blocks',
      summary: 'Define a useful action once and call it when needed.',
      objective: 'Distinguish defining a My Block from calling it.',
      story:
        'Instead of explaining every step of packing a school bag each morning, you can say “pack your bag” once everyone knows the routine. A My Block gives a group of robot instructions a useful name.',
      explanation: [
        'A definition says what a My Block does. A call asks the program to do it now. A definition standing by itself does not run just because it is visible in the workspace; the starting stack must call it.',
        'Here, corner means move 20 cm and turn 90°. Repeat calls corner four times to make a square. Editing the definition changes what every call does, so you do not have to update four copied stacks.',
        'A My Block and a loop solve different problems. A loop controls repetition. A My Block names a reusable job. They can be combined. Some My Blocks also accept a parameter, such as a distance, so the same job can use different values.',
      ],
      steps: [
        'Find the corner definition beside the starting stack.',
        'Each call runs both instructions inside corner before returning to the loop.',
        'Four calls produce four sides and four turns, bringing the robot close to its start.',
      ],
      prediction: {
        prompt: 'Change the distance inside corner from 20 cm to 15 cm. How many sides change?',
        options: [
          'Only the first side.',
          'All four sides.',
          'None until the definition is copied four times.',
        ],
        correct: 1,
        feedback: [
          'Every call uses the same definition.',
          'Yes. All four calls now use 15 cm.',
          'Calling the shared definition is the point; no copying is needed.',
        ],
      },
      experiment:
        'Rename corner to a name you understand, then change its distance. Run and compare the square.',
      compare:
        'Look for one definition and four uses of it through the loop. Keep the 90° turn while changing the size.',
      mistakes: [
        ['The definition is visible but nothing moves.', 'Add a call to the starting stack.'],
        [
          'The new shape is unexpected.',
          'Check every instruction inside the definition; each call runs them all.',
        ],
      ],
      quiz: {
        prompt: 'What does calling a My Block do?',
        options: [
          'Runs the instructions in its definition.',
          'Only changes its name.',
          'Creates a new physical motor.',
        ],
        correct: 0,
        feedback: [
          'Correct. The call runs the reusable instructions, then returns to the calling stack.',
          'Renaming and running are different actions.',
          'My Blocks organise a program; robot hardware is chosen separately.',
        ],
      },
      physical:
        'Test a reusable action by itself before putting it inside a large route. A reliable small action is easier to reuse and diagnose.',
      terms: ['function', 'parameter', 'loop', 'sequence'],
    },
    attachments: {
      title: 'Choose the right tool',
      tag: 'Motors and attachments',
      summary: 'Match the mechanism and the code to the physical job.',
      objective: 'Explain why driving, lifting and holding require different actions.',
      story:
        'A warehouse trolley can push a parcel, but it cannot put it on a shelf without a lifting tool. A good robot design starts with the job: how will the tool reach, support and release the object?',
      explanation: [
        'This robot has drive motors A and B, plus a powered fork on C. A movement block controls the driving pair. A motor block for C controls the lifting mechanism. Check the port map before assuming which motor will move.',
        'The low forks must get underneath the raised pallet before lifting. Running C while the forks are beside the pallet moves the arm but does not lift the load. Approach position is just as important as motor power.',
        'The objective requires the pallet to be lifted and held steadily. Touching it briefly or passing through a height is not enough. Slow contact, support under the load and time to settle make the result easier to control.',
      ],
      steps: [
        'Look at the fork’s height and the gap under the pallet.',
        'The example approaches, then runs motor C to raise the supported load.',
        'At the end, the pallet remains raised while the mechanism settles.',
      ],
      prediction: {
        prompt:
          'The forks are beside the pallet. What will increasing the lift motor’s speed solve?',
        options: [
          'It guarantees the pallet is lifted.',
          'It automatically moves the robot underneath.',
          'It does not fix the missing support under the pallet.',
        ],
        correct: 2,
        feedback: [
          'Speed cannot replace correct contact with the load.',
          'The attachment motor does not steer the drive wheels.',
          'Correct. First line the forks up and place them underneath.',
        ],
      },
      experiment:
        'Run the original. Shorten the approach a little, then observe whether the forks still support the pallet.',
      compare:
        'Watch the load itself, not only the moving arm. Restore the original before making a different change.',
      mistakes: [
        [
          'The arm moves but the pallet stays down.',
          'Check that the forks are underneath before lifting.',
        ],
        ['The drive wheels move instead of the arm.', 'Check the motor port: this lift uses C.'],
      ],
      quiz: {
        prompt: 'Which evidence shows a successful stable lift?',
        options: [
          'Motor C was switched on.',
          'The pallet stays raised above its supports.',
          'The robot travelled quickly.',
        ],
        correct: 1,
        feedback: [
          'That shows an instruction ran, but not what happened to the load.',
          'Correct. The physical load must reach and keep the required position.',
          'Travel speed does not demonstrate a lift.',
        ],
      },
      physical:
        'Long arms and heavy loads can tip a robot or strain a motor. Support the load, keep it close to the base and test at low power first.',
      terms: ['attachment', 'motor', 'port', 'encoder'],
    },
    debugging: {
      title: 'Test one change at a time',
      tag: 'Debugging',
      summary: 'Use evidence to improve a result instead of guessing.',
      objective: 'Separate reaching a place from staying there, and plan a controlled test.',
      story:
        'A bus that passes your stop has reached the right place for an instant, but it has not picked you up. A robot parking task can also require stopping and staying in the marked area.',
      explanation: [
        'Begin debugging by saying what you expected and what you observed. “It did not work” is hard to test. “It entered the circle, then rolled out before three seconds passed” points to a particular problem.',
        'This example moves into the finish area and waits for a little over three seconds. The mission checks continuous time inside the area. Time spent outside does not count, and separate short visits do not make one continuous stay.',
        'Change one thing at a time. Keep the robot, start position and mat the same while trying a different distance or waiting time. If you change four things together, you cannot tell which change helped. A video or a pair of screenshots is useful evidence, not just a celebration.',
      ],
      steps: [
        'Look at the finish circle before the trip.',
        'The robot enters it and stops.',
        'The wait keeps the finished pose long enough to satisfy the continuous stay.',
      ],
      prediction: {
        prompt: 'Change the wait from 3.1 seconds to 1 second. What is most likely to fail?',
        options: [
          'The requirement to stay for three continuous seconds.',
          'The robot’s ability to turn on.',
          'Every sensor port becomes invalid.',
        ],
        correct: 0,
        feedback: [
          'Yes. Reaching the circle is only part of this task.',
          'Changing a wait does not remove the start block.',
          'The wait duration does not change the robot’s hardware.',
        ],
      },
      experiment:
        'Try a one-second wait, then restore 3.1 seconds. Keep the move distance unchanged.',
      compare:
        'Compare whether the robot reached the circle and whether it stayed long enough. Those are separate observations.',
      mistakes: [
        [
          'Many values have been changed and the result is confusing.',
          'Restore the example and test one change.',
        ],
        [
          'The screenshot shows it in the circle, but the task fails.',
          'A single frame cannot prove how long it stayed there. Check the whole interval.',
        ],
      ],
      quiz: {
        prompt: 'Which is the clearest next test after the robot stops short of the target?',
        options: [
          'Change distance, speed, robot and mat together.',
          'Keep everything else fixed and adjust the move distance.',
          'Repeat without noting the result.',
        ],
        correct: 1,
        feedback: [
          'That makes it difficult to identify the cause.',
          'Correct. A controlled change makes the evidence easier to interpret.',
          'Record what happened so you can compare the next attempt.',
        ],
      },
      physical:
        'Real runs vary. Repeat a promising test several times and measure the spread, rather than judging a robot from one lucky run.',
      terms: ['debugging', 'sequence', 'feedback'],
    },
    line: {
      title: 'Steer by listening to the sensors',
      tag: 'Line following',
      summary: 'Use repeated brightness measurements to correct a route.',
      objective: 'Explain why a line follower needs repeated sensing and small corrections.',
      story:
        'When riding a bicycle along a path, you keep looking ahead and gently adjust the handlebars. You do not choose one steering angle at the start and ignore the path afterward. A line follower uses the same idea of repeated feedback.',
      explanation: [
        'The supplied robot has downward colour sensors D and F on opposite sides of the line. A reflected-light reading measures brightness. Comparing the two readings tells this particular robot which side needs a steering correction.',
        'The program calculates a correction and gives the wheels slightly different speeds. It then reads again. Small, repeated corrections guide the robot around curves. A correction that is too strong can make it swing from side to side; a weak correction can let it drift off.',
        'Following a line and knowing when to finish are separate tasks. This example uses a calibrated wheel-encoder distance to end the default course, then stops and settles near the target. That distance depends on the supplied robot and mat. It is not a general instruction that solves every line course.',
      ],
      steps: [
        'Notice that both sensors travel close to the line, one on each side.',
        'Through the curves, the wheel speeds change as the brightness difference changes.',
        'The encoder limit ends the course and the robot settles at the finish.',
      ],
      prediction: {
        prompt: 'Why must this follower read the sensors repeatedly?',
        options: [
          'One reading already describes every upcoming curve.',
          'The sensor positions relative to the line change as the robot moves.',
          'Repeated readings make the mat physically wider.',
        ],
        correct: 1,
        feedback: [
          'One reading only describes the surface currently under the sensors.',
          'Yes. New measurements let the robot correct new errors.',
          'Reading a sensor changes information, not the mat.',
        ],
      },
      experiment:
        'Run the supplied example. Find the multiplier 0.22 in Set steering correction. Try 0.18, keeping the base speed of 18 and the encoder finish limit fixed.',
      compare:
        'Compare how smoothly it follows the bends. Restore the calibrated example if it loses the line; increasing power is not always an improvement.',
      mistakes: [
        [
          'It turns away from the line.',
          'Check which sensor is D and which is F; swapping sides reverses the meaning of the correction.',
        ],
        [
          'It follows the line but stops in the wrong place.',
          'Check the encoder finish distance separately from the steering.',
        ],
      ],
      quiz: {
        prompt: 'What is feedback in this follower?',
        options: [
          'Using new sensor readings to adjust wheel speeds.',
          'Playing a beep at the end.',
          'Copying the same fixed turn ten times.',
        ],
        correct: 0,
        feedback: [
          'Correct. Measurement and correction form a repeating loop.',
          'That is an output signal, not the steering feedback.',
          'A fixed sequence does not respond to what the sensors currently measure.',
        ],
      },
      physical:
        'Calibrate on the actual black and white surfaces. Sensor spacing, wheel size, light and traction all affect useful steering settings.',
      terms: ['feedback', 'reflection', 'variable', 'encoder'],
    },
  },
} as const;
