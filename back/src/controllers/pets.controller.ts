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

    const { name, rarity } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name은 필수입니다." });
    }

    const petRarity = rarity ?? "common";

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
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

const getRequiredExp = (level: number) => {
  return level * 20; 
};

export const updatePet = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "인증 필요" });
    }

    const petId = req.params.id;
    // 프론트에서 보낸 데이터
    const { name, rarity, stars, is_main, last_main_change } = req.body;
    // body에 값이 없으면 undefined일 수 있음
    const bodyExp = req.body.experience;
    const bodyLevel = req.body.level;

    // 1. DB에서 현재 상태 가져오기
    const [rows] = await pool.execute(
      "SELECT * FROM pets WHERE id = ? AND user_id = ?",
      [petId, req.userId]
    );
    const pets = rows as any[];
    if (pets.length === 0) {
      return res.status(404).json({ message: "펫을 찾을 수 없습니다." });
    }
    const currentPet = pets[0];

    // 2. 메인 펫 해제 로직
    if (is_main === true || is_main === 1 || is_main === "true") {
      await pool.execute("UPDATE pets SET is_main = 0 WHERE user_id = ?", [
        req.userId,
      ]);
    }

    // 3. 레벨업 로직 (무조건 실행) 🚀
    // 요청에 경험치가 있으면 그걸 쓰고, 없으면 DB에 있는 현재 경험치를 씁니다.
    let calcExp = bodyExp !== undefined ? bodyExp : currentPet.experience;
    let calcLevel = bodyLevel !== undefined ? bodyLevel : currentPet.level;

    // 레벨업 계산 (while 반복문)
    let required = getRequiredExp(calcLevel);
    while (calcExp >= required) {
      calcExp -= required;
      calcLevel += 1;
      required = getRequiredExp(calcLevel);
    }

    // 4. SQL 필드 만들기
    const fields: string[] = [];
    const values: any[] = [];

    if (name !== undefined) { fields.push("name = ?"); values.push(name); }
    if (rarity !== undefined) { fields.push("rarity = ?"); values.push(rarity); }
    if (stars !== undefined) { fields.push("stars = ?"); values.push(stars); }
    
    // [중요] 계산된 레벨/경험치가 기존 DB 값과 다르거나, 요청으로 들어왔다면 업데이트 대상에 포함
    if (calcLevel !== currentPet.level || bodyLevel !== undefined) {
        fields.push("level = ?"); values.push(calcLevel);
    }
    if (calcExp !== currentPet.experience || bodyExp !== undefined) {
        fields.push("experience = ?"); values.push(calcExp);
    }

    if (is_main !== undefined) {
      fields.push("is_main = ?");
      values.push(is_main ? 1 : 0);
    }
    
    if (last_main_change !== undefined) {
      fields.push("last_main_change = ?");
      const formattedDate = new Date(last_main_change)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
      values.push(formattedDate);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "수정할 필드가 없습니다." });
    }

    values.push(petId, req.userId);

    // 5. 업데이트 실행
    await pool.execute(
      `UPDATE pets SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
      values
    );

    return res.json({ 
      message: "updated", 
      level: calcLevel, 
      experience: calcExp 
    });

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
