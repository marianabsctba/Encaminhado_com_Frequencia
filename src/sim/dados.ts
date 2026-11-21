import type { Habilidade, TipoVirus, Vetor } from './tipos';

export const NOMES = [
  'Nayara', 'Edinalva', 'Gesiel', 'Rosângela', 'Cleber', 'Wanderléia', 'Josué', 'Kauane', 'Lindomar', 'Marlene',
  'Adenor', 'Iracema', 'Sidnei', 'Tainá', 'Geovana', 'Ubirajara', 'Valquíria', 'Edson', 'Zuleica', 'Rafinha',
  'Doralice', 'Arlindo', 'Cleonice', 'Denilson', 'Elaine', 'Fabrício', 'Gildete', 'Heitor', 'Ivanilde', 'Jandira',
  'Luan', 'Marinalva', 'Nilton', 'Osvaldo', 'Quitéria', 'Reginaldo', 'Sueli', 'Tatiane', 'Ueslei', 'Vanusa',
  'Wellington', 'Yuri', 'Zilda', 'Benedita', 'Cauã', 'Dirceu', 'Eloá', 'Florisvaldo', 'Gracinha', 'Hélio',
  'Isadora', 'Jurema', 'Kléber', 'Laudelina', 'Mirela', 'Noêmia', 'Orlando', 'Pietra', 'Ramires', 'Sebastiana',
];
export const SOBRENOMES = ['Bragança', 'Pimentel', 'Teixeira', 'Lacerda', 'Moura', 'Siqueira', 'Paixão', 'Campos', 'Prado', 'Fontes', 'Amaral', 'Correia'];

// personagens fixos: casa especial -> moradores
export const ELENCO: Record<string, { nome: string; idade: number; clica: number; senhaFraca: boolean; segredo?: string; apelido: string }[]> = {
  rosimeire: [
    { nome: 'Dona Rosimeire', idade: 71, clica: 0.95, senhaFraca: true, apelido: 'rosimeire', segredo: 'A Dona Rosimeire manda corrente de oração pra 14 grupos e tem um perfil falso só pra curtir as próprias fotos.' },
    { nome: 'Thalisson', idade: 16, clica: 0.7, senhaFraca: true, apelido: 'thalisson', segredo: 'O Thalisson colou na prova de geografia usando o Wi-Fi da escola.' },
  ],
  bar: [{ nome: 'Seu Jurandir', idade: 58, clica: 0.85, senhaFraca: true, apelido: 'jurandir', segredo: 'O fiado do Bar do Jura passa de R$ 18 mil, e metade é do vereador.' }],
  dandara: [{ nome: 'Dandara', idade: 24, clica: 0, senhaFraca: false, apelido: 'dandara' }],
  prefeitura: [
    { nome: 'Prefeito Valdecir', idade: 63, clica: 0.6, senhaFraca: true, apelido: 'prefeito', segredo: 'A reforma da praça custou três vezes o orçamento. A nota fiscal é de uma empresa do cunhado do prefeito.' },
    { nome: 'Lucinéia da Secretaria', idade: 41, clica: 0.5, senhaFraca: true, apelido: 'lucineia', segredo: 'A senha de todos os computadores da prefeitura está num post-it: "Prefeitura@2019".' },
  ],
  padaria: [{ nome: 'Dona Ivonete', idade: 52, clica: 0.55, senhaFraca: true, apelido: 'ivonete', segredo: 'O "pão caseiro" da Pão Quente chega congelado de caminhão toda terça.' }],
  farmacia: [{ nome: 'Seu Haroldo', idade: 66, clica: 0.45, senhaFraca: false, apelido: 'haroldo', segredo: 'O Seu Haroldo vende o mesmo xarope com três rótulos diferentes.' }],
  mercadinho: [{ nome: 'Gilvânia do Mercadinho', idade: 38, clica: 0.6, senhaFraca: true, apelido: 'gilvania', segredo: 'A balança do Mercadinho pesa 80 gramas a mais. Sempre pesou.' }],
  lan: [{ nome: 'Wesley da LAN', idade: 29, clica: 0.5, senhaFraca: true, apelido: 'wesley', segredo: 'A LAN House não paga internet: puxa o sinal do vizinho desde 2017.' }],
};

