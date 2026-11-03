# Polymath syllabus guide

An explanation of all 7 pillars, one by one, at the depth a strong senior engineer works at.

For each pillar:

- **The idea** is what the pillar really teaches.
- **Module by module** explains what each module is for and the insight that matters most.
- **What's missing** lists where the current syllabus stops short of expert level.

**Sources:** the structure comes from `content/syllabi/`. The engineering and legal content is from my own knowledge and was not checked online in this session. Check law, dates and safety limits against primary sources before they go into the product.

## The honest verdict first

The syllabi are not elite yet, and they say so. They aim for L0 and L1: working knowledge and literacy.

| Pillar | Skills | Sum of skill minutes | Stated planning band |
|---|---|---|---|
| T0 Foundation | 142 | 67.1 h | 160–300 h |
| T1 Power & motion | 18 | 8.0 h | 48–95 h |
| T2 Control | 19 | 8.8 h | 50–90 h plus project |
| T3 Mechanical | 16 | 7.2 h | 35–70 h plus project |
| T4 UAV | 21 | 9.8 h | 60–120 h plus projects |
| T5 Cloud twin | 18 | 8.8 h | 50–100 h plus project |
| T6 Governance | 16 | 7.0 h | 25–50 h |

Skill minutes are first contact only. Real depth comes from projects, failures and repetition, which is why the planning bands are so much larger.

**What elite means here:** you can predict a result before measuring it, explain the difference afterwards, and name what would break first. The ideas below are written to build that habit. They are additions to the syllabi, not a claim that the syllabi already teach them.

**Fuller benchmark:** see `SYLLABUS-REVIEW-2026-11-02.md`, which supersedes this guide's verdicts where they differ.

**Update, 2 November 2026:** the review is now applied, and skills from this guide are in the syllabi and skill graph as stubs. The tables and "What's missing" lists below describe the syllabi before that change. Skill totals are now T1 44, T2 52, T3 31, T4 34, T5 42 and T6 37.

**All listed gaps now have a place,** with two changes to what this guide originally suggested:

- T0's gaps moved to T1, so the first walk stays at 142 skills. Reset, watchdog and crash skills are in `sw.rel`. Op-amp bench proof is the shunt current amplifier in L6.
- The original parallel-charger plan is dropped. Use one pack per charger channel.

**Still open:** all template authoring, and owner review of the L6 and L7 briefs.

**The five biggest gaps across the pillars:**

1. **T2 has PID but nothing to control.** L7 is a ground logger, so no loop is ever closed on a real plant.
2. **T2 has attitude without quaternions, and control without phase margin.**
3. **T3 has no structural analysis.** There are no stresses, beams, fatigue or modes.
4. **T5 is called a twin but is a telemetry pipeline,** and it has no LLM skill despite the "production AI" goal.
5. **T6 omits the EU Cyber Resilience Act,** which matters more to a connected EU product than most of what's listed.

---

## T0 Foundation

**The idea.** Everything later rests on one skill: build a simple model, predict a number, measure it, and explain the gap. T0 teaches this through a sensor board. 17 modules lead to a device that reads a sensor, filters it and logs it reliably.

### Module by module

**`math.alg` Algebra.** Dimensional analysis is the star here. Experts check units first because a wrong unit finds a wrong formula instantly. Estimation is its partner: know the answer to within a factor of 3 before you calculate. Logarithms matter because decibels, Bode plots and RC decay all live on them.

**`sw.tools` Terminal, Git, Make.** The real lesson is reversibility. Commit small, bisect to find a bug, and make every build reproducible. A build you can't repeat is a measurement you can't trust.

**`elec.dc` DC circuits.** Thevenin is the key idea of this module, far beyond a calculation trick. Every output in electronics is a source with an output resistance, and every input is a load. Loading effects, sensor errors, voltage sag and regulator droop are all the same picture. Nodal analysis is how SPICE works inside: it solves KCL at every node.

