import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  createFsrsAdapter,
  fromSkillStateColumns,
  toSkillStateColumns,
  DEFAULT_FSRS_CONFIG,
  type FsrsCard,
  type FsrsPort,
  type FsrsRating,
} from "./fsrs-adapter.ts";

interface ContractFile {
  library_version: string;
  model: string;
  weight_count: number;
  config: { desiredRetention: number; maximumIntervalDays: number; enableFuzz: boolean };
  start: string;
  sequences: {
    id: string;
    steps: { rating: FsrsRating; after_days: number }[];
    expected: Record<string, unknown>[];
  }[];
}

const contract = JSON.parse(readFileSync(new URL("../test/fsrs-contract.json", import.meta.url), "utf8")) as ContractFile;
const DAY_MS = 86_400_000;

async function replay(port: FsrsPort, start: string, steps: { rating: FsrsRating; after_days: number }[]) {
  let card = port.newCard(new Date(start));
  let t = new Date(start);
  const cards: FsrsCard[] = [];
  for (const s of steps) {
    t = new Date(t.getTime() + s.after_days * DAY_MS);
    card = (await port.review(card, s.rating, t)).card;
    cards.push(card);
  }
  return { cards, last: t };
}

describe("FSRS-6 adapter contract (BL-0041, 00a B7/H3)", () => {
  it("selects FSRS-6 with 21 weights, not the library default FSRS-7", async () => {
    const port = await createFsrsAdapter();
    expect(port.modelName).toBe("fsrs-6");
    expect(port.weightCount).toBe(21);
  });

  it("defaults to desired retention 0.85, 180-day cap, fuzz off, short-term off (G5, 06 3.5)", () => {
    expect(DEFAULT_FSRS_CONFIG).toMatchObject({
      desiredRetention: 0.85,
      maximumIntervalDays: 180,
      enableFuzz: false,
      enableShortTerm: false,
      version: "FSRS-6",
    });
  });

  it("freezes the contract for the pinned library version", () => {
    expect(contract.library_version).toBe("6.0.0");
    expect(contract.sequences).toHaveLength(20);
    const pinned = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
      dependencies: Record<string, string>;
    };
    expect(pinned.dependencies["ts-fsrs"]).toBe(contract.library_version);
  });

  describe.each(contract.sequences)("recorded sequence $id", (seq) => {
    it("reproduces the frozen due dates, intervals and card state", async () => {
      const port = await createFsrsAdapter(contract.config);
      const { cards } = await replay(port, contract.start, seq.steps);
      const got = cards.map((c) => ({
        due: c.due.toISOString(),
        scheduled_days: c.scheduled_days,
        fsrs_state: c.fsrs_state,
        stability: c.stability,
        difficulty: c.difficulty,
        reps: c.reps,
        lapses: c.lapses,
      }));
      expect(got).toEqual(seq.expected);
    });

    it("yields whole-day intervals no longer than 180 days", () => {
      for (const e of seq.expected) {
        expect(Number.isInteger(e.scheduled_days)).toBe(true);
        expect(e.scheduled_days as number).toBeLessThanOrEqual(180);
      }
    });
  });

  it("caps the interval at the configured maximum", async () => {
    const port = await createFsrsAdapter({ maximumIntervalDays: 7 });
    const { cards } = await replay(port, contract.start, [
      { rating: 4, after_days: 0 },
      { rating: 4, after_days: 10 },
      { rating: 4, after_days: 30 },
    ]);
    expect(Math.max(...cards.map((c) => c.scheduled_days))).toBe(7);
  });

  it("is deterministic: the same history gives the same card twice", async () => {
    const steps = contract.sequences[3]?.steps ?? [];
    const a = await replay(await createFsrsAdapter(), contract.start, steps);
    const b = await replay(await createFsrsAdapter(), contract.start, steps);
    expect(a.cards).toEqual(b.cards);
  });
});

