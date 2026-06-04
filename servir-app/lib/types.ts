export type Role = "admin" | "leader";

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: Role;
  teamIds: string[];
}

export interface Team {
  id: string;
  name: string;
  leaderIds: string[];
  memberIds: string[];
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  teamId: string;
  active: boolean;
}

export interface Service {
  id: string;
  title: string;
  date: string;
  createdBy: string;
}

export interface ScheduleSlot {
  memberId: string;
  memberName: string;
  role: string;
  confirmed: boolean | null;
  justification: string;
}

export interface Schedule {
  id: string;
  serviceId: string;
  serviceTitle: string;
  serviceDate: string;
  teamId: string;
  teamName: string;
  leaderId: string;
  slots: ScheduleSlot[];
  publicToken: string;
  createdAt: string;
}

export type FormFieldType = "text" | "textarea" | "select" | "checkbox" | "date";

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
}

export interface CustomForm {
  id: string;
  title: string;
  teamId: string;
  teamName: string;
  fields: FormField[];
  createdBy: string;
  createdAt: string;
}

export interface FormResponse {
  id: string;
  formId: string;
  formTitle: string;
  memberName: string;
  answers: Record<string, string | boolean>;
  submittedAt: string;
}