**`math.prob` Probability and uncertainty.** Averaging N readings cuts random noise by √N, so 100 samples gives only 10 times less noise. It does nothing for bias. Most bad engineering conclusions confuse those two: precision and accuracy. Bayes is how you debug: update your belief with each measurement.

**`elec.meas` Measurement and SPICE.** Every instrument changes what it measures.

- A multimeter on the current range adds burden voltage.
- A scope probe adds capacitance, and its long ground lead adds inductance that creates ringing that isn't in your circuit.
- Bandwidth ≈ 0.35 / rise time tells you whether your scope can see an edge at all.

A simulation is a hypothesis, so disagreement with the bench is information.

**`elec.dig` Digital logic.** Logic is analog underneath. Noise margin, open-drain lines and pull-ups are where digital meets physics. An I2C rising edge is set by the RC of the pull-up and the bus capacitance, which is why bus speed and pull-up value are linked.

**`sw.c` C basics.** Learn what the machine does, not only the syntax. Signed overflow is undefined behaviour, integer promotion surprises people, and fixed-width types exist because `int` varies. Unit testing belongs here because code you can test off-target gets written faster.

**`sw.mem` Memory and pointers.** Memory is a numbered array of bytes, and a pointer is an index into it. `volatile` tells the compiler that a value can change outside the code it sees. It does **not** make access atomic and it is not thread safety. Getting that wrong is a classic firmware bug.

**`math.trig`, `math.cplx`.** A sinusoid is a rotating arrow seen from the side. Euler's formula makes that literal: e^(jωt) turns differentiation into multiplication by jω. So a differential equation becomes algebra, and that is the whole reason for phasors and impedance.

**`math.calc` Calculus.** Derivative means sensitivity and integral means accumulation. `math.calc.numerical-methods` matters because firmware only ever has differences and sums. The rectangle sum is an integrator, and every digital controller is built on that.

**`elec.rc` Capacitors and filters.** One differential equation underlies the module: τ dV/dt + V = input. The same equation describes a thermal mass, an exponential filter in firmware, and first-order sensor lag. Corner frequency is 1/(2πRC), the slope is 20 dB per decade, and phase is −45° at the corner. Learn that shape once and you can read most of a Bode plot.

**`elec.semi` Diodes, transistors, regulators.** A MOSFET is a voltage-controlled switch with a real on-resistance, and its losses are I²R while on plus switching loss during edges. Check Vgs(th) carefully, because threshold is where it barely turns on, not where it's fully on. Linear regulators turn voltage difference directly into heat: P = (Vin − Vout) × I. Inductive loads keep current flowing when switched off, which is why flyback diodes exist.

**`sw.fsm` State machines.** A state machine makes behaviour explicit, testable and non-blocking. The expert habit is to enumerate every state and event pair, so "impossible" cases are decided on purpose.

**`elec.opamp` Op-amps.** Two golden rules give you the ideal circuit. The real expert question is when they fail: limited bandwidth, slew rate, input offset, output swing. Op-amps are exempt from the project gate in v1, which leaves this as the one electronics module with no bench proof.

**`sw.fw` Firmware.** The largest module, and it's where everything meets.

- An ISR should do almost nothing: capture, flag, leave.
- Shared data needs atomicity, not only `volatile`.
- A 16-bit read on an 8-bit bus can tear between bytes.
- Measure timing with a spare GPIO and a scope, because that shows what really happened.
- Calibration means fitting a model of offset and gain, then checking it with data you didn't fit.

**`math.vec` Vectors and matrices.** Placed last because it feeds T2. Rotation matrices are the bridge to attitude.

### What's missing

- **Differential equations** as a subject. RC is taught as a special case, but T2 needs them in general.
- **Eigenvalues.** Without them, stability and vibration modes stay unexplained.
- **Power-on behaviour:** reset, brown-out, watchdogs, and stack overflow detection. These cause a large share of real firmware field failures.
- **Bench proof for op-amps.** One small sensor amplifier would close this.
- **A labelling problem:** the capstone map uses "L5" for both filtering and the KiCad board.

