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

export type Funcao = "Líder" | "Co-líder" | "Voluntário";

export interface Member {
  id: string;
  name: string;
  phone: string;
  teamId: string;
  funcao: Funcao;
  aniversario: string;
  active: boolean;
}

export type Turno = "Manhã" | "Tarde" | "Noite" | "Especial";

export interface Service {
  id: string;
  title: string;
  date: string;
  turno: Turno;
  teamId: string;
  teamName: string;
  horario?: string;
  horarioChegada?: string;
  createdBy: string;
}

export interface ScheduleSlot {
  memberId: string;
  memberName: string;
  teamName: string;
  confirmed: boolean | null;
  justification: string;
}

export const POSITIONS = [
  "Estacionamento",
  "Portão",
  "Hall de Entrada",
  "Recepção",
  "Templo",
  "Frente",
  "Diretor de Culto",
  "Banheiro",
  "Mezanino",
  "Oferta",
  "Apoio e Limpeza",
  "Gabinete",
] as const;

export type Position = typeof POSITIONS[number];

export type PositionSlots = Record<string, ScheduleSlot[]>;

export interface Schedule {
  id: string;
  serviceId: string;
  serviceTitle: string;
  serviceDate: string;
  serviceTurno: string;
  teamId: string;
  teamName: string;
  leaderId: string;
  positions: PositionSlots;
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
