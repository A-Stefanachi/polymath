# 17 — Hardware, tools and phased buying guide

Status: v1.1, 1 Nov 2026. Owner: curriculum / projects. **Planning document, not a contract change.** Prices are **unverified EUR planning figures for Germany (DE)** [P] as of 2026-11-01: **retail including 19% MwSt** unless noted “net”. Band ≈ 0.7×–1.5× central. Shipping within DE/EU is included in rough estimates; import from non-EU shops may add duty. The app contains no purchase links in v1.

**USD cross-reference:** doc 10 section 5.1 remains in USD (Oct 2026). For the same basket, DE retail incl. MwSt is often **~1.05–1.15× the USD central figure** for parts and **~1.0–1.3×** for branded instruments [P].

Companions: `docs/10-build-projects-and-verification-spec.md` §5 (canonical L0–L5 BOM), `content/hardware-phases.yaml`, `docs/15-cyber-physical-capability-spine.md`.

**Typical DE/EU sources [P]:** Reichelt, Conrad, BerryBase, RPishop/Circuit-specialists, Amazon.de, Banggood EU warehouse, JLCPCB/Eurocircuits (PCBs), local makerspaces (printer access).

---

## 1. How to use this guide

| Phase | When to buy | Ladder | Purpose |
|---|---|---|---|
| **A — Bench foundation** | Before project L0 (order early for lead time) | L0–L5 | Sensor logger capstone; reuse for all later work |
| **B — Power bench** | Before L6 | L6 | BLDC/ESC, thrust or load measurement, Li-ion safety |
| **C — Motion sensing** | Before L7 (or with phase D) | L7 | IMU fusion on the bench (ground only) |
| **D — Kit quad integration** | Before L8 | L8 | First flight-line work; open flight stack |
| **E — Mechanical fab** | Before L9 | L9 | CAD → print/CNC frame |
| **F — Vehicle compute & cloud edge** | Before L11–L12 | L10–L13 | PDB/4-layer board fab, companion computer, field test |

You do **not** need everything on day one. Phase A is enough for the lean slice and the full foundation walk. Phases B–F follow the capability spine (doc 15).

**Workspace assumption:** a fixed **bench** (ESD mat optional but useful), good lighting, and storage for LiPo when you reach phase B (fire-safe bag or metal box [P]).

---

## 2. Phase A — Bench foundation (L0–L5)

Authoritative line-item BOM (USD): **doc 10 section 5.1**. Summary by role in **EUR (DE incl. MwSt)**:

### 2.1 Must-have instruments (buy first)

| Item | Used from | Central EUR [P] | Band EUR [P] | Notes |
|---|---|---|---|---|
| Digital multimeter (CAT II+, 4000 count+) | L0 | 35 | 25–55 | e.g. Voltcraft/Brymen class; continuity, DC V, R |
| Two-channel oscilloscope (≥50 MHz, 2× 10× probes, PC/USB export) | L1 | 280 | 180–450 | Largest cost; entry Rigol/Siglent class |
| USB logic analyzer (8 ch, ≥24 MHz, sigrok/PulseView) | L3 | 20 | 12–35 | Saleae clone or LA1040 class |
| USB–UART adapter (3.3 V logic) | L3 | 12 | 8–20 | FT232 / CP2102 breakout |
| SWD debug probe | L4 | 15 | 10–20 | Unverified [P]. Raspberry Pi Debug Probe class, or a spare Pico running debugprobe firmware; used for `sw.fw.gdb-swd` |

### 2.2 MCU and prototyping

| Item | Central EUR [P] | Band EUR [P] |
|---|---|---|
| Raspberry Pi Pico 2 (headers pre-soldered) ×1–2 | 10–18 | 8–24 |
| Breadboard 830 tie-points, jumper kits | 18–28 | 12–40 |
| Passives assortments (E12/E24 resistors, caps) | 45–75 | 30–100 |
| LEDs, 2N3904, MOSFET (logic-level), diodes | 18–28 | 12–40 |
| BME280 breakout (verify chip ID 0x60), optional OLED | 18–35 | 12–45 |
| Headers, buttons, USB cable | 18–32 | 12–45 |

### 2.3 Soldering and bench tools (from L3/L5)

| Item | Central EUR [P] | Band EUR [P] |
|---|---|---|
| Temperature-controlled soldering station + fine tip | 60–100 | 45–140 |
| Solder 0.6–0.8 mm, flux pen, braid, tip cleaner | 28–45 | 18–60 |
| Flush cutters, tweezers, needle-nose pliers | 22–38 | 15–50 |
| PCB holder / helping hands, fume fan or extractor | 35–75 | 25–100 |
| Safety glasses | 8–18 | 5–25 |
| Digital calipers 150 mm | 18–32 | 12–45 |
| Magnifier / loupe 10× | 12–22 | 8–30 |

### 2.4 PCB fabrication (L5)

| Item | Central EUR [P] | Band EUR [P] |
|---|---|---|
| KiCad on your PC (free) | 0 | 0 |
| 5× two-layer PCBs (~80×60 mm) + EU shipping (JLCPCB, Eurocircuits, …) | 28–50 | 20–70 |