---

## T1 Power and motion

**The idea.** Below about an amp, electronics is about signals. Above tens of amps, it's about energy, heat, inductance and failure. T1 teaches you to work safely where mistakes cause fires, and to model a motor well enough to predict thrust and current before spinning anything.

### Module by module

**`elec.semi.battery-spine`, `pwr.batt.li-ion-safe` Batteries.** A battery is a voltage source plus an internal resistance, Thevenin again. Under load, terminal voltage sags by I × R. Capacity falls at high current because you hit cutoff sooner, and because cold raises resistance.

- C-rate links current to capacity: 5 Ah at 20C means 100 A.
- Published C-ratings are often optimistic, so measure internal resistance yourself.
- Series adds voltage and parallel adds capacity. Balance matters because a series string is only as healthy as its weakest cell.
- Li-ion has hard limits: roughly 4.2 V full, around 3.0 V empty, and no charging below freezing, because lithium plating causes permanent damage and later internal shorts.
- Thermal runaway can't be stopped once started. The real safety work happens before it: inspection, fusing, supervised charging and a fire-safe location.

**`phys.thermal` Thermal.** Heat flows like current: temperature is voltage, thermal resistance is resistance, and heat capacity is capacitance. So thermal behaviour is an RC circuit too. That's why a part survives a 5-second burst and dies at 60 seconds. Read datasheet Rθ values critically, because Rθja depends on the board around the part.

**`pwr.bldc.esc` Motors and ESCs.** A BLDC motor is described by three equations:

- Voltage: V = I·R + ω/Kv
- Torque: τ = Kt·I
- Link: Kt ≈ 9.55 / KV, with Kt in Nm/A and KV in rpm/V

So high KV means low torque per amp. KV is not power. Propellers obey T = Ct·ρ·n²·D⁴ and P = Cp·ρ·n³·D⁵. Diameter dominates, so a modest prop increase raises power a lot, and this is how motors and ESCs get cooked.

The ESC commutates by sensing back-EMF, which is hard at low speed, and it can lose sync under sudden load changes. Modern digital protocols like DShot remove analogue throttle calibration. Bidirectional DShot gives RPM telemetry, which T2 can use for notch filters.

**`pwr.emc.practical` EMC.** The rule that matters most: current flows in loops, and at high frequency the return current follows the path of lowest impedance, directly under its outgoing conductor. Noise is mostly about loop area and rate of change. Twisted power pairs shrink the loop.

Long battery leads add inductance, so the ESC sees voltage spikes at each switching edge. That's why a low-ESR capacitor belongs right at the ESC. Spikes like these kill ESCs while the average voltage looks fine.

The syllabus's "star ground" is a low-frequency tool. It can make high-frequency noise worse by enlarging loops. Teach both, and when each applies.

### What's missing

- **The motor model above isn't explicit.** Add a skill that predicts current and RPM from V, KV, R and prop data, then compares to the L6 bench.
- **Current sensing and FOC.** Field-oriented control is standard in serious motor work, and T1 only covers ESC use.
- **Efficiency maps.** Grams per watt against throttle is how propulsion is actually chosen.
- **The LiPo plan contradicts itself.** Doc 17 and the review flagged this: "protected" packs don't match hobby 4S packs. Fix before L6.

---

## T2 Control and estimation

**The idea.** T2 answers two questions: where am I, and what do I do about it? Estimation and control are duals, and both are limited by delay, noise and bandwidth. This pillar separates real engineers from people who tune by trial and error. It's also the thinnest relative to its importance.

### Module by module

**`phys.mech` Mechanics.** Newton's laws in the body frame. Rotational inertia sets how fast a vehicle can turn. A rotating frame adds gyroscopic and cross-coupling terms, which is why a yaw command can disturb pitch.

**`sig.freq` Frequency domain.** Any signal is a sum of sinusoids, and FFT shows which frequencies matter. On a drone, the peaks are motor rotation frequency, blade-pass frequency (rotation × blade count), and harmonics. A log's FFT tells you about balance, frame resonance and bent props.

