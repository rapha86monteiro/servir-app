// Paleta de cores para equipes (inspirada na escala da Belém Church)
export const TEAM_COLOR_PALETTE = [
  { bg: "#15803d", text: "#ffffff", soft: "#dcfce7", softText: "#166534" }, // ASER - verde
  { bg: "#ea580c", text: "#ffffff", soft: "#ffedd5", softText: "#9a3412" }, // BENJAMIM - laranja
  { bg: "#22c55e", text: "#ffffff", soft: "#dcfce7", softText: "#15803d" }, // CASAIS - verde claro
  { bg: "#f59e0b", text: "#ffffff", soft: "#fef3c7", softText: "#92400e" }, // DA - âmbar
  { bg: "#4f46e5", text: "#ffffff", soft: "#e0e7ff", softText: "#3730a3" }, // ENOQUE - índigo
  { bg: "#1d4ed8", text: "#ffffff", soft: "#dbeafe", softText: "#1e40af" }, // GADE - azul royal
  { bg: "#f9a8d4", text: "#831843", soft: "#fce7f3", softText: "#9d174d" }, // GERADORAS - rosa
  { bg: "#dc2626", text: "#ffffff", soft: "#fee2e2", softText: "#991b1b" }, // JUDA - vermelho
  { bg: "#0d9488", text: "#ffffff", soft: "#ccfbf1", softText: "#115e59" }, // LEVI - teal
  { bg: "#047857", text: "#ffffff", soft: "#d1fae5", softText: "#065f46" }, // NAFTALI - esmeralda escuro
  { bg: "#7e22ce", text: "#ffffff", soft: "#f3e8ff", softText: "#6b21a8" }, // RUBEN - roxo
  { bg: "#92400e", text: "#ffffff", soft: "#fef3c7", softText: "#78350f" }, // SIMEAO - marrom
];

// Hash determinístico para dar cor consistente por nome
export function getTeamColor(name: string) {
  if (!name) return TEAM_COLOR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return TEAM_COLOR_PALETTE[hash % TEAM_COLOR_PALETTE.length];
}

// Para uma cor que sempre será igual para os mesmos nomes ordenados
export function getTeamColorByName(name: string, allNames: string[]) {
  const sorted = [...allNames].sort();
  const idx = sorted.indexOf(name);
  if (idx < 0) return getTeamColor(name);
  return TEAM_COLOR_PALETTE[idx % TEAM_COLOR_PALETTE.length];
}
