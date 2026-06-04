// Versículos para o devocional do dia (rotação determinística)
export const VERSICULOS = [
  { texto: "Servi uns aos outros, cada um conforme o dom que recebeu, como bons despenseiros da multiforme graça de Deus.", ref: "1 Pedro 4:10" },
  { texto: "Tudo quanto fizerdes, fazei-o de todo o coração, como para o Senhor e não para homens.", ref: "Colossenses 3:23" },
  { texto: "Porque o Filho do Homem não veio para ser servido, mas para servir.", ref: "Marcos 10:45" },
  { texto: "Cada um sirva aos outros segundo o dom que recebeu.", ref: "1 Pedro 4:10" },
  { texto: "E disse o Senhor: A quem enviarei? Eis-me aqui, envia-me a mim.", ref: "Isaías 6:8" },
  { texto: "Bem está, servo bom e fiel. Foste fiel no pouco, sobre o muito te colocarei.", ref: "Mateus 25:21" },
  { texto: "O que vos fizer maior, seja vosso servo.", ref: "Mateus 23:11" },
  { texto: "Assim resplandeça a vossa luz diante dos homens, para que vejam as vossas boas obras.", ref: "Mateus 5:16" },
  { texto: "Tudo posso naquele que me fortalece.", ref: "Filipenses 4:13" },
  { texto: "Alegrai-vos sempre no Senhor; outra vez digo: alegrai-vos.", ref: "Filipenses 4:4" },
  { texto: "O amor é paciente, é benigno; o amor não arde em ciúmes.", ref: "1 Coríntios 13:4" },
  { texto: "Lançando sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós.", ref: "1 Pedro 5:7" },
  { texto: "Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará.", ref: "Salmos 37:5" },
  { texto: "Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus.", ref: "Isaías 41:10" },
  { texto: "O Senhor é o meu pastor; nada me faltará.", ref: "Salmos 23:1" },
  { texto: "Buscai primeiro o reino de Deus, e a sua justiça, e todas estas coisas vos serão acrescentadas.", ref: "Mateus 6:33" },
  { texto: "Em tudo dai graças, porque esta é a vontade de Deus em Cristo Jesus para convosco.", ref: "1 Tessalonicenses 5:18" },
  { texto: "O coração do homem planeja o seu caminho, mas o Senhor lhe dirige os passos.", ref: "Provérbios 16:9" },
  { texto: "Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento.", ref: "Provérbios 3:5" },
  { texto: "Aquele que começou a boa obra em vós há de completá-la.", ref: "Filipenses 1:6" },
  { texto: "Sede fortes e corajosos. O Senhor vosso Deus está convosco por onde quer que andardes.", ref: "Josué 1:9" },
  { texto: "Mas os que esperam no Senhor renovarão as suas forças.", ref: "Isaías 40:31" },
  { texto: "Onde estiverem dois ou três reunidos em meu nome, ali estou no meio deles.", ref: "Mateus 18:20" },
  { texto: "Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.", ref: "Salmos 46:1" },
  { texto: "Não andeis ansiosos por coisa alguma; antes em tudo sejam conhecidas as vossas petições.", ref: "Filipenses 4:6" },
  { texto: "O fruto do Espírito é amor, alegria, paz, longanimidade, benignidade.", ref: "Gálatas 5:22" },
  { texto: "Servi ao Senhor com alegria; apresentai-vos diante dele com cânticos.", ref: "Salmos 100:2" },
  { texto: "Cada um contribua segundo propôs no seu coração, porque Deus ama ao que dá com alegria.", ref: "2 Coríntios 9:7" },
  { texto: "A vossa palavra seja sempre agradável, temperada com sal.", ref: "Colossenses 4:6" },
  { texto: "Levai as cargas uns dos outros e, assim, cumprireis a lei de Cristo.", ref: "Gálatas 6:2" },
  { texto: "Tudo tem o seu tempo determinado, e há tempo para todo o propósito debaixo do céu.", ref: "Eclesiastes 3:1" },
];

export function getVersiculoDoDia() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return VERSICULOS[dayOfYear % VERSICULOS.length];
}