**`sig.sampling` Sampling and aliasing.** This is the single most misunderstood topic. Sampling folds frequencies above fs/2 down into your band, and **once aliased, no later digital filter can remove them,** because they look identical to real signal. So anti-aliasing has to happen before the final sample rate: an analog filter, or oversampling in the sensor followed by digital filtering and decimation.

The skill named "Anti-alias filtering on logged streams" is misleading as written, because you can't anti-alias data that's already aliased. It should teach detection, and fixing the acquisition chain.

**`sig.imu` IMU frames and calibration.** Two insights separate experts here.

1. An accelerometer doesn't measure gravity. It measures specific force, everything except gravity. At rest it reads 1 g upward because the table pushes on it. In hover it reads thrust. In free fall it reads zero.
2. Rotations don't commute, so order matters. Frame conventions cause many real bugs, including NED against ENU, and body against world.

Gyro errors should be described by Allan variance, which separates white noise (angle random walk) from bias instability. That tells you how long you can trust integration.

**`ctl.pid` PID.** P reacts to now, I removes steady error, and D damps by reacting to trend.

- Saturation is where PID breaks. When the actuator limits, the integrator keeps growing, so you need clamping or back-calculation.
- Derivative on measurement avoids a kick on setpoint steps.
- D amplifies noise, so it always needs filtering, and the filter adds lag.

**Delay decides everything.** A delay of τ adds phase lag of 360·f·τ degrees, growing with frequency. That sets the bandwidth you can achieve. Phase margin of 45–60° is the usual target, and a small margin shows up as ringing in the step response.

Cascades work by keeping the inner loop faster, typically by a factor of 5 or so. That's why rate control sits inside angle control. Thrust goes with RPM squared, so the plant gain changes across throttle. This is why a tune that's perfect at hover can oscillate at full power.

**`ctl.est` Estimation.** The complementary filter is one elegant idea: trust the gyro at high frequency and the accelerometer at low frequency. With time constant τ and step dt, α = τ/(τ + dt). The two filters are complementary because their complex transfer functions add to 1. Their magnitudes do not: each is 0.707 at crossover.

A Kalman filter does the same job with a model and noise statistics, and sets the blend automatically over time. Its core output worth learning is the innovation: the difference between prediction and measurement. Innovation checks are how flight stacks detect a bad sensor. Literacy is fine at first, but you should at least derive the 1-D Kalman filter by hand.

### What's missing

- **A plant to control.** This is the largest gap. Add a one-axis rig: a beam on a pivot with a motor and prop, or a motor speed loop. It's ground-based, stays inside the safety boundary, and makes PID real. Then measure a step response and compare it to your prediction.
- **Quaternions.** Most attitude stacks use them, and the syllabus doesn't mention them. Euler angles hit gimbal lock.
- **Laplace, transfer functions, Bode margins and discrete-time basics.** The syllabus has a confusable pair called `fourier-vs-laplace-literacy` but no Laplace skill to confuse.
- **Allan variance, system identification and notch filters.** These are the working tools of serious tuning.

---

## T3 Mechanical design

**The idea.** Software forgives and metal doesn't. T3 teaches you to design parts that can be made, assembled, and survive vibration. The important shift: you stop designing shapes and start designing for loads, tolerances and processes.

### Module by module

**`mech.cad` Parametric CAD.** Design intent is the point. A well-built model captures why a dimension exists, so changing one parameter updates the part correctly. A fully constrained sketch has zero degrees of freedom, and an unconstrained one will break later. Base key dimensions on function: bolt circles first, outline second.

**`mech.cad.assemblies` Assemblies.** Mates reveal collisions before you print. Mass properties drive the CG budget, but only if parts have real densities, so weigh real parts and correct the model. Wiring is commonly forgotten and it collides with everything.