### 2.5 Phase A total (planning)

Doc 10 USD total **~608 USD central** (426–912 band) corresponds to **~665 EUR central** (465–980 band) for the full non-optional L0–L5 catalog [P]. The SWD debug probe (~15 EUR [P]) is on top of this total until doc 10 lists it.

**Realistic first purchase** (instruments + L0–L3): **~480–650 EUR central** (DMM + scope + soldering + parts), then **~90–140 EUR** more before L5 (calipers, SMD passives, PCB fab).

**Already owned (typical):** laptop, USB cables, internet. **Not required yet:** 3D printer, LiPo, RC radio.

---

## 3. Phase B — Power and motion bench (L6)

Requires **`elec.semi.battery-safety`** and battery brief acknowledgement (doc 10 §5.3 S9–S11) before energizing packs.

### 3.1 Parts

| Item | Qty | Central EUR [P] | Band EUR [P] | Notes |
|---|---|---|---|---|
| Bench BLDC motor (e.g. 2212 class) + prop **removed** or ducted guard | 1 | 18–28 | 12–40 | Never open prop on bench unguarded |
| ESC (30–40 A class, with BEC if needed) | 1 | 18–35 | 12–45 | Match motor/current |
| Commercial LiPo with marked ratings + **balance charger** (3S or 1S for first steps) | 1 set | 45–95 | 35–120 | Hobby packs have no BMS, so the L6 brief applies (00a H6) |
| LiPo safe storage bag or metal box | 1 | 12–28 | 8–40 | |
| Bench PSU 0–30 V, 5 A+ (alternative to LiPo for first spin-up) | 1 | 45–130 | 35–180 | Safer first tests [P] |
| Silicone wire 12–14 AWG, XT60 (or project connectors) | set | 18–28 | 12–40 | |
| Bulk caps, heat-shrink, zip ties | set | 12–18 | 8–25 | |

### 3.2 Measurement (pick one path)

| Path | Item | Central EUR [P] | Band EUR [P] |
|---|---|---|---|
| **Thrust** | Thrust stand (kit or print) + load cell 5 kg + HX711 | 45–130 | 30–180 |
| **Real load** | DC-capable current clamp, optical tach, and reaction-torque measurement on a guarded stand. A prop-off run gives no load or thrust | 35–90 | 25–120 |

### 3.3 Extra safety (L6+)

| Item | Central EUR [P] | Band EUR [P] |
|---|---|---|
| Fire extinguisher (electrical-rated; local rules) | 30–70 | 25–90 |
| Smoke detector in workshop | 18–45 | 12–60 |
| Non-flammable mat for charging | 12–22 | 8–30 |

**Phase B add-on central:** **~170–400 EUR** [P].

---

## 4. Phase C — IMU ground logger (L7)

| Item | Central EUR [P] | Band EUR [P] | Notes |
|---|---|---|---|
| 6-axis IMU breakout **or** FC with USB logging | 12–90 | 8–120 | FC overlaps phase D |
| MicroSD module (optional) | 6–12 | 4–18 | |
| Bench mount + lazy Susan for rotation tests | 12–35 | 8–45 | Ground only |
| One-axis rig: clamped pivot beam, small motor and guarded prop, or a plain motor speed loop as the lower-risk option | 25–60 | 15–90 | Ground only; current-limited supply; safety brief needed before promotion |

Prefer a propless geared arm or flywheel rig, which exercises cascades and the IMU. The prop beam is optional.

**Phase C add-on central:** **~55–190 EUR** (Pico path); **~115–240 EUR** if buying FC early.

---

## 5. Phase D — Kit quad integration (L8, L12)

Default: **multirotor**, PX4 on an H7 flight controller (00a H10). Do not buy a ready-to-assemble kit before the legal route is settled (00a H9). In the EU, 915 MHz is not a default band, so check regional rules.

### 5.1 Typical kit contents

| Category | Central EUR [P] | Band EUR [P] |
|---|---|---|
| Frame + arms (5" trainer or 3" cinewhoop) | 45–130 | 35–180 |
| Motors ×4, ESC (4-in-1 or separate) | (in kit) | |
| FC H7 class (00a H10) | 35–90 | 25–120 |
| Props + prop tool + spares | 18–35 | 12–45 |
| Radio TX + RX (ELRS class) | 70–170 | 55–220 |
| LiPo 4S packs + multi-channel balance charger, not a parallel board | 70–140 | 55–180 |
| GPS M10 class (L12) | 28–55 | 20–70 |
| Straps, landing gear, threadlock | 18–28 | 12–40 |

### 5.2 Field / flight-line tools

| Item | Central EUR [P] | Band EUR [P] |
|---|---|---|
| Prop balancer / premium props | 18–45 | 12–60 |
| Hex driver set (metric) | 18–32 | 12–45 |
| Field bag | 22–45 | 15–60 |
| USB-C cable for FC | 6–12 | 4–18 |

### 5.3 Compliance (EU / DE — budget, not parts)

