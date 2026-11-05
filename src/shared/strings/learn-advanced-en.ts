export const advancedMediaNotes = {
  python: [
    'Start with the robot facing the landing pad. The text instruction and the move block describe the same trip.',
    'The robot moves across the mat. In the code, 58 is the distance and speed=70 is the requested speed.',
    'The robot has stopped inside the pad. Changing code generated from a block changes the instruction, not the meaning of centimetres.',
  ],
  yaw: [
    'The robot begins facing its starting direction. Use this as your zero direction.',
    'The robot turns toward the target heading. Its position stays almost the same while its direction changes.',
    'The robot faces the new direction. The gyro reading helps check the angle; it does not measure a journey across the mat.',
  ],
  parameters: [
    'The robot starts before a route with a corner. Both straight sections use the same travel definition.',
    'One travel call and a turn lead into the next straight section. The calls give travel different distances.',
    'The robot finishes after trips of 20 cm and 30 cm. One definition can do both jobs.',
  ],
  gyroturn: [
    'This recording shows the original gyro exercise. The lesson experiment puts that same sensing idea inside a reusable My Block.',
    'The robot turns toward 90°. The difference between the target and the reading gets smaller.',
    'At the end, the robot faces near 90°. In your experiment, calling the same target again should cause little or no extra turn.',
  ],
  conversions: [
    'The robot starts before a 58 cm trip. That length is also 580 mm or 0.58 m.',
    'The wheels rotate to carry the robot forward. Wheel rotation and the robot’s heading are different measurements.',
    'The robot stops after the trip. A wheel-distance calculation is a starting estimate; real slip can change the result.',
  ],
} as const;