export const META_DINHEIRO = 50000;
export const META_SEGREDOS = 7;
export const META_ENXAME = 0.62; // fracao dos aparelhos da cidade
export const DIAS = 21;

export const HABILIDADES: Habilidade[] = [
  { id: 'corrente', nome: 'Corrente no grupo', custo: 8, vetor: 'corrente',
    desc: 'Você vira "vídeo lindo de bom dia" e se espalha pelos grupos do ZapZap.',
    como: 'Golpes de corrente usam emoção e pressa ("encaminhe agora!") para a pessoa clicar sem pensar. Quem confia em quem mandou abaixa a guarda.',
    defesa: 'Desconfiar de link e arquivo encaminhado, mesmo vindo da família. Na dúvida, perguntar por outro meio a quem mandou.' },
  { id: 'zapgold', nome: 'ZapZap Gold', custo: 14, requer: ['corrente'], vetor: 'zapgold',
    desc: 'Uma "versão premium" do ZapZap, com figurinhas exclusivas. É você.',
    como: 'Aplicativos falsos prometem recursos que o oficial não tem e pedem para instalar fora da loja. Depois de instalados, têm acesso a tudo no celular.',
    defesa: 'Instalar aplicativo só pela loja oficial e desconfiar de "versão especial" de aplicativo famoso.' },
  { id: 'wifi', nome: 'Wi-Fi da casa', custo: 10, vetor: 'wifi',
    desc: 'Entra na rede de casa e pula para os outros aparelhos.',
    como: 'Roteador com a senha de fábrica ou rede aberta deixa qualquer aparelho infectado conversar com os outros da casa e até com os vizinhos.',
    defesa: 'Trocar a senha de fábrica do roteador, usar senha forte no Wi-Fi e manter o roteador atualizado.' },
  { id: 'senha', nome: 'Adivinhar senha', custo: 16, requer: ['wifi'], vetor: 'senha',
    desc: 'Testa "123456", "senha" e o nome do cachorro.',
    como: 'Senhas curtas, óbvias ou repetidas caem rápido em tentativas automáticas, e uma senha descoberta costuma abrir várias portas.',
    defesa: 'Senha longa e diferente em cada lugar, gerenciador de senhas e verificação em duas etapas.' },
  { id: 'movimento', nome: 'Rede do comércio', custo: 22, requer: ['senha'], vetor: 'movimento',
    desc: 'Pula de um computador de loja para outro: padaria, farmácia, prefeitura.',
    como: 'Quando todo mundo divide a mesma rede e a mesma senha, quem entra numa máquina chega nas outras. Isso se chama movimento lateral.',
    defesa: 'Separar as redes, usar senhas diferentes por máquina e não dar permissão de administrador para todo mundo.' },
  { id: 'iot', nome: 'Coisas conectadas', custo: 18, requer: ['wifi'], vetor: 'iot',
    desc: 'TV, câmera e até a geladeira "inteligente" entram na sua conta.',
    como: 'Aparelhos conectados quase nunca são atualizados e muitos vêm com senha padrão. São fáceis de dominar e ninguém percebe.',
    defesa: 'Trocar a senha padrão, atualizar o aparelho e deixá-lo numa rede separada.' },
  { id: 'persistencia', nome: 'Persistência', custo: 20,
    desc: 'Quando a Dandara limpa uma casa, você tem chance de sobreviver escondido.',
    como: 'Programas maliciosos se instalam em lugares que voltam a rodar quando o aparelho liga, para sobreviver a uma limpeza superficial.',
    defesa: 'Na dúvida, restaurar o aparelho do zero a partir de um backup limpo, e usar proteção que vigia comportamento.' },
  { id: 'disfarce', nome: 'Disfarce', custo: 15,
    desc: 'Faz menos barulho a cada infecção.',
    como: 'Imitar programas legítimos e agir devagar ajuda a passar despercebido.',
    defesa: 'Ferramentas que observam comportamento estranho, e não só arquivos conhecidos.' },
  { id: 'cripto', nome: 'Sequestro de arquivos', custo: 12, tipo: 'sequestro',
    desc: 'Libera o botão Sequestrar: tranca os arquivos de uma casa e pede resgate.',
    como: 'O sequestro de dados (ransomware) cifra os arquivos e cobra para devolver. Faz muito barulho.',
    defesa: 'Backup frequente e desconectado. Com backup, o resgate perde o sentido.' },
  { id: 'dupla', nome: 'Dupla extorsão', custo: 25, tipo: 'sequestro', requer: ['cripto'],
    desc: 'Além de trancar, ameaça vazar. Cada resgate rende 60% a mais.',
    como: 'Antes de cifrar, os dados são copiados, e a ameaça de vazamento pressiona até quem tem backup.',
    defesa: 'Guardar menos dados do que o necessário, cifrar o que é sensível e ter plano de resposta a incidente.' },
  { id: 'dormente', nome: 'Modo dormente', custo: 20, tipo: 'enxame',
    desc: 'Seus aparelhos zumbis ficam quietos. Metade do barulho.',
    como: 'Redes de aparelhos zumbis (botnets) ficam paradas até receberem ordem, o que dificulta a descoberta.',
    defesa: 'Observar tráfego estranho saindo da rede e atualizar os aparelhos.' },
  { id: 'escuta', nome: 'Escuta', custo: 12, tipo: 'fofoca',
    desc: 'Descobre segredos em metade do tempo.',
    como: 'Espiões leem mensagens, arquivos e senhas salvas sem mexer em nada.',
    defesa: 'Proteger o celular com bloqueio, cifrar arquivos e desconfiar de aplicativo pedindo permissão demais.' },
  { id: 'rastros', nome: 'Apagar rastros', custo: 22, tipo: 'fofoca',
    desc: 'A Dandara esquece parte do que sabia e aprende mais devagar.',
    como: 'Apagar registros (logs) dificulta reconstruir o que aconteceu.',
    defesa: 'Guardar os registros fora da máquina, onde o invasor não alcança.' },
];