**`mech.tol` Tolerances.** Nothing is ever the drawn size. A stack-up adds tolerances along a chain. Worst case adds them all. Root-sum-square assumes they won't all be extreme together, which is usually realistic with many parts and process control. On FDM, holes print small and need measured compensation. Print a test coupon on your own machine and use its numbers.

**`matl.mfg`, `matl.print` Manufacturing.** Each process has its own physics.

- FDM parts are anisotropic: weakest between layers, so orient them so load doesn't peel layers apart.
- PLA creeps under sustained load and softens in a hot car.
- Carbon fibre is stiff but conductive, so it can short electronics. It's also galvanically active against aluminium.
- Choose the process from the load case and volume, not from what's available.

**`elec.pcb` High-current PCB.** Copper is a resistor and a heat path. One-ounce copper is about 0.5 mΩ per square, so a long thin trace is a real resistor at 50 A. Width sets heating, and IPC-2152 is the reference. Outer layers cool better than inner ones. Vias are small, so high-current paths need many in parallel. Kelvin-connect current-sense resistors so copper drop doesn't enter the reading.

### What's missing

- **Structural analysis, entirely.** The pillar has no statics, stress, beams or fatigue. Add:
  - Cantilever bending: δ = F·L³ / (3·E·I), where I grows with the cube of section depth. That's why deep arms are stiff.
  - Stiffness against strength as two different failures.
  - Stress concentration: sharp internal corners start cracks, so add fillets.
- **Vibration modes.** A frame resonance near motor frequency shows up as gyro noise. This connects T3 directly to T2, and the syllabus treats it as "awareness".
- **Bolted joints.** Joints stay tight through preload. Add threadlock, torque, and inserts for repeated assembly.
- **A sequencing loop.** T3 says L9 fits the L8 kit stack, while T4 lists T3 as a prerequisite. Decide which comes first.

---

## T4 UAV integration

**The idea.** A drone is T0 to T3 running at once, and it can hurt people. Integration is its own discipline: the failures live between subsystems. Elite integrators don't "fly and see". They reduce risk in stages, and the log decides what's true.

### Module by module

**`robo.uav.physics`, `robo.uav.propulsion` Weight and propulsion.** Thrust-to-weight of 2:1 is a common starting point, so hover sits near half throttle or less. Margin is needed for control authority, not only climb. At full throttle there's no headroom left to correct attitude.

Momentum theory gives the key result: hover power grows with thrust^1.5 and falls with rotor area. Bigger, slower props are more efficient, and that's why endurance craft look the way they do. CG must sit at the centre of thrust, or one motor group works harder all the time.

**`robo.uav.fc` Flight controller.** Three stacks exist for different jobs.

- Betaflight optimises manual rate flying.
- PX4 and ArduPilot provide autonomy and navigation.
- Their licences differ: PX4 is BSD, ArduPilot is GPLv3. This matters if you ship a product.

Always verify sensor orientation in the UI by physically tilting the craft. A wrong orientation flips immediately on take-off. Failsafes need thought, not defaults: what happens on loss of RC, telemetry, GPS, or low battery, in each flight phase?

**`robo.uav.ops-eu` EU operations.** The EU uses risk categories: Open, Specific and Certified, with Specific using the SORA risk assessment. The legal point the review surfaced: an unmarked ready-to-assemble kit doesn't count as privately built, so the L8 "kit quad" needs a checked legal route. Treat insurance as required in Germany and get proof first.

**`sens.meas` Error budgets.** One table of offset, gain, noise, drift and resolution, combined correctly: independent errors add by root-sum-square, while systematic ones add directly. GPS error comes mainly from geometry, multipath and the atmosphere, so plan margins from HDOP and worst cases. A geofence must allow for this error plus stopping distance.

**`net.rf` Telemetry and links.** Free-space loss is FSPL (dB) = 32.44 + 20·log₁₀(f in MHz) + 20·log₁₀(d in km). Doubling range costs 6 dB. Link margin should cover fading, and the Fresnel zone means line of sight alone isn't enough, since ground near the path reduces signal. Choose UDP for live telemetry because stale data is worse than lost data. Version your message contract, because MAVLink and custom fields both change.

