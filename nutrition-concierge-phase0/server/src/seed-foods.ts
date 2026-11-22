// 食材マスタ初期データ (Phase 0)。
// アレルギー区分は消費者庁の食品表示基準 (2026年4月1日改正) に準拠:
//   特定原材料 (表示義務) 9品目 / 特定原材料に準ずるもの (表示推奨) 20品目。
// それ以外は未就学児の給食・家庭でよく出る食材から選んだ。
// aliases は表記ゆれ・別名 (照合の漏れ防止のためマスタ側で吸収する)。

export type SeedFood = {
  name: string;
  aliases: string;
  category: string;
  allergenClass: "none" | "mandatory" | "recommended";
};

const M = "mandatory" as const;
const R = "recommended" as const;
const N = "none" as const;

export const FOOD_CATEGORIES = [
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
] as const;

export const SEED_FOODS: SeedFood[] = [
  // ---- 特定原材料 (表示義務9品目) ----
  { name: "卵", aliases: "たまご,玉子,エッグ", category: "卵・乳製品", allergenClass: M },
  { name: "牛乳", aliases: "乳,ミルク", category: "卵・乳製品", allergenClass: M },
  { name: "小麦", aliases: "小麦粉,こむぎ", category: "主食・穀類", allergenClass: M },
  { name: "そば", aliases: "蕎麦", category: "主食・穀類", allergenClass: M },
  { name: "えび", aliases: "エビ,海老", category: "魚介類", allergenClass: M },
  { name: "かに", aliases: "カニ,蟹", category: "魚介類", allergenClass: M },
  { name: "落花生", aliases: "ピーナッツ", category: "ナッツ・種実", allergenClass: M },
  { name: "くるみ", aliases: "クルミ,胡桃", category: "ナッツ・種実", allergenClass: M },
  { name: "カシューナッツ", aliases: "カシュー", category: "ナッツ・種実", allergenClass: M },

  // ---- 特定原材料に準ずるもの (表示推奨20品目) ----
  { name: "大豆", aliases: "ダイズ", category: "大豆・豆類", allergenClass: R },
  { name: "牛肉", aliases: "ぎゅうにく,ビーフ", category: "肉類", allergenClass: R },
  { name: "豚肉", aliases: "ぶたにく,ポーク", category: "肉類", allergenClass: R },
  { name: "鶏肉", aliases: "とりにく,チキン", category: "肉類", allergenClass: R },
  { name: "さけ", aliases: "鮭,シャケ,サーモン", category: "魚介類", allergenClass: R },
  { name: "さば", aliases: "鯖", category: "魚介類", allergenClass: R },
  { name: "いか", aliases: "イカ", category: "魚介類", allergenClass: R },
  { name: "いくら", aliases: "イクラ", category: "魚介類", allergenClass: R },
  { name: "あわび", aliases: "アワビ", category: "魚介類", allergenClass: R },
  { name: "ごま", aliases: "ゴマ,胡麻", category: "ナッツ・種実", allergenClass: R },
  { name: "アーモンド", aliases: "", category: "ナッツ・種実", allergenClass: R },
  { name: "ピスタチオ", aliases: "", category: "ナッツ・種実", allergenClass: R },
  { name: "マカダミアナッツ", aliases: "マカデミアナッツ", category: "ナッツ・種実", allergenClass: R },
  { name: "オレンジ", aliases: "", category: "果物", allergenClass: R },
  { name: "キウイフルーツ", aliases: "キウイ", category: "果物", allergenClass: R },
  { name: "バナナ", aliases: "", category: "果物", allergenClass: R },
  { name: "もも", aliases: "モモ,桃", category: "果物", allergenClass: R },
  { name: "りんご", aliases: "リンゴ,林檎", category: "果物", allergenClass: R },
  { name: "やまいも", aliases: "山芋", category: "野菜", allergenClass: R },
  { name: "ゼラチン", aliases: "", category: "調味料・その他", allergenClass: R },

  // ---- 主食・穀類 ----
  { name: "米", aliases: "ごはん,白米,うるち米", category: "主食・穀類", allergenClass: N },
  { name: "玄米", aliases: "", category: "主食・穀類", allergenClass: N },
  { name: "パン", aliases: "食パン", category: "主食・穀類", allergenClass: N },
  { name: "うどん", aliases: "", category: "主食・穀類", allergenClass: N },
  { name: "そうめん", aliases: "素麺", category: "主食・穀類", allergenClass: N },
  { name: "スパゲッティ", aliases: "パスタ,マカロニ", category: "主食・穀類", allergenClass: N },
  { name: "中華麺", aliases: "ラーメン", category: "主食・穀類", allergenClass: N },
  { name: "もち", aliases: "餅", category: "主食・穀類", allergenClass: N },
  { name: "オートミール", aliases: "", category: "主食・穀類", allergenClass: N },
  { name: "コーンフレーク", aliases: "", category: "主食・穀類", allergenClass: N },
  { name: "大麦", aliases: "麦ごはん", category: "主食・穀類", allergenClass: N },
  { name: "とうもろこし", aliases: "コーン", category: "主食・穀類", allergenClass: N },
  { name: "さつまいも", aliases: "サツマイモ,薩摩芋", category: "主食・穀類", allergenClass: N },
  { name: "じゃがいも", aliases: "ジャガイモ,馬鈴薯", category: "主食・穀類", allergenClass: N },
  { name: "里芋", aliases: "さといも", category: "主食・穀類", allergenClass: N },

  // ---- 卵・乳製品 ----
  { name: "ヨーグルト", aliases: "", category: "卵・乳製品", allergenClass: N },
  { name: "チーズ", aliases: "", category: "卵・乳製品", allergenClass: N },
  { name: "バター", aliases: "", category: "卵・乳製品", allergenClass: N },
  { name: "生クリーム", aliases: "", category: "卵・乳製品", allergenClass: N },

  // ---- 肉類 ----
  { name: "合いびき肉", aliases: "合挽き肉,ひき肉", category: "肉類", allergenClass: N },
  { name: "ウインナー", aliases: "ソーセージ", category: "肉類", allergenClass: N },
  { name: "ハム", aliases: "", category: "肉類", allergenClass: N },
  { name: "ベーコン", aliases: "", category: "肉類", allergenClass: N },

  // ---- 魚介類 ----
  { name: "たら", aliases: "鱈", category: "魚介類", allergenClass: N },
  { name: "かれい", aliases: "カレイ", category: "魚介類", allergenClass: N },
  { name: "たい", aliases: "鯛", category: "魚介類", allergenClass: N },
  { name: "まぐろ", aliases: "マグロ,ツナ", category: "魚介類", allergenClass: N },
  { name: "かつお", aliases: "カツオ,鰹", category: "魚介類", allergenClass: N },
  { name: "あじ", aliases: "アジ,鯵", category: "魚介類", allergenClass: N },
  { name: "いわし", aliases: "イワシ,鰯", category: "魚介類", allergenClass: N },
  { name: "しらす", aliases: "シラス", category: "魚介類", allergenClass: N },
  { name: "ほたて", aliases: "ホタテ,帆立", category: "魚介類", allergenClass: N },
  { name: "あさり", aliases: "アサリ", category: "魚介類", allergenClass: N },
  { name: "しじみ", aliases: "シジミ", category: "魚介類", allergenClass: N },

  // ---- 大豆・豆類 ----
  { name: "豆腐", aliases: "とうふ", category: "大豆・豆類", allergenClass: N },
  { name: "納豆", aliases: "なっとう", category: "大豆・豆類", allergenClass: N },
  { name: "油揚げ", aliases: "", category: "大豆・豆類", allergenClass: N },
  { name: "厚揚げ", aliases: "", category: "大豆・豆類", allergenClass: N },
  { name: "豆乳", aliases: "", category: "大豆・豆類", allergenClass: N },
  { name: "枝豆", aliases: "えだまめ", category: "大豆・豆類", allergenClass: N },
  { name: "いんげん", aliases: "インゲン", category: "大豆・豆類", allergenClass: N },
  { name: "グリーンピース", aliases: "", category: "大豆・豆類", allergenClass: N },
  { name: "きな粉", aliases: "きなこ", category: "大豆・豆類", allergenClass: N },

  // ---- 野菜 ----
  { name: "にんじん", aliases: "人参,ニンジン", category: "野菜", allergenClass: N },
  { name: "たまねぎ", aliases: "玉ねぎ,タマネギ", category: "野菜", allergenClass: N },
  { name: "キャベツ", aliases: "", category: "野菜", allergenClass: N },
  { name: "ブロッコリー", aliases: "", category: "野菜", allergenClass: N },
  { name: "ほうれん草", aliases: "ほうれんそう", category: "野菜", allergenClass: N },
  { name: "小松菜", aliases: "こまつな", category: "野菜", allergenClass: N },
  { name: "かぼちゃ", aliases: "カボチャ,南瓜", category: "野菜", allergenClass: N },
  { name: "大根", aliases: "だいこん", category: "野菜", allergenClass: N },
  { name: "きゅうり", aliases: "キュウリ", category: "野菜", allergenClass: N },
  { name: "トマト", aliases: "", category: "野菜", allergenClass: N },
  { name: "なす", aliases: "ナス,茄子", category: "野菜", allergenClass: N },
  { name: "ピーマン", aliases: "", category: "野菜", allergenClass: N },
  { name: "レタス", aliases: "", category: "野菜", allergenClass: N },
  { name: "白菜", aliases: "はくさい", category: "野菜", allergenClass: N },
  { name: "ねぎ", aliases: "長ねぎ,ネギ", category: "野菜", allergenClass: N },
  { name: "しょうが", aliases: "生姜", category: "野菜", allergenClass: N },
  { name: "にんにく", aliases: "ニンニク", category: "野菜", allergenClass: N },
  { name: "れんこん", aliases: "レンコン,蓮根", category: "野菜", allergenClass: N },
  { name: "ごぼう", aliases: "ゴボウ,牛蒡", category: "野菜", allergenClass: N },
  { name: "アスパラガス", aliases: "アスパラ", category: "野菜", allergenClass: N },
  { name: "オクラ", aliases: "", category: "野菜", allergenClass: N },
  { name: "かぶ", aliases: "カブ", category: "野菜", allergenClass: N },
  { name: "チンゲン菜", aliases: "", category: "野菜", allergenClass: N },
  { name: "もやし", aliases: "", category: "野菜", allergenClass: N },

  // ---- 果物 ----
  { name: "みかん", aliases: "ミカン,温州みかん", category: "果物", allergenClass: N },
  { name: "いちご", aliases: "イチゴ,苺", category: "果物", allergenClass: N },
  { name: "ぶどう", aliases: "ブドウ,葡萄", category: "果物", allergenClass: N },
  { name: "梨", aliases: "なし,ナシ", category: "果物", allergenClass: N },
  { name: "すいか", aliases: "スイカ,西瓜", category: "果物", allergenClass: N },
  { name: "メロン", aliases: "", category: "果物", allergenClass: N },
  { name: "パイナップル", aliases: "パイン", category: "果物", allergenClass: N },
  { name: "マンゴー", aliases: "", category: "果物", allergenClass: N },
  { name: "さくらんぼ", aliases: "サクランボ", category: "果物", allergenClass: N },
  { name: "ブルーベリー", aliases: "", category: "果物", allergenClass: N },
  { name: "レモン", aliases: "", category: "果物", allergenClass: N },
  { name: "グレープフルーツ", aliases: "", category: "果物", allergenClass: N },

  // ---- きのこ・海藻 ----
  { name: "しいたけ", aliases: "シイタケ,椎茸", category: "きのこ・海藻", allergenClass: N },
  { name: "しめじ", aliases: "シメジ", category: "きのこ・海藻", allergenClass: N },
  { name: "えのき", aliases: "えのきだけ,エノキ", category: "きのこ・海藻", allergenClass: N },
  { name: "まいたけ", aliases: "マイタケ,舞茸", category: "きのこ・海藻", allergenClass: N },
  { name: "エリンギ", aliases: "", category: "きのこ・海藻", allergenClass: N },
  { name: "わかめ", aliases: "ワカメ", category: "きのこ・海藻", allergenClass: N },
  { name: "ひじき", aliases: "ヒジキ", category: "きのこ・海藻", allergenClass: N },
  { name: "のり", aliases: "海苔,ノリ", category: "きのこ・海藻", allergenClass: N },
  { name: "こんぶ", aliases: "昆布,コンブ", category: "きのこ・海藻", allergenClass: N },

  // ---- 調味料・その他 ----
  { name: "しょうゆ", aliases: "醤油", category: "調味料・その他", allergenClass: N },
  { name: "みそ", aliases: "味噌", category: "調味料・その他", allergenClass: N },
  { name: "ケチャップ", aliases: "", category: "調味料・その他", allergenClass: N },
  { name: "マヨネーズ", aliases: "", category: "調味料・その他", allergenClass: N },
  { name: "はちみつ", aliases: "蜂蜜,ハチミツ", category: "調味料・その他", allergenClass: N },
  { name: "片栗粉", aliases: "", category: "調味料・その他", allergenClass: N },
];
