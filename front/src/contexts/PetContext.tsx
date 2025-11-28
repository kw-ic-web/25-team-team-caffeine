import React, { createContext, useContext, useState, ReactNode } from "react";

// 펫 타입 정의
interface Pet {
    id: string;
    name: string;
    avatar_url: string;
    stars: number;
    is_main: boolean;
}

// PetContext의 타입 정의
interface PetContextType {
    mainPet: Pet | null;
    setMainPet: (pet: Pet) => void;
}

// PetContext 생성
const PetContext = createContext<PetContextType | undefined>(undefined);

// PetProvider 컴포넌트
export const PetProvider = ({ children }: { children: ReactNode }) => {
    const [mainPet, setMainPet] = useState<Pet | null>(null);

    return (
        <PetContext.Provider value={{ mainPet, setMainPet }}>
            {children}
        </PetContext.Provider>
    );
};

// usePet 훅: PetContext의 상태와 setMainPet을 가져옴
export const usePet = () => {
    const context = useContext(PetContext);
    if (!context) {
        throw new Error("usePet must be used within a PetProvider");
    }
    return context;
};
