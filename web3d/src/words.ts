// 词的类别、强度和颜色。类别决定色相，强度决定填充（基础空心 / 进阶实心 / 奇术全息），
// 红方 / 蓝方 用阵营色，具体随从是圆角胶囊，数字是白框。
export type Cat = "结构" | "范围" | "对象" | "动作" | "引用" | "状态" | "触发" | "时间" | "关键词";

export const CAT_COLOR: Record<Cat, string> = {
  结构: "#93a8c9",
  范围: "#a982ff",
  对象: "#25d8c4",
  动作: "#ff9a3c",
  引用: "#a6e35a",
  状态: "#ff5dc8",
  触发: "#ffd24a",
  时间: "#cfa37f",
  关键词: "#ffffff",
};

export const WORDS: Record<string, [Cat, 1 | 2 | 3, number]> = {
  // 词: [类别, 强度, 价格]
  选择: ["结构", 1, 0], 若: ["结构", 2, 0], 若有: ["结构", 2, 1],
  一个: ["范围", 1, 0], 相邻: ["范围", 2, 0],
  随从: ["对象", 1, 0], 自身: ["对象", 1, 0], 来源: ["对象", 2, 0],
  造成: ["动作", 1, 1], 伤害: ["动作", 1, 1], 施加: ["动作", 1, 1], 恢复: ["动作", 1, 1],
  减少: ["动作", 1, 1], 增加: ["动作", 1, 1], 转为: ["动作", 2, 1], 移除: ["动作", 2, 3], 延后: ["动作", 2, 5],
  生命上限: ["引用", 2, 0], 较低者: ["引用", 2, 0],
  易伤: ["状态", 2, 2], 灼烧: ["状态", 2, 2], 衰弱: ["状态", 2, 2],
  当: ["触发", 2, 1], 回合结束: ["触发", 2, 1],
  之后: ["时间", 1, 0], 持久: ["时间", 2, 3],
  不屈: ["关键词", 3, 0],
};

export type Tok =
  | { k: "word"; w: string; auto?: boolean }
  | { k: "side"; side: "r" | "b"; auto?: boolean }
  | { k: "unit"; name: string; side?: "r" | "b" }
  | { k: "num"; v: number }
  | { k: "time"; sec: number; side: "r" | "b" };

/** 用空格分隔的简写拼一句：@名字 = 随从，#数字 = 数，红方/蓝方 = 阵营，~前缀 = 自动补。 */
export function parse(s: string): Tok[] {
  return s.split(/\s+/).filter(Boolean).map((x): Tok => {
    const auto = x.startsWith("~");
    if (auto) x = x.slice(1);
    if (x === "红方") return { k: "side", side: "r", auto };
    if (x === "蓝方") return { k: "side", side: "b", auto };
    if (x.startsWith("@")) return { k: "unit", name: x.slice(1) };
    if (x.startsWith("#")) return { k: "num", v: +x.slice(1) };
    return { k: "word", w: x, auto };
  });
}
