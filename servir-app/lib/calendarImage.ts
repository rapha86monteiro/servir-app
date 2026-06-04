import type { Service, Team, Member, Turno } from "./types";

const WEEK_DAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function getTeamHexColor(team: Team | undefined, fallback: string): string {
  return team?.color ?? fallback;
}

function hashColor(name: string): string {
  const colors = ["#15803d","#ea580c","#1d4ed8","#dc2626","#0d9488","#f59e0b","#7e22ce","#92400e","#22c55e","#4f46e5","#f9a8d4","#047857"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

// Cor de texto baseada no brilho da cor de fundo
function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1a1a1a" : "#ffffff";
}

export async function generateCalendarImage(
  monthServices: Service[],
  uniqueDates: string[],
  teams: Team[],
  members: Member[],
  month: number,
  year: number
): Promise<Blob> {
  const turnos: Turno[] = ["Manhã", "Tarde", "Noite"];

  const aniversariantes = members
    .filter((m) => m.aniversario && parseInt(m.aniversario.split("-")[1]) === month + 1)
    .sort((a, b) => parseInt(a.aniversario.split("-")[2]) - parseInt(b.aniversario.split("-")[2]));

  // Dimensões
  const DPR = 2;
  const padding = 40;
  const titleH = 70;
  const headerH = 60;
  const cellW = Math.max(110, Math.floor(1280 / Math.max(uniqueDates.length + 1, 5)));
  const cellH = 80;
  const turnoColW = 100;

  const tableW = turnoColW + uniqueDates.length * cellW;
  const tableH = headerH + turnos.length * cellH;

  // Aniversariantes (2 colunas)
  const birthHeader = 50;
  const birthRowH = 32;
  const birthCols = aniversariantes.length > 8 ? 2 : 1;
  const birthRowsCount = Math.ceil(aniversariantes.length / birthCols);
  const birthH = aniversariantes.length > 0 ? birthHeader + birthRowsCount * birthRowH + 24 : 0;

  const footerH = 30;
  const totalW = Math.max(tableW + padding * 2, 1280);
  const totalH = titleH + tableH + birthH + footerH + padding * 2;

  const canvas = document.createElement("canvas");
  canvas.width = totalW * DPR;
  canvas.height = totalH * DPR;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(DPR, DPR);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, totalW, totalH);

  // Título
  ctx.fillStyle = "#0a0a0a";
  ctx.font = "bold 22px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`BELÉM CHURCH · ${MONTH_NAMES[month].toUpperCase()} ${year}`, totalW / 2, padding + 25);

  // Linha divisória do título
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, padding + 55);
  ctx.lineTo(totalW - padding, padding + 55);
  ctx.stroke();

  // Posição inicial da tabela
  const tableX = (totalW - tableW) / 2;
  const tableY = padding + titleH;

  // Header (linha preta com dias)
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(tableX, tableY, tableW, headerH);

  // TURNO header
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 13px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("TURNO", tableX + turnoColW / 2, tableY + headerH / 2);

  // Dias do mês no header
  uniqueDates.forEach((dateISO, i) => {
    const d = new Date(dateISO + "T12:00:00");
    const dayLabel = WEEK_DAYS[d.getDay()];
    const dayNum = String(d.getDate()).padStart(2, "0");
    const monthNum = String(d.getMonth() + 1).padStart(2, "0");
    const cx = tableX + turnoColW + i * cellW + cellW / 2;

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px -apple-system, system-ui, sans-serif";
    ctx.fillText(dayLabel, cx, tableY + headerH / 2 - 8);
    ctx.font = "bold 13px -apple-system, system-ui, sans-serif";
    ctx.fillText(`${dayNum}/${monthNum}`, cx, tableY + headerH / 2 + 9);
  });

  // Linhas de turnos
  turnos.forEach((turno, rowIdx) => {
    const rowY = tableY + headerH + rowIdx * cellH;

    // Bg coluna TURNO
    ctx.fillStyle = "#f9fafb";
    ctx.fillRect(tableX, rowY, turnoColW, cellH);

    // Texto turno
    ctx.fillStyle = "#4b5563";
    ctx.font = "bold 11px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(turno.toUpperCase(), tableX + turnoColW / 2, rowY + cellH / 2);

    // Células de cada data
    uniqueDates.forEach((dateISO, colIdx) => {
      const cellX = tableX + turnoColW + colIdx * cellW;

      // Borda
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      ctx.strokeRect(cellX, rowY, cellW, cellH);

      const svcs = monthServices.filter((s) => s.date === dateISO && s.turno === turno);

      if (svcs.length === 0) {
        ctx.fillStyle = "#d1d5db";
        ctx.font = "300 22px -apple-system, system-ui, sans-serif";
        ctx.fillText("+", cellX + cellW / 2, rowY + cellH / 2);
        return;
      }

      // Vai mostrar primeiro serviço (ou múltiplos se houver espaço)
      const svc = svcs[0];
      const team = teams.find((t) => t.name === svc.teamName);
      const teamColor = getTeamHexColor(team, hashColor(svc.teamName));
      const textColor = getContrastColor(teamColor);

      // Badge com cor da equipe
      const badgeW = Math.min(cellW - 14, 90);
      const badgeH = 26;
      const badgeX = cellX + (cellW - badgeW) / 2;
      const badgeY = rowY + (svc.observacao ? 12 : (cellH - badgeH) / 2);

      // Rounded rect
      ctx.fillStyle = teamColor;
      const r = 6;
      ctx.beginPath();
      ctx.moveTo(badgeX + r, badgeY);
      ctx.lineTo(badgeX + badgeW - r, badgeY);
      ctx.quadraticCurveTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + r);
      ctx.lineTo(badgeX + badgeW, badgeY + badgeH - r);
      ctx.quadraticCurveTo(badgeX + badgeW, badgeY + badgeH, badgeX + badgeW - r, badgeY + badgeH);
      ctx.lineTo(badgeX + r, badgeY + badgeH);
      ctx.quadraticCurveTo(badgeX, badgeY + badgeH, badgeX, badgeY + badgeH - r);
      ctx.lineTo(badgeX, badgeY + r);
      ctx.quadraticCurveTo(badgeX, badgeY, badgeX + r, badgeY);
      ctx.closePath();
      ctx.fill();

      // Nome da equipe
      ctx.fillStyle = textColor;
      ctx.font = "bold 11px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(svc.teamName.toUpperCase().slice(0, 13), cellX + cellW / 2, badgeY + badgeH / 2);

      // Observação
      if (svc.observacao) {
        ctx.fillStyle = teamColor;
        ctx.font = "500 10px -apple-system, system-ui, sans-serif";
        ctx.fillText(svc.observacao.slice(0, 18), cellX + cellW / 2, badgeY + badgeH + 14);
      }
    });
  });

  // Aniversariantes
  if (aniversariantes.length > 0) {
    const birthY = tableY + tableH + 30;
    const birthBoxX = tableX;
    const birthBoxW = tableW;
    const birthBoxH = birthHeader + birthRowsCount * birthRowH + 16;

    // Background amarelo claro
    ctx.fillStyle = "#fefce8";
    ctx.fillRect(birthBoxX, birthY, birthBoxW, birthBoxH);

    // Borda
    ctx.strokeStyle = "#fde68a";
    ctx.lineWidth = 1;
    ctx.strokeRect(birthBoxX, birthY, birthBoxW, birthBoxH);

    // Título
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "bold 14px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`🎂  ANIVERSARIANTES DE ${MONTH_NAMES[month].toUpperCase()}`, birthBoxX + 16, birthY + 22);

    // Listas
    const colWidth = (birthBoxW - 32) / birthCols;
    aniversariantes.forEach((m, i) => {
      const col = i % birthCols;
      const row = Math.floor(i / birthCols);
      const rowY = birthY + 50 + row * birthRowH;
      const startX = birthBoxX + 16 + col * colWidth;
      const day = parseInt(m.aniversario.split("-")[2]);

      // Data
      ctx.fillStyle = "#374151";
      ctx.font = "bold 12px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${String(day).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}`, startX, rowY + birthRowH / 2);

      // Bolinha cor da equipe
      const team = teams.find((t) => t.id === m.teamId);
      const teamColor = getTeamHexColor(team, hashColor(team?.name ?? ""));
      ctx.beginPath();
      ctx.arc(startX + 55, rowY + birthRowH / 2, 4, 0, Math.PI * 2);
      ctx.fillStyle = teamColor;
      ctx.fill();

      // Nome
      ctx.fillStyle = "#111827";
      ctx.font = "600 12px -apple-system, system-ui, sans-serif";
      const maxNameW = colWidth - 130;
      let name = m.name;
      if (ctx.measureText(name).width > maxNameW) {
        while (ctx.measureText(name + "...").width > maxNameW && name.length > 0) {
          name = name.slice(0, -1);
        }
        name += "...";
      }
      ctx.fillText(name, startX + 68, rowY + birthRowH / 2);

      // Equipe
      ctx.fillStyle = "#9ca3af";
      ctx.font = "500 10px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText((team?.name ?? "").toUpperCase(), startX + colWidth - 8, rowY + birthRowH / 2);
    });
  }

  // Footer
  ctx.fillStyle = "#9ca3af";
  ctx.font = "11px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Calendário de Equipes · Belém Church Servir", totalW / 2, totalH - padding / 2);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png", 1.0);
  });
}
