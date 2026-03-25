const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

// ==================== 설정 ====================
const PREFIX = ',,팀뽑기';
const TOKEN = process.env.token;   // ← 반드시 바꾸기!

const roleLists = {
  '탑  ':    ["김준수", "하준서", "최신우", "민승호", "장현우", "김은우", "박준호", "백승우", "이진모"],
  '정글':  ["하준서", "김은우", "정승우", "최신우", "민승호", "노문강", "이시현", "장현우", "박준호", "백승우", "이진모", "조강유"],
  '미드':  ["장현우", "박신재", "하준서", "민승호", "백승우"],
  '원딜':  ["김은우", "박신재", "곽현우", "노문강", "박준호"],
  '서폿':  ["김은우", "이시현", "노문강", "곽현우", "박준호"]
  
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`${client.user.tag}온라인 `);
});

// 가중치 계산 (선호 라인 = 10, 비선호 = 1)
function getWeight(player, role) {
  if (roleLists[role].includes(player)) return 50;
  return 0.2; // 0퍼는 절대 아님
}

function pickWeighted(items, weights) {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return items[i];
  }
  return items[items.length - 1];
}

// 가중 랜덤으로 k명 뽑기 (중복 없이)
function weightedRandomSelect(items, weights, k) {
  let currentItems = [...items];
  let currentWeights = [...weights];
  const selected = [];
  for (let i = 0; i < k; i++) {
    const picked = pickWeighted(currentItems, currentWeights);
    selected.push(picked);
    const idx = currentItems.indexOf(picked);
    currentItems.splice(idx, 1);
    currentWeights.splice(idx, 1);
  }
  return selected;
}

// 10명 → 각 라인별 정확히 2명 배정 (가중치 적용)
function assignRoles(players) {
  let remaining = [...players];
  const assignment = {};
  const roles = ['탑  ', '정글', '미드', '원딜', '서폿'];

  // 라인 처리 순서를 매번 랜덤으로 섞어서 공정하게
  const shuffledRoles = [...roles].sort(() => Math.random() - 0.5);

  for (const role of shuffledRoles) {
    const currentWeights = remaining.map(p => getWeight(p, role));
    const selected = weightedRandomSelect(remaining, currentWeights, 2);
    assignment[role] = selected;
    remaining = remaining.filter(p => !selected.includes(p));
  }
  return assignment;
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);

  if (args.length !== 10 || new Set(args).size !== 10) {
    return message.reply('10명 띄어쓰기있게 이름석자로.');
  }

  const players = args;

  // 역할 배정
  const assignment = assignRoles(players);

  // 각 라인에서 2명을 A/B팀으로 랜덤 분배
  const displayRoles = ['탑  ', '정글', '미드', '원딜', '서폿'];
  const aLines = [];
  const bLines = [];

  for (const role of displayRoles) {
    let pair = assignment[role];
    // 랜덤으로 A/B 결정
    if (Math.random() > 0.5) pair = [pair[1], pair[0]];
    aLines.push(`**${role}** ${pair[0]}`);
    bLines.push(`**${role}** ${pair[1]}`);
  }

  // 예쁜 임베드 출력
  const embed = new EmbedBuilder()
    .setColor(0x00ff99)
    .setTitle('5ㄷ5결과')
    .setDescription(`뽑은사람:**${message.author}**`)
    .addFields(
      { name: '1팀', value: aLines.join('\n'), inline: true },
      { name: '2팀', value: bLines.join('\n'), inline: true }
    )

  await message.channel.send({ embeds: [embed] });
});

client.login(TOKEN);
