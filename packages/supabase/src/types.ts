import type { BillingInterval, Block, PlanCode, QuotaMetric } from '@scipal/types';

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

type DbTable<Row, Insert, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};
type WithDefaults<Row, Defaults extends keyof Row> = Omit<Row, Defaults> & Partial<Pick<Row, Defaults>>;
type PaidPlanCode = Exclude<PlanCode, 'student_free' | 'teacher_free'>;
type BillingTables = {
  billing_plans: DbTable<{
    code: PlanCode;
    audience: 'student' | 'teacher';
    name_en: string;
    name_vi: string;
    description_en: string;
    description_vi: string;
    active: boolean;
    version: number;
    created_at: string;
  }, WithDefaults<{
    code: PlanCode;
    audience: 'student' | 'teacher';
    name_en: string;
    name_vi: string;
    description_en: string;
    description_vi: string;
    active: boolean;
    version: number;
    created_at: string;
  }, 'active' | 'version' | 'created_at'>>;
  billing_prices: DbTable<{
    id: string;
    plan_code: PaidPlanCode;
    interval: BillingInterval;
    amount_vnd: number;
    currency: 'VND';
    active: boolean;
    created_at: string;
  }, WithDefaults<{
    id: string;
    plan_code: PaidPlanCode;
    interval: BillingInterval;
    amount_vnd: number;
    currency: 'VND';
    active: boolean;
    created_at: string;
  }, 'id' | 'currency' | 'active' | 'created_at'>>;
  billing_plan_limits: DbTable<{
    plan_code: PlanCode;
    metric: QuotaMetric;
    kind: 'monthly' | 'capacity';
    limit_value: number;
  }, { plan_code: PlanCode; metric: QuotaMetric; kind: 'monthly' | 'capacity'; limit_value: number }>;
  billing_orders: DbTable<{
    id: string;
    user_id: string | null;
    price_id: string;
    plan_code: PaidPlanCode;
    interval: BillingInterval;
    amount_vnd: number;
    currency: 'VND';
    purpose: 'subscription';
    status: 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled' | 'reconciliation';
    idempotency_key: string;
    payload_hash: string;
    expires_at: string;
    paid_at: string | null;
    created_at: string;
  }, WithDefaults<{
    id: string;
    user_id: string | null;
    price_id: string;
    plan_code: PaidPlanCode;
    interval: BillingInterval;
    amount_vnd: number;
    currency: 'VND';
    purpose: 'subscription';
    status: 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled' | 'reconciliation';
    idempotency_key: string;
    payload_hash: string;
    expires_at: string;
    paid_at: string | null;
    created_at: string;
  }, 'id' | 'currency' | 'purpose' | 'status' | 'paid_at' | 'created_at'>>;
  billing_payment_attempts: DbTable<{
    id: string;
    order_id: string;
    provider: 'payos' | 'vnpay';
    provider_reference: string;
    provider_transaction_id: string | null;
    status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'reconciliation';
    amount_vnd: number;
    currency: 'VND';
    created_at: string;
    updated_at: string;
  }, WithDefaults<{
    id: string;
    order_id: string;
    provider: 'payos' | 'vnpay';
    provider_reference: string;
    provider_transaction_id: string | null;
    status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'reconciliation';
    amount_vnd: number;
    currency: 'VND';
    created_at: string;
    updated_at: string;
  }, 'id' | 'provider_transaction_id' | 'status' | 'currency' | 'created_at' | 'updated_at'>>;
  billing_events: DbTable<{
    id: string;
    provider: 'payos' | 'vnpay';
    fingerprint: string;
    event_type: string;
    merchant_reference: string | null;
    provider_transaction_id: string | null;
    outcome: 'paid' | 'failed' | 'cancelled' | 'expired' | 'unverified';
    verification_state: 'verified' | 'rejected' | 'reconciliation';
    received_at: string;
    processed_at: string | null;
  }, WithDefaults<{
    id: string;
    provider: 'payos' | 'vnpay';
    fingerprint: string;
    event_type: string;
    merchant_reference: string | null;
    provider_transaction_id: string | null;
    outcome: 'paid' | 'failed' | 'cancelled' | 'expired' | 'unverified';
    verification_state: 'verified' | 'rejected' | 'reconciliation';
    received_at: string;
    processed_at: string | null;
  }, 'id' | 'merchant_reference' | 'provider_transaction_id' | 'received_at' | 'processed_at'>>;
  billing_subscriptions: DbTable<{
    user_id: string;
    plan_code: PaidPlanCode;
    paid_through: string;
    pending_price_id: string | null;
    renewal_mode: 'manual' | 'auto';
    mandate_id: string | null;
    version: number;
    created_at: string;
    updated_at: string;
  }, WithDefaults<{
    user_id: string;
    plan_code: PaidPlanCode;
    paid_through: string;
    pending_price_id: string | null;
    renewal_mode: 'manual' | 'auto';
    mandate_id: string | null;
    version: number;
    created_at: string;
    updated_at: string;
  }, 'pending_price_id' | 'renewal_mode' | 'mandate_id' | 'version' | 'created_at' | 'updated_at'>>;
  billing_grants: DbTable<{
    id: string;
    order_id: string;
    user_id: string | null;
    plan_code: PaidPlanCode;
    starts_at: string;
    paid_through: string;
    created_at: string;
  }, WithDefaults<{
    id: string;
    order_id: string;
    user_id: string | null;
    plan_code: PaidPlanCode;
    starts_at: string;
    paid_through: string;
    created_at: string;
  }, 'id' | 'user_id' | 'created_at'>>;
  account_quota_versions: DbTable<{
    user_id: string;
    version: number;
    updated_at: string;
  }, WithDefaults<{ user_id: string; version: number; updated_at: string }, 'version' | 'updated_at'>>;
  account_quota_overrides: DbTable<{
    user_id: string;
    metric: QuotaMetric;
    limit_value: number;
    expires_at: string | null;
    version: number;
    updated_by: string | null;
    updated_at: string;
  }, WithDefaults<{
    user_id: string;
    metric: QuotaMetric;
    limit_value: number;
    expires_at: string | null;
    version: number;
    updated_by: string | null;
    updated_at: string;
  }, 'updated_by' | 'updated_at'>>;
  account_quota_audit: DbTable<{
    id: string;
    actor_id: string | null;
    target_id: string | null;
    before_state: Json;
    after_state: Json;
    reason: string;
    created_at: string;
  }, WithDefaults<{
    id: string;
    actor_id: string | null;
    target_id: string | null;
    before_state: Json;
    after_state: Json;
    reason: string;
    created_at: string;
  }, 'id' | 'actor_id' | 'target_id' | 'created_at'>>;
  quota_usage: DbTable<{
    user_id: string;
    metric: QuotaMetric;
    period_start: string;
    used: number;
    reserved: number;
    updated_at: string;
  }, WithDefaults<{
    user_id: string;
    metric: QuotaMetric;
    period_start: string;
    used: number;
    reserved: number;
    updated_at: string;
  }, 'used' | 'reserved' | 'updated_at'>>;
  quota_operations: DbTable<{
    operation_id: string;
    user_id: string;
    metric: QuotaMetric;
    period_start: string;
    request_hash: string;
    units: number;
    state: 'reserved' | 'committed' | 'released';
    lease_expires_at: string;
    created_at: string;
    settled_at: string | null;
  }, WithDefaults<{
    operation_id: string;
    user_id: string;
    metric: QuotaMetric;
    period_start: string;
    request_hash: string;
    units: number;
    state: 'reserved' | 'committed' | 'released';
    lease_expires_at: string;
    created_at: string;
    settled_at: string | null;
  }, 'created_at' | 'settled_at'>>;
};

