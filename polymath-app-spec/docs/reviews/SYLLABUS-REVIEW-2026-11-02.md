# Polymath syllabus review, 2 November 2026

Four reviewers benchmarked all 7 pillars against published courses, standard texts, vendor documents and EU law. Nothing in the syllabi was changed. Their full module-by-module reports are in the appendix, each with one hard assessment task per module.

## The verdict

**The structure is good. The depth is not there yet.** The topics are mostly right, and predict-then-measure is the strongest idea in the plan. The curriculum falls short in five ways:

1. **Foundations are missing.** T0 has no machine model, no debugger and no sampling. T2 has no Nyquist stability, sensitivity or state space. T1 has no power electronics. T3 has no drawings or materials selection.
2. **Most assessment tests recognition.** Many skills are multiple choice, and "human review" by a solo founder is self-review.
3. **Time budgets aren't credible.** Examples are 30 minutes for fatigue and 150 minutes for most of the mathematics of control.
4. **Some claims promise more than the skills teach.** L11 is called a twin but is a one-way shadow. Doc 16 promises OT leadership from 0.9 hours.
5. **Some legal content is out of date or missing.** That includes the Data Act, the AI Act, German export practice and the L8 kit route.

**A limit to keep in mind.** No syllabus gets anyone to the best human level. That takes years of practice on real failures. MIT's 2.007 alone runs about 12 hours a week. At 8 hours a week, the honest goal is to reach strong working ability on one path, and then go deep in one or two areas. The claims policy also forbids promising more than this in the product.

## Top priorities, ranked

| # | Pillar | Change | Why it matters |
|---|---|---|---|
| 1 | T4 | Fix the L8 legal route before buying a kit | EASA says a single ready-to-assemble kit isn't privately built. I confirmed this on the EASA page. Self-specified parts mean A3 rules. Confirm with the LBA. |
| 2 | All | Replace recognition tests with held-out, predicted-first tasks | This is what separates knowing from doing. |
| 3 | All | Stop self-certification on hazardous steps | Use an outside reviewer, or a pre-registered prediction with a fixed tolerance. |
| 4 | T0 | Add machine model, GDB over SWD, integer semantics, sampling, PWM, decoupling | Six swaps keep the count at 142. This changes the lean plan's scope, so it's your decision. |
| 5 | T2 | Add Nyquist, sensitivity, state space, linearisation, and model-based tuning | Otherwise margins are numbers with no theory behind them. |
| 6 | T2 | Add a second-order cascade rig with no propeller | A motor speed loop is close to first order, so it can't exercise cascades or the IMU. |
| 7 | T1 | Add a `pwr.conv` power electronics module, before BLDC | T1 teaches using an ESC, and nothing about what's inside one. |
| 8 | T1 | Fix the L6 rig: real load, torque measurement, DC clamp | "Prop removed" gives no thrust, and doc 17 contradicts the artifact. |
| 9 | T4 | Replace `robo.uav.physics` with real physics, and add flight test and piloting | The module has no physics, and failsafe recovery depends on manual flying. |
| 10 | T3 | Add `mech.draw` and `matl.select` | No drawings, datums or materials selection exist. For Germany, teach ISO GPS first. |
| 11 | T2, T3, T4 | Build one vibration thread | Rotor harmonics, frame mode, IMU, filter delay and phase margin are one chain. |
| 12 | T5 | Make the twin real, or rename it a calibrated shadow | L11 has no two-way loop, no state estimation and no VVUQ. |
| 13 | T5 | Double `sys.telemetry`, and reorder the pillar | Freshness, correctness and coverage SLOs are missing, and the twin comes before regression. |
| 14 | T6 | Fix export teaching and add a real classification memo | My guide stated General Note 2 wrongly. Teach current entries such as 9A012 and 5A002. |
| 15 | T6 | Add Data Act, GDPR, AI Act and German export layers, and applied crypto | All are missing, and CRA reporting is already live. |

**What to remove:** Betaflight as a T4 target, ESC calibration as a default skill, BMS as a main outcome on the LiPo path, star ground as a headline, and six T0 skills if you take the swap.

## Corrections made to SYLLABUS-GUIDE.md

These were my errors, so I fixed them:

- A controlled subassembly doesn't automatically pull in the whole product. General Note 2 applies when it's the principal element and can feasibly be removed.
- "Most OT compromises begin at remote access" is unsupported, so it now says "a leading path".
- The RED cyber rules apply to the classes in 2022/30, not to every wireless product.
- "Every real attitude stack uses quaternions" is now "most".
- Complementary filter gains add to 1 as complex transfer functions, not as magnitudes.
- Schema compatibility is directional, and cloud readers must read all old firmware.

## Evidence limits

- The EASA kit point was re-checked directly. All other findings come from the reviewers and were **not** independently verified, so check them before they go into the product.
- EU law was read through an unofficial mirror, because EUR-Lex returned empty pages. Check the Official Journal.
- Most paid books and standards were seen only as contents pages or snippets, including Shigley, Ott, Krishnan, IEC 62443, ISO 23247 and EN 18031.
- The annex of Recommendation 2019/1318 still couldn't be read, so the stop drill's red-flag list can't be written from the source yet.
- MIT OCW and Solà's quaternion notes are non-commercial. They can be benchmarks only, never reused in the app.
- Hour figures in the reports are reviewers' judgement.

---

# Appendix: full reviewer reports

## T0 Foundation syllabus review (read-only, no project files changed)

**Verdict:** the structure is sound and the electronics and C order matches strong curricula. The weaknesses are not the topic list. T0 has no machine model, no real debugger, no sampling idea and no integer-semantics depth. Its op-amp and digital evidence is too weak to deserve the L1 label. Most of this fits inside 142 skills by editing descriptions and doing six swaps.

Evidence labels: **[O]** opened and read, **[S]** search snippet or secondary copy only, **[R]** my recall, not checked this session, **[Repo]** checked in the repo. MIT OCW was benchmarked only; nothing here copies from it.

## Top 15 recommendations, ranked by impact

Tag: **NOW-edit** = no skill count change. **SWAP** = 142 preserved. **AFTER** = after the first walk.

