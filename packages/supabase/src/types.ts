import type { Block } from '@scipal/types';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type EducationLevel = 'primary' | 'lower_secondary' | 'upper_secondary';
export type LessonStatus = 'draft' | 'pending_review' | 'published' | 'rejected';
export type CurriculumRole = 'required' | 'elective_choice' | 'optional' | 'required_activity';
export type CodeLanguage = 'python' | 'cpp';
export interface BilingualText { en: string; vi: string }

export interface Database {
  public: {
    Tables: {
      subjects: {
        Row: {
          id: string;
          slug: string;
          name_en: string;
          name_vi: string;
          accent_color: string;
          icon: string;
          icon_url: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name_en: string;
          name_vi: string;
          accent_color: string;
          icon: string;
          icon_url?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name_en?: string;
          name_vi?: string;
          accent_color?: string;
          icon?: string;
          icon_url?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      curriculum_versions: {
        Row: {
          id: string;
          code: string;
          name_vi: string;
          issued_by: string;
          source_ref: Record<string, unknown>;
          effective_from: string;
          effective_to: string | null;
          status: 'draft' | 'active' | 'retired';
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      subject_grade_catalog: {
        Row: {
          id: string;
          curriculum_version_id: string;
          subject_id: string;
          grade: number;
          curriculum_role: CurriculumRole;
          source_ref: Record<string, unknown>;
          sort_order: number;
          active: boolean;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'subject_grade_catalog_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subject_grade_catalog_curriculum_version_id_fkey';
            columns: ['curriculum_version_id'];
            isOneToOne: false;
            referencedRelation: 'curriculum_versions';
            referencedColumns: ['id'];
          },
        ];
      };
      subject_tracks: {
        Row: {
          id: string;
          subject_id: string;
          slug: string;
          name_en: string;
          name_vi: string;
          grades: number[];
          sort_order: number;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'subject_tracks_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      topics: {
        Row: {
          id: string;
          subject_id: string;
          slug: string;
          name_en: string;
          name_vi: string;
          sort_order: number;
          grade: number | null;
          kind: 'core' | 'elective_topic';
        };
        Insert: {
          id?: string;
          subject_id: string;
          slug: string;
          name_en: string;
          name_vi: string;
          sort_order?: number;
          grade?: number | null;
          kind?: 'core' | 'elective_topic';
        };
        Update: {
          id?: string;
          subject_id?: string;
          slug?: string;
          name_en?: string;
          name_vi?: string;
          sort_order?: number;
          grade?: number | null;
          kind?: 'core' | 'elective_topic';
        };
        Relationships: [
          {
            foreignKeyName: 'topics_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      lessons: {
        Row: {
          id: string;
          topic_id: string;
          subject_id: string;
          slug: string;
          title_en: string;
          title_vi: string;
          grade: number;
          blocks: Block[];
          sort_order: number;
          created_by: string | null;
          status: LessonStatus;
          track_id: string | null;
          digital_competency: BilingualText | null;
          review_note: string | null;
          published_at: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          topic_id: string;
          subject_id: string;
          slug: string;
          title_en: string;
          title_vi: string;
          grade?: number;
          blocks?: Block[];
          sort_order?: number;
          created_by?: string | null;
          status?: LessonStatus;
          track_id?: string | null;
          digital_competency?: BilingualText | null;
          review_note?: string | null;
          published_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          topic_id?: string;
          subject_id?: string;
          slug?: string;
          title_en?: string;
          title_vi?: string;
          grade?: number;
          blocks?: Block[];
          sort_order?: number;
          created_by?: string | null;
          status?: LessonStatus;
          track_id?: string | null;
          digital_competency?: BilingualText | null;
          review_note?: string | null;
          published_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lessons_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lessons_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'topics';
            referencedColumns: ['id'];
          },
        ];
      };
      terms: {
        Row: {
          id: string;
          subject_id: string;
          term_en: string;
          term_vi: string;
          part_of_speech: string | null;
          definition_en: string;
          definition_vi: string;
          example_en: string | null;
          example_vi: string | null;
          audio_url: string | null;
          tags: string[];
        };
        Insert: {
          id?: string;
          subject_id: string;
          term_en: string;
          term_vi: string;
          part_of_speech?: string | null;
          definition_en: string;
          definition_vi: string;
          example_en?: string | null;
          example_vi?: string | null;
          audio_url?: string | null;
          tags?: string[];
        };
        Update: {
          id?: string;
          subject_id?: string;
          term_en?: string;
          term_vi?: string;
          part_of_speech?: string | null;
          definition_en?: string;
          definition_vi?: string;
          example_en?: string | null;
          example_vi?: string | null;
          audio_url?: string | null;
          tags?: string[];
        };
        Relationships: [
          {
            foreignKeyName: 'terms_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      questions: {
        Row: {
          id: string;
          subject_id: string;
          lesson_id: string | null;
          type: 'mc' | 'truefalse' | 'short';
          difficulty: number;
          objective_id: string | null;
          data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          lesson_id?: string | null;
          type: 'mc' | 'truefalse' | 'short';
          difficulty?: number;
          objective_id?: string | null;
          data: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: string;
          lesson_id?: string | null;
          type?: 'mc' | 'truefalse' | 'short';
          difficulty?: number;
          objective_id?: string | null;
          data?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'questions_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'questions_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      exam_blueprints: {
        Row: {
          id: string;
          name: string;
          grade: number | null;
          subject_id: string | null;
          sections: Json;
        };
        Insert: {
          id?: string;
          name: string;
          grade?: number | null;
          subject_id?: string | null;
          sections: Json;
        };
        Update: {
          id?: string;
          name?: string;
          grade?: number | null;
          subject_id?: string | null;
          sections?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'exam_blueprints_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      resources: {
        Row: {
          id: string;
          subject_id: string;
          url: string;
          title_en: string;
          title_vi: string;
          description_en: string | null;
          description_vi: string | null;
          category: 'practice' | 'reference' | 'simulation';
          sort_order: number;
        };
        Insert: {
          id?: string;
          subject_id: string;
          url: string;
          title_en: string;
          title_vi: string;
          description_en?: string | null;
          description_vi?: string | null;
          category: 'practice' | 'reference' | 'simulation';
          sort_order?: number;
        };
        Update: {
          id?: string;
          subject_id?: string;
          url?: string;
          title_en?: string;
          title_vi?: string;
          description_en?: string | null;
          description_vi?: string | null;
          category?: 'practice' | 'reference' | 'simulation';
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'resources_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          role: 'student' | 'teacher';
          avatar_url: string | null;
          preferred_education_level: EducationLevel | null;
          preferred_code_language: CodeLanguage | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          role?: 'student' | 'teacher';
          avatar_url?: string | null;
          preferred_education_level?: EducationLevel | null;
          preferred_code_language?: CodeLanguage | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          role?: 'student' | 'teacher';
          avatar_url?: string | null;
          preferred_education_level?: EducationLevel | null;
          preferred_code_language?: CodeLanguage | null;
          created_at?: string;
        };
        Relationships: [];
      };
      progress: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          completed_at: string | null;
          score: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          completed_at?: string | null;
          score?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          completed_at?: string | null;
          score?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'progress_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'progress_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      xp_log: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string;
          delta: number;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id: string;
          delta: number;
          reason: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject_id?: string;
          delta?: number;
          reason?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'xp_log_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'xp_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      streaks: {
        Row: {
          user_id: string;
          subject_id: string;
          current_streak: number;
          longest_streak: number;
          last_active: string | null;
        };
        Insert: {
          user_id: string;
          subject_id: string;
          current_streak?: number;
          longest_streak?: number;
          last_active?: string | null;
        };
        Update: {
          user_id?: string;
          subject_id?: string;
          current_streak?: number;
          longest_streak?: number;
          last_active?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'streaks_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'streaks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      badges: {
        Row: {
          id: string;
          subject_id: string | null;
          name_en: string;
          name_vi: string;
          icon: string;
          condition: Json;
        };
        Insert: {
          id?: string;
          subject_id?: string | null;
          name_en: string;
          name_vi: string;
          icon: string;
          condition: Json;
        };
        Update: {
          id?: string;
          subject_id?: string | null;
          name_en?: string;
          name_vi?: string;
          icon?: string;
          condition?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'badges_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      user_badges: {
        Row: {
          user_id: string;
          badge_id: string;
          earned_at: string;
        };
        Insert: {
          user_id: string;
          badge_id: string;
          earned_at?: string;
        };
        Update: {
          user_id?: string;
          badge_id?: string;
          earned_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_badges_badge_id_fkey';
            columns: ['badge_id'];
            isOneToOne: false;
            referencedRelation: 'badges';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_badges_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      class_rooms: {
        Row: {
          id: string;
          teacher_id: string;
          subject_id: string;
          name: string;
          invite_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          subject_id: string;
          name: string;
          invite_code?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          subject_id?: string;
          name?: string;
          invite_code?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'class_rooms_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'class_rooms_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      class_members: {
        Row: {
          class_id: string;
          student_id: string;
          joined_at: string;
        };
        Insert: {
          class_id: string;
          student_id: string;
          joined_at?: string;
        };
        Update: {
          class_id?: string;
          student_id?: string;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'class_members_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'class_rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'class_members_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      assignments: {
        Row: {
          id: string;
          class_id: string;
          lesson_id: string | null;
          blueprint_id: string | null;
          due_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          lesson_id?: string | null;
          blueprint_id?: string | null;
          due_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          lesson_id?: string | null;
          blueprint_id?: string | null;
          due_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'assignments_blueprint_id_fkey';
            columns: ['blueprint_id'];
            isOneToOne: false;
            referencedRelation: 'exam_blueprints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assignments_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'class_rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assignments_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database['public']['Tables'] & Database['public']['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database['public']['Tables'] &
        Database['public']['Views'])
    ? (Database['public']['Tables'] &
        Database['public']['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;
