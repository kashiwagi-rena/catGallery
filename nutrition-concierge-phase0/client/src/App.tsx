// 栄養士コンシェルジュ Phase 0 試作
// Phase 0 の範囲: アカウント / 子どものプロフィール / 食材マスタ。
// チャット (Phase 1)・確認キュー (Phase 2)・未食エンジン (Phase 3) は未実装で、
// ロードマップとして設定タブに示す。

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { actionFields } from "@hatch/space-sdk/fields" with { type: "macro" };
import { api, type ApiRequest, type ApiResponse } from "./api";
import type { Actions } from "../../server/src/actions";

const FIELDS = actionFields<typeof Actions>();

type State = ApiResponse<typeof api, "getState">;
type Child = State["children"][number];
type Food = State["foods"][number];
type ChildArgs = ApiRequest<typeof api, "createChild">;
type FoodStatus = "untried" | "tried_ok" | "watch" | "eaten";

const STATUS_LABEL: Record<FoodStatus, string> = {
  untried: "未食",
  tried_ok: "試した",
  watch: "様子見",
  eaten: "食べた",
};
const STATUS_ORDER: FoodStatus[] = ["untried", "tried_ok", "watch", "eaten"];

const CATEGORIES = [
  "主食・穀類",
  "卵・乳製品",
  "肉類",
  "魚介類",
  "大豆・豆類",
  "野菜",
  "果物",
  "きのこ・海藻",
  "ナッツ・種実",
  "調味料・その他",
];

const NOTIFICATION_TIMES = ["日曜 19:00", "日曜 18:00", "日曜 20:00", "金曜 19:00", "月曜 8:00"];

function ageLabel(birthYearMonth: string): string {
  const [y = 2020, m = 1] = birthYearMonth.split("-").map(Number);
  const now = new Date();
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return years > 0 ? `${years}歳${rest}か月（月齢${months}か月）` : `月齢${months}か月`;
}

function AllergenBadge({ cls }: { cls: Food["allergenClass"] }) {
  if (cls === "mandatory") {
    return (
      <span className="shrink-0 rounded-full bg-[var(--warn)] px-2 py-0.5 text-xs font-medium text-white">
        義務
      </span>
    );
  }
  if (cls === "recommended") {
    return (
      <span className="shrink-0 rounded-full bg-[var(--persimmon)] px-2 py-0.5 text-xs font-medium text-white">
        推奨
      </span>
    );
  }
  return null;
}