**`robo.uav.test` Test matrix.** The expert structure is a staged build-up:

1. Bench with props off.
2. Motors with thrust stand.
3. Tethered or low hover.
4. Open area, envelope expanded one parameter at a time.

Each stage has a written purpose, expected results, abort criteria, and a log review before the next. Change one thing at a time, and keep a golden configuration so you can always return to a known good state.

### What's missing

- **Log analysis as a skill.** Vibration clipping, EKF innovations, motor saturation, and compass interference from power wires. Experts read logs before they read opinions.
- **Simulation first.** SITL lets you test missions and failsafes with no risk. It isn't listed, and it should come before L8.
- **Fault injection.** Trigger each failsafe deliberately on the ground or in simulation.
- **Scope accuracy.** `sens.meas.calibration-uncertainty` is tagged L2 with 25 minutes and multiple choice only, which doesn't match an L2 claim.

---

## T5 Cloud twin

**The idea.** Physical systems produce messy, late, duplicated data forever. T5 builds a system that takes it, keeps it trustworthy, and makes it useful. The syllabus says this leverages your cloud strength, so the value is in what's specific to devices: intermittent links, wrong clocks, and hardware that can't be patched quickly.

### Module by module

**`sys.req` Requirements.** A requirement states a need and how you'd prove it. There are four classic methods: inspection, analysis, demonstration and test. Verification asks if you built it right; validation asks if you built the right thing. An ICD freezes the interface between teams, and most integration failures start at interfaces.

**`sys.telemetry` Edge-to-cloud contracts.** Device data is different from web data.

- **Event time is not arrival time.** A drone offline for 10 minutes sends old data late. Partition and window on event time, and use watermarks for lateness.
- **Device clocks are wrong.** Record both device and receive time, plus a sequence number and boot counter.
- **Delivery is at-least-once,** so make ingestion idempotent with a device id and sequence key.
- **Schema evolution** is directional. Cloud readers must read every old firmware version, because old devices stay in the field for years. Add optional fields, and never reuse a field's meaning.
- **Store and forward** on the device needs a defined overflow policy.

Partitioning trades query speed against the small-files problem. Alerts should fire on symptoms users feel, measured against an SLO. Burn-rate alerting beats fixed thresholds.

Device identity must be per-device. A shared fleet key means one extracted device compromises all. Use mTLS with short-lived certificates, and a secure element if the threat justifies it.

**`ml.core` ML foundations.** Time-series splits must be chronological. Random splits leak the future. Beat a persistence baseline first: "next value = last value" is surprisingly hard to beat on telemetry. If the model can't beat that, you don't have a model yet.

**`ml.ops` MLOps.** Evals are tests for models. Keep a frozen golden set with thresholds, add every production failure to it, and block deploys on regressions. Drift comes in two main kinds: inputs change (covariate), or the relationship changes (concept). Deploy through shadow, then canary, with rollback ready. Offline scores don't guarantee online performance.

**`ml.edge` Edge inference.** Quantization maps reals to integers with r = S·(q − Z). The real constraints are flash for weights, RAM for the tensor arena, and inference time against your control or logging deadline. Calibrate with representative data, or use quantization-aware training if accuracy falls. Measure on the device, because laptop metrics tell you nothing about latency.

**`sw.cloud` Firmware CI.** Hardware-in-the-loop tests belong in CI. OTA updates need A/B slots, signed images, a health check and automatic rollback, because a failed update on a fielded device can mean a truck roll. Secrets never live in repos.

### What's missing