1. **Add a machine-model skill (SWAP, L0).** Cover registers, PC, fetch-execute, memory map, call stack, and what an ISR entry saves.
   - T0 has no ISA, assembly, program counter or stack-frame content [Repo: graph and ladder grep].
   - Every benchmark teaches this: Nand2Tetris projects 4-6 [O](https://www.nand2tetris.org/course), Computation Structures parts 2-3 including "Devices and Interrupts" [O](https://computation-structures.github.io/course), CS61C [O](https://sp25-web.pages.dev), and CS:APP Bomb Lab [S](https://GitHub.com/xuwd11/15-213_labs).
   - Without it, pointers, the stack and ISRs are rules to memorise, not a model.
2. **Add a real debugger skill (SWAP): GDB over SWD.** Cover breakpoint, step, memory and register inspection, and backtrace.
   - The graph and ladder have zero mentions [Repo]. The L4 bug hunt prescribes "a print or a smaller test".
   - The official Raspberry Pi probe gives SWD plus UART, and GDB breakpoints and stepping [O](https://www.raspberrypi.com/documentation/microcontrollers/debug-probe.html).
   - Add the probe to the kit. I did not check its price.
3. **Fix integer semantics (SWAP or split `sw.c.types-ints`).** Cover integer promotion, usual arithmetic conversions, signed overflow UB, and shift rules.
   - "Undefined behaviour" and promotion appear nowhere [Repo].
   - CERT INT02-C's `(~port) >> 4` on a `uint8_t` is register code [S](https://wiki.sei.cmu.edu/confluence/display/c/INT02-C.+Understand+integer+conversion+rules).
   - MISRA C:2023 Rule 1.3 and its 10.x essential-type rules target this [S, vendor text](https://www.mathworks.com/help/bugfinder/ug/essential-types-in-misra-c-2012-rules.html).
   - L3 s08 has learners implement the BME280 integer compensation, which uses `t_fine` and shifts [S](https://codex.ac6.fr/Zephyr/xref/Zephyr-latest/drivers/sensor/bosch/bme280/bme280.c), before this is taught.
4. **Add sampling and aliasing (SWAP, L1), not left as a stub.**
   - `sw.fw.exponential-filter` asks for a cutoff frequency, and `moving-average` for lag, yet no real skill teaches the sample rate.
   - L1 Path B uses the Pico ADC as a scope [Repo].
   - `sig.sampling.nyquist-aliasing` hard-depends on a Fourier stub, so create a new real `sw.fw` skill with a time-domain treatment. Leave the stub for T-later.
5. **Remove the `sw.c.bitwise-ops` to `sw.fw.gpio-output` hard edge; replace it with a basic C skill (NOW-edit).**
   - Doc 05 says the first LED can use a driver call, yet the edge forces masks first.
   - First-blink prerequisites land at weeks 12-23 (doc 05 §6.1).
   - Stanford's ENGR 40M begins labs in week 2 [O](https://edit-summer.stanford.edu/sites/summer/files/media/file/engr_40m_syllabus_summer_2026.pdf).
6. **Give `elec.opamp` bench evidence or stop calling it L1.**
   - Seven skills have L1 targets and no project (exempt under 00a E2). That contradicts doc 05 §3's "completes a guided project".
   - Now: show the module as checkpoint-only.
   - AFTER: add one L3 step, a buffered and scaled analog sensor into the ADC.
   - AoE and LAoE treat op-amps as lab material [O ToC](https://artofelectronics.net/the-book/table-of-contents/), [S](https://www.cambridge.org/us/academic/subjects/physics/electronics-physicists/learning-art-electronics-hands-lab-course). TI Precision Labs uses simulation plus measurement [S](https://ti.com/video/series/ti-precision-labs-op-amps.html).
7. **Add PWM as a skill (SWAP).** L2 uses PWM in firmware and the ladder mentions it 13 times; the graph has zero [Repo]. It is tagged only as `timers-tick`. PWM also ties together duty cycle, averaging and RC filtering.
8. **Add decoupling and return paths (SWAP, L1).**
   - Zero graph coverage, while L5 lays out a real board [Repo].
   - MT-101 and AoE 8.15-8.16 show it is core practice [S](https://www.analog.com/cn/resources/packaging-quality-symbols-footprints/package-resources.html), [O ToC](https://artofelectronics.net/the-book/table-of-contents/).
9. **Make `math.vec` earn its place: replace `rotation-matrices` with a least-squares line fit (SWAP).**
   - No real skill depends on this module [Repo].
   - Boyd's framing is vectors, matrices, least squares, applications first [O](https://web.stanford.edu/class/engr108), [O](https://web.stanford.edu/~boyd/vmls/). EE16A also has least squares [O](https://hkn.eecs.berkeley.edu/courseguides/EE/16A).
   - Then extend calibration from two points to N points with residuals.
   - Also use 3×3 nodal equations as `linear-systems` items. EE16A's teaching of circuits with linear systems supports this.
10. **Add a rise-time measurement to L3 s07 (NOW-edit, cheapest high-value fix).**
    - Have learners compute Rp limits, measure tr, and infer bus capacitance. `elec.rc` and I2C meet here.
    - TI: tr = 0.8473·Rp·Cb, 300 ns limit in Fast mode, Rp(min) from Vol and Iol [O](https://www.ti.com/lit/an/slva689/slva689.pdf).
    - The ladder has no I2C rise-time work [Repo].
11. **Rewrite volatile and ISR content around what volatile does not do (NOW-edit).**
    - It gives no atomicity, and compilers move non-volatile accesses across volatile ones [O](https://blog.regehr.org/archives/28).
    - `isr-shared-data`'s "volatile flags" invites the error.
12. **Add `d/dt e^{jωt} = jω e^{jωt}` to the impedance path (NOW-edit).**
    - `elec.rc.impedance` has no route to `derivative-functions` except through other work. Add the edge or a required worked example.
    - `exp-growth-decay` teaches only dy/dt = -ky. RC charging towards Vs needs the shifted form explicitly.
13. **Compiler discipline in `sw.c.unit-testing` and `reading-errors` (NOW-edit).** Add `-Wall -Wextra -Werror`, ASan and UBSan on host tests, and one static analyser. The repo has none [Repo]; the value is my practice judgement [R].
14. **Replace MC graders for design skills with constructive grading (NOW-edit).**
    - `combinational-design` and `fsm-from-spec` have only MC and numeric graders. Truth-table or next-state equivalence is deterministic and proves design. Same for `latch-flipflop` traces.
    - Nand2Tetris is built on such constructive projects [O](https://www.nand2tetris.org/course).
15. **AFTER the first walk, add a short sequence:** SPI, linker and startup, fixed-point, floating point, and a stack-overflow or fault post-mortem.
    - CS61C covers floating point and compiler-assembler-linker-loader [O](https://sp25-web.pages.dev).
    - Floating point has zero graph hits [Repo].
    - `sw.rel.*` stubs already hold watchdog and reset topics, so do not duplicate those [Repo].

## Keep-142 swap

**Remove from first walk (all six have no real dependents, no ladder use, not in the lean slice [Repo]):**

| Remove | In | Reason |
|---|---|---|
| `math.prob.conditional-bayes` | PWM | No T0 consumer |
| `math.vec.rotation-matrices` | least-squares fit | Move to T-control or mechanics |
| `sw.mem.dynamic-memory-bugs` | machine model | Firmware path avoids heap; keep buffer overflow inside arrays. MISRA bans allocation [R] |
| `sw.tools.git-branching` | GDB/SWD | Solo. Fold push and merge into `git-basics` |
| `elec.dig.mux-decoder-adder` | sampling | **Weakest cut**: keep the adder in `combinational-design` as a design task (Nand2Tetris project 2) |
| `math.prob.normal-distribution` | decoupling | Keep ±1σ inside `variance` or `averaging-noise` |

- Integer semantics goes in by moving part of `types-ints`, or by cutting K-maps from `combinational-design` and adding a skill. K-maps are the first thing to drop [R].
- This changes lean-plan scope, so it is your decision. The hours stay about equal.
- These skills are not verified, so key immutability does not block it. Check against doc 05 §8.

## Module review

Each module has a verdict, gaps, order and depth, misconceptions, one reference, and one unaided task.

**1. `math.alg` - KEEP.**
- Gaps: straight-line use of log scales; significant figures. Promote `estimation` from orphan to a habit inside DC items.
- Order: fine. Depth: fine.
- Misconceptions: √(a²+b²)≠a+b; 1/(a+b)≠1/a+1/b (it breaks parallel R); milli vs mega prefixes.
- Reference: OpenStax *Algebra and Trigonometry* [R].
- Task: from an unseen formula P = V²R/(R+r)², isolate r, check units, estimate within 10% without a calculator.

**2. `sw.tools` - CHANGE.**
- Drop branching (above). Add `git restore`, `reset` and `bisect`; the outcome already says "recover without losing work".
- Depth: `build-make` is a hidden problem, because L0 uses Pico SDK and CMake [Repo]. Teach the object-compile-link model, not only Make syntax. Keep the known module-order exception.
- Misconceptions: a commit is a backup; `make` is the compiler.
- Reference: *Pro Git* [R].
- Task: given a repo with a broken build and a bad commit, restore lost work and find the regression by `git bisect`, with no notes.

**3. `elec.dc` - CHANGE (order and framing, not topics).**
- Keep nodal, Thevenin and loading. Add "real source" (internal resistance) and ground-as-reference. Teach current conservation before formulas.
- Superposition to Thevenin is a dubious hard edge; open/short methods do not require it. Consider soft.
- Misconceptions (design items directly):
  - battery as constant-current source, current focus, mixing properties of V/I/R [O](https://arxiv.org/abs/physics/0304040)
  - current used up [S](https://arxiv.org/pdf/physics/0304040)
  - Use DIRECT-style unnumbered conceptual items; a modernised reDIRECT exists [S](https://doras.dcu.ie/32448/1/SEFI2025_187.pdf). Check its licence before any reuse.
- Reference: Hayes and Horowitz, *Learning the Art of Electronics*, ch. 1 [S](https://buscador.unsam.edu.ar/Record/62507/TOC?print=1).
- Task: measure an unknown black-box two-terminal source with two loads, derive its Thevenin model, predict a third load within tolerance.

**4. `math.prob` - CHANGE.**
- Cut Bayes and the normal skill (above). Move the remainder to use the learner's own bench readings. Add systematic vs random error and worst-case tolerance stack; `resistor-values` touches this.
- Misconceptions: more averaging fixes bias; √N applies to correlated data; SD vs standard error.
- Reference: Taylor, *An Introduction to Error Analysis* [R].
- Task: from 50 of your own readings, report value ± uncertainty, separate systematic and random terms, and say what 100× more samples can and cannot fix.

**5. `elec.meas` - KEEP, deepen.**
- Add: probe loading (×1 vs ×10), ground clip inductance and ringing [S](https://www.scribd.com/doc/250646140/Abcs-of-Probes), scope bandwidth and rise-time limit, DMM burden voltage, trigger as a debugging skill.
- Bigger gap: `datasheet-reading` should include errata. On a Pico 2 the E9 case is real: A2-stepping GPIO input leakage is fixed in A4, and A4 needs pico-sdk ≥2.1.0 [S](https://www.cnx-software.com/2025/07/29/raspberry-pi-rp2350-a4-stepping-fixes-e9-gpio-erratum-9-glitching-bugs-introduces-2mb-flash-variants/?amp=1), [S](https://www.raspberrypi.com/news/rp2350-a4/).
- Misconception: the scope shows the signal, not signal plus probe; ground clips are harmless.
- Reference: AoE Appendix O [O ToC](https://artofelectronics.net/the-book/table-of-contents/).
- Task: a seeded fault circuit with a misleading capture; identify which features are measurement artefacts and re-measure correctly.

**6. `elec.dig` - CHANGE.**
- Add setup and hold, and metastability literacy (L0), because a button into a clock-synchronised input is the real case. Zero repo coverage.
- Add CMOS gate as switch (L0). Computation Structures puts the digital abstraction and CMOS first [O](https://computation-structures.github.io/course). ETH's course also starts at transistors and gates [S](https://csdiy.wiki/en/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/DDCA/).
- Order is good: bits before C.
- Misconceptions: floating input reads 0; flip-flops update "continuously"; Moore vs Mealy timing.
- Reference: Harris and Harris, *Digital Design and Computer Architecture* [S](https://csdiy.wiki/en/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/DDCA/).
- Task: from a written spec, design a 3-bit FSM, graded by exhaustive next-state equivalence, and state its maximum clock from given gate delays.

**7. `sw.c` - CHANGE.**
- Items 3 and 13 above. Add const-correctness, `static` scope, and the C string terminator trap. Adopt BARR-C-style rules as a style target; `stdint` use and no bitwise on signed are the relevant ones [S older mirror](https://rkks.github.io/wiki/codestd.html).
- Do not teach MISRA as a syllabus; use it as a lens. Its 221 rules [S](https://help.klocwork.com/current/en-us/concepts/misrac2023enforcement.htm) are unsuitable for novices.
- Misconceptions: `char` is 8 unsigned bits; `int` is 32 bits; `~u8` stays 8 bits; sizeof on an array parameter.
- Reference: K. N. King, *C Programming: A Modern Approach* [R].
- Task: write a tested bit-field pack and unpack module with no warnings under `-Wall -Wextra`, passing hidden edge-case tests and UBSan.

**8. `sw.mem` - CHANGE.**
- Add machine model. Use stack frames as the explanation. Teach const-volatile register pointers (`timer_t volatile * const`) [S](https://rkks.github.io/wiki/codestd.html). Read-modify-write hazards belong here.
- Add a CS:APP Bomb Lab style "read the map or assembly" exercise, reduced to a single short function.
- Misconceptions: array is a pointer; returning a local address works; volatile = thread-safe.
- Reference: CS:APP ch. 2-3 [S](https://GitHub.com/xuwd11/15-213_labs).
- Task: given a crashing binary and an ELF map, use GDB to find the stack corruption unaided.

**9. `math.trig` - KEEP.** RMS could sit here or in RC.
- Misconceptions: degrees in `sin()`; phase sign; atan vs atan2.
- Reference: OpenStax [R].
- Task: from a raw captured waveform CSV, fit amplitude, frequency and phase by hand and predict the next zero crossing.

**10. `math.cplx` - KEEP (small).**
- Add a rotation-and-scale picture before algebra. Move the Euler derivation so it can use the derivative (item 12). The `quadratics` to complex edge is motivational, so consider soft.
- Misconceptions: j is "imaginary so not real" in circuits; adding phasors of different frequencies.
- Reference: Agarwal and Lang, *Foundations of Analog and Digital Electronic Circuits*, sinusoidal steady-state chapters [R].
- Task: derive an RC gain and phase by hand, then predict a capture at a frequency you were not given in advance.

**11. `math.calc` - CHANGE.**
- Add linear first-order ODE with a constant driving term. Keep `numerical-methods` and connect it to firmware: Euler step leads to the exponential filter. That link is the strongest idea here and it is unused.
- Order: consider before `elec.dc`'s end is unneeded; the current position is fine.
- Misconceptions: derivative of a measured signal is clean; "area" must be geometric; forgetting the integration constant equals initial conditions.
- Reference: Strang, *Calculus* [R]; benchmark only if using an OCW-hosted copy.
- Task: derive V(t) for an RC with a nonzero initial voltage and step input; then discretise it and show it equals your filter.

**12. `elec.rc` - CHANGE.**
- Add decoupling (above), capacitor reality (ceramic DC-bias, ESR), and RC as switch-edge limit. Inductor stays L0 for first walk.
- Depth: keep. `rc-lowpass` to `bode-db` is a good spine.
- Misconceptions: current flows "through" a capacitor; τ is when it finishes; -3 dB is a brick wall; cutoff means no signal above it.
- Reference: LAoE ch. 2 [S](https://buscador.unsam.edu.ar/Record/62507/TOC?print=1).
- Task: identify R and C in a sealed filter from step and sweep measurements alone, with uncertainty.

**13. `elec.semi` - CHANGE.**
- Add GPIO electrical reality: source and sink limits, absolute maximum, 3.3 V vs 5 V. Add BJT saturation vs MOSFET Rds(on) losses, thermal resistance as a calculation.
- Ladder fixes:
  - `linear-regulator` says LDO, but L2 uses an L7805, which is not an LDO [R].
  - L2 s06 says confirm "3.3 V Rds(on) data". The IRLZ44N table stops at 4 V [S third-party datasheet copies](https://dtsheet.com/model/2082628). Teach reading the curve and measuring, or choose a part specified at 3.3 V. The 90 mA load itself is probably fine [inf].
- Misconceptions: "logic-level" means 3.3 V safe; threshold is the on-voltage; regulator input capacitor is optional.
- Reference: AoE ch. 2, 3, 9 [O ToC](https://artofelectronics.net/the-book/table-of-contents/).
- Task: choose and justify a 3.3 V-driven load switch from real datasheets for a 1 A inductive load, including dissipation, then predict bench Vds.

**14. `sw.fsm` - KEEP.**
- Add event queue vs polling, and explicit handling of "unexpected event in state". Function pointers are a low-priority split; keep them.
- White's book treats state-centric, event-centric and table-driven machines, so the content matches [S](https://www.oreilly.com/library/view/-/9781098151539).
- Misconceptions: nested flags are simple; `HAL_Delay` is harmless.
- Reference: Elecia White, *Making Embedded Systems*, 2nd ed. [S](https://www.oreilly.com/library/view/-/9781098151539).
- Task: add one new state to an unfamiliar FSM from a spec change, preserving hidden timing tests.

**15. `elec.opamp` - CHANGE (item 6).**
- Add input and output swing on single supply as the first real limit, and when not to use a comparator as an op-amp. Stability stays L0.
- `ideal-rules` assumption of feedback is already handled. Good.
- Misconceptions: inputs "draw no current so the node is free"; rail-to-rail is universal; gain is free.
- Reference: AoE ch. 4 [O ToC](https://artofelectronics.net/the-book/table-of-contents/).
- Task: design a single-supply stage mapping a sensor's real range onto 0-3 V, choose a real part, then build and measure the error budget.

**16. `sw.fw` - CHANGE, largest module at 8.7 h and the riskiest.**
- Add PWM, sampling, GDB. Add a ring buffer as a named skill: the ladder has it in seven lines, the graph only inside `moving-average` [Repo]. Add error-path handling, since I2C NACK recovery exists only briefly. Keep DMA, RTOS and low power out of the first walk.
- Debounce: a 20-50 ms window is the guide's pick; the worst switch measured was 157 ms on opening, and bounce pulses confuse ISRs [O PDF mirror](https://my.eng.utah.edu/~cs5780/debouncing.pdf). L4's capture step is excellent. Add "sample by timer vs edge-interrupt" as an explicit choice.
- Misconceptions: printf in an ISR; bigger filter is better; UART logging is free in timing; an I2C ACK means good data; ISRs must be fast because of "rules" rather than latency maths.
- Reference: White 2nd ed. [S]. Pair with the RP2350 datasheet.
- Task: no walkthrough, a fresh sensor datasheet, bring up a driver, recover from an unplugged bus, log at a fixed rate with jitter measured on the analyser, and prove no aliasing.

**17. `math.vec` - CHANGE (item 9).**
- Depth: currently 2×2 mechanics prep. Keep rank and span literacy, as a geometric view per 3Blue1Brown ch. 2-3 and 7 [S](https://notesbylex.com/essence-of-linear-algebra). Skip eigenvectors in first walk.
- Strang stays the deep follow-up [S](https://opencourser.com/book/zgsn7l/introduction-to-linear-algebra), Boyd the primary.
- Position: last is fine, unless least squares feeds calibration; then place it before `sensor-calibration` and add a whitelisted or hard edge.
- Misconceptions: matrix multiplication is entrywise; inverse is the way to solve; a best fit passes through points.
- Reference: Boyd and Vandenberghe, *VMLS* (free PDF, copyright Cambridge) [O](https://web.stanford.edu/~boyd/vmls/).
- Task: fit gain and offset to noisy calibration data by hand-derived normal equations in code, and report the residual-based uncertainty.

## Remove or downgrade

The six swaps above, plus K-maps as a required technique. Nothing else needs removing: orphan skills like `dimensional-analysis`, `estimation` and `definite-integrals` are habits or foundations, not waste.

## Repo defects found

- **Doc 05 vs YAML:** doc says 4060 min, 67.7 h, and `nodal-analysis` 55, `rc-lowpass` 50. YAML totals 4025 min, 67.1 h, with both at 40. The 35-minute gap equals all four claimed re-timings, so they appear never to have landed. The doc's quoted validator warnings also disagree with YAML.
- **Doc 05 §6.1 and §6.4** say 18 stubs; the §7 validator block says 158.
- **`graph=0` confirmed:** SPI, DMA, PWM, decoupling, UB, sanitisers, linker, floating point, fixed point, debugger.

## Depth honesty

EE16A alone runs roughly 14 h a week (3+2+3 class plus about 6 outside) [O](https://hkn.eecs.berkeley.edu/courseguides/EE/16A). MIT 6.2000 is listed 3-2-7 [S](https://student.mit.edu/catalog/m6b.html). T0's 160-300 h is therefore about one to two such courses [inf], across far wider content. T0 L1 can mean "working on this path", never course equivalence. Keep doc 05's unvalidated-hours caution.

## Could not check

- **MIT:** current 6.1910 and 6.2000 syllabi. The catalog page failed TLS; only snippets were seen. The 6.004 syllabus PDF would not load, so I used the Computation Structures site instead.
- **Berkeley:** current EE16A and EE16B sites redirect to login. HKN guides and snippets only. The car lab is unconfirmed.
- **Stanford:** EE 102A and EE 108 topics not found. ENGR 40M syllabus opened but its project details sit behind Canvas.
- **ETH:** only secondary summaries. **TUM:** nothing read.
- **Books not read:** CS:APP site failed TLS, so labs come from student repos. Making Embedded Systems ToC (O'Reilly 403) is partial. AoE X-Chapters ToC, LAoE full ToC, and Strang contents not seen.
- **Standards not read:** MISRA text (vendors only), current BARR-C (old mirror only), and Bosch and Infineon primary datasheets. CERT INT13 and INT34 not retrieved. L7805 dropout is recalled.
- **Not timed:** I did not stopwatch tasks or validate any hours. References marked [R] are unverified, including current editions and licences. Run the validators before applying any graph edit.

---

## T2 Control and estimation review (read-only; no project files edited)

**Verdict.** The topic list is sound and the guide's formulas are correct. Four things keep it below world-class:
- There is no stability theory beyond margins: no Nyquist criterion, no sensitivity functions, no state space, no linearisation.
- Time budgets are implausible.
- The assessment mostly tests recognition rather than building.
- The preferred rig cannot exercise most of what the module teaches.

Labels: **[read]** = opened, directly or through a fetch summary. **[snip]** = search snippet only. **[calc]** = my own derivation or numeric check. **[recall]** = my memory, not checked. Hour figures are my judgement.

## Top 15 recommendations, ranked by impact

1. **Add loop-analysis skills in `ctl.sys`:** frequency response and Bode, Nyquist criterion, and S, T and Ms. The syllabus teaches phase margin with no Nyquist or sensitivity. Feedback Systems (FBS) has these in chapters 10 and 12 [read](https://www.cds.caltech.edu/~murray/books/AM08/pdf/fbs-public_24Jul2020.pdf). Also add the confusable `nyquist-sampling-vs-nyquist-stability`.
2. **Add a second-order, propless cascade rig step.** A motor speed loop is close to first order, so it cannot exercise cascade, D action or the IMU. Add a geared motor plus an arm or flywheel, with an inner rate loop, an outer angle loop, and the IMU on the arm. This matches "rate vs angle" without a propeller. Keep the prop beam optional. The safety brief needs a matching revision.
3. **Add linearisation at an operating point, and model validation on held-out data.** Neither exists now. The rig's gravity torque, thrust curve, dead zone and stiction all need them.
4. **Replace MC-only PID skills with a code-tested discrete controller.** `ctl.pid.pid-controller` and `cascade-intuition` are MC only, and no skill runs `code_tests` on a PID. Require the derivative filter, derivative on measurement, anti-windup, bumpless enable and a fixed-step loop. FBS gives N of 5–20 for the derivative filter [read](https://www.cds.caltech.edu/~murray/books/AM08/pdf/fbs-public_24Jul2020.pdf). `ctl.sys` promises "unaided derivation" but its graders are numeric and MC, so make that consistent too.
5. **Add model-based tuning with SIMC before manual tuning.** Rules: Kc = (1/k)·τ1/(τc+θ), τI = min[τ1, 4(τc+θ)], with τc = θ as the tight setting ([snip](https://skoge.folk.ntnu.no/publications/2006/skogestad_iecr_smooth-pid/readme.txt), [slides, partly read](https://skoge.folk.ntnu.no/prosessregulering/lectures/2024/SiS6SIMC_tuning.pdf)). This turns "predict first" into a procedure. My check on an integrating-plus-delay plant gives Ms 1.70, GM 2.96, PM 46.9 degrees [calc], matching Skogestad's reported Ms of about 1.7 and GM of about 3 [snip](https://skoge.folk.ntnu.no/publications/2003/tuningPID/README.html.folkmigration).
6. **Add feedforward and gain scheduling.** Neither is in the syllabus, yet the guide itself explains the varying gain across throttle. FBS 12 covers feedforward design [read](https://www.cds.caltech.edu/~murray/books/AM08/pdf/fbs-public_24Jul2020.pdf). Gravity feedforward on the arm is the ideal first exercise.
7. **Make discrete implementation and delay accounting explicit.** Teach the delay budget: ZOH of about T/2 [snip](https://www.slideshare.net/slideshow/ece4510-notes10/77879418), plus compute, filter and actuator delay, with sampling at 10–20 times bandwidth or more [snip, weak sources]. Add `ctl.pid.delay-budget` and measure it on the rig.
8. **Move from "1-D Kalman plus EKF literacy" to a two-state angle-and-bias filter,** plus Q/R tuning and normalised innovation (NIS). PX4 reports innovation test ratios, with rejection above 1.0 and healthy values below about 0.5 [read](https://docs.px4.io/main/en/advanced_config/tuning_the_ecl_ekf.html). Teach Higgins's result that the complementary filter is a steady-state Kalman filter for a class of problems [read](https://allaboutcircuits.com/uploads/articles/A_comparison_of_complementary_and_kalman_filtering.pdf).
9. **Fix the sampling outcome.** "Above Nyquist for the band of interest" is wrong as written. The rate must exceed twice the highest frequency present after the anti-alias chain, not twice the band of interest [calc; consistent with the guide's own text].
10. **Add bias handling to the complementary filter.** A constant gyro bias b gives a steady error of bτ [calc]. An integral correction fixes it, as in the Mahony style of PI correction [snip](https://centaur.reading.ac.uk/83915/1/1-s2.0-S0888327019303012-main%20%281%29.pdf).
11. **Upgrade calibration.** "Two-reference" omits misalignment and temperature. Use multi-position static calibration plus known-rotation gyro scale ([Tedaldi method, snip](https://iris.uniroma1.it/handle/11573/794826); [12 orientations follow-up, snip](https://arxiv.org/abs/2207.04801v1)). Woodman notes that bias against temperature is often highly nonlinear for MEMS [read](https://www.cl.cam.ac.uk/techreports/UCAM-CL-TR-696.pdf).
12. **Rebudget.** Actual total is 995 min, or 16.6 h (the table says 16.7, a rounding artefact). `ctl.sys` gives ODEs, Laplace, poles and z-domain 150 minutes. MIT 16.30 alone runs 25 lectures and assumes classical root-locus and Bode knowledge [read](https://ocw.mit.edu/courses/16-30-feedback-control-systems-fall-2010/pages/syllabus/). I suggest `ctl.sys` at about 10–14 h of contact. The syllabus band of 80–130 h also conflicts with the guide's 50–90 h, so reconcile them.
13. **Add a lever-arm and specific-force exercise on the rig.** An off-axis IMU reads f = a + α×r + ω×(ω×r), so tilt from the accelerometer fails in motion [calc]. See item 4 of the guide corrections below.
14. **Create a separate advanced stage** at tier L2 (see below).
15. **Add Euler rigid-body equations.** The guide promises gyroscopic cross-coupling, but `phys.mech` stops at "literacy" with no ω×Iω skill.

## Module review

### `ctl.sys` — change, expand most
- **Keep:** ODEs, poles, Laplace, z-domain.
- **Add:** linearisation, Bode by hand, Nyquist, S/T, state-space form, ZOH discretisation, stable/unstable mapping s to z, and effects of RHP zeros and delay. Root locus is optional.
- **Order:** the table is alphabetical, with discrete-time first. Teach ODE, Laplace, poles, frequency response, Nyquist and S/T, then discrete. There is no eigenvalue prerequisite in `math.vec` (it ends at rotation matrices), and eigenvalues are taught here in 35 minutes.
- **Misconceptions:** Stable open loop means safe closed loop. Poles alone determine the response, ignoring zeros. Bandwidth is a rise-time fact, unrelated to delay. Laplace "is" Fourier.
- **Reference:** Åström and Murray, FBS 2nd ed., electronic edition [read](https://www.cds.caltech.edu/~murray/books/AM08/pdf/fbs-public_24Jul2020.pdf). It is marked personal use only, so link it and never copy. [Oppenheim and Willsky is recall only.]
- **Hard task:** Given L(s) with an unstable pole and a delay, sketch Nyquist unaided, count encirclements, then find the maximum delay before instability. Check the answer by simulation.

### `phys.mech` — change
- **Add:** Euler's equations, gravity torque on a pivot, motor torque and inertia referred through a gearbox.
- **Misconceptions:** A body-frame force law has no ω×v term. Heavier always means slower to control.
- **Reference:** FBS chapters 3–4 cover modelling [TOC read]. A dedicated rigid-body text was not checked.
- **Hard task:** Derive the arm's nonlinear model, linearise at 0 and 30 degrees, and predict how the natural frequency differs. Measure it.

### `sig.freq` — keep, small changes
- **Add:** windowing and leakage, spectrogram, group delay of notches and low-pass filters, and the cost of filters in phase. Betaflight's own notes frame filtering as a delay trade-off, and raising cutoffs twofold halves low-pass delay [read](https://betaflight.com/docs/wiki/tuning/4-1-Tuning-Notes).
- **Order:** teach this after, or alongside, Bode in `ctl.sys`.
- **Depth:** `notch-rpm` needs an RPM-tagged source. Before L8 use the L6 bench or supplied logs, so ground-only holds.
- **Misconceptions:** Biggest FFT peak equals the problem. A notch is "free". Lower cutoff is always cleaner.
- **Reference:** Betaflight tuning notes for practice; Oppenheim and Willsky for theory [recall].
- **Hard task:** Given an unlabelled bench log and blade count, identify the fundamental, blade-pass, harmonics and one aliased tone. Then design a filter stack and state the phase lag it adds at crossover.

### `sig.sampling` — change
- **Fix:** the outcome in recommendation 9. The confusable `nyquist-vs-shannon-full` is not the real one; see recommendation 1.
- **Add:** on-chip decimation chains, clipping, and vibration rectification to DC. Clipping is not recoverable. [Rectification is recall.]
- **Misconceptions:** A digital low-pass fixes aliasing. Sampling at 2.1 times the band of interest is fine. ODR equals usable bandwidth.
- **Reference:** Oppenheim and Willsky [recall]; a sensor datasheet for the actual chain.
- **Hard task:** Given a sensor filter chain and a vibration spectrum, predict the alias frequencies, then confirm with an experiment at two ODRs.

### `sig.imu` — change
- **Keep:** frames, Allan variance, specific force.
- **Expand `quaternions` (40 min):** Hamilton against JPL, q and −q, normalisation, integration from gyro, and composition order. Solà warns that quaternion definitions differ [abstract read](https://arxiv.org/abs/1711.02508), [snip](https://ar5iv.labs.arxiv.org/html/1711.02508). Solà is CC BY-NC-SA, so link only.
- **Allan depth:** Woodman used a 12-hour stationary log at 100 Hz [read](https://www.cl.cam.ac.uk/techreports/UCAM-CL-TR-696.pdf), which does not fit a 35-minute skill. Treat it as an overnight project step. Temperature will contaminate it. Add rate random walk, quantisation and rate ramp slopes [snip](https://arxiv.org/pdf/2202.09360.pdf).
- **Grader trap:** Woodman reads bias instability as the curve minimum. A vendor manual reports minimum/0.664 under the IEEE 952 convention [snip](https://docs.inertialsense.com/user-manual/imx/performance/allan_deviation/). Fix one convention in the verifier.
- **Misconceptions:** The accelerometer measures gravity or tilt. Calibration fixes drift. A bias is constant after power-up. Roll, pitch and yaw rates equal gyro axes.
- **Reference:** Woodman for noise; Solà for quaternions; Barfoot for depth (paid; [TOC snip](https://assets.cambridge.org/97810092/99893/toc/9781009299893_toc.pdf)).
- **Hard task:** From a raw overnight log and six-face data, produce ARW, bias instability, a calibration matrix and residuals. Predict heading-free tilt drift at 60 s, then measure it.

### `ctl.pid` — change
- **Add:** SIMC, feedforward, setpoint weighting, code-tested discrete PID, the delay budget, stiction limit cycles, and rate limits. Anti-windup should cover clamping and back-calculation with a tracking time constant. Modelica's documentation follows Åström and Hägglund here [snip](https://build.openmodelica.org/Documentation/Modelica.Blocks.Continuous.LimPID.html).
- **Add a logged frequency-response step** with a safe, bounded chirp. ArduPilot's System ID mode shows the practice [snip](https://ardupilot.org/copter/docs/common-systemid-mode.html). PX4 autotune does recursive identification [snip](https://github.com/PX4/PX4-Autopilot/files/7252179/MathieuBresciani_Controllers_auto-tuning_for_multirotors_and_fixed-wing_vehicles.pdf).
- **Order:** identify, predict, tune analytically, then adjust. Today `margins-delay` and `plant-identification` are listed after `closed-loop-rig` by alphabet. Make the sequence explicit.
- **Depth:** `closed-loop-rig` at 60 minutes is far too short; it is a project step.
- **Misconceptions:** Ziegler-Nichols-style oscillation is a good target. More D always damps. I fixes everything. Closed-loop identification is equivalent to open-loop. Cascade works for any rate ratio.
- **Reference:** Åström and Hägglund, *Advanced PID Control* [not opened; Modelica cites the earlier *PID Controllers*], with Skogestad 2003 as the free companion. Brian Douglas's "Understanding PID Control" is a good first explanation [snip](https://it.mathworks.com/videos/understanding-pid-control-part-7-important-pid-concepts-1533639185431.html), not a reference.
- **Hard task:** On a held-out rig configuration, with extra mass or added delay, fit a model from one step and write predicted overshoot, settling time, PM and saturated recovery before running it. Then pass within stated bands, with a disturbance test and a saturation test. No assistant, no retuning before prediction is locked.

### `ctl.est` — change
- **Add:** two-state Kalman with bias, Q/R as tuning, NIS and whiteness of innovations, Madgwick and Mahony as named methods, and delayed-measurement handling at literacy depth. PX4's fusion time horizon is the example [read](https://docs.px4.io/main/en/advanced_config/tuning_the_ecl_ekf.html). Madgwick's report gives parameters and low-rate performance [snip](https://courses.cs.washington.edu/courses/cse466/14au/labs/l4/madgwick_internal_report.pdf).
- **Order:** drift, then complementary, then 1-D Kalman, then two-state, then innovation checks, then EKF literacy.
- **Misconceptions:** Kalman is optimal in practice regardless of model. A smaller innovation means a better filter (it may be overfitting or an inflated R). Complementary and Kalman are unrelated. An EKF needs no consistency check. The covariance is the true error.
- **Reference:** Simon, *Optimal State Estimation* [recall, not opened]. *Probabilistic Robotics* is secondary and more localisation-focused [recall]. ETH Recursive Estimation is a benchmark: probability, Bayes, KF, EKF, particle filter [2010 fact sheet, snip](https://www.dynsyslab.org/archive/RecEst2010/www.idsc.ethz.ch/Courses/Archives/Recursive_Estimation/recursive_filtering_2010/factsSheet.pdf).
- **Hard task:** Implement a two-state filter blind on a log with an injected bias step and an accelerometer fault window. Show NIS consistency, detect the fault by innovation, and beat a reference RMS, all against an encoder truth signal.

## Distinct advanced stage: yes, as tier L2

The contract already has L2 and L3, and no project grants L2 or L3 (`docs/00-contract.md` line 130). So the assessment must be unaided items, code tests and held-out logs. Any new module keys go through the founder under CLAUDE.md section 12.

**Proposed module `ctl.adv` [P], roughly 40–60 h [my estimate]:**
1. State feedback and observers; separation; controllability and observability.
2. LQR and LQG, including LQR's phase margin of at least 60 degrees and the loss of those guarantees with an observer [FBS exercise read; Doyle's LQG result is recall].
3. System identification: ARX, frequency-domain methods, validation. Tedrake chapter 18 [TOC read](https://underactuated.csail.mit.edu/).
4. Robustness: multiplicative uncertainty, Bode's integral and the waterbed. FBS 13–14 [read]; Stein's "Respect the Unstable" [snip](https://ieeecss.org/node/15221); 6.241 for depth [snip](https://ocw.mit.edu/courses/6-241j-dynamic-systems-and-control-spring-2011/pages/syllabus/).
5. Error-state filter on quaternions (Solà).
6. MPC with constraints. Rawlings, Mayne and Diehl has free PDFs [read](https://sites.engineering.ucsb.edu/~jbraw/mpc/), Borrelli has one too [read](https://sites.google.com/berkeley.edu/mpc-lab/mpc-course-material). Neither states reuse terms. ETH DPOC for the DP angle [old fact sheets, snip](https://www.dynsyslab.org/archive/OptCont2008/www.idsc.ethz.ch/Courses/Archives/Optimal_Control/optimal_control_2008/factsSheet.pdf).

**Boundary.** All exercises use the fixed ground rig or simulation of that rig, with commanded setpoints only. Exclude seekers, target tracking, pursuit or proportional navigation, intercept, terminal guidance and moving-target estimators. State this in the syllabus Boundaries section, which today covers only ground and clamp rules.

**Capstone task.** Identify the rig, design LQG and constrained MPC at a fixed sample rate, predict the robustness margin, and show which fails first under added delay and saturated input.

## Guide corrections (T2 section)

| # | Claim | Verdict |
|---|---|---|
| 1 | α = τ/(τ+dt) | **Correct.** It is exact for backward Euler [calc]. The e^(−dt/τ) form is nearly identical: 0.98020 against 0.98039 at 10 ms and 0.5 s [calc]. |
| 2 | "Gains add to 1" | **Imprecise.** The complex transfer functions sum to 1. Magnitudes do not: each is 0.707 at crossover, summing to 1.41 [calc]. |
| 3 | Delay lag 360·f·τ | **Correct.** But τ is also used for the time constant in the same section; use θ. "Delay decides everything" overclaims: FBS also limits on RHP zeros and poles and nonlinearity. Its delay limit is ωgc·τ ≤ φ allowed, in radians [read]. |
| 4 | PM 45–60 degrees | **Acceptable, incomplete.** FBS gives PM 30–60, GM 2–5, stability margin 0.5–0.8 [read], so Ms about 1.25–2 [calc]. Add Ms. Ringing with small PM holds for dominant second-order loops only. |
| 5 | Specific force | **Physically correct.** Tighten to: non-gravitational force per unit mass. "Reads thrust" means thrust/mass. Free fall zero ignores drag. Sign depends on axis. Add: in flight the accelerometer does not give tilt directly, and Leishman et al. show a rotor-drag model explains quadrotor accelerometers [abstract read](https://scholarsarchive.byu.edu/facpub/1419). |
| 6 | "Every real attitude stack uses quaternions" | **Overclaim.** ArduPilot runs DCM in the background [snip](https://ardupilot.org/plane/docs/common-apm-navigation-extended-kalman-filter-overview.html). Say "most". |
| 7 | Allan variance separates white noise from bias instability | **True, incomplete.** See `sig.imu` above. |
| 8 | Kalman "sets the blend automatically" | **Only given correct Q/R and models.** |
| 9 | "No later digital filter can remove" aliases | **Right for teaching.** A known narrow tone can be notched at its folded frequency, also removing real signal there [calc]. |

The thrust/RPM-squared gain, blade-pass, derivative kick and aliasing claims are fine. Inner loop faster "by about 5" is a rule of thumb that I could not source.

## Safety brief (`prj.L7`)

It is sound for ground work. Gaps:
- Require a zero integrator and a ramp on enable.
- Add a check that a hard-stop contact cannot cause windup and a lunge.
- Add flywheel or arm retention if recommendation 2 is adopted.

L7 ladder summary and `tier_gate: L1` are consistent with the syllabus. `est_hours` is null.

## What I could not check

- **Books not opened:** Franklin Powell Emami-Naeini, Simon, Thrun, Oppenheim and Willsky, Åström and Hägglund, Barfoot's text (TOC only).
- **Standards:** IEEE 952 itself; its content here comes from secondary sources. The Allan-record confidence formula could not be confirmed.
- **Courses:** MIT 6.302 returned nothing. Current ETH syllabi were not found, only 2008–2012 archives. 6.241 was snippet level.
- **Papers:** the Mahony paper directly; Madgwick and Tedaldi full text; the Leishman full text.
- **FBS:** the wiki returned HTTP 500. I read the July 2020 public draft, whose chapter numbers may differ from print.
- **Licences:** Tedrake shows only a copyright notice and no licence on the page. MIT OCW is CC BY-NC-SA, benchmark only, and project rule 12.8 forbids non-commercial content in the app. Solà is also non-commercial.
- **Project:** I did not read `spine-module-plan.yaml` or the skill graph edges. My `math` check was limited to the first 50 keys.

---

## Polymath T1, T3 and T4 syllabi review against published standards

No project files were edited.

**Evidence tags**
- **[O]** = I opened the page or document.
- **[S]** = search snippet only.
- **[J]** = my engineering judgement, no source checked.

Textbook claims rest on tables of contents or snippets unless tagged [O]. MIT OCW was benchmarked only, so nothing here should be copied from it.

## Verdict

**Keep:** the predict-then-measure design of L6, L7 and L9, and the strict-unaided checkpoints. These are the strongest part of the plan.

**Weak spots:**
- **T1** teaches ESC use and contains no power electronics.
- **T3** teaches hand structures, but has no drawings, materials selection or composites.
- **T4** is a safety checklist. Its "physics" module contains no physics, and it has no flight-test method and no piloting skill.
- **L8 legal path:** the default "kit quad" may be unusable in the Open category.

**Depth gap:** the module sums are far below each syllabus's own planning band. The band includes projects and rework, but 30 minutes for fatigue is not credible.

| Track | Module sum | Planning band |
|---|---|---|
| T1 | 13.6 h | 40–80 h |
| T3 | 10.6 h | 50–90 h |
| T4 | 11.8 h | 60–120 h |

## Top 15 recommendations, by impact

1. **Fix the L8 legal path before any kit is bought.**
   - EASA says "privately built" does not cover UAS assembled from a single ready-to-assemble kit, and Open category drones need a class mark, private-build status, or pre-2024 market placement ([EASA, O](https://www.easa.europa.eu/en/domains/drones-air-mobility/operating-drone/open-category-low-risk-civil-drones); definition in [Reg 2019/945, S](https://eur-lex.europa.eu/eli/reg_del/2019/945)).
   - Change L8 to "self-specified parts, privately built", or to a class-marked product. Under 25 kg, that path means A3: 150 m from uninvolved people and urban areas, plus A1/A3 training and registration (same EASA page).
   - Have the founder confirm the reading with the LBA, then move `robo.uav.ops-eu` ahead of the Phase D purchase.
   - A club route may exist; I did not check it.

2. **Add a `pwr.conv` module to T1 before `pwr.bldc.esc`, about 6–8 h.**
   - Content: volt-second and charge balance, buck and half-bridge, MOSFET conduction and switching loss, dead time, gate drive, DC-link ripple, basic inductor.
   - Benchmarks: Erickson chapters 2–4 and 10–11 ([contents, S](https://www.springerprofessional.de/en/fundamentals-of-power-electronics/18182664)); [MIT 6.334, O](https://ocw.mit.edu/courses/6-334-power-electronics-spring-2007/pages/syllabus/) covers converters, magnetics and devices; MIT's lab also includes [three-phase inverters, S](https://stuff.mit.edu/afs/sipb/project/course-search/web_scripts/search/urls-sp21/cat/6.330.html).
   - Add a current-limited, low-voltage synchronous buck lab with predicted efficiency.

3. **Commit to one flight stack and specify an H7 flight controller.**
   - Remove Betaflight from the T4 outcomes. Pick PX4 or ArduPilot in an ADR, including licence implications (from memory PX4 is BSD and ArduPilot GPLv3; I did not verify this).
   - ArduPilot prefers raw IMU logging on H7 boards from 4.5 ([O](https://ardupilot.org/copter/docs/common-imu-notch-filtering.html)). PX4 BDShot needs H7 or i.MXRT ([O](https://docs.px4.io/main/en/peripherals/dshot.html)). 1 MB boards get reduced ArduPilot builds ([S](https://ardupilot.org/rover/docs/common-limited-firmware.html)).
   - Doc 17 currently says "F4/F7".

4. **Add a `robo.uav.flight-test` module and a piloting skill.**
   - Include test cards, hazard analysis, build-up from ground to flight, one change at a time, abort criteria, and stop rules.
   - Benchmarks: [NATO STO, S](https://www.sto.nato.int/publications/STO%20Meeting%20Proceedings/STO-MP-SCI-328/MP-SCI-328-13P.pdf); [Flight Test Safety fact sheet, S](https://flighttestsafety.org/images/Flight_Test_Safety_Fact_21-01edit.pdf); [ScanEagle lessons, S](https://flighttestsafety.setp.org/images/stories/workshop/2009Apr/Swartz.pdf).
   - Nothing in T4 teaches manual flying, yet failsafe recovery depends on it. PX4 advises bringing an experienced person and fitting an emergency switch ([O](https://docs.px4.io/main/en/flying/first_flight_guidelines.html)).
   - Require logged simulator hours and a manual-recovery check before the maiden.

5. **Stop self-certification.**
   - `human_review` by a solo founder is self-review, and an "ack" proves reading, not competence.
   - For high-current steps, the maiden and L12, require an external reviewer or a pre-registered prediction with a fixed pass tolerance.
   - Replace `rubric_llm` on preflight and props-off items with `human_review`. CLAUDE.md rule 4 makes rubric grades ineligible for mastery until calibrated anyway.

6. **Fix the L6 measurement rig.** Doc 17 contradicts the competence artifact:
   - "Prop removed" gives no load and no thrust; use a guarded enclosure instead.
   - The "load proxy" path applies no load.
   - Add reaction-torque measurement. Grams per watt cannot separate motor from prop losses, whereas [UIUC data, S](https://m-selig.ae.illinois.edu/props/propDB.html) comes from torque and RPM.
   - The current clamp must be DC-capable [J].
   - A bench supply generally cannot sink regen ([forum case for one ESC, S](https://forum.modalai.com/post/25385)), so add current-limit, bulk-capacitance and throttle-slew rules.
   - Teach earthed-scope hazards on floating or switching nodes, and budget a differential or current probe [J].

7. **Replace `robo.uav.physics` with real physics.**
   - Add thrust and torque coefficients, momentum theory, figure of merit, mixer and allocation, yaw authority, saturation, and rotor drag.
   - Add ground effect and descent limits; vortex ring onset is around half induced velocity ([report, S](https://arxiv.org/pdf/1601.00733)).
   - Move compatibility matrices to the propulsion module.

8. **Build one vibration thread across T3, T2 and T4.**
   - Chain: rotor harmonics, then structural mode, then IMU, then filter delay, then phase margin.
   - PX4 forbids fixing high vibration with filters and notes soft mounts add latency. It gives about 8 ms delay at 30 Hz gyro cutoff ([O](https://docs.px4.io/main/en/config_mc/filter_tuning.html)).
   - ArduPilot gives vibration and clipping limits ([O](https://ardupilot.org/copter/docs/common-measuring-vibration.html)).
   - The L9 evidence should compare a frame mode with a flight FFT, not only a tap test.

9. **Fix prerequisite inversions.**
   - T1: wiring and connector skills come before any energising. EMC and current sensing come before trusting data. `sw.rel.brownout` comes after a motor exists.
   - T4: `robo.uav.sitl-first`, `robo.uav.preflight` and basic log analysis are L8 terminal skills but sit in module 7. Move them before the maiden.

10. **Raise depth only where failure is expensive.**
    - Fatigue, bolted joints, beam design, log analysis, failsafes and motor modelling should each be numeric and take 90–120 minutes in total.
    - Add an L2 tier for these. Do not inflate everything.
    - [MIT 2.007, O](https://ocw.mit.edu/courses/2-007-design-and-manufacturing-i-spring-2009/pages/syllabus/) runs about 12 h a week and gives labs 50% of the grade.

11. **Add `mech.draw`: drawings, datums, fits and stacks.**
    - T3 has no engineering drawings at all, yet [2.007, O](https://ocw.mit.edu/courses/2-007-design-and-manufacturing-i-spring-2009/pages/syllabus/) requires reading and creating them.
    - For a Germany-based learner, teach ISO GPS as the default and ASME Y14.5 as the confusable. The two differ on default principles ([summary, S](https://knowt.com/note/27d0c404-c3fa-4653-9a4e-3d7f71a4385a/Functional-Equivalence-of-ISO-GPS-and-AS)).
    - Add worst-case and RSS stacks. I did not check the standards themselves.

12. **Add `matl.select`, covering Ashby and real frame materials.**
    - Derive indices from function, objective, constraint and free variable ([Ashby and Cebon, S](https://hal.archives-ouvertes.fr/jpa-00251707/file/ajp-jp4199303C701.pdf)).
    - Add CFRP plate behaviour, FDM anisotropy, heat limits and creep.
    - FDM X-versus-Z strength gaps of 25–128% were reported in [one study, S](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9230522/); check the figures before use.
    - I found no creep or Tg source. Treat that part as [J].

13. **Rebuild batteries around the pack actually purchased.**
    - Doc 17 notes hobby LiPos have no BMS, yet `pwr.batt.li-ion-safe` promises BMS interpretation.
    - Teach OCV, R0 and RC equivalent circuit, sag, cutoff, and pack imbalance ([Plett contents, S](https://libexplorer.upnm.edu.my/home/Record/98508/TOC)).
    - Keep BMS as a short protected-pack skill.

14. **Reframe EMC around current loops, and move `elec.pcb` to T1.**
    - Star ground is not a universal answer. Low-frequency returns follow resistance; high-frequency returns stay adjacent to the signal ([Bogatin, S](https://www.signalintegrityjournal.com/blogs/4-eric-bogatin-signal-integrity-journal-editor/post/502-ground-rules-for-grounding)).
    - Add DC-link loop inductance and spikes ([S](https://chargedevs.com/features/a-closer-look-at-the-dc-link)).
    - High-current layout does not belong in Mechanical, and L10 currently has no real owner.

15. **Add regional RF rules, SORA literacy and doc 17 corrections.**
    - 915 MHz is the wrong default in the EU; ArduPilot lists 433 MHz limits for Europe ([S](https://ardupilot.org/copter/docs/common-telemetry-radio-regional-regulations.html)).
    - Add one Specific-category and SORA scenario skill. EASA ties SORA to Article 11 for operations not covered by a standard scenario or PDRA ([O](https://www.easa.europa.eu/en/domains/drones-air-mobility/operating-drone/specific-category-civil-drones/specific-operations-risk-assessment-sora)).
    - Version 2.5 adoption is only [snippet-supported, S](https://wingman360.ai/insights/sora-2-5-with-ai-the-ten-steps-and-the-uas-operations-manual).

## What to remove or cut back

- Betaflight as a T4 target. Teach it as a confusable only.
- `robo.uav.esc-calibration-quad` as a default skill. DShot needs no calibration ([PX4, O](https://docs.px4.io/main/en/peripherals/dshot.html)). Keep a PWM-only note.
- `px4-vs-ardupilot-params` once a stack is chosen.
- `pwr.batt.cell-formats` as titled, because it mixes cell size with chemistry and packaging. Replace it with cell format versus chemistry.
- `pwr.bldc.current-sensing-foc` as a single "literacy" skill. Split it (see the `pwr.bldc.esc` module below).
- BMS as a main outcome for the LiPo path.
- The word "calibration" attached to DShot throttle in `pwr.bldc.esc-modes`.
- "Every failsafe" in `robo.uav.fault-injection` as an in-flight requirement. Run the full set in SITL, then fly a short approved subset.
- Star ground as the headline of `pwr.emc.grounding-harness`.
- Ondsel from doc 17. It [shut down, S](https://hackaday.com/2024/11/12/the-end-of-ondsel-and-reflecting-on-the-commercial-prospects-for-freecad).

## T1 Power & motion

### `elec.semi.battery-spine`: Keep, change
- **Missing:** usable capacity versus label, derating with age and cold, fuse sizing against fault current, pre-charge or anti-spark [J].
- **Order or depth:** keep it first, but move connector and wire sizing here from EMC.
- **Misconceptions:** C-rating on the label is a true continuous rating. Series and parallel are interchangeable.
- **Reference:** Plett, BMS Vol 1 chapters 1–2.
- **Assessment:** from a datasheet and a duty profile, choose S/P, fuse and wire, then predict endurance within 10% of a logged run.

### `pwr.batt.li-ion-safe`: Change
- **Missing:** DCIR measurement, equivalent-circuit sag, cell imbalance, cutoff under load, abuse-free stop criteria.
- **Order or depth:** merge `pwr.batt.high-discharge-packs` into the core. BMS becomes an optional branch.
- **Misconceptions:** LiPo packs have a BMS. Voltage equals state of charge under load. A cool pack is a healthy pack.
- **Reference:** Plett Vol 1. Vol 2 for later BMS work ([S](https://us.artechhouse.com/mobile/Battery-Management-Systems-Volume-II-Equivalent-Circuit-Methods-P1775.aspx)).
- **Assessment:** fit R0 and one RC pair from pulse data, then predict sag for an unseen pulse within 5%.

### `pwr.conv` (new): Add
- **Missing today:** the whole topic (recommendation 2).
- **Order or depth:** place it before BLDC. Keep magnetics to one inductor design.
- **Misconceptions:** PWM duty sets current directly. MOSFET loss is only I²R. Input current equals output current.
- **Reference:** Erickson and Maksimovic, Fundamentals of Power Electronics.
- **Assessment:** closed-book, design a buck for a given ripple, predict loss split, then measure efficiency within 3 points.

### `phys.thermal`: Keep, change
- **Missing:** thermal capacitance and time constants, burst ratings, winding temperature via resistance rise [J], copper's temperature coefficient.
- **Order or depth:** `heat-transfer` is multiple choice only, yet the outcome is numeric. Add numeric items.
- **Misconceptions:** an IR thermometer reads junction or winding temperature. RθJA from a datasheet applies to your board.
- **Reference:** Erickson chapter 3 for losses, then vendor thermal notes. No single definitive source found.
- **Assessment:** predict the temperature-time curve of an ESC or motor under a step load, then match it within 10 °C.

### `sw.rel`: Keep, move
- **Missing:** none material at this level. Add ESC or link-loss safe state [J].
- **Order or depth:** teach reset causes and the watchdog early. Do `brownout` after the motor bench.
- **Misconceptions:** a watchdog proves health. A brown-out always resets cleanly.
- **Reference:** I checked no external source. Use the MCU reference manual.
- **Assessment:** an outsider injects a hidden hang or brown-out, and you find the cause from logs alone.

### `pwr.bldc.esc`: Change
- **Missing:** phase versus battery current, dq frame, Rs/Ls/flux ID, deadband and timing, demag, motor torque constant, torque measurement.
- **Evidence:** battery current is chopped phase current ([S](https://chargedevs.com/features/a-closer-look-at-the-dc-link)). TI's guide has explicit Rs, Ls and flux identification parameters ([contents, O](https://www.ti.com/document-viewer/lit/html/SPRUHJ1)). Krishnan covers dq, weakening and dead time ([S](https://www.routledge.com/Permanent-Magnet-Synchronous-and-Brushless-DC-Motor-Drives/Krishnan/p/book/9780824753849)).
- **Order or depth:** split into BLDC bench (T1) and an FOC lab after T2, on a VESC-class or eval board. Full field weakening stays out.
- **Misconceptions:** Kv and Kt are unrelated. Battery amps equal phase amps. ESC input PWM is the inverter PWM.
- **Reference:** Krishnan for theory. TI SPRUHJ1 for practice.
- **Assessment:** given an unlabelled motor, measure R, Kv and I0, then predict current and RPM on a stated prop within 10% before first spin.

### `pwr.emc.practical`: Change
- **Missing:** loop area, common-mode paths, DC-link inductance, spikes, probe pickup checks, magnetometer coupling to power wires.
- **Order or depth:** place it before the current-sense amp. Rename connector skills out of EMC.
- **Misconceptions:** star ground fixes everything. Ferrites work at every frequency. A noisy scope trace is always real.
- **Reference:** Ott, Electromagnetic Compatibility Engineering ([S](https://typeset.io/pdf/electromagnetic-compatibility-engineering-ott-577ftbxe2w.pdf)).
- **Assessment:** diagnose a seeded noise fault, prove measurement validity with a shorted-probe test, then show a before-and-after reduction.

## T3 Mechanical

### `mech.cad`: Keep, change
- **Missing:** design intent, parameter tables, robust references, revision control.
- **Order or depth:** fine as is. Note FreeCAD 1.0 reportedly improved topological naming ([forum, S](https://hackaday.com/2024/11/12/the-end-of-ondsel-and-reflecting-on-the-commercial-prospects-for-freecad)).
- **Misconceptions:** fully constrained equals well designed. STL is a design file.
- **Reference:** the chosen tool's official docs.
- **Assessment:** from a drawing, model a part in 60 minutes, then change three driving parameters with no rebuild failures.

### `mech.cad.assemblies`: Keep, change
- **Missing:** inertia tensor export, harness and battery clearance, service access, CG checked by measurement.
- **Order or depth:** add inertia, since T2 and T4 can use it.
- **Misconceptions:** CAD mass matches reality without wires, glue or screws.
- **Reference:** the chosen tool's docs.
- **Assessment:** predict mass within 5% and CG within 3 mm, then measure both on the real vehicle.

### `mech.draw` (new): Add
- **Missing today:** the whole topic (recommendation 11).
- **Order or depth:** place it before `mech.tol`.
- **Misconceptions:** CAD nominal is the specification. ISO and ASME symbols mean the same defaults.
- **Reference:** ISO 1101 for the EU default, ASME Y14.5 as the comparison.
- **Assessment:** write a drawing for a motor mount that an outside shop could inspect, with datums tied to function.

### `matl.select` (new): Add
- **Missing today:** the whole topic (recommendation 12).
- **Order or depth:** place it before `mech.struct` sizing decisions.
- **Misconceptions:** strongest material is best. Carbon fibre is isotropic. Printed PLA has datasheet strength.
- **Reference:** Ashby, Materials Selection in Mechanical Design.
- **Assessment:** derive the index for a stiffness-limited, mass-minimum arm, pick a material, and defend it against a process limit.

### `mech.struct`: Change
- **Missing:** load cases including crash, torsion, closed versus open sections, factor of safety, fatigue with Goodman and Marin factors, joint stiffness, damping, Campbell-style rotor check.
- **Evidence:** Shigley's fatigue and bolted-joint coverage is broad ([contents, S](https://highered.mheducation.com/sites/dl/free/0070668612/563090/Detailed_Table_of_Contents.pdf)). VDI 2230 is not checked.
- **Order or depth:** this needs the most extra time. Beam bending should also be an L9 terminal skill, because the artifact depends on it. Bolted joints need numeric items, not only multiple choice and checklists.
- **Misconceptions:** stiff equals strong. Tighter bolts always help. FEA replaces hand checks. Static safety implies fatigue safety.
- **Reference:** Shigley's Mechanical Engineering Design. Use Hibbeler for statics and stress if needed.
- **Assessment:** size an arm unaided for stiffness, strength and first mode, then predict deflection within 15% and frequency within 10%.

### `mech.tol`: Change
- **Missing:** ISO 286 fits, worst-case and RSS stacks, measurement error, datums, inserts and threads in plastic.
- **Order or depth:** after `mech.draw`. Make `print-shrink` numeric with measured coupons.
- **Misconceptions:** a CAD hole prints true. RSS is always safe with few parts.
- **Reference:** ISO fits system, then Shigley's limits and fits material.
- **Assessment:** predict a stack distribution, then measure ten printed parts and explain the difference.

### `matl.mfg`: Keep, change
- **Missing:** process variation, adhesive and threadlock compatibility, CFRP handling, galvanic isolation.
- **Evidence:** anaerobic threadlockers can stress-crack some thermoplastics ([S](https://www.adhesivesmag.com/articles/96391-can-we-use-anaerobic-threadlockers-for-screws-used-in-plastics)). CFRP dust needs extraction and is conductive ([S](https://www.unsw.edu.au/content/dam/pdfs/unsw-adobe-websites/planning-assurance/safety/documents-resources/other/2018-05-UNSW-Carbon-fibre-safety-information-sheet.pdf)). [MIT 2.008, S](https://ocw.mit.edu/courses/2-008-design-and-manufacturing-ii-spring-2025/pages/syllabus/) treats variation as central.
- **Order or depth:** `pcb-fabrication` moves to T1.
- **Misconceptions:** infill sets strength alone. Layer lines do not matter under bending.
- **Reference:** no single definitive source. Use vendor design guides plus Ashby's process charts.
- **Assessment:** predict failure location and load for three print orientations, then break the coupons.

### `elec.pcb`: Move to T1
- **Missing:** thermal rise measurement, return paths, Kelvin sensing, DC-link placement, connector mechanics. I could not confirm IPC-2152 status.
- **Order or depth:** three skills cannot cover a 4-layer high-current board. Add review gates and a low-risk first spin.
- **Misconceptions:** a width calculator proves safety. Vias share current equally.
- **Reference:** Ott for layout. IPC standard unchecked.
- **Assessment:** build a PDB, then predict and measure voltage drop and temperature rise at a defined current.

## T4 UAV integration

### `robo.uav.physics`: Replace (recommendation 7)
- **Missing:** see recommendation 7.
- **Order or depth:** first, after `robo.uav.ops-eu`.
- **Misconceptions:** thrust margin only sets climb rate. More throttle always gives more control. Hover throttle does not depend on battery state.
- **Reference:** Mahony, Kumar and Corke tutorial ([S](https://researchportalplus.anu.edu.au/en/publications/multirotor-aerial-vehicles-modeling-estimation-and-control-of-qua/); I could not open the full PDF). Use Leishman for momentum theory (contents unverified). Beard and McLain is useful for frames and estimation ([S](https://vufind.katalog.k.utb.cz/Record/kn-ocn769927217/TOC)), but from memory it is mainly fixed-wing.
- **Assessment:** from bench data, predict hover power, throttle and endurance within 10%, then confirm by log.

### `robo.uav.propulsion`: Keep, change
- **Missing:** ESC telemetry and RPM, thrust-curve linearisation, motor and ESC temperature checks after short hovers, prop balance.
- **Order or depth:** add tethered or restrained checks only if they are hazard-assessed [J].
- **Misconceptions:** props-off proves direction and control sign. Balanced props remove all vibration.
- **Reference:** the chosen stack's actuator docs.
- **Assessment:** diagnose seeded motor-order and prop-direction errors from logs and a props-off test.

### `robo.uav.fc`: Change
- **Missing:** estimator health, compass interference, Remote ID handling, tuning sequence, parameter version control.
- **Evidence:** CompassMot under 30% is acceptable and above 60% needs hardware changes ([O](https://ardupilot.org/copter/docs/common-compass-setup-advanced.html)). Tuning order runs through initial tune, notches, manual tune, then AutoTune ([O](https://ardupilot.org/copter/docs/tuning-process-instructions.html)).
- **Order or depth:** one stack only. Rename the module as a tuning and configuration workflow.
- **Misconceptions:** all failsafes behave alike. Notches fix vibration at the source. Configuration done once stays valid.
- **Reference:** the chosen stack's official docs.
- **Assessment:** rebuild a safe configuration from scratch, justify every changed parameter, and pass a seeded-misconfiguration audit.

### `robo.uav.ops-eu`: Change, move first
- **Missing:** kit status, A3 geometry, registration and training, Remote ID, mandatory German insurance, geozones, Specific category triggers.
- **Evidence:** dipul says operators must carry liability insurance under LuftVG section 43 and keep the certificate at hand ([O](https://www.dipul.bund.de/homepage/en/information/general/minimum-age-and-mandatory-insurance)). Doc 17 says only "common".
- **Order or depth:** first, and gate purchases. Thirty minutes at L0 is too small for this.
- **Misconceptions:** self-assembled kits are privately built. The geofence makes the site legal. Household liability cover always applies.
- **Reference:** EASA Open category page and Reg 2019/947, plus dipul for Germany.
- **Assessment:** given three real sites and two vehicles, decide category, restrictions and paperwork, or say "not permitted". Not legal advice.

### `sens.meas`: Keep, change
- **Missing:** barometer disturbance from prop wash, GPS correlated error, estimator innovation use in real logs [J].
- **Order or depth:** link to `ctl.est.innovation-checks`. Margin sums should feed the geofence.
- **Misconceptions:** GPS error is white noise. An EPH number is a hard bound.
- **Reference:** the stack's estimator docs. Allan variance sits in T2.
- **Assessment:** from a real log, build the error budget and set a mission margin, then defend it.

### `net.rf`: Keep, change
- **Missing:** EU bands and duty limits, antenna polarisation and Fresnel clearance, MAVLink rates, link-loss policy, signing.
- **Order or depth:** stack-specific. Cellular telemetry is unresolved; I found no Bundesnetzagentur source.
- **Misconceptions:** a radio legal in the US is legal in the EU. TCP suits lossy links. Link budget equals real range.
- **Reference:** ArduPilot regional table for orientation, then ETSI EN 300 220 (not opened).
- **Assessment:** choose a legal radio setup, predict range margin, then log RSSI against the prediction on the ground.

### `robo.uav.test`: Split
- **Missing:** see recommendation 4. Failsafe interaction, severity, and stopping-distance margin.
- **Evidence:** PX4 lists failsafe types, says the most severe action wins, and offers a state-machine simulator. Its geofence action fires after the breach, so margin uses v²/2a ([O](https://docs.px4.io/main/en/config/safety.html)). [MC_04 test card, O](https://docs.px4.io/main/en/test_cards/mc_04_failsafe_testing.html) is a model. PX4 log guidance covers rate tracking and vibration ([O, partial](https://docs.px4.io/main/en/log/flight_log_analysis.html)).
- **Order or depth:** SITL, preflight and log basics before L8. Matrix, regression and fault injection before L12.
- **Misconceptions:** a geofence stops at the line. A passed failsafe once stays passed. SITL proves real behaviour.
- **Reference:** the stack's failsafe docs and test cards, plus flight-test safety practice sources above.
- **Assessment:** given an unseen flight log with a hidden fault, identify cause, evidence and fix. Then write a test card for your own mission, with computed fence margin and stop rules.

## Boundary guardrails

- GNSS-loss testing is SITL or a stack-level sensor-disable only. No radiated jamming or spoofing, no anti-jam content.
- Flight termination is taught as a safety function only.
- Exclude target tracking, payload release, and any armed or military scenario.
- Keep RF to legal civil links.

None of the additions above require weapon, munitions or EW content.

## Other doc 17 corrections

- The insurance line understates a legal duty.
- Add DC clamp and torque sensing.
- Fusion personal use is [home-based and non-commercial, S](https://www.autodesk.com/products/fusion-360/blog/subscription-types/). That conflicts with later dual-use product work, so verify current terms.
- The threadlock line needs a plastics warning.
- Hobby-level ESC capacitor guidance is [mostly anecdotal, S](https://www.hobbywingdirect.com/blogs/news/blog-capacitor). Use it with care.

## What I could not check

- **Paywalled or standards bodies:** Shigley, Norton, Hibbeler, Paul, Leishman, Krishnan, Plett, Ott, Bogatin books, ASME Y14.5, ISO, IPC-2152, VDI 2230 and ETSI text were not read in full. Norton and Hibbeler had no usable evidence at all.
- **Failed to open:** the Mahony full PDF timed out, the Springer page redirected to login, the [6.131 OCW URL I tried](https://ocw.mit.edu/courses/6-131-power-electronics-laboratory-spring-2004/) returned 404, and the TI PDF was too large.
- **Partly read:** the ArduPilot [first-flight page URL I tried](https://ardupilot.org/copter/docs/flight-evaluation.html) returned 404. TI contents were only partly read; the rest of the page was not reached. VESC pages gave [no technical detail, O](https://vesc-project.com/node/178), so VESC is unbenchmarked.
- **CU Boulder:** I found no official ECEA 5700 syllabus, only [snippets](https://coconote.app/notes/1de9f379-8357-44a8-8abd-a187a41569f5).
- **SORA 2.5:** the EASA page I opened names no version, and I did not read the JARUS main body.
- **German law:** I did not verify FPV observer rules, club authorisation routes, or cellular use. Legal readings need founder confirmation.
- **Project scope:** I did not read `spine-module-plan.yaml` or `hardware-phases.yaml`, so changes will need checking there. I checked T2 skill lists only by title, to avoid calling covered topics missing.

---

## T5 Cloud twin and T6 Governance: review against world-class standards

Research, not legal advice. No project files edited.

**Source labels:** [R] = page or text opened. [S] = search snippet only. [J] = my engineering judgement, no external claim.

**Important caveat on [R]:** a small fetch model summarised the pages, so I did not eyeball them directly. Quotes need checking before use.

**Law sources:**
- EUR-Lex returned empty, as it did earlier, including the ELI and HTML URLs.
- I read the CRA, 2021/821, 2025/2003, the AI Act and the Data Act through the lawplayer.com mirror. It is unofficial, so check the Official Journal before anything ships.

**Verdict:**
- The structure is sound, and the 2 November additions fixed the worst gaps.
- The main problems now are five:
  - "Twin" is still mislabelled.
  - Export teaching contains a wrong rule.
  - Three EU laws that touch the design are absent.
  - Most assessments are recognition tests.
  - 15.3 and 10.5 contact hours cannot support the claims in doc 16.

---

## Top 15 recommendations, by impact

**1. Make the twin real (T5).**
- L11 is one-way: telemetry in, residual alert out.
- Under Kritzinger's taxonomy that is a **digital shadow**, not a twin ([S](https://www.bohrium.com/paper-details/digital-twin-in-manufacturing-a-categorical-literature-review-and-classification/812997713636360193-40126)).
- The National Academies report calls bidirectional interaction "central" ([R](https://www.nationalacademies.org/read/26894/chapter/2)) and calls VVUQ essential and continual ([S](https://www.nationalacademies.org/read/26894/chapter/10)).
- Fix:
  - Add `sys.twin.state-estimation`, a Kalman filter reusing T2.
  - Add `sys.twin.vvuq`.
  - Add one closed decision: the twin changes a limit or schedule, with a human in the loop.
  - Otherwise rename the artifact "calibrated shadow".

**2. Base residual thresholds on uncertainty, not a hand-set number.**
- Use the NIS chi-square test ([S, Piché](https://researchportal.tuni.fi/en/publications/online-tests-of-kalman-filter-consistency/)).
- Residuals are never zero, even with no fault ([S](https://rd.springer.com/chapter/10.1007/978-3-030-17728-7_4)).
- Grade on a blind injected fault, with false-alarm rate reported on clean runs.

**3. Fix the export rule, and add a real classification memo (T6).**
- The guide's "single controlled subassembly can pull in the whole product" overstates the rule; see the fact check below.
- Replace template scenarios with a founder memo on their own design against the current Annex I, covering 9A012, 5A002 and the General Notes. It ends in questions for counsel, not conclusions.

**4. Add the German layer.** Currently it is one sentence in the guide and one 25-minute skill.
- Ausfuhrverantwortlicher: must be named in writing for listed goods.
- Auskunft zur Güterliste: only says whether a good is listed.
- Nullbescheid.
- BAFA's Merkblatt, 10th edition, November 2024, including its cloud section.
- All [S](https://www.ihk.de/aachen/international/export-import/exportkontrolle-608126). I did not read the current cloud text.
- Add a literacy pointer to the Ausfuhrliste and the war-weapons law, ending at "stop and call counsel".

**5. Add a data law module; it is entirely absent.** L11 is a connected product's telemetry store.
- The Data Act requires data access by default ([R, Art 3(1)](https://lawplayer.com/eu/act/32023R2854)).
- Art 7 excludes qualifying micro and small enterprises from that chapter, so the skill is scoping, not just a duty list.
- 12 September 2026 for design duties is [S](https://www.heuking.de/en/news-events/newsletter-articles/detail/data-act-access-by-design-becomes-mandatory-as-of-12-september-what-companies-need-to-know-now.html). Art 50 was not read.
- GDPR for telemetry appears nowhere in T5 or T6. A grep of the syllabi finds only `robo.uav.ops-privacy`, which covers cameras. Location logs and operator identity are the gap.

**6. Add AI Act literacy (T6).** No syllabus covers it.
- The Digital Omnibus, reported as Regulation 2026/1744, moved Annex III high-risk duties to 2 December 2027 and Annex I product duties to 2 August 2028 ([S, White & Case](https://www.whitecase.com/insight-alert/eu-ai-omnibus-enters-force-amending-ai-act), [S](https://trusteditfirms.com/blog/eu-ai-act-digital-omnibus-high-risk-deadline-delay/)).
- Teach Art 2(3): the exclusion applies to systems used "exclusively" for military, defence or national security ([R](https://lawplayer.com/eu/act/32024R1689)). Dual-use is therefore not automatically out of scope.
- Add Art 4 AI literacy and the NIST AI RMF functions, GOVERN, MAP, MEASURE and MANAGE ([S](https://nvlpubs.nist.gov/nistpubs/ai/nist.ai.100-1.pdf)). NIST says the RMF is under revision.

**7. Treat CRA reporting as live and run it as a drill.**
- Art 14 has applied since 11 September 2026, and Art 69(3) reaches products already on the market ([R](https://lawplayer.com/eu/act/32024R2847)).
- ENISA's platform is live ([S](https://www.enisa.europa.eu/news/the-cra-single-reporting-platform-is-launched)).
- Timed task: 24 h / 72 h / 14 days on a simulated exploited vulnerability.

**8. Reorder T5.**
- Proposed order: `sys.req` → `sw.cloud` identity and provisioning → `sys.telemetry` → `ml.core` plus `ml.pred.baselines` → `sys.twin` → rest of `ml.pred` → `ml.ops` → `ml.edge` → `ml.llm`.
- Today the twin (order 3) comes before regression (order 4), though calibration needs least squares.
- Secure uplink (order 2) comes before device identity (order 9).
- The optional LLM slice comes before anomaly detection.

**9. Roughly double `sys.telemetry` and add data-quality SLOs.**
- The SRE Workbook's pipeline SLOs are freshness, correctness and coverage. It also says end-to-end checks catch silent field drops that per-stage checks miss, and stale data is generally better than wrong data ([R](https://sre.google/workbook/data-processing/)).
- These are missing. The syllabus has "alert SLO" only.
- 2.1 h is the wrong depth for the pillar's core value [J].

**10. Replace MC-only and tier-mismatched assessment.**
- `prof.law`, `def.export`, `sec.ot` and `prof.eu` promise outcomes "after module L1", but every skill is tier L0.
- `sec.hw.threat-modelling`, `ml.core.linear-regression`, `ml.edge.quantization` and `econ.cost.bom-costing` are MC only.
- Either relabel, or use the tasks below.
- Rubric-LLM grades are not mastery-eligible until calibrated (CLAUDE.md rule 4), so most T6 and `ml.ops` checks need human sign-off or machine-checkable artefacts.

**11. Add applied cryptography and key lifecycle (T6/`sec.hw`).**
- Doc 15 G-F1 promises crypto, but no skill teaches it.
- Add AEAD, nonces, key hierarchy, provisioning, rotation, revocation and end of life.

**12. Make threat modelling a method, not a quiz.**
- Use Shostack's four questions ([S](https://github.com/adamshostack/4QuestionFrame)) plus the EMB3D properties → threats → evaluate workflow, v2.0.2 ([R](https://emb3d.mitre.org/)).

**13. Rebuild `econ.cost` as a unit P&L and cash model.**
- BOM alone is a poor proxy. One vendor source puts it at 20–35% of per-unit cost at scale ([S](https://hubble.com/community/comparisons/the-real-cost-of-building-iot-hardware-a-breakdown/)); treat that as a rule of thumb.
- Add landed cost, channel margin, yield, compliance cost, warranty, working capital and EVT/DVT/PVT gates ([S](https://instrumental.com/wp-content/uploads/2020/10/EVT-DVT-PVT-Whitepaper.pdf)).

**14. Make OTA and provisioning a fault-injected lab.**
- Currently MC and checklist.
- Prove rollback, anti-rollback and recovery on real hardware.
- Use SP 800-193's protect/detect/recover ([R](https://csrc.nist.gov/pubs/sp/800/193/final)).
- Add the CRA default of automatic security updates ([R](https://lawplayer.com/eu/act/32024R2847)).

**15. Trim doc 16 to match the syllabus.**
- 0.9 h of OT cannot support "Lead hybrid IT/OT/embedded assessments".
- `sec.ot` does not teach "asset inventory" or "SIEM logging", and no skill teaches "security test plans".
- Either add depth or downgrade the claims. They are career inference [P], but they set the bar.
- Also sync doc 15's T6 row, which omits CRA and CE.

**Do not add:** CS336-style LLM building. It is a from-scratch model course with PyTorch and distributed-training prerequisites ([R](https://cs336.stanford.edu/spring2025/)), off-goal for a founder who integrates models.

---

## SYLLABUS-GUIDE fact check

The guide states it was not checked online.

**Errors or overstatements**

| Guide claim | Finding |
|---|---|
| "a single controlled subassembly can pull in the whole product" | **Wrong as stated.** General Note 2 applies when the controlled component is the **principal element** and can feasibly be removed or used for other purposes ([R, 2025/2003](https://lawplayer.com/eu/act/32025R2003)). Judged on quantity, value, know-how and special circumstances ([S, earlier version](https://legislation.gov.uk/eur/2019/2199/annex/I/division/LIST/adopted/data.pdf)). |
| "Remote access is where most OT compromises begin" | **Unsupported.** Reported figures vary: half of incidents via external or remote access in SANS 2025 ([S](https://sans.org/blog/why-vpn-mfa-is-not-enough-ot-evidence-sans-state-icsot-security-report)), versus 57% via IT compromise pivot in another survey ([S](https://www.securityweek.com/ics-ot-security-budgets-increasing-but-critical-areas-underfunded-report/)). Say "a leading path". |
| "Radio Equipment Directive's cybersecurity rules… Any wireless product hits these" | **Overstated.** CE/RED hits radio products, but the cyber rules apply to the classes in 2022/30 ([S](https://digital.gob.es/content/dam/portal-mtdfp/avance-digital/telecomunicacion-e-infraestructuras-digitales/areas_interes/equipos-telecomunicacion/documents/Guia-aplicacion-EN-18031.pdf)), and they are repealed from 11 December 2027 by Delegated Regulation 2026/339 ([S](https://www.tuv.com/regulations-and-standards/en/eu-cybersecurity-repeal-of-delegated-regulation-supplementing-the-radio-equipment-directive.html)). |
| Twin = "holds a model, tracks its state, and predicts" | **Incomplete**, and L11 still is not one; see recommendation 1. |
| Schema "must be backward and forward compatible" | **Too absolute.** Compatibility is directional and sets upgrade order ([R, Confluent](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html)). Cloud readers must read all old firmware, which is transitive backward. Forward matters for downlink and lagging readers [J]. |
| "Partition and window on event time" beside "Device clocks are wrong" | **Internal tension.** Window on event time, yes. Akidau warns you often cannot know event-time completeness ([R](https://www.oreilly.com/radar/the-world-beyond-batch-streaming-101/)). Physically partitioning on an unvalidated device clock risks junk partitions; validate or partition on receive date [J]. |
| "Burn-rate alerting beats fixed thresholds" | **True for traffic-rich services.** At low traffic one failure can page; remedies include synthetic traffic and combining services ([R](https://sre.google/workbook/alerting-on-slos/)). A small fleet is exactly this case. |
| mTLS with short-lived certificates | **Not an error, but unresolved.** Expiry checks need a trustworthy clock, which the same section says devices lack [J]. |
| "Drift comes in two main kinds" | **Omits label/prior shift** [from memory; Huyen's chapter not opened]. |
| "category 5 part 2 can catch connected devices" | **True but thin.** See `def.export` below for the tests to teach. |

**Confirmed**
- Four verification methods ([R, NASA handbook](https://www.nasa.gov/wp-content/uploads/2018/09/nasa_systems_engineering_handbook_0.pdf), analysis, demonstration, inspection, test; the guide's list matches). The handbook applies the same four to validation.
- CRA dates ([R](https://lawplayer.com/eu/act/32024R2847)); the September 2026 date has now passed.
- SBOM required, at least top-level dependencies, and machine-readable ([R](https://lawplayer.com/eu/act/32024R2847)). Teach also that it is provided to authorities on reasoned request (Annex VII) and to users only if the manufacturer chooses (Annex II).
- 10 Annex I categories, and the category names I saw in the contents [R].
- Art 4 catch-all ([R](https://lawplayer.com/eu/act/32021R0821)).
- Scheme r = S(q − Z): paper confirmed ([R abstract only](https://arxiv.org/abs/1712.05877)), formula from memory.
- OWASP LLM01 is prompt injection, 2025 edition ([R](https://genai.owasp.org/llm-top-10/)).
- Product liability covers software; transposition deadline 9 December 2026 ([S](https://www.reedsmith.com/articles/the-german-draft-implementation-bill-of-the-eu-product-liability-directive/)).

**Stale or missing currency**
- "What's missing" still says no LLM skill and no CRA; line 31 discloses this.
- Stated bands differ from the syllabi: T5 50–100 vs 65–120 h, T6 25–50 vs 30–60 h.
- `ml.ops.eval-report` no longer appears in `spine-module-plan.yaml` (grep).
- Annex I was last replaced by Delegated Regulation 2025/2003, in force 15 November 2025 ([S, Hannover IHK](https://www.ihk.de/hannover/hauptnavigation/international/export-import/export/exportkontrolle-uebersicht/eu-dual-use-verordnung-anhang-i-wurde-aktualisiert-6805770)). A newer act may exist; a Commission 2026 document surfaced but I did not check it.
- CRA guidance C(2026) 5252, 27 July 2026, is non-binding ([S](https://digital-strategy.ec.europa.eu/en/library/commission-publishes-new-guidance-support-timely-cyber-resilience-act-implementation)).
- The Bundestag reportedly passed the German CRA act in October 2026, with the BSI as market surveillance authority ([S](https://silicon-saxony.de/en/bsi-bundestag-strengthens-cybersecurity-cra-implementation-act-passed/)). Promulgation is unconfirmed.
- SP 800-82 Rev 4 draft is out, comments due 30 November 2026 ([R](https://csrc.nist.gov/pubs/sp/800/82/r3/final)).

---

## T5 module reviews

**`sys.req`: Change.**
- Missing: stakeholder needs vs requirements; requirements written so a pass or fail number exists; FMEA or hazard analysis; change control. INCOSE treats needs and requirements through a companion manual ([S](https://www.thriftbooks.com/w/incose-needs-and-requirements-manual-needs-requirements-validation-verification-across-the-lifecycle/53254546/)).
- Depth: 1.3 h is literacy only; keep it, but apply it to L11.
- Misconception: a passing test means the requirement was right. NASA treats verification and validation as separate, with validation about suitability to stakeholder expectations.
- Reference: [NASA SE Handbook SP-2016-6105 Rev 2](https://www.nasa.gov/wp-content/uploads/2018/09/nasa_systems_engineering_handbook_0.pdf) (free). INCOSE v5 is the wider reference ([S](https://www.oreilly.com/library/view/incose-systems-engineering/9781119814290/f07.xhtml)).
- Hard task: given a vague L11 brief, write 15 requirements with methods. Then a planted interface defect must be traced to the requirement that should have caught it.

**`sys.telemetry`: Change, and expand.**
- Missing:
  - Time model: event, ingest and sequence, boot counter, clock-quality flag.
  - Dedupe key and idempotent replay.
  - Freshness, correctness and coverage SLOs.
  - Backfill after schema change.
  - Store-and-forward overflow.
  - Golden data ([R](https://sre.google/workbook/data-processing/)).
  - Observability of the observer: a silent device is not a healthy device [J].
- Also separate a transport layer: MQTT QoS semantics [J].
- Add table-format evolution: Iceberg hidden partitioning. Only its heading was visible ([R, body truncated](https://iceberg.apache.org/docs/latest/partitioning/)).
- Misconceptions: exactly-once delivery is the goal (idempotence often removes the need, [R](https://sre.google/workbook/data-processing/)); complete windows exist; schema version and API version are the same thing.
- Reference: Kleppmann and Riccomini, DDIA 2nd edition ([R, author's blog not opened, S](https://martin.kleppmann.com/2026/03/24/designing-data-intensive-applications-2e.html)). Publication is reported as February or March 2026, and the contents page I saw was "not yet final". Streaming Systems for time ([S](https://oreilly.com/library/view/streaming-systems/9781491983867)).
- Hard task: replay a provided log with duplicates, a 10-minute outage, a reboot that resets the clock, and two firmware schema versions. Output must be byte-identical across two runs, with every record accounted for.

**`sys.twin`: Change, see recommendations 1–2.**
- Missing: identifiability, train and validation runs separated by condition, parameter drift vs fault, regime of validity, uncertainty, and model version in provenance.
- Depth: 1.7 h is far too thin for the title of the pillar.
- Misconceptions: a twin is a dashboard or 3D model; a well-fitted calibration is validated; a residual means fault, when it may mean model error or sensor fault.
- ISO 23247 is a manufacturing framework, and its "synchronisation" definition is seen only secondhand ([S](https://www.es.mdh.se/pdf_publications/6606.pdf)). Do not quote it as the general definition.
- Reference: [NASEM 2024](https://www.nationalacademies.org/read/26894/chapter/2). Glaessgen and Stargel not found.
- Hard task: calibrate on one thermal or battery run and predict a different load profile before seeing it, stating prediction intervals. Then detect a blind fault the assessor injects, with alert latency and false-alarm rate reported.

**`ml.core`: Change.**
- Missing: residual diagnostics; rolling-origin validation; regularisation; uncertainty; scaled errors. Evaluate on a rolling forecasting origin ([R](https://otexts.com/fpp3/tscv.html)).
- Use MASE or RMSSE, because RMSE and MAE do not compare across units, and do not use MAPE on Celsius ([R](https://otexts.com/fpp3/accuracy.html)). The current `metrics-interpret` lists RMSE/MAE only.
- Misconceptions: good training fit predicts well; leakage is only random splitting (scaler fit and feature windows also leak [J]).
- Reference: [Hyndman and Athanasopoulos, FPP3](https://otexts.com/fpp3/).
- Hard task: find three planted leaks in a pipeline, then show a MASE below 1 on a rolling origin, or state that no model is justified.

**`ml.ops`: Change.**
- Missing:
  - Training-serving skew: log features at serving, measure skew across gaps ([R, rules 29, 37](https://developers.google.com/machine-learning/guides/rules-of-ml)).
  - Rule 1, launching without ML.
  - Rule 5, testing infrastructure separately.
  - Hidden feedback loops and undeclared consumers ([S, Sculley](https://research.google/pubs/hidden-technical-debt-in-machine-learning-systems/)).
  - Monitoring and continual learning, and "ML beyond accuracy", as in CS329S ([R](https://stanford-cs329s.github.io/syllabus.html)).
  - Model and data versioning, and shadow and canary, which the guide mentions but no skill owns.
- Misconception: drift alerts mean accuracy fell.
- Reference: Huyen, Designing ML Systems ([S](https://github.com/chiphuyen/dmls-book)).
- Hard task: given a degraded deployed model and logs, locate the cause among skew, sensor recalibration and real drift, then ship a rollback decision with evidence.

**`ml.llm`: Keep, change content, sequence last.**
- Missing:
  - Capability vs regression evals, multiple trials, outcome grading over path grading, testing both over- and under-triggering, 20–50 real tasks to start ([R, Anthropic](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).
  - Calibrating automated scoring against humans and mining logs ([R, OpenAI](https://developers.openai.com/api/docs/guides/evaluation-best-practices)).
  - Cost, unbounded consumption, output handling, excessive agency and vector weaknesses ([R, OWASP 2025](https://genai.owasp.org/llm-top-10/)).
  - OWASP's agentic list ([S](https://www.indusface.com/learning/owasp-top-10-agentic-ai/)).
- Misconception: injection can be filtered away. NCSC says it probably cannot be fully mitigated; treat the model as a confusable deputy, constrain actions deterministically, and give it no more privilege than the untrusted content's source ([R](https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection)).
- Reference: Huyen, AI Engineering ([S](https://www.huyenchip.com/books/)). Contents not verified.
- Hard task: an agent over L11 logs with one write-capable tool. An assessor plants injection in a log line. Pass means the unauthorised action is impossible by design, shown by the outcome state, plus a regression eval with pass rate over repeated trials.

**`ml.pred`: Keep, move later, deepen.**
- Good already: baseline first, no point adjustment.
- Add event-level latency and false alarms per hour of operation. Add a no-fault clean run, and separate bench and field data [J].
- Misconceptions: a good benchmark score means a good detector; flawed benchmarks are the point of Wu and Keogh, already cited in the guide. RUL without run-to-failure data is not credible, so keep it at literacy.
- Reference: Wu and Keogh ([cited in guide, not reopened](https://arxiv.org/pdf/2009.13807)). The guide's gap on battery or motor prognostics sources remains open.
- Hard task: compare detector vs trivial baseline on a blind labelled log, reporting event-level precision, recall and detection delay. Be willing to report that the baseline won.

**`ml.edge`: Keep, tighten.**
- Missing: the choice of inference at edge vs cloud at all; per-axis vs per-tensor; quantization-aware training; operator support; flash vs RAM; energy; worst-case timing vs average; versioned model as an OTA payload.
- MLPerf Tiny measures latency, energy and memory ([S](https://meta-intelligence.tech/de/insight-tinyml)).
- "Tensor arena" is TFLite Micro vocabulary, not universal [J]. No dynamic allocation or virtual memory on such targets ([R, David et al.](https://arxiv.org/abs/2010.08678)).
- Misconceptions: INT8 is always faster; accuracy after conversion equals accuracy on device, when sensor preprocessing differs [J].
- Reference: [Reddi, Machine Learning Systems](https://mlsysbook.ai/index.html) ([S]); [MIT 6.5940](https://hanlab.mit.edu/courses/2026-fall-65940) as the deep follow-up ([S]).
- "Jia and others on TinyML": I found no such work. You may mean Jacob et al. Please confirm.
- Hard task: deploy under a stated RAM, flash and deadline budget, prove worst-case timing with a logic analyser or cycle counter, and report accuracy on-device.

**`sw.cloud`: Change, split identity forward.**
- Missing: full identity lifecycle (manufacture, claim, rotate, revoke, decommission), staged rollout with kill switch, power-loss during update, CI that fails on a hardware rig. SUIT's architecture is a good model and addresses updates after a vendor vanishes ([S, RFC 9019](https://datatracker.ietf.org/doc/rfc9019/)). Uptane and TUF as concepts ([S](https://core.ac.uk/download/266912339.pdf)).
- Add incident response and postmortems. No T5 skill owns operating the thing [J].
- Misconception: signing equals safe update, when anti-rollback, recovery and health check are separate.
- Reference: [NIST SP 800-193](https://csrc.nist.gov/pubs/sp/800/193/final) for protect/detect/recover ([S, PDF](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-193.pdf)).
- Hard task: cut power at a random point in OTA, serve an old signed image, serve a tampered image. The device must end healthy or recover each time, with logs.

---

## T6 module reviews

**`prof.law`: Change.**
- Missing: the exporter definition, whoever holds the contract and can determine sending ([R](https://lawplayer.com/eu/act/32021R0821)).
- Electronic transfer as export, Art 4(2) notification when the exporter knows, Art 5 cyber-surveillance, Art 8 technical assistance, Arts 9–10 national lists ([R](https://lawplayer.com/eu/act/32021R0821)).
- General Technology Note: technology "required" for development, production or use ([R](https://lawplayer.com/eu/act/32025R2003)).
- The Recommendation 2019/1318 seven core elements, confirmed via a government page ([R](https://mvep.gov.hr/o-hrvatskom-izvozu/kontrola-izvoza/export-control/guidelines/245202)), scaled to one person. Physical and information security links to the repo.
- Misconceptions: civil product means no controls; only shipments are exports; an unlisted item is always free; the classification table is binding (it is not, [S](https://www.ihk.de/aachen/international/export-import/exportkontrolle-608126)).
- Reference: the current BAFA Merkblatt "Exportkontrolle und das BAFA", as the practical text.
- Hard task: within 30 minutes of a red-flag scenario, write the hold decision and note to counsel, listing facts, known unknowns and what stays frozen.

**`def.export`: Change, with one boundary fix.**
- `product-decomposition` must teach General Note 2, including that controls "should not be defeated" ([R](https://lawplayer.com/eu/act/32025R2003)).
- Add confusable set **design-choice-vs-structuring**: an early design change reviewed with counsel is legitimate; splitting items or shipments to sidestep a control is excluded content.
- Doc 16's "redesign when a feature triggers control" needs that same guard.
- Teach real entries as literacy:
  - 9A012: BVLOS-designed UAVs by endurance, ≥1 h, or ≥30 min with 25-knot gust capability ([R](https://lawplayer.com/eu/act/32025R2003)).
  - 9A112: range 300 km, or aerosol-dispensing criteria.
  - Category 5 Part 2: the definition excludes authentication, signature and integrity functions; the Cryptography Note has retail conditions; 5A002.a has four function tests ([R](https://lawplayer.com/eu/act/32025R2003)).
- Note that "mass market" is not the wording the fetch found in that note.
- Misconceptions: TLS means controlled, or the reverse; the 30-minute drone is out of scope without checking the design intent.
- Reference: current Annex I via Delegated Regulation 2025/2003 ([S ELI](https://eur-lex.europa.eu/eli/reg_del/2025/2003/oj)).
- Hard task: from a fictional spec, identify candidate entries, the parameters needing data, and what cannot be concluded without counsel. Grading rewards correct uncertainty.

**`sec.hw`: Change, see recommendations 11–12.**
- Add `sec.hw.applied-crypto` and key lifecycle, and move `threat-modelling` up to L1.
- Include debug and physical threats, recovery, and validating the model against a real device ("did we do a good job", [S](https://shostack.org/files/papers/The_Four_Question_Framework.pdf)).
- Misconceptions: a threat model is a one-time document; encryption gives integrity; a secure element is mandatory. Note CRA Annex IV lists secure elements as critical products ([R](https://lawplayer.com/eu/act/32024R2847)), which matters for component suppliers, not automatically for every product using one [J; check with counsel].
- Reference: Shostack, Threat Modeling, with Anderson's Security Engineering 3e chapters 18–20 ([R](https://www.cl.cam.ac.uk/archive/rja14/book.html)); chapter availability is unclear.
- Hard task: threat model L4 or L11, map to EMB3D, then an independent reviewer finds the highest-risk missed threat. Pass only if each top risk has a verification test that was run.
- Keep it defensive: no exploit recipes; attack classes only.

**`sec.ot`: Change.**
- Separate three things: Purdue reference model, zones and conduits (risk-based, [S](https://www.cisco.com/c/en/us/products/collateral/security/isaiec-62443-3-3-wp.pdf)), and the product standards. The module currently merges "Purdue/zones".
- A product builder needs 62443-4-1 and 4-2 at least as much as 3-2 ([S](https://www.cisco.com/c/en/us/products/collateral/security/isaiec-62443-3-3-wp.pdf)).
- Add safety vs security interaction, and legacy devices [J].
- Misconceptions: Purdue levels are zones; air gap equals secure; a VPN solves remote access (also see [S](https://sans.org/blog/why-vpn-mfa-is-not-enough-ot-evidence-sans-state-icsot-security-report)).
- Reference: [NIST SP 800-82 Rev 3](https://csrc.nist.gov/pubs/sp/800/82/r3/final) (free), while watching Rev 4. IEC 62443 itself is paywalled and not read.
- Hard task: draw zones and conduits for the L11 architecture, with risk rationale, and defend one remote-maintenance path against a supplied compromise scenario.

**`prof.integrator`: Keep, add.**
- Add: traceability from claim to evidence, configuration baseline, TRL justification, limits of validity, known-issues list. Add a negative: what the test does not show [J].
- Misconception: more pages make a better pack.
- Reference: NASA SE Handbook, configuration and technical data parts.
- Hard task: a sceptical reviewer picks any claim in the pack; the founder reproduces its evidence, from the exact configuration, within an hour.
- Gating: keep the export checkpoint before this module. Evidence packs can themselves contain controlled technology [J].

**`econ.cost`: Change, see recommendation 13.**
- Missing: fully loaded unit cost, price-to-cost walk, breakeven volume, cash conversion, MOQ cash exposure, tariffs, FX, spares, warranty reserve, compliance costs, and second-source risk.
- Also add EVT/DVT/PVT. Instrumental warns against "XVT", mixing EVT parts with DVT exit criteria ([S](https://instrumental.com/?p=505)).
- Misconceptions: BOM × some multiple = price; NRE is sunk and ignorable; costs fall smoothly with volume.
- Reference: no authoritative text found; the [Instrumental whitepaper](https://instrumental.com/wp-content/uploads/2020/10/EVT-DVT-PVT-Whitepaper.pdf) covers stages only ([S]). All sources found were blogs or vendor pages; treat numbers as rules of thumb.
- Hard task: from supplied quotes, build a 100/1k/10k model and change a design choice. State the price, gross margin, peak cash need, and the point where a printed part should become moulded.

**`prof.eu`: Change and expand, the highest-value T6 module.**
- Add:
  - Placing on the market vs prototype; substantial modification.
  - Important and critical classes: Annex III and IV; security-function MCUs are Class I ([R](https://lawplayer.com/eu/act/32024R2847)).
  - Support period, at least five years unless expected use is shorter (Art 13(8), [R]).
  - Exclusions: products developed or modified **exclusively** for national security or defence, and those certified under 2018/1139 ([R, Art 2](https://lawplayer.com/eu/act/32024R2847)). Do not assume a dual-use drone is out.
  - Art 64 fines; Art 64(10) spares micro and small firms for missing the 24 h deadline only ([R](https://lawplayer.com/eu/act/32024R2847)).
  - RED cyber repeal; PLD; Data Act; AI Act; UAS class rules.
  - Other CE routes, EMC, batteries and WEEE: **not researched**, search returned nothing.
- Fix `sec.hw.iot-baselines`: EN 18031 is cited with restrictions ([S](https://w3prep.intertek.se/kunskapsbank/blogg/new-series-of-cyber-security-standards-now-harmonised-with-red-article-33/)); self-declaration can fail on that.
- Note PLD removes the German €85m cap and €500 deductible in the draft ([S](https://www.reedsmith.com/articles/the-german-draft-implementation-bill-of-the-eu-product-liability-directive/)). Check the enacted text; sources conflict on passage.
- Misconceptions: CE means certified; CRA starts in 2027, when reporting is live; SBOM must be published; free open source means no duties; defence-adjacent means exempt.
- Reference: [CRA text](https://lawplayer.com/eu/act/32024R2847) with C(2026) 5252. The Blue Guide is not verified this session.
- Hard task: an applicability map for the founder's own device (which laws, why, dates, which conformity route, what evidence), then a 72-hour reporting drill and a counsel question list. Every date must cite an OJ source.

**Add module: `prof.data`** (Data Act, GDPR, AI Act scoping): 3 skills.
- Hard task: annotate L11's data inventory for owner, personal data, user access route, retention and export-controlled content.

**UAS gap:** T6's competence artifact lists "UAS ops ack", but the skill sits in T4 (`spine-module-plan.yaml` line 923). Either cross-reference it or remove it from T6.

---

## Could not check

- Official Journal text directly; all law via mirror, or summaries.
- Annex of Recommendation 2019/1318. The seven elements are confirmed secondhand. **The red-flag list remains unread**, so the stop drill still cannot be written from source.
- BAFA originals, including the current cloud section; BAFA URLs returned 404.
- AWV and Ausfuhrliste text, war-weapons law, CRA Art 3–4, Data Act Art 50, Omnibus text and Digital Omnibus article numbers.
- C(2026) 5252 content; CRA treatment of open-class drones; German UAS rules and class marks.
- Paywalled: DDIA, Streaming Systems, Huyen, INCOSE, Shostack's book, IEC 62443, ISO 23247, EN 18031, EN 303 645. Assessed by contents or snippets only.
- Sculley's paper read as abstract only; I did not confirm "CACE" as the paper's term.
- Wu and Keogh and Kim et al. were not reopened.
- Jacob et al.'s formula was not read beyond the abstract.
- SP 800-82 overlays; Rev 4 content not read.
- ETSI TR 103 935.

Files reviewed: `C:/Users/Lenovo/Desktop/_PERSONAL/learning-app/polymath-app-spec/content/syllabi/pillar-T5-cloud-twin.md`, `C:/Users/Lenovo/Desktop/_PERSONAL/learning-app/polymath-app-spec/content/syllabi/pillar-T6-governance.md`, `C:/Users/Lenovo/Desktop/_PERSONAL/learning-app/polymath-app-spec/docs/15-cyber-physical-capability-spine.md`, `C:/Users/Lenovo/Desktop/_PERSONAL/learning-app/polymath-app-spec/docs/16-capability-outcomes.md`, `C:/Users/Lenovo/Desktop/_PERSONAL/learning-app/SYLLABUS-GUIDE.md`.

---

