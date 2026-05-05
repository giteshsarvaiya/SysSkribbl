import { NextRequest, NextResponse } from "next/server";
import { verifyPlayerToken } from "@/lib/jwt";
import {
  getPromptForRound,
  getPromptOptionsForRound,
  buildHints,
  getCategoryHint,
} from "@/lib/prompts";
import type { Category, Difficulty } from "@/lib/types";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await verifyPlayerToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const round      = parseInt(searchParams.get("round")    ?? "1", 10);
  const category   = searchParams.get("category")   as Category   | null;
  const difficulty = searchParams.get("difficulty") as Difficulty | null;
  const variant    = parseInt(searchParams.get("variant")  ?? "0", 10) as 0 | 1 | 2;
  const wantOptions = searchParams.get("options") === "true";

  if (!category || !difficulty || isNaN(round) || round < 1) {
    return NextResponse.json({ error: "Missing or invalid params" }, { status: 400 });
  }

  const validCategories   = ["classic", "databases", "infra", "famous", "interview"];
  const validDifficulties = ["easy", "medium", "hard"];

  if (!validCategories.includes(category) || !validDifficulties.includes(difficulty)) {
    return NextResponse.json({ error: "Invalid category or difficulty" }, { status: 400 });
  }

  if (wantOptions) {
    const options = getPromptOptionsForRound(category, difficulty, round - 1);
    return NextResponse.json({
      options: options.map((p) => ({ system: p.system, scenario: p.scenario })),
    });
  }

  const safeVariant: 0 | 1 | 2 = ([0, 1, 2] as const).includes(variant as 0 | 1 | 2) ? variant : 0;
  const p = getPromptForRound(category, difficulty, round - 1, safeVariant);
  const [, hint1, hint2] = buildHints(p.system);
  const categoryHint = getCategoryHint(category);

  return NextResponse.json({
    prompt:              p.system,
    scenario:            p.scenario,
    hints:               [categoryHint, hint1, hint2],
    referenceComponents: p.referenceComponents,
    designNote:          p.designNote,
    wordCount:           p.system.split(" ").length,
    charCount:           p.system.replace(/\s/g, "").length,
  });
}