- **An actual twin.** A digital twin holds a model of the physical system, tracks its state, and predicts. L11 stores, replays and alerts. Add a simple model: predicted battery sag or motor temperature from L6 data, compared live with telemetry, with alerts on the residual. That's the difference between a dashboard and a twin.
- **LLM and agent skills.** The spine promises production AI and doc 15 says LLMOps, but no skill covers retrieval, prompt injection, structured outputs or agent evaluation.
- **OTA as a skill** in its own right. It's a central risk for connected devices.
- **A broken reference.** The L11 map names `ml.ops.eval-report`, but the module's skill is `ml.ops.evals`.
- **Physical-data ML.** Anomaly detection and remaining useful life are the natural use of this data.

---

## T6 Governance

**The idea.** Technology that crosses borders, connects to networks, or flies near people is regulated, and the rules shape the design from the start. The syllabus keeps this to literacy, with counsel making legal calls. That's right. The expert skill is knowing when to stop and ask, early enough to change the design.

### Module by module

**`prof.law`, `def.export` Export control.** The most common misunderstanding: exporting isn't only shipping boxes. **Technology transfer can be an email, a shared repo, a cloud upload or a screen share.**

EU Regulation 2021/821 lists dual-use items in Annex I, across 10 categories (0 to 9), including electronics (3), telecoms and information security (5), sensors (6), navigation (7) and aerospace and propulsion (9). Three questions drive the analysis:

1. **What is it?** Classification against the list.
2. **Where is it going?** Destination and sanctions.
3. **Who will use it and for what?** End-user and end-use. Catch-all rules can apply even when an item isn't listed.

Germany adds AWG, AWV and BAFA as the authority. US rules can follow a product through US-origin content or technology, and ITAR is a separate regime. Encryption is the trap for ordinary products, because category 5 part 2 can catch connected devices. Product decomposition matters because of General Note 2: a controlled component can bring the whole product under control when it is the principal element and can feasibly be removed or used for other purposes. Know where such parts are, and take design choices to counsel early. Splitting items to sidestep a control is never acceptable.

**`sec.hw` Device threat modelling.** Start with assets, then attackers, then trust boundaries. Physical access changes the game, because attackers can read flash, glitch power and use debug ports.

- Secure boot proves firmware authenticity through a chain from an immutable root of trust.
- It needs anti-rollback, or attackers simply install old vulnerable firmware.
- Lock debug ports on production units.
- Unique per-device keys limit damage.

An SBOM lists what's inside, usually in SPDX or CycloneDX. Paired with VEX, it says which vulnerabilities actually apply.

**`sec.ot` OT zones and remote access.** IT protects data first. OT protects physical safety and availability first, so patching can be slower and uptime rules. IEC 62443 groups assets into zones with controlled conduits between them. Remote access is a leading path into OT networks, so route it through a jump host with strong authentication and logging.

**`prof.integrator` Integrator docs.** Serious buyers trust evidence. An evidence pack holds architecture, interfaces, test results and configuration, all traceable to requirements. Golden configuration means you can state exactly what was tested. Stating technology readiness honestly (TRL) builds credibility.

**`econ.cost` Economics.** NRE is what you pay once and recurring cost is per unit. Total unit cost = recurring + NRE / volume, so the crossover between processes is simple arithmetic. BOM is often only part of the real cost. Add assembly, test, yield, scrap, certification, freight, support and returns. Volume changes which design is best: a printed part at 100 units becomes a moulded part at 100,000.

### What's missing

- **The EU Cyber Resilience Act.** This is the largest gap. It applies to products with digital elements, with vulnerability reporting duties starting in September 2026 and main obligations in December 2027. Check the dates and scope against the regulation. It requires secure-by-design, vulnerability handling, an SBOM and support periods.
- **The Radio Equipment Directive's cybersecurity rules,** and CE marking in general. CE and RED apply to radio products, while the cyber rules apply to the classes in Delegated Regulation 2022/30, and reportedly lapse when the CRA takes over in December 2027.
- **Product liability,** including the new EU directive that covers software. The review flagged this too.
- **An "I must stop" drill.** A timed scenario where you find a red flag in a design review and write the note to counsel.
- **A real threat model.** Apply it to your own L4 or L11 device instead of a template device.

---

