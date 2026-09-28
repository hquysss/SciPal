/** A published lesson the student can ask the tutor about. */
export type TutorLesson = {
  id: string;
  title_vi: string;
  title_en: string;
  grade: number;
  subject_id: string;
  subject_name_vi: string;
  subject_name_en: string;
};
