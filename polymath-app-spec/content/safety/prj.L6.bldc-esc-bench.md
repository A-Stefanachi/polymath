---
brief_version: "2026-11-03-1"
project_key: prj.L6.bldc-esc-bench
title: L6 BLDC bench and high-discharge packs — safety brief
status: draft, needs founder review before L6 is promoted
---

# Safety brief — BLDC bench and high-discharge packs (L6)

Practical lab guidance only; not medical advice. Check every limit against the pack and charger manuals, which take priority.

## Before you start

- **First spin-up uses a current-limited bench supply** with no propeller.
- **Hobby high-discharge packs have no BMS.** Nothing inside stops overcharge, over-discharge or a short, so your procedure is the protection. This is why doc 10 S9 keeps them out of v1. From L6, decision 00a H6 allows them only under this brief, and the S10 charging rules still apply.

## Rotating parts

- Clamp the motor stand to the bench before power is connected. A motor that is only held by hand or by its wires is not ready to run.
- Fit a guard around any propeller, and wear eye protection whenever one is fitted. Keep hands, hair, loose clothing, people and pets out of the propeller plane, and stand to the side of it, never in line with it.
- Keep a physical power cut within reach that works with the firmware crashed, and that you can reach without crossing the propeller plane. Test it before each session.
- Fit the propeller last. Remove it for wiring, flashing, debugging and direction checks. A debugger halt can freeze the processor while the motor signal keeps running.
- Check the propeller for cracks and nicks before fitting it, and tighten the prop nut. Replace a propeller that has hit anything.

## Charging

- Use a balance charger set to the pack's chemistry and cell count. High-voltage packs have different limits, so follow the label.
- **Stay with the pack.** Never charge overnight or unattended.
- Use only a charger specified for the pack, and never charge packs of mixed age together.
- Charge on a non-combustible surface inside a fire-resistant container, away from anything flammable. Treat a fire bag as damage reduction, not containment: evidence that hobby bags contain a pack fire is mostly vendor claims, and some bags state an energy limit. Check the bag's limit against the pack's watt-hours.
- Charge in a room with a working smoke alarm and a clear exit that does not pass the charging spot. Supervision and location matter more than the bag.
- **One pack per charger channel.** Do not use a parallel board. It hides individual cell voltages, and packs at different voltages push current into each other when connected.

## Use and storage

- Inspect before each use for swelling, dents, torn wrap or damaged leads.
- Fit an inline fuse sized for the test, close to the pack.
- Store at the manufacturer's storage voltage, usually about 3.7 to 3.85 V per cell, in a fire-resistant container, if unused for more than about two weeks.

## Damaged packs

- **Stop** if a pack swells, hisses, smells or heats up. If it is safe to do so, disconnect it, then move away.
- A swollen or deep-discharged pack is defective. Never charge or reuse it.
- Keep it apart from other material, on a non-combustible surface, outdoors if you can, until disposal.

## If a pack catches fire

- Do not fight it. Get everyone out, close the door behind you if that is safe, and call 112 from outside. Your safety comes before the equipment.
- The smoke is toxic. Do not stay in the room to watch it, and do not go back in.
- Do not hold a burning pack or try to carry it. Do not move a puffed or hot pack unless that is clearly safe.
- A pack can reignite hours after it seems out. Tell the fire service it is a lithium pack, and let them decide when the room is safe.

## Disposal in Germany

- Use a lithium battery collection point, such as a retailer's take-back or a municipal hazardous-waste site, and ask before bringing a damaged pack.
- Tape the terminals.
- **Do not post a damaged pack.** Transport rules for damaged lithium batteries are strict.
- Do not discharge a pack to zero as your own fix, since sources disagree. Follow the collection point's instructions.

## Check questions

1. Why does a parallel board make cell problems harder to see?
2. What must you never do with a swollen pack?
3. What is the first power source for a new motor, and why?
4. What in a hobby pack stops overcharge?
5. Where do you stand while a propeller spins, and where is the power cut?
6. A pack starts to smoke while charging. What do you do?
