// Pure grouping of a subject's topics by grade; no server imports, so client code can use it too.

export interface TopicRow {
  id: string;
  name_en: string;
  name_vi: string;
  sort_order: number;
  grade: number | null;
  lessons: Array<{ id: string; slug: string; title_en: string; title_vi: string; source?: string | null; sort_order: number; grade: number }>;
}

export interface GradeGroup {
  grade: number;
  topics: Array<{
    id: string;
    name_en: string;
    name_vi: string;
    sort_order: number;
    lessons: Array<{ id: string; slug: string; title_en: string; title_vi: string; source?: string | null; sort_order: number }>;
  }>;
}

export function groupTopicsByGrade(topics: TopicRow[]): GradeGroup[] {
  const groups = new Map<number, Map<string, GradeGroup['topics'][number]>>();

  for (const topic of [...topics].sort((a, b) => a.sort_order - b.sort_order)) {
    for (const lesson of topic.lessons ?? []) {
      const grade = topic.grade ?? lesson.grade;
      const byTopic = groups.get(grade) ?? new Map();
      groups.set(grade, byTopic);
      const entry = byTopic.get(topic.id) ?? {
        id: topic.id,
        name_en: topic.name_en,
        name_vi: topic.name_vi,
        sort_order: topic.sort_order,
        lessons: [],
      };
      byTopic.set(topic.id, entry);
      entry.lessons.push({
        id: lesson.id,
        slug: lesson.slug,
        title_en: lesson.title_en,
        title_vi: lesson.title_vi,
        source: lesson.source ?? null,
        sort_order: lesson.sort_order,
      });
    }
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([grade, byTopic]) => ({
      grade,
      topics: [...byTopic.values()].map((topic) => ({
        ...topic,
        lessons: [...topic.lessons].sort((a, b) => a.sort_order - b.sort_order),
      })),
    }));
}