function StatusPicker({
  value,
  onChange,
  foodName,
}: {
  value: FoodStatus;
  onChange: (s: FoodStatus) => void;
  foodName: string;
}) {
  return (
    <div
      role="group"
      aria-label={`${foodName}の食事ステータス`}
      className="flex shrink-0 overflow-hidden rounded-full border border-[var(--border)]"
    >
      {STATUS_ORDER.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={value === s}
          onClick={() => onChange(s)}
          className={`px-2.5 text-xs ${
            value === s
              ? s === "watch"
                ? "bg-[var(--persimmon)] font-semibold text-white"
                : "bg-[var(--accent)] font-semibold text-white"
              : "bg-[var(--surface)] text-[var(--dim)]"
          }`}
        >
          {STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Child form ---------------- */

function ChildForm({
  initial,
  allergenFoods,
  onSubmit,
  onCancel,
  submitting,
  error,
}: {
  initial: Child | null;
  allergenFoods: Food[];
  onSubmit: (args: ChildArgs) => void;
  onCancel: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const [nickname, setNickname] = useState(initial?.nickname ?? "");
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const initParts = (initial?.birthYearMonth ?? "").split("-").map(Number);
  const initYear = initParts[0];
  const initMonth = initParts[1];
  const [year, setYear] = useState<number>(
    initYear != null && Number.isFinite(initYear) && initYear >= 2018 ? initYear : 2023,
  );
  const [month, setMonth] = useState<number>(
    initMonth != null && Number.isFinite(initMonth) && initMonth >= 1 && initMonth <= 12
      ? initMonth
      : 1,
  );
  const [attends, setAttends] = useState(initial?.attendsNursery ?? false);
  const [nurseryName, setNurseryName] = useState(initial?.nurseryName ?? "");
  const [allergies, setAllergies] = useState<number[]>(initial?.allergyFoodIds ?? []);
  const [dislikes, setDislikes] = useState(initial?.dislikes ?? "");
  const [doctorMemo, setDoctorMemo] = useState(initial?.doctorHoursMemo ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const years = Array.from({ length: 10 }, (_, i) => 2018 + i);
  const mandatory = allergenFoods.filter((f) => f.allergenClass === "mandatory");
  const recommended = allergenFoods.filter((f) => f.allergenClass === "recommended");

  const toggleAllergy = (id: number) =>
    setAllergies((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const allergyChip = (f: Food) => {
    const active = allergies.includes(f.id);
    return (
      <button
        key={f.id}
        type="button"
        aria-pressed={active}
        onClick={() => toggleAllergy(f.id)}
        className={`rounded-full border px-3 py-1.5 text-sm ${
          active
            ? "border-[var(--warn)] bg-[var(--warn)] font-semibold text-white"
            : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
        }`}
      >
        {f.name}
      </button>
    );
  };

  return (
    <form
      className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!nickname.trim()) {
          setNicknameError("ニックネームを入力してください");
          return;
        }
        setNicknameError(null);
        onSubmit({
          nickname: nickname.trim(),
          birthYearMonth: `${year}-${String(month).padStart(2, "0")}`,
          attendsNursery: attends,
          nurseryName: attends ? nurseryName.trim() : "",
          allergyFoodIds: allergies,
          dislikes: dislikes.trim(),
          doctorHoursMemo: doctorMemo.trim(),
          notes: notes.trim(),
        });
      }}
    >
      <h3 className="font-display text-lg font-semibold">
        {initial ? "子どもの情報を編集" : "子どもを追加"}
      </h3>

      <label className="mt-4 block text-sm font-medium" htmlFor="child-nickname">
        ニックネーム
      </label>
      <input
        id="child-nickname"
        {...FIELDS.createChild.nickname}
        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="例：あおい"
      />
      {nicknameError && <p className="mt-1 text-sm text-[var(--warn)]">{nicknameError}</p>}

      <div className="mt-4 flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium" htmlFor="child-birth-year">
            生まれた年
          </label>
          <select
            id="child-birth-year"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium" htmlFor="child-birth-month">
            生まれた月
          </label>
          <select
            id="child-birth-month"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}月
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={attends}
          onChange={(e) => setAttends(e.target.checked)}
        />
        保育園・幼稚園に通っている
      </label>
      {attends && (
        <>
          <label className="mt-3 block text-sm font-medium" htmlFor="child-nursery">
            園の名前（任意）
          </label>
          <input
            id="child-nursery"
            {...FIELDS.createChild.nurseryName}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
            value={nurseryName}
            onChange={(e) => setNurseryName(e.target.value)}
          />
        </>
      )}

      <fieldset className="mt-5">
        <legend className="text-sm font-medium">
          アレルギー（表示枠組み29品目から選択）
        </legend>
        <p className="mt-1 text-xs text-[var(--dim)]">特定原材料（表示義務）9品目</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">{mandatory.map(allergyChip)}</div>
        <p className="mt-3 text-xs text-[var(--dim)]">特定原材料に準ずるもの（表示推奨）20品目</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">{recommended.map(allergyChip)}</div>
      </fieldset>

      <label className="mt-4 block text-sm font-medium" htmlFor="child-dislikes">
        苦手なもの・食べ方の様子
      </label>
      <textarea
        id="child-dislikes"
        {...FIELDS.createChild.dislikes}
        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
        rows={2}
        value={dislikes}
        onChange={(e) => setDislikes(e.target.value)}
        placeholder="例：トマトが苦手。緑の野菜は刻むと食べる"
      />

      <label className="mt-4 block text-sm font-medium" htmlFor="child-doctor">
        かかりつけ医の診療時間メモ
      </label>
      <input
        id="child-doctor"
        {...FIELDS.createChild.doctorHoursMemo}
        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
        value={doctorMemo}
        onChange={(e) => setDoctorMemo(e.target.value)}
        placeholder="例：平日 9:00–12:00 / 15:00–18:00、土曜午前のみ"
      />

      <label className="mt-4 block text-sm font-medium" htmlFor="child-notes">
        メモ
      </label>
      <textarea
        id="child-notes"
        {...FIELDS.createChild.notes}
        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {error && <p className="mt-3 text-sm text-[var(--warn)]">保存できませんでした：{error}</p>}

      <div className="mt-5 flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-full bg-[var(--accent)] px-4 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "保存中…" : "保存する"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-[var(--border)] px-4 py-2.5"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}

/* ---------------- Food form ---------------- */

function FoodForm({
  initial,
  onSubmit,
  onCancel,
  onDelete,
  submitting,
  error,
}: {
  initial: Food | null;
  onSubmit: (args: {
    name: string;
    aliases: string;
    category: string;
    allergenClass: Food["allergenClass"];
  }) => void;
  onCancel: () => void;
  onDelete: (() => void) | null;
  submitting: boolean;
  error: string | null;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [aliases, setAliases] = useState(initial?.aliases ?? "");
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0]!);
  const [allergenClass, setAllergenClass] = useState<Food["allergenClass"]>(
    initial?.allergenClass ?? "none",
  );

  return (
    <form
      className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) {
          setNameError("食材名を入力してください");
          return;
        }
        setNameError(null);
        onSubmit({
          name: name.trim(),
          aliases: aliases.trim(),
          category,
          allergenClass,
        });
      }}
    >
      <h3 className="font-display text-lg font-semibold">
        {initial ? "食材を編集" : "食材を追加"}
      </h3>

      <label className="mt-4 block text-sm font-medium" htmlFor="food-name">
        食材名
      </label>
      <input
        id="food-name"
        {...FIELDS.addFood.name}
        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="例：ずいき"
      />
      {nameError && <p className="mt-1 text-sm text-[var(--warn)]">{nameError}</p>}

      <label className="mt-4 block text-sm font-medium" htmlFor="food-aliases">
        別名・表記ゆれ（カンマ区切り）
      </label>
      <input
        id="food-aliases"
        {...FIELDS.addFood.aliases}
        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
        value={aliases}
        onChange={(e) => setAliases(e.target.value)}
        placeholder="例：ズイキ"
      />

      <div className="mt-4 flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium" htmlFor="food-category">
            カテゴリ
          </label>
          <select
            id="food-category"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium" htmlFor="food-allergen">
            アレルギー区分
          </label>
          <select
            id="food-allergen"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
            value={allergenClass}
            onChange={(e) => setAllergenClass(e.target.value as Food["allergenClass"])}
          >
            <option value="none">区分なし</option>
            <option value="mandatory">特定原材料（義務）</option>
            <option value="recommended">準ずるもの（推奨）</option>
          </select>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-[var(--warn)]">{error}</p>}

      <div className="mt-5 flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-full bg-[var(--accent)] px-4 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "保存中…" : "保存する"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-[var(--border)] px-4 py-2.5"
        >
          キャンセル
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full border border-[var(--warn)] px-4 py-2.5 text-[var(--warn)]"
          >
            削除
          </button>
        )}
      </div>
    </form>
  );
}