| Item | Notes |
|---|---|
| UAS operator registration / remote ID | National fees [R]; not legal advice |
| Drone liability insurance | Mandatory in Germany (Air Traffic Act, per dipul); keep the certificate with you, and confirm it covers self-built drones |
| Club field or open site | Travel time |

**Phase D add-on central:** **~400–850 EUR** [P] (whoop vs 5" kit).

---

## 6. Phase E — Mechanical (L9)

| Item | Central EUR [P] | Band EUR [P] | Notes |
|---|---|---|---|
| CAD software | 0–550/yr | FreeCAD free; Fusion personal use is non-commercial, so check terms before product work |
| FDM 3D printer | 220–650 | 180–900 | Or makerspace |
| Filament PLA/PETG | 35–65 | 25–90 | |
| Torque driver (nylon screws) | 18–32 | 12–45 | |
| Outsourced laser-cut / CNC plates | 55–220+ | Quote locally |

**Phase E add-on central:** **~280–750 EUR** with printer; **~55–170 EUR** makerspace + outsource.

---

## 7. Phase F — Power PCB, companion computer, field V&V (L10–L13)

| Item | Central EUR [P] | Band EUR [P] | Notes |
|---|---|---|---|
| 4-layer PCB fab + shipping | 45–110 | 35–140 | Thicker copper PDB |
| Raspberry Pi 5 / 4 or CM4 carrier | 55–280 | 45–350 | L11 cloud twin |
| microSD / NVMe | 18–65 | 12–85 | |
| 4G/5G or Wi-Fi bridge (optional) | 35–110 | 25–140 | |
| Crash spares (arms, motors) | 55–170 | 40–220 | L13 |
| Labels / notebook (golden vehicle) | 12 | 8–20 | |

**Phase F add-on central:** **~115–450 EUR** beyond L8 stock.

---

## 8. Cumulative tool chest (all phases)

| Tool | Phase |
|---|---|
| DMM, scope, logic analyzer, UART, SWD debug probe | A |
| Soldering station, ESD habits | A |
| Calipers, hex drivers, prop tool | A / D |
| Crimp tool + JST-XH | B / D |
| Heat gun / lighter (heat-shrink) | B |
| Laptop (KiCad, SDK, GCS) | A |
| LiPo bag/box + charger | B |
| Optional bench PSU | B |

Software: **KiCad**, **VS Code**, Pico SDK / **arm-none-eabi-gcc**, **QGroundControl** (or stack GCS), **PulseView**, cloud CLI for L11.

---

## 9. Suggested buying order

1. **Month 0:** DMM, breadboard, Pico, passives, LEDs; order scope if needed.  
2. **Before L1:** Compensate scope probes; RC passives.  
3. **Before L3:** Soldering station, LA, UART, BME280, glasses, fume fan.  
4. **Before L4:** SWD debug probe (or reuse a spare Pico).  
5. **Before L5:** Calipers, SMD passives, **order PCB fab early** (~28 days in doc 10).  
6. **After foundation L1:** Battery safety → phase B PSU or protected pack + motor/ESC.  
7. **Before first flight:** Phase D kit + DE/EU registration/insurance checklist.  
8. **Before L9:** Printer or makerspace.  
9. **Before L11:** Companion computer for telemetry.

---

## 10. What not to buy (yet)

| Item | Why wait |
|---|---|
| VNA / high-end spectrum analyzer | Link-budget math first |
| Scope >100 MHz | 50 MHz enough for L0–L5 and most ESC PWM |
| Custom motor manufacturing | Buy COTS |
| Export-sensitive parts without counsel | Governance track |
| Second full quad before golden vehicle | L13 process |

---

## 11. Planning totals (EUR, DE incl. MwSt)

| Scope | Central EUR [P] | Band EUR [P] |
|---|---|---|
| Phase A only (full doc 10 catalog) | ~665 | 465–980 |
| First serious bench (subset) | 480–650 | 350–850 |
| Add B + C | +200–530 | |
| Add D | +400–850 | |
| Add E | +55–750 | |
| Add F | +115–450 | |
| **All phases (no dedup)** | **~1,450–3,200** | |

Dedup one scope, one iron, one radio, FC L7→L8. **Realistic multi-year spend** (mid-range instruments + one quad): **~1,700–2,500 EUR central** [P].

---

## 12. Open questions

| ID | Question | Default |
|---|---|---|
| OQ-HW-1 | 3" cinewhoop vs 5" trainer | 5" if safe open space; else 3" |
| OQ-HW-2 | FC in L7 vs L8 kit | L7 on Pico + IMU; FC with L8 kit |
| OQ-HW-3 | Net vs incl. MwSt tracking in personal budget | Incl. MwSt (this doc) |

---

## 13. Cross-references

- L0–L5 BOM (USD): doc 10 §5.1–5.2  
- LiPo rules: doc 10 §5.3 S9–S11  
- Spine projects: `content/extended-project-ladder-sketch.yaml`  
- Machine-readable phases: `content/hardware-phases.yaml`
