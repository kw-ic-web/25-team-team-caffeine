import type { Response } from "express";
import { pool } from "../db";
import type { AuthedRequest } from "../middleware/auth";

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

    const { name, rarity, avatar_url } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name은 필수입니다." });
    }

    const petRarity = rarity ?? "common";

    const [result] = await pool.execute(
      `INSERT INTO pets (user_id, name, rarity, avatar_url)
       VALUES (?, ?, ?, ?)`,
      [req.userId, name, petRarity, avatar_url ?? null]
    );

    const insertResult = result as any;

    return res.status(201).json({
      id: insertResult.insertId ?? null,
      name,
      rarity: petRarity,
      avatar_url: avatar_url ?? null,
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

    const {
      name,
      level,
      rarity,
      experience,
      stars,
      isMain,
      is_main,        // 혹시 프론트에서 이렇게 보내도 받게
      avatar_url,
      // last_main_change 는 이제 바디에서 안 받는다
    } = req.body;

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
    if (avatar_url !== undefined) {
      fields.push("avatar_url = ?");
      values.push(avatar_url);
    }

    // 🔥 메인 여부 처리
    const mainFlag = isMain ?? is_main;
    if (mainFlag !== undefined) {
      // is_main 컬럼 갱신
      fields.push("is_main = ?");
      values.push(mainFlag ? 1 : 0);

      // 메인으로 설정하는 경우에만 last_main_change 를 NOW()로 박음
      if (mainFlag) {
        fields.push("last_main_change = NOW()");
        // NOW()는 함수라 ? 플레이스홀더 필요 없음 → values.push 안 함
      }
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