/* ---------------- App ---------------- */

type Tab = "children" | "foods" | "settings";

export function App() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("children");
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [editingChild, setEditingChild] = useState<Child | "new" | null>(null);
  const [editingFood, setEditingFood] = useState<Food | "new" | null>(null);
  const [childFormError, setChildFormError] = useState<string | null>(null);
  const [foodFormError, setFoodFormError] = useState<string | null>(null);
  const [childSearch, setChildSearch] = useState("");
  const [foodSearch, setFoodSearch] = useState("");
  const [foodFilter, setFoodFilter] = useState<"all" | "mandatory" | "recommended" | "none" | "custom">("all");
  const [confirmDeleteChild, setConfirmDeleteChild] = useState(false);
  const seededRef = useRef(false);

  const state = useQuery({ queryKey: ["state"], queryFn: () => api.getState({}) });

  const seed = useMutation({
    mutationFn: () => api.seedFoodMaster({}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["state"] }),
  });

  useEffect(() => {
    if (state.data && state.data.foods.length === 0 && !seededRef.current) {
      seededRef.current = true;
      seed.mutate();
    }
  }, [state.data, seed]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["state"] });

  const saveChild = useMutation({
    mutationFn: async (args: ChildArgs) =>
      editingChild && editingChild !== "new"
        ? await api.updateChild({ id: editingChild.id, ...args })
        : await api.createChild(args),
    onSuccess: () => {
      invalidate();
      setEditingChild(null);
      setChildFormError(null);
    },
    onError: (e) => setChildFormError(e.message),
  });

  const deleteChild = useMutation({
    mutationFn: (id: number) => api.deleteChild({ id }),
    onSuccess: () => {
      invalidate();
      setEditingChild(null);
      setSelectedChildId(null);
      setConfirmDeleteChild(false);
    },
    onError: (e) => setChildFormError(e.message),
  });

  const saveFood = useMutation({
    mutationFn: async (args: {
      name: string;
      aliases: string;
      category: string;
      allergenClass: Food["allergenClass"];
    }) =>
      editingFood && editingFood !== "new"
        ? await api.updateFood({ id: editingFood.id, ...args })
        : await api.addFood(args),
    onSuccess: () => {
      invalidate();
      setEditingFood(null);
      setFoodFormError(null);
    },
    onError: (e) => setFoodFormError(e.message),
  });

  const deleteFood = useMutation({
    mutationFn: (id: number) => api.deleteFood({ id }),
    onSuccess: () => {
      invalidate();
      setEditingFood(null);
      setFoodFormError(null);
    },
    onError: (e) => setFoodFormError(e.message),
  });

  const setStatus = useMutation({
    mutationFn: (v: { childId: number; foodId: number; status: FoodStatus }) =>
      api.setFoodStatus(v),
    onSuccess: invalidate,
  });

  const [accountError, setAccountError] = useState<string | null>(null);
  const saveAccount = useMutation({
    mutationFn: (args: ApiRequest<typeof api, "saveAccount">) => api.saveAccount(args),
    onSuccess: () => {
      invalidate();
      setAccountError(null);
    },
    onError: (e) => setAccountError(e.message),
  });

  const data = state.data;
  const foods = useMemo(() => data?.foods ?? [], [data]);
  const foodById = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);
  const allergenFoods = useMemo(
    () => foods.filter((f) => f.allergenClass !== "none"),
    [foods],
  );
  const children = data?.children ?? [];
  const selectedChild =
    children.find((c) => c.id === selectedChildId) ?? children[0] ?? null;

  const statusOf = (child: Child, foodId: number): FoodStatus => {
    const s = child.statuses.find((x) => x.foodId === foodId);
    return s ? s.status : "untried";
  };

  const counts = selectedChild
    ? {
        untried: foods.filter((f) => statusOf(selectedChild, f.id) === "untried").length,
        tried_ok: selectedChild.statuses.filter((s) => s.status === "tried_ok").length,
        watch: selectedChild.statuses.filter((s) => s.status === "watch").length,
        eaten: selectedChild.statuses.filter((s) => s.status === "eaten").length,
      }
    : null;

  const matchesSearch = (f: Food, q: string) =>
    q.trim() === "" ||
    f.name.includes(q.trim()) ||
    f.aliases.split(",").some((a) => a.trim() !== "" && a.trim().includes(q.trim()));

  const childFoodRows = selectedChild
    ? foods.filter((f) => matchesSearch(f, childSearch))
    : [];
  const recordedRows = childFoodRows.filter((f) =>
    selectedChild ? statusOf(selectedChild, f.id) !== "untried" : false,
  );
  const untriedRows = childFoodRows.filter((f) =>
    selectedChild ? statusOf(selectedChild, f.id) === "untried" : false,
  );

  const filteredFoods = foods.filter((f) => {
    if (!matchesSearch(f, foodSearch)) return false;
    if (foodFilter === "all") return true;
    if (foodFilter === "custom") return f.isCustom;
    return f.allergenClass === foodFilter;
  });

  const groupByCategory = (list: Food[]) => {
    const map = new Map<string, Food[]>();
    for (const f of list) {
      const arr = map.get(f.category) ?? [];
      arr.push(f);
      map.set(f.category, arr);
    }
    return CATEGORIES.filter((c) => map.has(c)).map((c) => ({
      category: c,
      items: map.get(c)!,
    }));
  };

  const account = data?.account;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg)] pt-safe">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <p className="font-display text-base font-semibold">Phase 0：土台づくり</p>
          <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs text-[var(--accent)]">
            試作
          </span>
        </div>
        <nav aria-label="画面切り替え" className="mx-auto flex max-w-3xl gap-1 px-4 pb-2">
          {(
            [
              ["children", "子どもと未食"],
              ["foods", "食材マスタ"],
              ["settings", "設定"],
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-full px-3 py-2 text-sm ${
                tab === t
                  ? "bg-[var(--accent)] font-semibold text-white"
                  : "bg-[var(--surface)] text-[var(--dim)]"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-10">
        {state.isPending && <p className="py-12 text-center text-[var(--dim)]">読み込み中…</p>}
        {state.error && (
          <p className="py-12 text-center text-[var(--warn)]">
            読み込めませんでした。再度お試しください。
          </p>
        )}

        {data && tab === "children" && (
          <section aria-label="子どもと未食リスト">
            {children.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="子どもの切り替え">
                {children.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={selectedChild?.id === c.id}
                    onClick={() => setSelectedChildId(c.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      selectedChild?.id === c.id
                        ? "border-[var(--accent)] bg-[var(--accent)] font-semibold text-white"
                        : "border-[var(--border)] bg-[var(--surface)]"
                    }`}
                  >
                    {c.nickname}
                  </button>
                ))}
              </div>
            )}

            {editingChild === "new" && (
              <div className="mt-4">
                <ChildForm
                  initial={null}
                  allergenFoods={allergenFoods}
                  onSubmit={(args) => saveChild.mutate(args)}
                  onCancel={() => setEditingChild(null)}
                  submitting={saveChild.isPending}
                  error={childFormError}
                />
              </div>
            )}

            {!selectedChild && editingChild !== "new" && (
              <div className="mt-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
                <p className="font-display text-lg font-semibold">まだ子どもが登録されていません</p>
                <p className="mt-2 text-sm text-[var(--dim)]">
                  最初の子どものプロフィールを登録すると、未食リストの管理を始められます。
                </p>
                <button
                  type="button"
                  onClick={() => setEditingChild("new")}
                  className="mt-4 rounded-full bg-[var(--accent)] px-5 py-2.5 font-semibold text-white"
                >
                  子どもを追加
                </button>
              </div>
            )}

            {selectedChild && editingChild !== "new" && (
              <>
                {editingChild ? (
                  <div className="mt-4">
                    <ChildForm
                      initial={editingChild}
                      allergenFoods={allergenFoods}
                      onSubmit={(args) => saveChild.mutate(args)}
                      onCancel={() => setEditingChild(null)}
                      submitting={saveChild.isPending}
                      error={childFormError}
                    />
                    <div className="mt-3 rounded-[var(--radius)] border border-[var(--warn)] bg-[var(--surface)] p-4">
                      {confirmDeleteChild ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm">
                            「{selectedChild.nickname}」のプロフィールと食事ステータスを削除しますか？
                          </p>
                          <button
                            type="button"
                            onClick={() => deleteChild.mutate(selectedChild.id)}
                            className="rounded-full bg-[var(--warn)] px-4 py-2 text-sm font-semibold text-white"
                          >
                            削除する
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteChild(false)}
                            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm"
                          >
                            やめる
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteChild(true)}
                          className="text-sm text-[var(--warn)]"
                        >
                          この子どもを削除
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Hero: child summary */}
                    <div className="mt-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="font-display text-2xl font-semibold">
                            {selectedChild.nickname}
                          </h2>
                          <p className="mt-1 text-sm text-[var(--dim)]">
                            {ageLabel(selectedChild.birthYearMonth)}
                            {selectedChild.attendsNursery &&
                              ` ・ ${selectedChild.nurseryName || "園に通園中"}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setChildFormError(null);
                            setEditingChild(selectedChild);
                          }}
                          className="shrink-0 rounded-full border border-[var(--border)] px-4 py-2 text-sm"
                        >
                          編集
                        </button>
                      </div>

                      {counts && (
                        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                          {(
                            [
                              ["未食", counts.untried],
                              ["試した", counts.tried_ok],
                              ["様子見", counts.watch],
                              ["食べた", counts.eaten],
                            ] as [string, number][]
                          ).map(([label, n]) => (
                            <div
                              key={label}
                              className="rounded-lg bg-[var(--surface-alt)] px-1 py-2"
                            >
                              <p className="font-display text-xl font-semibold">{n}</p>
                              <p className="text-xs text-[var(--dim)]">{label}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {selectedChild.allergyFoodIds.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-medium text-[var(--dim)]">アレルギー</p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {selectedChild.allergyFoodIds.map((id) => {
                              const f = foodById.get(id);
                              if (!f) return null;
                              return (
                                <span
                                  key={id}
                                  className={`rounded-full px-2.5 py-1 text-xs font-medium text-white ${
                                    f.allergenClass === "mandatory"
                                      ? "bg-[var(--warn)]"
                                      : "bg-[var(--persimmon)]"
                                  }`}
                                >
                                  {f.name}
                                  {f.allergenClass === "mandatory" ? "（義務）" : "（推奨）"}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {(selectedChild.dislikes ||
                        selectedChild.doctorHoursMemo ||
                        selectedChild.notes) && (
                        <dl className="mt-4 space-y-2 text-sm">
                          {selectedChild.dislikes && (
                            <div>
                              <dt className="text-xs text-[var(--dim)]">苦手なもの・食べ方の様子</dt>
                              <dd className="mt-0.5 whitespace-pre-wrap">{selectedChild.dislikes}</dd>
                            </div>
                          )}
                          {selectedChild.doctorHoursMemo && (
                            <div>
                              <dt className="text-xs text-[var(--dim)]">かかりつけ医の診療時間</dt>
                              <dd className="mt-0.5 whitespace-pre-wrap">
                                {selectedChild.doctorHoursMemo}
                              </dd>
                            </div>
                          )}
                          {selectedChild.notes && (
                            <div>
                              <dt className="text-xs text-[var(--dim)]">メモ</dt>
                              <dd className="mt-0.5 whitespace-pre-wrap">{selectedChild.notes}</dd>
                            </div>
                          )}
                        </dl>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditingChild("new")}
                      className="mt-3 w-full rounded-full border border-dashed border-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent)]"
                    >
                      ＋ 子どもを追加
                    </button>

                    {/* Food status management */}
                    <div className="mt-6">
                      <h3 className="font-display text-lg font-semibold">食材の記録と未食リスト</h3>
                      <label className="sr-only" htmlFor="child-food-search">
                        食材を検索
                      </label>
                      <input
                        id="child-food-search"
                        className="mt-2 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5"
                        value={childSearch}
                        onChange={(e) => setChildSearch(e.target.value)}
                        placeholder="食材名・別名で検索（例：たまご）"
                      />

                      {recordedRows.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold text-[var(--dim)]">
                            記録あり（{recordedRows.length}）
                          </h4>
                          <ul className="mt-2 divide-y divide-[var(--border)] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
                            {recordedRows.map((f) => (
                              <li
                                key={f.id}
                                className="flex items-center justify-between gap-2 px-3 py-2"
                              >
                                <span className="flex min-w-0 flex-1 items-center gap-2">
                                  <span className="font-medium leading-snug">{f.name}</span>
                                  <AllergenBadge cls={f.allergenClass} />
                                </span>
                                <StatusPicker
                                  value={statusOf(selectedChild, f.id)}
                                  foodName={f.name}
                                  onChange={(s) =>
                                    setStatus.mutate({
                                      childId: selectedChild.id,
                                      foodId: f.id,
                                      status: s,
                                    })
                                  }
                                />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-[var(--dim)]">
                          未食リスト（{untriedRows.length}）
                        </h4>
                        {groupByCategory(untriedRows).map((g) => (
                          <div key={g.category} className="mt-3">
                            <p className="text-xs font-medium text-[var(--dim)]">{g.category}</p>
                            <ul className="mt-1.5 divide-y divide-[var(--border)] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
                              {g.items.map((f) => (
                                <li
                                  key={f.id}
                                  className="flex items-center justify-between gap-2 px-3 py-2"
                                >
                                  <span className="flex min-w-0 flex-1 items-center gap-2">
                                    <span className="leading-snug">{f.name}</span>
                                    <AllergenBadge cls={f.allergenClass} />
                                  </span>
                                  <StatusPicker
                                    value="untried"
                                    foodName={f.name}
                                    onChange={(s) =>
                                      setStatus.mutate({
                                        childId: selectedChild.id,
                                        foodId: f.id,
                                        status: s,
                                      })
                                    }
                                  />
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                        {untriedRows.length === 0 && recordedRows.length === 0 && (
                          <p className="mt-3 text-sm text-[var(--dim)]">
                            条件に合う食材がありません。
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        )}

        {data && tab === "foods" && (
          <section aria-label="食材マスタ" className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold">
                食材マスタ
                <span className="ml-2 text-sm font-normal text-[var(--dim)]">
                  {foods.length}品目
                </span>
              </h2>
              <button
                type="button"
                onClick={() => {
                  setFoodFormError(null);
                  setEditingFood("new");
                }}
                className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
              >
                食材を追加
              </button>
            </div>
            <p className="mt-1 text-sm text-[var(--dim)]">
              アレルギー区分は消費者庁の食品表示基準（2026年4月改正）：特定原材料（義務）9品目・準ずるもの（推奨）20品目。
            </p>

            {editingFood && (
              <div className="mt-4">
                <FoodForm
                  initial={editingFood === "new" ? null : editingFood}
                  onSubmit={(args) => saveFood.mutate(args)}
                  onCancel={() => setEditingFood(null)}
                  onDelete={
                    editingFood !== "new" && editingFood.isCustom
                      ? () => deleteFood.mutate(editingFood.id)
                      : null
                  }
                  submitting={saveFood.isPending}
                  error={foodFormError}
                />
              </div>
            )}

            <label className="sr-only" htmlFor="food-search">
              食材を検索
            </label>
            <input
              id="food-search"
              className="mt-4 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5"
              value={foodSearch}
              onChange={(e) => setFoodSearch(e.target.value)}
              placeholder="食材名・別名で検索（例：玉子）"
            />
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="アレルギー区分で絞り込み">
              {(
                [
                  ["all", "すべて"],
                  ["mandatory", "義務9品目"],
                  ["recommended", "推奨20品目"],
                  ["none", "区分なし"],
                  ["custom", "追加した食材"],
                ] as [typeof foodFilter, string][]
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={foodFilter === v}
                  onClick={() => setFoodFilter(v)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    foodFilter === v
                      ? "border-[var(--accent)] bg-[var(--accent)] font-semibold text-white"
                      : "border-[var(--border)] bg-[var(--surface)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {groupByCategory(filteredFoods).map((g) => (
              <div key={g.category} className="mt-5">
                <h3 className="text-sm font-semibold text-[var(--dim)]">
                  {g.category}（{g.items.length}）
                </h3>
                <ul className="mt-1.5 divide-y divide-[var(--border)] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
                  {g.items.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2">
                          <span className="truncate font-medium">{f.name}</span>
                          <AllergenBadge cls={f.allergenClass} />
                          {f.isCustom && (
                            <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs text-[var(--accent)]">
                              追加
                            </span>
                          )}
                        </p>
                        {f.aliases && (
                          <p className="mt-0.5 truncate text-xs text-[var(--dim)]">
                            別名：{f.aliases}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label={`${f.name}を編集`}
                        onClick={() => {
                          setFoodFormError(null);
                          setEditingFood(f);
                        }}
                        className="shrink-0 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm"
                      >
                        編集
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {filteredFoods.length === 0 && (
              <p className="mt-6 text-center text-sm text-[var(--dim)]">
                条件に合う食材がありません。
              </p>
            )}
          </section>
        )}

        {data && tab === "settings" && (
          <section aria-label="設定" className="mt-4">
            <h2 className="font-display text-xl font-semibold">アカウント</h2>
            <AccountForm
              key={account ? `${account.displayName}|${account.email}|${account.notificationTime}` : "empty"}
              initial={account ?? { hasAccount: false, displayName: "", email: "", notificationTime: "日曜 19:00" }}
              onSave={(args) => saveAccount.mutate(args)}
              saving={saveAccount.isPending}
              saved={saveAccount.isSuccess}
              error={accountError}
            />

            <h2 className="font-display mt-8 text-xl font-semibold">作る順序（アーキテクチャ文書より）</h2>
            <ol className="mt-3 space-y-2">
              {[
                ["Phase 0", "アカウント、子どものプロフィール、食材マスタの初期データ", "この試作"],
                ["Phase 1", "チャット即答＋安全ガード（ルール判定）", "未着手"],
                ["Phase 2", "確認ボタン、確認キュー、栄養士コンソール、スタンプ／訂正配信", "未着手"],
                ["Phase 3", "未食リスト、献立の貼り付け登録、照合、週次バッチの先回り通知、試した記録", "未着手"],
                ["Phase 4以降", "献立表の写真からの自動取り込み、食事写真の判定ほか", "未着手"],
              ].map(([phase, desc, status]) => (
                <li
                  key={phase}
                  className="flex items-start justify-between gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{phase}</p>
                    <p className="mt-0.5 text-sm text-[var(--dim)]">{desc}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                      status === "この試作"
                        ? "bg-[var(--accent)] font-semibold text-white"
                        : "bg-[var(--surface-alt)] text-[var(--dim)]"
                    }`}
                  >
                    {status}
                  </span>
                </li>
              ))}
            </ol>

            <h2 className="font-display mt-8 text-xl font-semibold">決定事項（2026-11-22）</h2>
            <ul className="mt-3 list-disc space-y-1.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-6 py-4 text-sm">
              <li>基盤：Cloudflare＋Turso（最安構成）／形と認証：PWA＋メールリンク認証</li>
              <li>LLM：提供元は今は決めず、Phase 1前に比較して決める</li>
              <li>安全：即答を止めるのは一番危ない範囲だけ（症状が出ている・窒息・体調不良）</li>
              <li>食材マスタ：表示枠組みを土台に100〜200品目から（この試作は{foods.length}品目）</li>
              <li>先回り通知：日曜19時ごろに翌週分をまとめて</li>
              <li>広告：MVPからAdSenseを入れる（審査対応・プライバシーポリシー・カテゴリ制限を含む）。置き場所はホーム画面などに限定</li>
            </ul>
            <p className="mt-3 text-xs text-[var(--dim)]">
              この試作はMuse上のプロトタイプです。本番のPWA＋メールリンク認証とCloudflare＋Tursoへの移行は、実サービス開発時に行います。
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

function AccountForm({
  initial,
  onSave,
  saving,
  saved,
  error,
}: {
  initial: { displayName: string; email: string; notificationTime: string };
  onSave: (args: { displayName: string; email: string; notificationTime: string }) => void;
  saving: boolean;
  saved: boolean;
  error: string | null;
}) {
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [email, setEmail] = useState(initial.email);
  const [notificationTime, setNotificationTime] = useState(initial.notificationTime);

  return (
    <form
      className="mt-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          displayName: displayName.trim(),
          email: email.trim(),
          notificationTime,
        });
      }}
    >
      <label className="block text-sm font-medium" htmlFor="account-name">
        表示名
      </label>
      <input
        id="account-name"
        {...FIELDS.saveAccount.displayName}
        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="例：KASHIWAGI"
      />
      <label className="mt-4 block text-sm font-medium" htmlFor="account-email">
        メールアドレス（本番ではメールリンク認証に使用）
      </label>
      <input
        id="account-email"
        {...FIELDS.saveAccount.email}
        type="email"
        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label className="mt-4 block text-sm font-medium" htmlFor="account-notification">
        先回り通知のタイミング（決定：日曜19時ごろ）
      </label>
      <select
        id="account-notification"
        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
        value={notificationTime}
        onChange={(e) => setNotificationTime(e.target.value)}
      >
        {NOTIFICATION_TIMES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      {error && <p className="mt-3 text-sm text-[var(--warn)]">保存できませんでした：{error}</p>}
      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[var(--accent)] px-5 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存する"}
        </button>
        {saved && !saving && <p className="text-sm text-[var(--accent)]">保存しました</p>}
      </div>
    </form>
  );
}
