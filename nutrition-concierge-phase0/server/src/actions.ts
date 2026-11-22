// Phase 0 actions for 栄養士コンシェルジュ.
// Scope (architecture doc 2026-11-21): アカウント / 子どものプロフィール /
// 食材マスタ初期データ. Chat, review queue and the 未食エンジン are later phases.

import { defineAction, z, type ActionsModule, type Ctx } from "@hatch/space-sdk";
import { asc, eq } from "drizzle-orm";
import * as schema from "./schema";
import { SEED_FOODS } from "./seed-foods";

const okResponse = z.object({ ok: z.literal(true) });

const accountShape = z.object({
  hasAccount: z.boolean(),
  displayName: z.string(),
  email: z.string(),
  notificationTime: z.string(),
});

const foodShape = z.object({
  id: z.number(),
  name: z.string(),
  aliases: z.string(),
  category: z.string(),
  allergenClass: z.enum(["none", "mandatory", "recommended"]),
  isCustom: z.boolean(),
});

const childShape = z.object({
  id: z.number(),
  nickname: z.string(),
  birthYearMonth: z.string(),
  attendsNursery: z.boolean(),
  nurseryName: z.string(),
  allergyFoodIds: z.array(z.number()),
  dislikes: z.string(),
  doctorHoursMemo: z.string(),
  notes: z.string(),
  statuses: z.array(
    z.object({
      foodId: z.number(),
      status: z.enum(["tried_ok", "watch", "eaten"]),
    }),
  ),
});

const stateResponse = z.object({
  account: accountShape,
  children: z.array(childShape),
  foods: z.array(foodShape),
});

type State = z.infer<typeof stateResponse>;

function parseIdList(raw: string): number[] {
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

async function loadState(ctx: Ctx): Promise<State> {
  const db = ctx.db<typeof schema>();
  const accountRows = await db
    .select()
    .from(schema.accounts)
    .orderBy(asc(schema.accounts.id))
    .limit(1);
  const accountRow = accountRows[0];
  const childRows = await db
    .select()
    .from(schema.children)
    .orderBy(asc(schema.children.id));
  const profileRows = await db.select().from(schema.childProfiles);
  const foodRows = await db
    .select()
    .from(schema.foods)
    .orderBy(asc(schema.foods.sortOrder), asc(schema.foods.id));
  const statusRows = await db.select().from(schema.childFoodStatus);

  const profileByChild = new Map(profileRows.map((p) => [p.childId, p]));
  const statusesByChild = new Map<number, { foodId: number; status: "tried_ok" | "watch" | "eaten" }[]>();
  for (const s of statusRows) {
    const list = statusesByChild.get(s.childId) ?? [];
    list.push({ foodId: s.foodId, status: s.status });
    statusesByChild.set(s.childId, list);
  }

  return {
    account: {
      hasAccount: accountRow != null,
      displayName: accountRow?.displayName ?? "",
      email: accountRow?.email ?? "",
      notificationTime: accountRow?.notificationTime ?? "日曜 19:00",
    },
    children: childRows.map((c) => {
      const p = profileByChild.get(c.id);
      return {
        id: c.id,
        nickname: c.nickname,
        birthYearMonth: c.birthYearMonth,
        attendsNursery: c.attendsNursery,
        nurseryName: c.nurseryName,
        allergyFoodIds: parseIdList(p?.allergyFoodIds ?? ""),
        dislikes: p?.dislikes ?? "",
        doctorHoursMemo: p?.doctorHoursMemo ?? "",
        notes: p?.notes ?? "",
        statuses: statusesByChild.get(c.id) ?? [],
      };
    }),
    foods: foodRows.map((f) => ({
      id: f.id,
      name: f.name,
      aliases: f.aliases,
      category: f.category,
      allergenClass: f.allergenClass,
      isCustom: f.isCustom,
    })),
  };
}

const childInput = {
  nickname: z.string().trim().min(1).max(30),
  birthYearMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "生年月は YYYY-MM 形式で入力してください"),
  attendsNursery: z.boolean(),
  nurseryName: z.string().trim().max(50),
  allergyFoodIds: z.array(z.number().int().positive()).max(29),
  dislikes: z.string().trim().max(300),
  doctorHoursMemo: z.string().trim().max(200),
  notes: z.string().trim().max(500),
};

