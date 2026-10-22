// Generated from the Supabase schema (supabase/migrations). Regenerate after schema changes.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type Enum = Database["public"]["Enums"]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      access_claims: {
        Row: { attendee_id: string; claimed_at: string; claimed_by: string | null; event_id: string; id: string; item: Enum["access_item"]; workspace_id: string }
        Insert: { attendee_id: string; claimed_at?: string; claimed_by?: string | null; event_id: string; id?: string; item: Enum["access_item"]; workspace_id: string }
        Update: { attendee_id?: string; claimed_at?: string; claimed_by?: string | null; event_id?: string; id?: string; item?: Enum["access_item"]; workspace_id?: string }
        Relationships: []
      }
      activity_log: {
        Row: { action: Enum["activity_action"]; actor_id: string | null; actor_name: string | null; created_at: string; event_id: string | null; id: number; metadata: Json; target: string; workspace_id: string }
        Insert: { action: Enum["activity_action"]; actor_id?: string | null; actor_name?: string | null; created_at?: string; event_id?: string | null; id?: never; metadata?: Json; target: string; workspace_id: string }
        Update: { action?: Enum["activity_action"]; actor_id?: string | null; actor_name?: string | null; created_at?: string; event_id?: string | null; id?: never; metadata?: Json; target?: string; workspace_id?: string }
        Relationships: []
      }
      attendance: {
        Row: { attendance_date: string; attendee_id: string; biometric_event_id: string | null; checked_in_at: string; created_at: string; event_id: string; id: string; method: Enum["verification_method"]; programme_id: string | null; recorded_by: string | null; workspace_id: string }
        Insert: { attendance_date: string; attendee_id: string; biometric_event_id?: string | null; checked_in_at?: string; created_at?: string; event_id: string; id?: string; method: Enum["verification_method"]; programme_id?: string | null; recorded_by?: string | null; workspace_id: string }
        Update: { attendance_date?: string; attendee_id?: string; biometric_event_id?: string | null; checked_in_at?: string; created_at?: string; event_id?: string; id?: string; method?: Enum["verification_method"]; programme_id?: string | null; recorded_by?: string | null; workspace_id?: string }
        Relationships: []
      }
      attendee_departments: {
        Row: { attendee_id: string; department_id: string; event_id: string; workspace_id: string }
        Insert: { attendee_id: string; department_id: string; event_id: string; workspace_id: string }
        Update: { attendee_id?: string; department_id?: string; event_id?: string; workspace_id?: string }
        Relationships: []
      }
      attendees: {
        Row: {
          address: string | null; band_id: string | null; biometric_consent_at: string | null; biometric_status: Enum["biometric_status"]
          church_location_id: string | null; code: string; confirmation_email_error: string | null; confirmation_email_id: string | null; confirmation_email_sent_at: string | null; created_at: string; created_by: string | null; date_of_birth: string | null; timetable_email_sent_at: string | null
          email: string; emergency_contact: string | null; event_id: string; first_timer_followed_up: boolean; full_name: string
          gender: string | null; group_id: string | null; id: string; invited_by: string | null; is_first_timer: boolean
          kind: Enum["registration_kind"]; last_verified_at: string | null; leadership_role: string | null; occupation: string | null
          phone_number: string; photo_path: string | null; registered_at: string; registration_link_id: string | null
          status_token: string; updated_at: string; wants_permanent_membership: boolean | null; workspace_id: string
        }
        Insert: {
          address?: string | null; band_id?: string | null; biometric_consent_at?: string | null; biometric_status?: Enum["biometric_status"]
          church_location_id?: string | null; code: string; confirmation_email_error?: string | null; confirmation_email_id?: string | null; confirmation_email_sent_at?: string | null; created_at?: string; created_by?: string | null; date_of_birth?: string | null
          email: string; emergency_contact?: string | null; event_id: string; first_timer_followed_up?: boolean; full_name: string
          gender?: string | null; group_id?: string | null; id?: string; invited_by?: string | null; is_first_timer?: boolean
          kind: Enum["registration_kind"]; last_verified_at?: string | null; leadership_role?: string | null; occupation?: string | null
          phone_number: string; photo_path?: string | null; registered_at?: string; registration_link_id?: string | null
          status_token?: string; updated_at?: string; wants_permanent_membership?: boolean | null; workspace_id: string
        }
        Update: {
          address?: string | null; band_id?: string | null; biometric_consent_at?: string | null; biometric_status?: Enum["biometric_status"]
          church_location_id?: string | null; code?: string; confirmation_email_error?: string | null; confirmation_email_id?: string | null; confirmation_email_sent_at?: string | null; created_at?: string; created_by?: string | null; date_of_birth?: string | null
          email?: string; emergency_contact?: string | null; event_id?: string; first_timer_followed_up?: boolean; full_name?: string
          gender?: string | null; group_id?: string | null; id?: string; invited_by?: string | null; is_first_timer?: boolean
          kind?: Enum["registration_kind"]; last_verified_at?: string | null; leadership_role?: string | null; occupation?: string | null
          phone_number?: string; photo_path?: string | null; registered_at?: string; registration_link_id?: string | null
          status_token?: string; updated_at?: string; wants_permanent_membership?: boolean | null; workspace_id?: string
        }
        Relationships: []
      }
      bands: {
        Row: { color: string | null; created_at: string; created_by: string | null; event_id: string; id: string; is_active: boolean; name: string; sort_order: number; updated_at: string; workspace_id: string }
        Insert: { color?: string | null; created_at?: string; created_by?: string | null; event_id: string; id?: string; is_active?: boolean; name: string; sort_order?: number; updated_at?: string; workspace_id: string }
        Update: { color?: string | null; created_at?: string; created_by?: string | null; event_id?: string; id?: string; is_active?: boolean; name?: string; sort_order?: number; updated_at?: string; workspace_id?: string }
        Relationships: []
      }
      biometric_devices: {
        Row: { connection_type: string; created_at: string; created_by: string | null; id: string; is_active: boolean; last_heartbeat_at: string | null; last_seen_by: string | null; model: string; name: string; serial_number: string | null; service_url: string; status: Enum["device_status"]; updated_at: string; vendor: string; workspace_id: string }
        Insert: { connection_type?: string; created_at?: string; created_by?: string | null; id?: string; is_active?: boolean; last_heartbeat_at?: string | null; last_seen_by?: string | null; model?: string; name: string; serial_number?: string | null; service_url?: string; status?: Enum["device_status"]; updated_at?: string; vendor?: string; workspace_id: string }
        Update: { connection_type?: string; created_at?: string; created_by?: string | null; id?: string; is_active?: boolean; last_heartbeat_at?: string | null; last_seen_by?: string | null; model?: string; name?: string; serial_number?: string | null; service_url?: string; status?: Enum["device_status"]; updated_at?: string; vendor?: string; workspace_id?: string }
        Relationships: []
      }
      biometric_events: {
        Row: { attendee_id: string | null; created_at: string; device_id: string | null; enrollment_id: string | null; event_id: string; id: string; kind: Enum["biometric_event_kind"]; match_score: number | null; message: string | null; operator_id: string | null; programme_id: string | null; result: Enum["biometric_event_result"]; threshold: number | null; workspace_id: string }
        Insert: { attendee_id?: string | null; created_at?: string; device_id?: string | null; enrollment_id?: string | null; event_id: string; id?: string; kind: Enum["biometric_event_kind"]; match_score?: number | null; message?: string | null; operator_id?: string | null; programme_id?: string | null; result: Enum["biometric_event_result"]; threshold?: number | null; workspace_id: string }
        Update: { attendee_id?: string | null; created_at?: string; device_id?: string | null; enrollment_id?: string | null; event_id?: string; id?: string; kind?: Enum["biometric_event_kind"]; match_score?: number | null; message?: string | null; operator_id?: string | null; programme_id?: string | null; result?: Enum["biometric_event_result"]; threshold?: number | null; workspace_id?: string }
        Relationships: []
      }
      church_locations: {
        Row: { created_at: string; created_by: string | null; event_id: string; id: string; is_active: boolean; name: string; sort_order: number; updated_at: string; workspace_id: string }
        Insert: { created_at?: string; created_by?: string | null; event_id: string; id?: string; is_active?: boolean; name: string; sort_order?: number; updated_at?: string; workspace_id: string }
        Update: { created_at?: string; created_by?: string | null; event_id?: string; id?: string; is_active?: boolean; name?: string; sort_order?: number; updated_at?: string; workspace_id?: string }
        Relationships: []
      }
      convention_groups: {
        Row: { auto_assign: boolean; color: string | null; created_at: string; created_by: string | null; event_id: string; for_unbanded: boolean; id: string; is_active: boolean; name: string; sort_order: number; updated_at: string; workspace_id: string }
        Insert: { auto_assign?: boolean; color?: string | null; created_at?: string; created_by?: string | null; event_id: string; for_unbanded?: boolean; id?: string; is_active?: boolean; name: string; sort_order?: number; updated_at?: string; workspace_id: string }
        Update: { auto_assign?: boolean; color?: string | null; created_at?: string; created_by?: string | null; event_id?: string; for_unbanded?: boolean; id?: string; is_active?: boolean; name?: string; sort_order?: number; updated_at?: string; workspace_id?: string }
        Relationships: []
      }
      departments: {
        Row: { created_at: string; created_by: string | null; event_id: string; id: string; is_active: boolean; name: string; sort_order: number; updated_at: string; workspace_id: string }
        Insert: { created_at?: string; created_by?: string | null; event_id: string; id?: string; is_active?: boolean; name: string; sort_order?: number; updated_at?: string; workspace_id: string }
        Update: { created_at?: string; created_by?: string | null; event_id?: string; id?: string; is_active?: boolean; name?: string; sort_order?: number; updated_at?: string; workspace_id?: string }
        Relationships: []
      }
      leadership_roles: {
        Row: { created_at: string; created_by: string | null; event_id: string; id: string; is_active: boolean; name: string; sort_order: number; updated_at: string; workspace_id: string }
        Insert: { created_at?: string; created_by?: string | null; event_id: string; id?: string; is_active?: boolean; name: string; sort_order?: number; updated_at?: string; workspace_id: string }
        Update: { created_at?: string; created_by?: string | null; event_id?: string; id?: string; is_active?: boolean; name?: string; sort_order?: number; updated_at?: string; workspace_id?: string }
        Relationships: []
      }
      event_code_counters: {
        Row: { event_id: string; kind: Enum["registration_kind"]; last_value: number }
        Insert: { event_id: string; kind: Enum["registration_kind"]; last_value?: number }
        Update: { event_id?: string; kind?: Enum["registration_kind"]; last_value?: number }
        Relationships: []
      }
      events: {
        Row: { created_at: string; created_by: string | null; description: string | null; end_date: string; id: string; is_active: boolean; max_attendees: number | null; name: string; scripture: string | null; start_date: string; theme: string | null; updated_at: string; venue: string | null; workspace_id: string }
        Insert: { created_at?: string; created_by?: string | null; description?: string | null; end_date: string; id?: string; is_active?: boolean; max_attendees?: number | null; name: string; scripture?: string | null; start_date: string; theme?: string | null; updated_at?: string; venue?: string | null; workspace_id: string }
        Update: { created_at?: string; created_by?: string | null; description?: string | null; end_date?: string; id?: string; is_active?: boolean; max_attendees?: number | null; name?: string; scripture?: string | null; start_date?: string; theme?: string | null; updated_at?: string; venue?: string | null; workspace_id?: string }
        Relationships: []
      }
      fingerprint_enrollments: {
        Row: { attendee_id: string; device_id: string | null; enrolled_at: string; enrolled_by: string | null; event_id: string; finger: Enum["fingerprint_finger"]; id: string; image_quality: number | null; nfiq: number | null; revoked_at: string | null; revoked_by: string | null; template: string; template_format: Enum["fingerprint_template_format"]; workspace_id: string }
        Insert: { attendee_id: string; device_id?: string | null; enrolled_at?: string; enrolled_by?: string | null; event_id: string; finger: Enum["fingerprint_finger"]; id?: string; image_quality?: number | null; nfiq?: number | null; revoked_at?: string | null; revoked_by?: string | null; template: string; template_format?: Enum["fingerprint_template_format"]; workspace_id: string }
        Update: { attendee_id?: string; device_id?: string | null; enrolled_at?: string; enrolled_by?: string | null; event_id?: string; finger?: Enum["fingerprint_finger"]; id?: string; image_quality?: number | null; nfiq?: number | null; revoked_at?: string | null; revoked_by?: string | null; template?: string; template_format?: Enum["fingerprint_template_format"]; workspace_id?: string }
        Relationships: []
      }
      platform_admins: {
        Row: { created_at: string; user_id: string }
        Insert: { created_at?: string; user_id: string }
        Update: { created_at?: string; user_id?: string }
        Relationships: []
      }
      programmes: {
        Row: { created_at: string; created_by: string | null; date: string; description: string; end_time: string; event_id: string; id: string; is_active: boolean; location: string | null; sort_order: number; start_time: string; title: string; updated_at: string; workspace_id: string }
        Insert: { created_at?: string; created_by?: string | null; date: string; description?: string; end_time: string; event_id: string; id?: string; is_active?: boolean; location?: string | null; sort_order?: number; start_time: string; title: string; updated_at?: string; workspace_id: string }
        Update: { created_at?: string; created_by?: string | null; date?: string; description?: string; end_time?: string; event_id?: string; id?: string; is_active?: boolean; location?: string | null; sort_order?: number; start_time?: string; title?: string; updated_at?: string; workspace_id?: string }
        Relationships: []
      }
      registration_links: {
        Row: { created_at: string; created_by: string | null; event_id: string; expires_at: string | null; id: string; is_active: boolean; kind: Enum["registration_kind"]; label: string | null; max_uses: number | null; token: string; updated_at: string; uses: number; workspace_id: string }
        Insert: { created_at?: string; created_by?: string | null; event_id: string; expires_at?: string | null; id?: string; is_active?: boolean; kind: Enum["registration_kind"]; label?: string | null; max_uses?: number | null; token?: string; updated_at?: string; uses?: number; workspace_id: string }
        Update: { created_at?: string; created_by?: string | null; event_id?: string; expires_at?: string | null; id?: string; is_active?: boolean; kind?: Enum["registration_kind"]; label?: string | null; max_uses?: number | null; token?: string; updated_at?: string; uses?: number; workspace_id?: string }
        Relationships: []
      }
      workspace_members: {
        Row: { assigned_at: string; assigned_by: string | null; role: Enum["workspace_role"]; user_id: string; workspace_id: string }
        Insert: { assigned_at?: string; assigned_by?: string | null; role: Enum["workspace_role"]; user_id: string; workspace_id: string }
        Update: { assigned_at?: string; assigned_by?: string | null; role?: Enum["workspace_role"]; user_id?: string; workspace_id?: string }
        Relationships: []
      }
      workspaces: {
        Row: { code_prefix: string; created_at: string; created_by: string | null; id: string; is_active: boolean; name: string; owner_id: string | null; slug: string; timezone: string; updated_at: string }
        Insert: { code_prefix?: string; created_at?: string; created_by?: string | null; id?: string; is_active?: boolean; name: string; owner_id?: string | null; slug: string; timezone?: string; updated_at?: string }
        Update: { code_prefix?: string; created_at?: string; created_by?: string | null; id?: string; is_active?: boolean; name?: string; owner_id?: string | null; slug?: string; timezone?: string; updated_at?: string }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_event: { Args: { p_event: string }; Returns: undefined }
      assign_workspace_role: { Args: { p_email: string; p_role: Enum["workspace_role"]; p_workspace: string }; Returns: undefined }
      can_upload_registration_photo: { Args: { p_name: string }; Returns: boolean }
      claim_access_item: { Args: { p_attendee: string; p_item: Enum["access_item"] }; Returns: Json }
      qr_check_in: { Args: { p_attendee: string; p_date: string; p_programme?: string | null }; Returns: Json }
      create_workspace: { Args: { p_code_prefix?: string; p_name: string; p_owner_email: string; p_slug: string }; Returns: string }
      enroll_fingerprint: {
        Args: {
          p_attendee: string; p_consent?: boolean; p_device?: string; p_finger: Enum["fingerprint_finger"]
          p_image_quality?: number; p_nfiq?: number; p_template: string; p_template_format?: Enum["fingerprint_template_format"]
        }
        Returns: string
      }
      find_attendee_status: {
        Args: { p_query: string; p_workspace_slug: string }
        Returns: { code: string; full_name: string; kind: Enum["registration_kind"]; status_token: string }[]
      }
      get_attendee_status: { Args: { p_token: string }; Returns: Json }
      get_event_timetable: { Args: { p_workspace_slug: string }; Returns: Json }
      get_registration_form: { Args: { p_token: string }; Returns: Json }
      has_workspace_role: { Args: { roles?: Enum["workspace_role"][]; ws: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      list_workspace_members: {
        Args: { p_workspace: string }
        Returns: { assigned_at: string; email: string; name: string; role: Enum["workspace_role"]; user_id: string }[]
      }
      purge_event_fingerprints: { Args: { p_event: string }; Returns: number }
      record_biometric_verification: {
        Args: {
          p_attendee: string; p_device?: string; p_enrollment?: string; p_match_score?: number; p_message?: string
          p_programme?: string; p_result: Enum["biometric_event_result"]; p_threshold?: number
        }
        Returns: Json
      }
      register_attendee: { Args: { p_payload: Json; p_token: string }; Returns: Json }
      revoke_fingerprint: { Args: { p_enrollment: string }; Returns: undefined }
    }
    Enums: {
      access_item: "food" | "souvenir" | "entry" | "activity"
      activity_action: "attendance" | "registration" | "verification" | "access" | "role" | "settings"
      biometric_event_kind: "capture" | "enroll" | "verify" | "identify"
      biometric_event_result: "success" | "no_match" | "duplicate" | "low_quality" | "device_error" | "cancelled"
      biometric_status: "pending_verification" | "fingerprint_enrolled" | "verified_checked_in" | "duplicate_attempt"
      device_status: "online" | "offline" | "connecting" | "error"
      fingerprint_finger:
        | "right_thumb" | "right_index" | "right_middle" | "right_ring" | "right_little"
        | "left_thumb" | "left_index" | "left_middle" | "left_ring" | "left_little"
      fingerprint_template_format: "ISO19794" | "ANSI378" | "SG400"
      registration_kind: "member" | "executive"
      verification_method: "biometric" | "qr_code" | "manual"
      workspace_role:
        | "admin" | "registration_desk" | "link_manager" | "verification_operator" | "food_distributor"
        | "souvenir_distributor" | "activity_coordinator" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type TableRow<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
