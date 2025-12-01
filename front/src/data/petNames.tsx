export const petNames = [
  { name: "곰", image: "hat_bear.png" },
  { name: "고양이", image: "hat_cat.png" },
  { name: "개", image: "hat_dog.png" },
  { name: "여우", image: "hat_fox.png" },
  { name: "도치", image: "hat_hedgehog.png" },
  { name: "코알라", image: "hat_koala.png" },
  { name: "수달", image: "hat_otter.png" },
  { name: "판다", image: "hat_panda.png" },
  { name: "쿼카", image: "hat_quokka.png" },
  { name: "토끼", image: "hat_rabbit.png" },
];

export const getRandomPetName = (): { name: string; image: string } => {
  const pet = petNames[Math.floor(Math.random() * petNames.length)];
  return pet;
};
