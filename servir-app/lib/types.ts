export type Role = "admin" | "leader" | "member";
export type Funcao = "Coordenador" | "Líder" | "Co-líder" | "Voluntário";
export type UserStatus = "pending" | "approved" | "rejected";

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: Role;
  funcao?: Funcao;
  teamIds: string[];
  memberId?: string;
  status?: UserStatus;
  phone?: string;
  aniversario?: string;
  photo?: string;
}

export interface Team {
  id: string;
  name: string;
  leaderIds: string[];
  memberIds: string[];
  inviteToken?: string;
  leaderInviteToken?: string;
}

export interface Member {
  id: string;
  name: string;
  email?: string;
  phone: string;
  teamId: string;
  funcao: Funcao;
  aniversario: string;
  active: boolean;
  uid?: string;
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
  observacao?: string;
  createdBy: string;
}

export interface ScheduleSlot {
  memberId: string;
  memberName: string;
  teamName: string;
  confirmed: boolean | null;
  justification: string;
  needsSubstitute?: boolean;
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

export type StatusSubstituicao = "aberta" | "aceita" | "cancelada";

export interface Substituicao {
  id: string;
  scheduleId: string;
  serviceTitle: string;
  serviceDate: string;
  serviceTurno: string;
  position: string;
  teamId: string;
  teamName: string;
  membroId: string;
  membroName: string;
  justification: string;
  status: StatusSubstituicao;
  substitutoId?: string;
  substitutoName?: string;
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

export type Avaliacao = "Ótimo" | "Bom" | "Regular" | "Precisa melhorar";

export interface Relatorio {
  id: string;
  serviceId: string;
  serviceTitle: string;
  serviceDate: string;
  teamId: string;
  teamName: string;
  liderId: string;
  liderName: string;
  presentes: number;
  ausentes: number;
  substitutos: number;
  avaliacao: Avaliacao;
  observacoes: string;
  ocorrencias: string;
  fotos: string[];
  createdAt: string;
}
