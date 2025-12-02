import type { Response } from "express";

import { pool } from "../db.js";
import type { AuthedRequest } from "../middleware/auth.js";

// ✅ 펫 색상 팔레트 & 랜덤 함수 추가
const PET_COLORS = [
  "#F97373", // red
  "#FACC15", // yellow
  "#4ADE80", // green
  "#38BDF8", // blue
  "#A855F7", // purple
  "#F97316", // orange
  "#EC4899", // pink
];

function getRandomPetColor(): string {
  const idx = Math.floor(Math.random() * PET_COLORS.length);
  return PET_COLORS[idx];
}

// 내 펫 리스트 조회
export const listMyPets = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "인증 필요" });
    }

    const [rows] = await pool.execute(
      "SELECT * FROM pets WHERE user_id = ? ORDER BY created_at ASC",
      [req.userId]
    );

    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

// 펫 생성
export const createPet = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "인증 필요" });
    }

    const { name, rarity } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name은 필수입니다." });
    }

    const petRarity = rarity ?? "common";

    // ✅ 랜덤 색상 생성
    const color = getRandomPetColor();

    const [result] = await pool.execute(
      `INSERT INTO pets (user_id, name, rarity)
       VALUES (?, ?, ?)`,
      [req.userId, name, petRarity]
    );

    const insertResult = result as any;

    return res.status(201).json({
      id: insertResult.insertId ?? null,
      name,
      rarity: petRarity,
      color, // ✅ 응답에도 같이 내려주기
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

// 펫 정보 업데이트 (레벨, 경험치, 메인 설정 등)
export const updatePet = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "인증 필요" });
    }

    const petId = req.params.id;
    const { name, level, rarity, experience, stars, isMain, color } = req.body;

    const fields: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      fields.push("name = ?");
      values.push(name);
    }
    if (level !== undefined) {
      fields.push("level = ?");
      values.push(level);
    }
    if (rarity !== undefined) {
      fields.push("rarity = ?");
      values.push(rarity);
    }
    if (experience !== undefined) {
      fields.push("experience = ?");
      values.push(experience);
    }
    if (stars !== undefined) {
      fields.push("stars = ?");
      values.push(stars);
    }
    if (isMain !== undefined) {
      fields.push("is_main = ?");
      values.push(isMain ? 1 : 0);
    }
    // ✅ color도 필요하면 수정 가능하게
    if (color !== undefined) {
      fields.push("color = ?");
      values.push(color);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "수정할 필드가 없습니다." });
    }

    values.push(petId, req.userId);

    const [result] = await pool.execute(
      `UPDATE pets
       SET ${fields.join(", ")}
       WHERE id = ? AND user_id = ?`,
      values
    );

    const r = result as any;
    if (r.affectedRows === 0) {
      return res.status(404).json({ message: "펫을 찾을 수 없습니다." });
    }

    return res.json({ message: "updated" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

// 펫 삭제
export const deletePet = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "인증 필요" });
    }

    const petId = req.params.id;

    const [result] = await pool.execute(
      "DELETE FROM pets WHERE id = ? AND user_id = ?",
      [petId, req.userId]
    );

    const r = result as any;
    if (r.affectedRows === 0) {
      return res.status(404).json({ message: "펫을 찾을 수 없습니다." });
    }

    return res.json({ message: "deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
};