## The five upgrades, now added as planned skills

1. **Add a closed-loop rig to T2.** One beam, one motor, one logged step response.
2. **Add quaternions and frequency-domain stability** to T2, with differential equations and eigenvalues at the start of T2, so the first walk stays at 142 skills.
3. **Add structural analysis and vibration modes** to T3.
4. **Turn L11 into a real twin** with one predictive model, and add LLM skills to T5.
5. **Add the Cyber Resilience Act and CE marking** to T6.

One habit would raise every pillar: **for each project, write the predicted number and failure mode before you build, then explain the difference afterwards.** Project steps already do this in places, such as the L0 predictions. Making it universal is cheap and fits the product's measurement-first design.

---

## Research sources for the 2 November gap fill

Only the search results listed here were read, and several were snippets. Source quality is noted because the rule is to check primary sources before anything ships.

**Batteries (mostly institutional or hobby sources; check pack and charger manuals):**

- [UMD drone lab LiPo guide](https://facilities.robotics.umd.edu/droneLab/safety/batteries.html)
- [Penn LiPo use checklist](https://ehrs.upenn.edu/sites/default/files/2017-12/Lithium%20Polymer%20Battery%20Use%20Checklist.pdf)
- [MIT lithium battery guidance](https://ehs.mit.edu/wp-content/uploads/2019/09/Lithium_Battery_Safety_Guidance.pdf)
- [HobbyKing on parallel charging](https://hobbyking.com/jp_jp/blog/parallel-charging/) and [Oscar Liang](https://oscarliang.com/parallel-charging-multiple-lipo/). Voltage thresholds disagree (0.1 to 0.25 V), and no manufacturer source was found. That disagreement is why the brief avoids parallel boards.
- [GRS service specification](https://batterien.grs-pro.de/fileadmin/Downloads/Registrierung_Ruecknahmestelle/GRS_Leistungsverzeichnis_STB_IND_FZG_01-2026.pdf) and [Hannover notice on BattDG](https://www.hannover.de/Service/Presse-Medien/Hannover.de/Aktuelles/Service-2026/aha-nimmt-Batterien-über-500g-nur-im-Son­der­abfall­zwi­schen­la­ger-Lahe-an). The BattDG text itself was not read.

**Firmware reliability (practitioner sources):** [Beningo on watchdogs](https://www.beningo.com/a-watchdog-timer-is-needed-in-every-embedded-device/), [Memfault reboot reasons](https://docs.nrfcloud.com/docs/reference/reference-reboot-reason-ids).

**Current sensing:** [TI on Kelvin connections](https://ti.com/lit/pdf/sszt805), [onsemi AND9750](https://www.onsemi.com/pub/Collateral/AND9750-D.PDF), [ROHM design note](https://fscdn.rohm.com/en/products/databook/applinote/common/low_side_current_sense_circuit_design_an-e.pdf). A 1 mV offset on a 10 mV shunt drop is a 10% error, which is why this makes a good calibration exercise.

**Anomaly detection and prognostics:**

- [Wu and Keogh on flawed benchmarks](https://arxiv.org/pdf/2009.13807)
- [Kim et al. on point adjustment](https://ojs.aaai.org/index.php/AAAI/article/view/20680): even a random score can look excellent under that protocol.
- [Physics-informed RUL on C-MAPSS](https://arxiv.org/pdf/2406.15619). No battery or motor prognostics source was found.

**Governance:**

- [Recommendation (EU) 2019/1318](https://eur-lex.europa.eu/eli/reco/2019/1318/oj/eng) is non-binding guidance on internal compliance programmes. **Its annex could not be read in this session,** so the stop drill's red-flag list must be written from the original text.
- [EN 18031 overview](https://incompliancemag.com/reds-cybersecurity-requirements-update-en-18031-x2024/): it maps to RED articles 3.3(d), (e) and (f), and cross-references EN 303 645.
- ETSI TR 103 935 covers risk assessment and STRIDE. It was seen through secondary sources only.