export const advancedLessons = {
  python: {
    title: 'Python, one instruction at a time',
    tag: 'Python first steps',
    summary: 'Read a short robot instruction and connect it to a familiar block.',
    objective:
      'Explain a Python instruction, its numbers and its indentation without memorising a whole program.',
    story:
      'Imagine sending a clear text message to a friend: “Walk 58 centimetres.” A block and a line of Python are two ways to write an instruction. Python uses typed words and punctuation, so spelling and brackets matter.',
    explanation: [
      'Start with one line: await robot.move_cm(58, speed=70). Read it as “ask the robot to travel 58 centimetres at speed 70, and wait for that move to finish.” The name move_cm tells us the job and its unit. The values inside brackets give details for that job. They are called arguments. You do not need to remember every command; read the name, then check each value.',
      'Python uses spaces at the beginning of a line to show which instructions belong together. This is called indentation. In our example, the move line is indented under async def main():. That line defines a routine called main. runloop.run(main()) starts it. Think of a definition as writing a recipe and a call as deciding to cook it.',
      'This app generates Python from the blocks. Open the example, choose See Python, then change the move block and compare the new text. The Python view is read-only: you run the blocks here. These robot helpers belong to this simulator; a physical SPIKE hub uses its own Python API. Learning the sequence, arguments and indentation will still help you read that code later.',
      'A number such as 58 is a quantity. Text such as "Hello" goes inside quotes. A variable is a named place for a value, like distance = 58. The equals sign stores a value; a double equals sign, ==, asks whether two values are equal. Learn one difference at a time, then check an example.',
    ],
    steps: [
      'Open the worked code below. Find move_cm and the number 58.',
      'Find the indented instruction inside main. It runs when main is called.',
      'Run the blocks. Change 58 to 30 and use See Python to find the changed number.',
    ],
    codeSteps: [
      {
        code: 'async def main():',
        meaning:
          'Define the main routine. The colon starts its group of instructions. async lets this routine wait for robot actions.',
      },
      {
        code: '    await robot.move_cm(58, speed=70)',
        meaning:
          'The four leading spaces put this move inside main. 58 is centimetres; 70 is speed. await waits for completion.',
      },
      {
        code: 'runloop.run(main())',
        meaning: 'Start the main routine. A definition by itself does not make the robot move.',
      },
    ],
    prediction: {
      prompt: 'In move_cm(58, speed=70), which value sets the requested travel distance?',
      options: ['58.', '70.', 'Both numbers are distances.'],
      correct: 0,
      feedback: [
        'Yes. The first value is centimetres for this helper.',
        '70 belongs to speed. It changes how quickly the move is attempted.',
        'The values have different jobs. Read the command and the speed label.',
      ],
    },
    experiment:
      'Run the blocks, then change Distance from 58 to 30. Choose See Python and find 30 in the move instruction. Run again and compare the destination.',
    compare:
      'The block and the generated text should ask for the same distance. A shorter trip should stop before the original pad.',
    mistakes: [
      [
        'The Python page will not let me type.',
        'That view is read-only. Edit a block and watch the matching text change.',
      ],
      ['I think a definition runs immediately.', 'Look for the call at the end that starts main.'],
      [
        'I read every number as a distance.',
        'Check its label and unit. speed=70 is a speed setting.',
      ],
    ],
    quiz: {
      prompt: 'What does indentation tell you in this example?',
      options: [
        'How fast the robot moves.',
        'Which instructions belong inside main.',
        'Which motor is connected to A.',
      ],
      correct: 1,
      feedback: [
        'Speed is an argument, not a number of spaces.',
        'Correct. Indentation groups instructions inside a routine, loop or decision.',
        'The port is written as part of an instruction or robot setup.',
      ],
    },
    physical:
      'Copying simulator helper names directly to a real hub will not work. Use the hub’s documented commands, keeping the same plan and checking the ports and units.',
    terms: ['python', 'sequence', 'argument', 'indentation', 'function'],
  },
  yaw: {
    title: 'Yaw: which way am I facing?',
    tag: 'Gyro and angles',
    summary: 'Turn an on-screen arrow to understand the robot’s direction.',
    objective: 'Distinguish heading from distance and explain what resetting yaw does.',
    story:
      'Stand facing the classroom board. Call that direction zero. Turn a quarter turn to your right: you have changed where you face, even though you are still standing in the same place. That turning-around-the-floor angle is called yaw.',
    explanation: [
      'The hub’s gyro senses rotation. Yaw is the angle around the upright axis: turning left or right on the floor. Pitch is tipping your nose up or down; roll is leaning to a side. For a robot driving on a flat mat, yaw is the angle we usually need for steering.',
      'Reset yaw to 0 means “use the direction I face now as zero.” It does not physically turn the robot. Reset a ruler’s starting point in your mind: the object has not moved, but you have chosen where to measure from. In these simulator blocks, positive turning is right and negative turning is left.',
      'There is a difference between “turn 90° more” and “face heading 90°”. If you already face 70°, reaching heading 90° needs about 20° more. The difference is target − current reading: 90 − 70 = 20. The supplied gyro exercise repeats a small correction until that difference is close to zero.',
      'A whole turn is 360°. Some systems show +190° and others show the same direction as −170°. Do not mix angle ranges without checking. The arrow tool below shows the shorter turn between two directions. Our first gyro exercise stays near its starting quarter turn so you can learn the idea before handling a full circle.',
    ],
    steps: [
      'Set the arrow’s current yaw to 0 and target to 90. Notice the quarter turn.',
      'Set current yaw to 70. Only 20° remains to reach the same target.',
      'Run the gyro example and compare the starting and final directions.',
    ],
    prediction: {
      prompt:
        'The robot faces 70°. The target is 90°. About how much farther should it turn right?',
      options: ['90°.', '160°.', '20°.'],
      correct: 2,
      feedback: [
        'That would add a whole new quarter turn. We only need the remaining difference.',
        'Adding the headings does not find the remaining turn.',
        'Yes. 90 − 70 = 20 degrees.',
      ],
    },
    experiment:
      'Run the original 90° gyro example. Change both target numbers from 90 to 45, then run again. Keep the 0.5° tolerance unchanged.',
    compare:
      'Compare which way the robot faces. The old mission goal still expects 90°, so a good 45° experiment can intentionally miss that original goal.',
    mistakes: [
      [
        'Reset yaw did not rotate the robot.',
        'That is expected: reset changes the reference reading. Use a turn instruction to rotate.',
      ],
      [
        'The gyro tells me how far I travelled.',
        'Yaw measures direction. Use wheel rotation or a distance measurement for travel.',
      ],
      [
        'The robot keeps correcting.',
        'Use a small tolerance instead of demanding an exact decimal reading.',
      ],
    ],
    quiz: {
      prompt: 'What happens when you reset yaw to zero?',
      options: [
        'The robot instantly faces north.',
        'Its present facing direction becomes the zero reference.',
        'It drives back to the starting point.',
      ],
      correct: 1,
      feedback: [
        'A gyro reset does not request a physical turn or detect compass north.',
        'Correct. It changes the reference, not the robot’s position.',
        'Going back needs movement instructions.',
      ],
    },
    physical:
      'Keep a real hub still while its gyro starts. Drift, mounting direction and wheel slip can affect results. Check the sign with a small turn before attempting a long route.',
    terms: ['yaw', 'heading', 'gyro', 'degree', 'tolerance'],
  },
  parameters: {
    title: 'One My Block, different-sized jobs',
    tag: 'My Block inputs',
    summary: 'Give a reusable instruction a value instead of copying its definition.',
    objective: 'Explain a parameter using two travel calls with different distances.',
    story:
      'A friend can fill a bottle with one cup or two cups of water. “Fill the bottle” is the job; the number of cups is a detail you give each time. A My Block can also receive a value each time it is called.',
    explanation: [
      'A parameter is a named input in a My Block’s definition. Here the definition is travel(distance). Inside it, the move uses distance instead of one fixed number. A call such as travel(20) supplies 20 for that job. The value supplied at the call is called an argument.',
      'The first call travels 20 cm. The robot turns right, then a second call travels 30 cm. The same definition handles both sizes. Editing the speed inside travel changes both trips; changing the first call’s argument only changes that first trip.',
      'Use clear names with units in your plan. A parameter called distance should mean one quantity throughout the definition. Do not secretly treat it as seconds in one place and centimetres in another. Start with one input; add more only when they make the job easier to understand.',
    ],
    steps: [
      'Find the travel definition and its distance input.',
      'Follow the first call with 20, the turn, then the second call with 30.',
      'Change only the first call to 10 and predict which part of the route becomes shorter.',
    ],
    prediction: {
      prompt: 'Change only travel(20) to travel(10). Which trip changes?',
      options: [
        'Only the first straight trip.',
        'Both straight trips become 10 cm.',
        'The turn becomes 10°.',
      ],
      correct: 0,
      feedback: [
        'Yes. That argument belongs to the first call.',
        'The second call still supplies 30 to the same definition.',
        'The separate turn instruction has not changed.',
      ],
    },
    experiment:
      'Run the route. Change the first travel input from 20 to 10. Then restore it and instead lower the speed inside the travel definition.',
    compare:
      'The first edit changes one distance. The second edit changes the speed of both calls. Test them separately.',
    mistakes: [
      [
        'Every trip changed when I wanted just one to change.',
        'Check whether you edited the definition instead of one call’s input.',
      ],
      [
        'The new input does nothing.',
        'Use the parameter value in the move inside the definition. Merely naming an input does not make it control a motor.',
      ],
    ],
    quiz: {
      prompt: 'Why give travel a distance parameter?',
      options: [
        'To create another physical motor.',
        'To reuse one definition with different requested distances.',
        'To make every journey exactly the same length.',
      ],
      correct: 1,
      feedback: [
        'Inputs are program values, not hardware.',
        'Correct. Different calls can give the same job different values.',
        'A fixed value could do that; a parameter allows variation.',
      ],
    },
    physical:
      'A reusable block should document which robot and wheel size it expects. Reusing code does not guarantee the same physical distance on a different robot.',
    terms: ['function', 'parameter', 'argument', 'variable'],
  },
  gyroturn: {
    title: 'Make a My Block that faces a direction',
    tag: 'Your own gyro turn',
    summary: 'Put a read–compare–turn routine inside a reusable block.',
    objective:
      'Build and explain a My Block that turns toward a target yaw, then checks the result.',
    story:
      'Imagine a helper who keeps asking, “Am I facing the classroom board yet?” They turn a little, look again and stop when close enough. Your robot can put that checking routine inside a My Block called face target.',
    explanation: [
      'This lesson combines two ideas you have met: a My Block names a job, and the gyro measures direction. face target has one input called target. The supplied start stack calls it with 90. The definition reads the current yaw and calculates target − yaw. That value is the remaining turn.',
      'The Repeat while condition asks whether the size of the remaining error is greater than 1°. Size means absolute value: both −2 and +2 are two degrees away. Inside the loop, Turn uses the remaining error at a slow speed of 20. It waits for that turn, then checks the gyro again. A 1° tolerance matches the precision of our turn helper.',
      'Calling face target(90) twice is different from calling turn(90) twice. The second face-target call checks the same desired heading, so it should need little or no movement. Two relative 90° turns request a half turn in total. Decide whether your own block means a change in direction or a final direction, and name it clearly.',
      'This is a first version for nearby target angles from the supplied start. Test 45°, 60° and 90° first. A full-circle controller also needs angle-wrap handling, a time limit and tests for a stalled robot. We do not pretend one classroom example is a finished competition controller.',
    ],
    steps: [
      'Find the face target definition. The target input replaces the fixed 90 values in the earlier gyro exercise.',
      'Follow the call with 90 into the definition, through the condition, turn and new sensor check.',
      'Change the call’s input to 45. The definition stays the same; the target changes.',
    ],
    prediction: {
      prompt: 'After reaching heading 90°, what should a second face target(90) call request?',
      options: [
        'Another full 90° turn.',
        'Little or no turn, because the target is already reached.',
        'A 90 cm move.',
      ],
      correct: 1,
      feedback: [
        'That describes a relative Turn 90 block, not facing the same target.',
        'Yes. The remaining difference should already be within tolerance.',
        'Heading is in degrees, not centimetres.',
      ],
    },
    experiment:
      'Run face target with 90. Change the call to 45, run and compare. Then restore 90 and add a second call with 90 below the first.',
    compare:
      'Watch the robot’s front and gyro reading. The extra call should check the target without asking for a second quarter turn.',
    mistakes: [
      [
        'Only one of my target numbers changes.',
        'Use the target parameter in both the loop condition and the turn-error calculation.',
      ],
      [
        'I cannot find the definition when I run.',
        'Definitions stay in the workspace. The connected start stack needs a call to begin the job.',
      ],
      [
        'I want to cross from +170° to −170°.',
        'That crosses an angle boundary. Use the yaw explorer to understand the short turn before extending this starter controller.',
      ],
    ],
    quiz: {
      prompt: 'Why read yaw again after turning?',
      options: [
        'The requested turn and the actual result can differ slightly.',
        'Reading a sensor automatically repairs a motor.',
        'It changes centimetres into degrees.',
      ],
      correct: 0,
      feedback: [
        'Correct. Feedback checks what actually happened before deciding whether to correct again.',
        'A reading supplies information. The program chooses an action.',
        'Yaw is already an angle; this is checking a result.',
      ],
    },
    physical:
      'Start at low power and keep the hub still at reset. A physical controller should stop safely if a wheel jams or the reading never approaches the target.',
    terms: ['function', 'parameter', 'yaw', 'feedback', 'tolerance'],
  },
  conversions: {
    title: 'From centimetres to wheel turns',
    tag: 'Measurements and units',
    summary: 'Use a ruler and a rolling wheel to connect distance with rotation.',
    objective:
      'Convert metres, centimetres and millimetres, then estimate wheel rotation for a journey.',
    story:
      'Roll a bicycle wheel along the ground for one full turn. The distance it covers is the length around its edge. A robot wheel does the same thing, just on a smaller scale.',
    explanation: [
      'Begin with a ruler: 1 cm is 10 mm, and 100 cm is 1 m. To change centimetres into millimetres, multiply by 10. So 30 cm is 300 mm. To change centimetres into metres, divide by 100: 30 cm is 0.30 m. The length has not changed; only the unit has.',
      'The length around a wheel is its circumference. For a round wheel, circumference = π × diameter. π, said “pi”, is about 3.14. A 5.6 cm wheel therefore travels about 3.14 × 5.6 = 17.6 cm in one full rotation if it rolls without slipping. Diameter means the straight distance across the centre, not the radius from the centre to the edge.',
      'To estimate rotations, divide the travel distance by the distance per rotation. For 35.2 cm with that wheel, 35.2 ÷ 17.6 is about 2 rotations. One rotation is 360 wheel degrees, so two rotations are 720 wheel degrees. The calculator below keeps more digits of π, so it may show slightly different rounded values.',
      'Wheel degrees and robot yaw degrees describe different things. A wheel can rotate 720° while the robot travels straight with almost no change in yaw. These calculations assume a wheel driven directly by its motor. Gears can change the number of motor turns per wheel turn, and slipping changes how far the robot really moves.',
    ],
    steps: [
      'Enter 30 cm in the calculator and check 300 mm and 0.30 m.',
      'Use a 5.6 cm wheel diameter to estimate the wheel rotations and degrees.',
      'Try a larger 8 cm wheel for the same journey. Predict whether it needs more or fewer turns.',
    ],
    prediction: {
      prompt: 'For the same journey, does a larger wheel need more or fewer wheel rotations?',
      options: [
        'More, because it is larger.',
        'Fewer, because each rotation covers more ground.',
        'Exactly the same number.',
      ],
      correct: 1,
      feedback: [
        'A larger circumference carries the robot farther per rotation.',
        'Correct. A longer distance per rotation means fewer rotations for the same journey.',
        'That would only hold if the distance per rotation stayed the same.',
      ],
    },
    experiment:
      'The supplied movement example requests 58 cm. Use the calculator to estimate its wheel rotation with a 5.6 cm wheel. Run it, then change the move to 29 cm and compare.',
    compare:
      'Half the travel distance should need about half as much wheel rotation. The distance block already handles the conversion; the calculator helps explain why.',
    mistakes: [
      [
        'My estimate is ten times too large.',
        'Check whether you mixed millimetres and centimetres. Use the same length unit for distance and diameter.',
      ],
      [
        'I entered the radius as the diameter.',
        'Measure all the way across the wheel through its centre. Diameter is twice the radius.',
      ],
      [
        '720 wheel degrees should turn the robot around twice.',
        'Wheel rotation measures the wheel shaft. Yaw measures which way the robot faces.',
      ],
    ],
    quiz: {
      prompt: 'How many millimetres are in 25 cm?',
      options: ['2.5 mm.', '250 mm.', '2,500 mm.'],
      correct: 1,
      feedback: [
        'That divides by 10; centimetres are larger than millimetres.',
        'Correct. 25 × 10 = 250 mm.',
        'That multiplies by 100. There are 10 mm in each cm.',
      ],
    },
    physical:
      'Measure your wheel under its normal load, check any gearing, and test on the real surface. Treat the calculation as a useful starting estimate, then measure actual travel.',
    terms: ['centimetre', 'circumference', 'encoder', 'degree', 'yaw'],
  },
} as const;