async function upsertProfile(
  ctx: Ctx,
  childId: number,
  args: {
    allergyFoodIds: number[];
    dislikes: string;
    doctorHoursMemo: string;
    notes: string;
  },
) {
  const db = ctx.db<typeof schema>();
  const values = {
    childId,
    allergyFoodIds: args.allergyFoodIds.join(","),
    dislikes: args.dislikes,
    doctorHoursMemo: args.doctorHoursMemo,
    notes: args.notes,
  };
  const existing = await db
    .select()
    .from(schema.childProfiles)
    .where(eq(schema.childProfiles.childId, childId))
    .limit(1);
  if (existing[0]) {
    await db
      .update(schema.childProfiles)
      .set(values)
      .where(eq(schema.childProfiles.childId, childId));
  } else {
    await db.insert(schema.childProfiles).values(values);
  }
}

export const Actions = {
  getState: defineAction({
    description:
      "Returns the full Phase 0 state: account profile, children with profiles and food statuses, and the food master.",
    request: z.object({}),
    response: stateResponse,
    async handler(ctx): Promise<State> {
      return loadState(ctx);
    },
  }),

  seedFoodMaster: defineAction({
    description:
      "Seeds the initial food master (消費者庁 2026年4月改正の29品目 + よく出る食材) once; a no-op when foods already exist.",
    request: z.object({}),
    response: z.object({ inserted: z.number(), total: z.number() }),
    async handler(ctx): Promise<{ inserted: number; total: number }> {
      const db = ctx.db<typeof schema>();
      const existing = await db.select({ id: schema.foods.id }).from(schema.foods);
      if (existing.length > 0) {
        return { inserted: 0, total: existing.length };
      }
      await db.insert(schema.foods).values(
        SEED_FOODS.map((f, i) => ({
          name: f.name,
          aliases: f.aliases,
          category: f.category,
          allergenClass: f.allergenClass,
          isCustom: false,
          sortOrder: i,
        })),
      );
      ctx.invalidateQueries();
      return { inserted: SEED_FOODS.length, total: SEED_FOODS.length };
    },
  }),

  saveAccount: defineAction({
    description: "Creates or updates the single account profile (name, email, notification timing).",
    request: z.object({
      displayName: z.string().trim().max(50),
      email: z.string().trim().max(120),
      notificationTime: z.string().trim().min(1).max(30),
    }),
    response: okResponse,
    async handler(ctx, args): Promise<z.infer<typeof okResponse>> {
      const db = ctx.db<typeof schema>();
      const existing = await db
        .select()
        .from(schema.accounts)
        .orderBy(asc(schema.accounts.id))
        .limit(1);
      const values = {
        displayName: args.displayName,
        email: args.email,
        notificationTime: args.notificationTime,
        updatedAt: new Date(),
      };
      if (existing[0]) {
        await db
          .update(schema.accounts)
          .set(values)
          .where(eq(schema.accounts.id, existing[0].id));
      } else {
        await db.insert(schema.accounts).values(values);
      }
      ctx.invalidateQueries();
      return { ok: true as const };
    },
  }),

  createChild: defineAction({
    description: "Adds a child with birth year-month, nursery info, and profile (allergies, dislikes, doctor hours memo).",
    request: z.object(childInput),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const result = await db
        .insert(schema.children)
        .values({
          nickname: args.nickname,
          birthYearMonth: args.birthYearMonth,
          attendsNursery: args.attendsNursery,
          nurseryName: args.nurseryName,
        })
        .returning({ id: schema.children.id });
      const inserted = result[0];
      if (!inserted) throw new Error("createChild: insert returned no rows");
      await upsertProfile(ctx, inserted.id, args);
      ctx.invalidateQueries();
      return { id: inserted.id };
    },
  }),

  updateChild: defineAction({
    description: "Updates a child's basic info and profile fields.",
    request: z.object({ id: z.number().int().positive(), ...childInput }),
    response: okResponse,
    async handler(ctx, args): Promise<z.infer<typeof okResponse>> {
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.children)
        .set({
          nickname: args.nickname,
          birthYearMonth: args.birthYearMonth,
          attendsNursery: args.attendsNursery,
          nurseryName: args.nurseryName,
          updatedAt: new Date(),
        })
        .where(eq(schema.children.id, args.id));
      await upsertProfile(ctx, args.id, args);
      ctx.invalidateQueries();
      return { ok: true as const };
    },
  }),

  deleteChild: defineAction({
    description: "Deletes a child together with their profile and food statuses.",
    request: z.object({ id: z.number().int().positive() }),
    response: okResponse,
    async handler(ctx, args): Promise<z.infer<typeof okResponse>> {
      const db = ctx.db<typeof schema>();
      await db
        .delete(schema.childProfiles)
        .where(eq(schema.childProfiles.childId, args.id));
      await db
        .delete(schema.childFoodStatus)
        .where(eq(schema.childFoodStatus.childId, args.id));
      await db.delete(schema.children).where(eq(schema.children.id, args.id));
      ctx.invalidateQueries();
      return { ok: true as const };
    },
  }),

  addFood: defineAction({
    description: "Adds a custom food to the food master with aliases and allergen classification.",
    request: z.object({
      name: z.string().trim().min(1).max(30),
      aliases: z.string().trim().max(120),
      category: z.string().trim().min(1).max(30),
      allergenClass: z.enum(["none", "mandatory", "recommended"]),
    }),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const all = await db.select({ sortOrder: schema.foods.sortOrder }).from(schema.foods);
      const maxOrder = all.reduce((m, r) => Math.max(m, r.sortOrder), 0);
      const result = await db
        .insert(schema.foods)
        .values({ ...args, isCustom: true, sortOrder: maxOrder + 1 })
        .returning({ id: schema.foods.id });
      const inserted = result[0];
      if (!inserted) throw new Error("addFood: insert returned no rows");
      ctx.invalidateQueries();
      return { id: inserted.id };
    },
  }),

  updateFood: defineAction({
    description: "Updates a food master's name, aliases, category, or allergen classification.",
    request: z.object({
      id: z.number().int().positive(),
      name: z.string().trim().min(1).max(30),
      aliases: z.string().trim().max(120),
      category: z.string().trim().min(1).max(30),
      allergenClass: z.enum(["none", "mandatory", "recommended"]),
    }),
    response: okResponse,
    async handler(ctx, args): Promise<z.infer<typeof okResponse>> {
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.foods)
        .set({
          name: args.name,
          aliases: args.aliases,
          category: args.category,
          allergenClass: args.allergenClass,
        })
        .where(eq(schema.foods.id, args.id));
      ctx.invalidateQueries();
      return { ok: true as const };
    },
  }),

  deleteFood: defineAction({
    description: "Deletes a custom food from the master and any child statuses recorded for it.",
    request: z.object({ id: z.number().int().positive() }),
    response: okResponse,
    async handler(ctx, args): Promise<z.infer<typeof okResponse>> {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.foods)
        .where(eq(schema.foods.id, args.id))
        .limit(1);
      const food = rows[0];
      if (!food) throw new Error("食材が見つかりません");
      if (!food.isCustom) {
        throw new Error("初期データの食材は削除できません（編集は可能です）");
      }
      await db
        .delete(schema.childFoodStatus)
        .where(eq(schema.childFoodStatus.foodId, args.id));
      await db.delete(schema.foods).where(eq(schema.foods.id, args.id));
      ctx.invalidateQueries();
      return { ok: true as const };
    },
  }),

  setFoodStatus: defineAction({
    description:
      "Sets one child's status for one food (tried_ok / watch / eaten), or clears it back to untried.",
    request: z.object({
      childId: z.number().int().positive(),
      foodId: z.number().int().positive(),
      status: z.enum(["untried", "tried_ok", "watch", "eaten"]),
    }),
    response: okResponse,
    async handler(ctx, args): Promise<z.infer<typeof okResponse>> {
      const db = ctx.db<typeof schema>();
      // Targeted upsert/delete for the (child, food) pair.
      const existing = await db
        .select()
        .from(schema.childFoodStatus)
        .where(eq(schema.childFoodStatus.childId, args.childId));
      const row = existing.find((r) => r.foodId === args.foodId);
      if (args.status === "untried") {
        if (row) {
          await db
            .delete(schema.childFoodStatus)
            .where(eq(schema.childFoodStatus.id, row.id));
        }
      } else if (row) {
        await db
          .update(schema.childFoodStatus)
          .set({ status: args.status, updatedAt: new Date() })
          .where(eq(schema.childFoodStatus.id, row.id));
      } else {
        await db.insert(schema.childFoodStatus).values({
          childId: args.childId,
          foodId: args.foodId,
          status: args.status,
        });
      }
      ctx.invalidateQueries();
      return { ok: true as const };
    },
  }),
} satisfies ActionsModule;
