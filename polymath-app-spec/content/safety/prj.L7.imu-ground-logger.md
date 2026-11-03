---
brief_version: "2026-11-03-1"
project_key: prj.L7.imu-ground-logger
title: L7 IMU logger and one-axis rig — safety brief
status: draft, needs founder review before L7 is promoted
---

# Safety brief — IMU logger and one-axis rig (L7)

Practical lab guidance only; not medical advice. This covers ground work only. The rig never flies.

## Choose the rig

- **Start here:** a motor speed loop with no propeller.
- **Main rig:** a geared motor with a retained arm or flywheel and no propeller. It gives a second-order plant for cascade loops and the IMU.
- **Pivot beam with a propeller:** optional, only after both work, and only with every rule below.

## Rules

- **Clamp the rig.** Fix the base to the bench before power is connected. A rig that can walk or tip is not ready.
- **Limit arm and beam travel** with hard mechanical stops, so neither can reach you, the wiring or the supply. Firmware limits do not replace the stops.
- **Guard any flywheel or arm.** Fit a guard that encloses a flywheel's rim, and wear eye protection whenever the motor is powered with an arm or flywheel fitted.
- **Cap flywheel speed.** Before the first run, write down the stored energy, 0.5 × I × ω², at the firmware speed limit. Keep it at or below 1 J (roughly a 100 g mass dropped 1 m). A 0.1 kg, 40 mm radius disc reaches 1 J at about 158 rad/s (1500 rpm).
- **Plan the power-off state.** When power is cut, a gravity-loaded arm falls. Before power-up, check where it falls: it must come to rest on a stop, or be counterbalanced, with no hand, cable or sensor lead in its arc. Cover open gears and belts, and never hold or steady the arm by hand while it is powered.
- **Limit stall current.** Set the supply's current limit before the first power-up, at or below the motor's rated continuous current and the driver's rating. A stall against a stop must not overheat the motor or driver. The firmware also stops when the output sits at its limit with no motion for more than half a second.
- **Expect regenerated voltage.** A bench supply cannot absorb energy. When the motor brakes, the supply rail voltage rises. Ramp speed down in firmware, keep the driver's input capacitor fitted, and if you brake hard, add a voltage clamp (TVS diode or brake resistor) that acts below the driver's maximum voltage.
- **Guard the propeller.** Use the smallest propeller that gives a measurable response, with a full guard or mesh around the disc. Never reach past the guard while powered.
- **Stay out of the propeller plane,** and keep other people and pets out of the room.
- **Eye protection** whenever a propeller is fitted.
- **Current-limited bench supply** at 12 V or less. No lithium packs on this rig.
- **Fit the prop last.** Remove it for all wiring, firmware flashing and direction checks.
- **Firmware limits first.** Clamp the output, ramp the setpoint, and stop on a lost command or sensor fault. Test these with no propeller.
- **Safe enable.** Zero the integrator and ramp on enable, and check that hitting a hard stop cannot wind up and cause a lunge.
- **No gain-to-oscillation tests.** Find stability margins from a model or a small-amplitude measurement. Never raise the gain until the rig oscillates.
- **Abort limits on test inputs.** Before any chirp or step test, set an output limit that stops the input and cuts drive: half the travel to the nearest stop, and the rate the firmware clamp allows. Start at low amplitude, and sweep slowly near a predicted resonance.
- **Retain the arm or flywheel** so it cannot detach at speed.
- **Physical stop within reach:** a switch that removes motor power and works with the firmware crashed.
- **Secure loose hair, sleeves and cables.**
- **Stop** on smell, smoke, unexpected heat, growing oscillation, or any loose part. Cut power first, then investigate.

## Check questions

1. Why is a firmware stop not enough on its own?
2. What must be removed before you flash new control code, and why?
3. The beam starts to oscillate with growing amplitude. What is your first action?
4. Which rig should you run first, and what does it prove?
5. Your arm is held level by the motor. Where does it go when you cut power, and what must be clear?
6. A flywheel has I = 8e-5 kg m². What speed limit keeps its stored energy at 1 J?