describe("desired retention (US-021)", () => {
  it("0.80 lengthens the interval against 0.85 for the same history (property)", async () => {
    const lo = await createFsrsAdapter({ desiredRetention: 0.8, maximumIntervalDays: 36500 });
    const hi = await createFsrsAdapter({ desiredRetention: 0.85, maximumIntervalDays: 36500 });
    const rating = fc.constantFrom<FsrsRating>(1, 2, 3, 4);
    const history = fc.array(fc.record({ rating, after_days: fc.integer({ min: 1, max: 60 }) }), { minLength: 1, maxLength: 6 });
    await fc.assert(
      fc.asyncProperty(history, rating, async (steps, last) => {
        const { cards, last: t } = await replay(hi, contract.start, [{ rating: 3, after_days: 0 }, ...steps]);
        const card = cards[cards.length - 1] as FsrsCard;
        const when = new Date(t.getTime() + 5 * DAY_MS);
        const dLo = (await lo.review(card, last, when)).card.scheduled_days;
        const dHi = (await hi.review(card, last, when)).card.scheduled_days;
        // Intervals are rounded to whole days, so short ones can tie at the 1-day floor; never shorter,
        // and clearly longer (ratio about 1.37) once the 0.85 interval is 10 days or more.
        expect(dLo).toBeGreaterThanOrEqual(dHi);
        if (dHi >= 10) expect(dLo).toBeGreaterThan(dHi);
      }),
      { numRuns: 60 },
    );
  });

  it("0.80 gives a strictly longer first interval for a Good rating", async () => {
    const lo = await createFsrsAdapter({ desiredRetention: 0.8 });
    const hi = await createFsrsAdapter({ desiredRetention: 0.85 });
    const t0 = new Date(contract.start);
    const a = (await lo.review(lo.newCard(t0), 3, t0)).card.scheduled_days;
    const b = (await hi.review(hi.newCard(t0), 3, t0)).card.scheduled_days;
    expect(a).toBeGreaterThan(b);
  });

  it.each([0, 1, -0.1, 1.2, Number.NaN])("rejects desired retention %s", async (r) => {
    await expect(createFsrsAdapter({ desiredRetention: r })).rejects.toThrow(RangeError);
  });

  it.each([0, 0.5, -3])("rejects maximum interval %s", async (m) => {
    await expect(createFsrsAdapter({ maximumIntervalDays: m })).rejects.toThrow(RangeError);
  });

  it("refuses a model or mode other than the pinned one", async () => {
    await expect(createFsrsAdapter({ enableShortTerm: true as unknown as false })).rejects.toThrow(RangeError);
    await expect(createFsrsAdapter({ version: "FSRS-7" as unknown as "FSRS-6" })).rejects.toThrow(RangeError);
  });
});

describe("retrievability and inputs", () => {
  it("is 0 for a new card, 1 at the review instant and decays to about 0.9 at one stability", async () => {
    const port = await createFsrsAdapter();
    const t0 = new Date(contract.start);
    expect(port.retrievability(port.newCard(t0), t0)).toBe(0);
    const card = (await port.review(port.newCard(t0), 3, t0)).card;
    expect(port.retrievability(card, t0)).toBe(1);
    const atStability = new Date(t0.getTime() + Math.round(card.stability) * DAY_MS);
    const r = port.retrievability(card, atStability);
    expect(r).toBeGreaterThan(0.8);
    expect(r).toBeLessThan(1);
    const later = port.retrievability(card, new Date(t0.getTime() + 60 * DAY_MS));
    expect(later).toBeLessThan(r);
  });

  it("treats a now before last_review as zero elapsed time instead of throwing", async () => {
    const port = await createFsrsAdapter();
    const t0 = new Date(contract.start);
    const card = (await port.review(port.newCard(t0), 3, t0)).card;
    const before = new Date(t0.getTime() - 3 * DAY_MS);
    expect(port.retrievability(card, before)).toBe(1);
    const out = await port.review(card, 3, before);
    expect(out.log.elapsed_days).toBe(0);
  });

  it.each([0, 5, 2.5, Number.NaN])("rejects rating %s", async (rating) => {
    const port = await createFsrsAdapter();
    const t0 = new Date(contract.start);
    await expect(port.review(port.newCard(t0), rating as FsrsRating, t0)).rejects.toThrow(RangeError);
  });

  it("rejects an invalid date", async () => {
    const port = await createFsrsAdapter();
    await expect(port.review(port.newCard(new Date(contract.start)), 3, new Date("nope"))).rejects.toThrow(TypeError);
  });
});

describe("skill_state mapping", () => {
  it("round-trips a card through the skill_state columns with fsrs_model fsrs-6", async () => {
    const port = await createFsrsAdapter();
    const t0 = new Date(contract.start);
    const first = await port.review(port.newCard(t0), 3, t0);
    const second = await port.review(first.card, 1, new Date(t0.getTime() + 6 * DAY_MS));
    const cols = toSkillStateColumns(second.card, second.log);
    expect(cols.fsrs_model).toBe("fsrs-6");
    expect(cols.fsrs_state).toBe(2);
    expect(cols.elapsed_days).toBe(6);
    expect(cols.lapses).toBe(1);
    expect(cols.fsrs_extra).toEqual({});
    expect(fromSkillStateColumns(cols)).toEqual(second.card);
  });

  it("keeps extra fields through a review and rejects an out-of-range state", async () => {
    const port = await createFsrsAdapter();
    const t0 = new Date(contract.start);
    const card: FsrsCard = { ...port.newCard(t0), extra: { note: 1 } };
    const out = await port.review(card, 3, t0);
    expect(out.card.extra).toEqual({ note: 1 });
    const row = toSkillStateColumns(out.card);
    expect(() => fromSkillStateColumns({ ...row, fsrs_state: 4 as 3 })).toThrow(RangeError);
  });
});