export const DEFESA_PENDRIVE = 'Não plugar pendrive achado na rua, e desativar a execução automática de mídia removível.';

export const TIPOS: Record<TipoVirus, { nome: string; meta: string; desc: string }> = {
  sequestro: { nome: 'Sequestro', meta: `Junte R$ ${META_DINHEIRO.toLocaleString('pt-BR')} em resgates.`, desc: 'Barulhento e rico. Tranca os arquivos da cidade e cobra para devolver. Todo mundo vai te caçar.' },
  enxame: { nome: 'Enxame', meta: `Domine ${Math.round(META_ENXAME * 100)}% dos aparelhos da cidade ao mesmo tempo.`, desc: 'Silencioso e numeroso. Só quer quantidade: celular, TV, câmera, geladeira.' },
  fofoca: { nome: 'Fofoca', meta: `Descubra ${META_SEGREDOS} segredos da cidade.`, desc: 'Invisível. Lê tudo, não mexe em nada. Vence se ninguém perceber que você existe.' },
};

export const BOATOS_ZAP = [
  'Alguém sabe por que meu celular tá rosa??',
  'Gente, o vídeo de bom dia que a Rosi mandou é muito lindo, encaminhei pra todos',
  'É o 5G. Desde que botaram a antena, minhas galinhas não botam.',
  'ATENÇÃO: se não encaminhar em 10 minutos o seu Wi-Fi cai. Fonte: um primo que trabalha na NASA',
  'Meu sobrinho falou que é só desligar e ligar de novo',
  'Quem tiver o número do técnico manda aqui. Não é a Dandara, ela é muito cara (R$ 40)',
  'A geladeira lá de casa tá fazendo um barulhinho estranho de madrugada',
  'Isso é castigo. Ninguém mais vai na missa das 7',
  'O Bar do Jura tá com a TV passando propaganda de cassino sozinha',
];

export const BOATOS_RADIO = [
  'Rádio Santa Rita: especialistas da cidade culpam a antena nova do 5G.',
  'Rádio Santa Rita: vereador pede CPI do celular rosa.',
  'Rádio Santa Rita: Padre Anselmo vai benzer os roteadores no domingo, às 9h.',
  'Rádio Santa Rita: a Dandara Tec informa que não faz milagre, mas aceita Pix.',
  'Rádio Santa Rita: prefeito garante que a situação está sob controle e pede que ninguém clique em nada.',
];

export const NOME_VETOR: Record<Vetor, string> = {
  pendrive: 'Pendrive', corrente: 'Corrente', zapgold: 'ZapZap Gold', wifi: 'Wi-Fi', senha: 'Senha', movimento: 'Rede do comércio', iot: 'Coisas conectadas',
};
