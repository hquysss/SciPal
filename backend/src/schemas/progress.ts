/** XP the server grants for finishing a lesson the first time. Clients may only show it as an estimate. */
export const LESSON_COMPLETE_XP = 100;

/** XP the server grants for the first answer to a practice question, when it is right, by difficulty. */
export const PRACTICE_XP: Record<number, number> = { 1: 10, 2: 15, 3: 25 };