/** Site switches (migration 20261003070000_site_settings.sql); readable by everyone, written by the backend. */
type SiteTables = {
  site_settings: DbTable<{
    id: number;
    signup_enabled: boolean;
    features: Record<string, boolean>;
    maintenance: boolean;
    updated_at: string;
    updated_by: string | null;
  }, never, never>;
};

export interface Database {
  public: {
    Tables: BillingTables & SiteTables & {
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
          delete_requested_at: string | null;
          delete_requested_by: string | null;
          delete_request_note: string | null;
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
          delete_requested_at?: string | null;
          delete_requested_by?: string | null;
          delete_request_note?: string | null;
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
          delete_requested_at?: string | null;
          delete_requested_by?: string | null;
          delete_request_note?: string | null;
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
          kind: 'word' | 'place';
          image_url: string | null;
          image_alt_en: string | null;
          image_alt_vi: string | null;
          image_credit: string | null;
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
          kind?: 'word' | 'place';
          image_url?: string | null;
          image_alt_en?: string | null;
          image_alt_vi?: string | null;
          image_credit?: string | null;
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
          kind?: 'word' | 'place';
          image_url?: string | null;
          image_alt_en?: string | null;
          image_alt_vi?: string | null;
          image_credit?: string | null;
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
          status: 'published' | 'pending_review';
          import_id: string | null;
          created_by: string | null;
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
          status?: 'published' | 'pending_review';
          import_id?: string | null;
          created_by?: string | null;
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
          status?: 'published' | 'pending_review';
          import_id?: string | null;
          created_by?: string | null;
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
          name_en: string | null;
          grade: number | null;
          subject_id: string | null;
          sections: Json;
          question_ids: string[] | null;
          duration_minutes: number | null;
          status: 'published' | 'pending_review';
          import_id: string | null;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          name_en?: string | null;
          grade?: number | null;
          subject_id?: string | null;
          sections: Json;
          question_ids?: string[] | null;
          duration_minutes?: number | null;
          status?: 'published' | 'pending_review';
          import_id?: string | null;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          name_en?: string | null;
          grade?: number | null;
          subject_id?: string | null;
          sections?: Json;
          question_ids?: string[] | null;
          duration_minutes?: number | null;
          status?: 'published' | 'pending_review';
          import_id?: string | null;
          created_by?: string | null;
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
          cover_url: string | null;
          preferred_education_level: EducationLevel | null;
          preferred_code_language: CodeLanguage | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          role?: 'student' | 'teacher';
          avatar_url?: string | null;
          cover_url?: string | null;
          preferred_education_level?: EducationLevel | null;
          preferred_code_language?: CodeLanguage | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          role?: 'student' | 'teacher';
          avatar_url?: string | null;
          cover_url?: string | null;
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
      billing_get_effective_quotas: {
        Args: { p_user_id: string; p_now: string };
        Returns: Array<{
          metric: QuotaMetric;
          kind: 'monthly' | 'capacity';
          quota_limit: number;
          used: number;
          reserved: number;
          source: 'plan' | 'override';
          expires_at: string | null;
          resets_at: string | null;
        }>;
      };
      billing_reserve_quota: {
        Args: {
          p_user_id: string;
          p_metric: QuotaMetric;
          p_operation_id: string;
          p_request_hash: string;
          p_units?: number;
        };
        Returns: Json;
      };
      billing_settle_quota: {
        Args: { p_operation_id: string; p_outcome: 'commit' | 'release' };
        Returns: boolean;
      };
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
