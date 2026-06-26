/**
 * Fit Questions Seed — pool of 100 hardcoded psychometric questions
 * stratified across 18 `FitDimension` values (Big Five OCEAN +
 * Schwartz basic values + SDT basic needs).
 *
 * The fit-profile/ context samples 25 questions from this pool with
 * stratification, so the per-dimension counts here drive the shape of
 * any user's questionnaire. Distribution: 6 per Big Five (×5 = 30),
 * 5 per Schwartz value (×10 = 50), 7/7/6 for SDT (= 20). Total: 100.
 *
 * All questions use a 5-point Likert scale; the answer integer maps to
 * 1=Strongly Disagree … 5=Strongly Agree. Weight defaults to 1 — future
 * IRT calibration will mutate this column without re-seeding the keys.
 *
 * Idempotent: upsert keyed on the human-stable `key` column. Re-running
 * the seed updates text/weight without duplicating rows.
 */

import { FitDimension, Prisma, type PrismaClient } from '@prisma/client';

type FitQuestionSeed = {
  key: string;
  dimension: FitDimension;
  textEn: string;
  textPtBr: string;
};

const Q: readonly FitQuestionSeed[] = [
  // ── Big Five — Openness (6) ─────────────────────────────────────
  {
    key: 'bf_open_01',
    dimension: FitDimension.BIG_FIVE_OPENNESS,
    textEn: 'I enjoy exploring abstract ideas and theories.',
    textPtBr: 'Gosto de explorar ideias e teorias abstratas.',
  },
  {
    key: 'bf_open_02',
    dimension: FitDimension.BIG_FIVE_OPENNESS,
    textEn: 'I have a vivid imagination.',
    textPtBr: 'Tenho uma imaginação vívida.',
  },
  {
    key: 'bf_open_03',
    dimension: FitDimension.BIG_FIVE_OPENNESS,
    textEn: 'I prefer routine over variety.',
    textPtBr: 'Prefiro rotina a variedade.',
  },
  {
    key: 'bf_open_04',
    dimension: FitDimension.BIG_FIVE_OPENNESS,
    textEn: 'I appreciate art, music, or literature deeply.',
    textPtBr: 'Aprecio profundamente arte, música ou literatura.',
  },
  {
    key: 'bf_open_05',
    dimension: FitDimension.BIG_FIVE_OPENNESS,
    textEn: 'I am curious about how things work.',
    textPtBr: 'Tenho curiosidade sobre como as coisas funcionam.',
  },
  {
    key: 'bf_open_06',
    dimension: FitDimension.BIG_FIVE_OPENNESS,
    textEn: 'I avoid philosophical discussions.',
    textPtBr: 'Evito discussões filosóficas.',
  },

  // ── Big Five — Conscientiousness (6) ────────────────────────────
  {
    key: 'bf_consc_01',
    dimension: FitDimension.BIG_FIVE_CONSCIENTIOUSNESS,
    textEn: 'I keep my workspace organized.',
    textPtBr: 'Mantenho meu espaço de trabalho organizado.',
  },
  {
    key: 'bf_consc_02',
    dimension: FitDimension.BIG_FIVE_CONSCIENTIOUSNESS,
    textEn: 'I follow through on commitments.',
    textPtBr: 'Cumpro com os compromissos que assumo.',
  },
  {
    key: 'bf_consc_03',
    dimension: FitDimension.BIG_FIVE_CONSCIENTIOUSNESS,
    textEn: 'I procrastinate on important tasks.',
    textPtBr: 'Procrastino em tarefas importantes.',
  },
  {
    key: 'bf_consc_04',
    dimension: FitDimension.BIG_FIVE_CONSCIENTIOUSNESS,
    textEn: 'I plan my day in advance.',
    textPtBr: 'Planejo meu dia com antecedência.',
  },
  {
    key: 'bf_consc_05',
    dimension: FitDimension.BIG_FIVE_CONSCIENTIOUSNESS,
    textEn: 'I pay attention to details others miss.',
    textPtBr: 'Presto atenção em detalhes que outros não percebem.',
  },
  {
    key: 'bf_consc_06',
    dimension: FitDimension.BIG_FIVE_CONSCIENTIOUSNESS,
    textEn: 'I find it hard to start tasks I dislike.',
    textPtBr: 'Tenho dificuldade de começar tarefas que não gosto.',
  },

  // ── Big Five — Extraversion (6) ─────────────────────────────────
  {
    key: 'bf_extra_01',
    dimension: FitDimension.BIG_FIVE_EXTRAVERSION,
    textEn: 'I feel energized after group meetings.',
    textPtBr: 'Sinto-me energizado depois de reuniões em grupo.',
  },
  {
    key: 'bf_extra_02',
    dimension: FitDimension.BIG_FIVE_EXTRAVERSION,
    textEn: 'I prefer working alone over in a team.',
    textPtBr: 'Prefiro trabalhar sozinho a trabalhar em equipe.',
  },
  {
    key: 'bf_extra_03',
    dimension: FitDimension.BIG_FIVE_EXTRAVERSION,
    textEn: 'I start conversations with strangers easily.',
    textPtBr: 'Inicio conversas com desconhecidos com facilidade.',
  },
  {
    key: 'bf_extra_04',
    dimension: FitDimension.BIG_FIVE_EXTRAVERSION,
    textEn: 'I enjoy being the center of attention.',
    textPtBr: 'Gosto de ser o centro das atenções.',
  },
  {
    key: 'bf_extra_05',
    dimension: FitDimension.BIG_FIVE_EXTRAVERSION,
    textEn: 'Quiet environments suit me best.',
    textPtBr: 'Ambientes silenciosos me agradam mais.',
  },
  {
    key: 'bf_extra_06',
    dimension: FitDimension.BIG_FIVE_EXTRAVERSION,
    textEn: 'I make friends quickly in new environments.',
    textPtBr: 'Faço amigos rapidamente em novos ambientes.',
  },

  // ── Big Five — Agreeableness (6) ────────────────────────────────
  {
    key: 'bf_agree_01',
    dimension: FitDimension.BIG_FIVE_AGREEABLENESS,
    textEn: 'I sympathize with others’ feelings.',
    textPtBr: 'Tenho empatia pelos sentimentos dos outros.',
  },
  {
    key: 'bf_agree_02',
    dimension: FitDimension.BIG_FIVE_AGREEABLENESS,
    textEn: 'I prefer to avoid conflicts.',
    textPtBr: 'Prefiro evitar conflitos.',
  },
  {
    key: 'bf_agree_03',
    dimension: FitDimension.BIG_FIVE_AGREEABLENESS,
    textEn: 'I am suspicious of people’s motives.',
    textPtBr: 'Desconfio das motivações alheias.',
  },
  {
    key: 'bf_agree_04',
    dimension: FitDimension.BIG_FIVE_AGREEABLENESS,
    textEn: 'I make people feel at ease.',
    textPtBr: 'Faço as pessoas se sentirem à vontade.',
  },
  {
    key: 'bf_agree_05',
    dimension: FitDimension.BIG_FIVE_AGREEABLENESS,
    textEn: 'I trust what others tell me.',
    textPtBr: 'Confio no que os outros me dizem.',
  },
  {
    key: 'bf_agree_06',
    dimension: FitDimension.BIG_FIVE_AGREEABLENESS,
    textEn: 'I get frustrated by others’ mistakes quickly.',
    textPtBr: 'Fico frustrado rapidamente com os erros dos outros.',
  },

  // ── Big Five — Neuroticism (6) ──────────────────────────────────
  {
    key: 'bf_neuro_01',
    dimension: FitDimension.BIG_FIVE_NEUROTICISM,
    textEn: 'I worry about things often.',
    textPtBr: 'Costumo me preocupar com várias coisas.',
  },
  {
    key: 'bf_neuro_02',
    dimension: FitDimension.BIG_FIVE_NEUROTICISM,
    textEn: 'I stay calm under pressure.',
    textPtBr: 'Mantenho a calma sob pressão.',
  },
  {
    key: 'bf_neuro_03',
    dimension: FitDimension.BIG_FIVE_NEUROTICISM,
    textEn: 'I get upset easily.',
    textPtBr: 'Fico chateado com facilidade.',
  },
  {
    key: 'bf_neuro_04',
    dimension: FitDimension.BIG_FIVE_NEUROTICISM,
    textEn: 'My mood changes quickly.',
    textPtBr: 'Meu humor muda rapidamente.',
  },
  {
    key: 'bf_neuro_05',
    dimension: FitDimension.BIG_FIVE_NEUROTICISM,
    textEn: 'I rarely feel anxious about the future.',
    textPtBr: 'Raramente me sinto ansioso quanto ao futuro.',
  },
  {
    key: 'bf_neuro_06',
    dimension: FitDimension.BIG_FIVE_NEUROTICISM,
    textEn: 'Setbacks shake my confidence.',
    textPtBr: 'Contratempos abalam minha confiança.',
  },

  // ── Schwartz — Self-Direction (5) ───────────────────────────────
  {
    key: 'sw_selfdir_01',
    dimension: FitDimension.SCHWARTZ_SELF_DIRECTION,
    textEn: 'It is important to me to make my own decisions.',
    textPtBr: 'É importante para mim tomar minhas próprias decisões.',
  },
  {
    key: 'sw_selfdir_02',
    dimension: FitDimension.SCHWARTZ_SELF_DIRECTION,
    textEn: 'I value freedom over stability.',
    textPtBr: 'Valorizo a liberdade mais do que a estabilidade.',
  },
  {
    key: 'sw_selfdir_03',
    dimension: FitDimension.SCHWARTZ_SELF_DIRECTION,
    textEn: 'I like figuring things out for myself.',
    textPtBr: 'Gosto de descobrir as coisas por conta própria.',
  },
  {
    key: 'sw_selfdir_04',
    dimension: FitDimension.SCHWARTZ_SELF_DIRECTION,
    textEn: 'Being independent is essential for me.',
    textPtBr: 'Ser independente é essencial para mim.',
  },
  {
    key: 'sw_selfdir_05',
    dimension: FitDimension.SCHWARTZ_SELF_DIRECTION,
    textEn: 'I prefer when others guide my choices.',
    textPtBr: 'Prefiro quando outras pessoas guiam minhas escolhas.',
  },

  // ── Schwartz — Stimulation (5) ──────────────────────────────────
  {
    key: 'sw_stim_01',
    dimension: FitDimension.SCHWARTZ_STIMULATION,
    textEn: 'I look for new experiences regularly.',
    textPtBr: 'Busco novas experiências com frequência.',
  },
  {
    key: 'sw_stim_02',
    dimension: FitDimension.SCHWARTZ_STIMULATION,
    textEn: 'I prefer adventure over comfort.',
    textPtBr: 'Prefiro aventura à zona de conforto.',
  },
  {
    key: 'sw_stim_03',
    dimension: FitDimension.SCHWARTZ_STIMULATION,
    textEn: 'I avoid risky activities.',
    textPtBr: 'Evito atividades arriscadas.',
  },
  {
    key: 'sw_stim_04',
    dimension: FitDimension.SCHWARTZ_STIMULATION,
    textEn: 'A varied life is appealing to me.',
    textPtBr: 'Uma vida variada me atrai.',
  },
  {
    key: 'sw_stim_05',
    dimension: FitDimension.SCHWARTZ_STIMULATION,
    textEn: 'Excitement matters more to me than safety.',
    textPtBr: 'A emoção importa mais para mim do que a segurança.',
  },

  // ── Schwartz — Hedonism (5) ─────────────────────────────────────
  {
    key: 'sw_hedo_01',
    dimension: FitDimension.SCHWARTZ_HEDONISM,
    textEn: 'Enjoying life’s pleasures is a top priority.',
    textPtBr: 'Aproveitar os prazeres da vida é uma prioridade.',
  },
  {
    key: 'sw_hedo_02',
    dimension: FitDimension.SCHWARTZ_HEDONISM,
    textEn: 'I work hard to afford things I enjoy.',
    textPtBr: 'Trabalho duro para poder aproveitar coisas que gosto.',
  },
  {
    key: 'sw_hedo_03',
    dimension: FitDimension.SCHWARTZ_HEDONISM,
    textEn: 'I delay gratification for long-term gains.',
    textPtBr: 'Adio gratificações em prol de ganhos de longo prazo.',
  },
  {
    key: 'sw_hedo_04',
    dimension: FitDimension.SCHWARTZ_HEDONISM,
    textEn: 'I value free time over extra income.',
    textPtBr: 'Valorizo tempo livre mais do que renda extra.',
  },
  {
    key: 'sw_hedo_05',
    dimension: FitDimension.SCHWARTZ_HEDONISM,
    textEn: 'I treat myself when I accomplish something.',
    textPtBr: 'Me presenteio quando alcanço algo.',
  },

  // ── Schwartz — Achievement (5) ──────────────────────────────────
  {
    key: 'sw_achv_01',
    dimension: FitDimension.SCHWARTZ_ACHIEVEMENT,
    textEn: 'Being recognised for my work is important to me.',
    textPtBr: 'Ser reconhecido pelo meu trabalho é importante para mim.',
  },
  {
    key: 'sw_achv_02',
    dimension: FitDimension.SCHWARTZ_ACHIEVEMENT,
    textEn: 'I set ambitious career goals.',
    textPtBr: 'Defino metas ambiciosas para minha carreira.',
  },
  {
    key: 'sw_achv_03',
    dimension: FitDimension.SCHWARTZ_ACHIEVEMENT,
    textEn: 'I am content with average results.',
    textPtBr: 'Sinto-me satisfeito com resultados medianos.',
  },
  {
    key: 'sw_achv_04',
    dimension: FitDimension.SCHWARTZ_ACHIEVEMENT,
    textEn: 'Outperforming peers motivates me.',
    textPtBr: 'Superar colegas me motiva.',
  },
  {
    key: 'sw_achv_05',
    dimension: FitDimension.SCHWARTZ_ACHIEVEMENT,
    textEn: 'Demonstrating my abilities matters to me.',
    textPtBr: 'Demonstrar minhas habilidades é importante para mim.',
  },

  // ── Schwartz — Power (5) ────────────────────────────────────────
  {
    key: 'sw_powr_01',
    dimension: FitDimension.SCHWARTZ_POWER,
    textEn: 'I want to lead and influence others.',
    textPtBr: 'Quero liderar e influenciar pessoas.',
  },
  {
    key: 'sw_powr_02',
    dimension: FitDimension.SCHWARTZ_POWER,
    textEn: 'Having authority over decisions matters to me.',
    textPtBr: 'Ter autoridade sobre decisões é importante para mim.',
  },
  {
    key: 'sw_powr_03',
    dimension: FitDimension.SCHWARTZ_POWER,
    textEn: 'I prefer to follow rather than lead.',
    textPtBr: 'Prefiro seguir a liderar.',
  },
  {
    key: 'sw_powr_04',
    dimension: FitDimension.SCHWARTZ_POWER,
    textEn: 'Wealth is a meaningful indicator of success.',
    textPtBr: 'Riqueza é um indicador relevante de sucesso.',
  },
  {
    key: 'sw_powr_05',
    dimension: FitDimension.SCHWARTZ_POWER,
    textEn: 'Status symbols are unimportant to me.',
    textPtBr: 'Símbolos de status não são importantes para mim.',
  },

  // ── Schwartz — Security (5) ─────────────────────────────────────
  {
    key: 'sw_secu_01',
    dimension: FitDimension.SCHWARTZ_SECURITY,
    textEn: 'A stable income outweighs higher risk-reward.',
    textPtBr: 'Uma renda estável vale mais do que risco com retorno alto.',
  },
  {
    key: 'sw_secu_02',
    dimension: FitDimension.SCHWARTZ_SECURITY,
    textEn: 'Safe environments matter more than novelty.',
    textPtBr: 'Ambientes seguros importam mais do que novidade.',
  },
  {
    key: 'sw_secu_03',
    dimension: FitDimension.SCHWARTZ_SECURITY,
    textEn: 'I am comfortable with uncertainty.',
    textPtBr: 'Lido bem com incertezas.',
  },
  {
    key: 'sw_secu_04',
    dimension: FitDimension.SCHWARTZ_SECURITY,
    textEn: 'I plan financially for the long term.',
    textPtBr: 'Planejo financeiramente para o longo prazo.',
  },
  {
    key: 'sw_secu_05',
    dimension: FitDimension.SCHWARTZ_SECURITY,
    textEn: 'Health and safety guide my decisions.',
    textPtBr: 'Saúde e segurança guiam minhas decisões.',
  },

  // ── Schwartz — Conformity (5) ───────────────────────────────────
  {
    key: 'sw_conf_01',
    dimension: FitDimension.SCHWARTZ_CONFORMITY,
    textEn: 'I follow established norms at work.',
    textPtBr: 'Sigo as normas estabelecidas no trabalho.',
  },
  {
    key: 'sw_conf_02',
    dimension: FitDimension.SCHWARTZ_CONFORMITY,
    textEn: 'I behave properly even when no one is watching.',
    textPtBr: 'Comporto-me adequadamente mesmo sem ninguém observando.',
  },
  {
    key: 'sw_conf_03',
    dimension: FitDimension.SCHWARTZ_CONFORMITY,
    textEn: 'I question authority when I disagree.',
    textPtBr: 'Questiono a autoridade quando discordo.',
  },
  {
    key: 'sw_conf_04',
    dimension: FitDimension.SCHWARTZ_CONFORMITY,
    textEn: 'Politeness is a core value of mine.',
    textPtBr: 'Educação é um valor central para mim.',
  },
  {
    key: 'sw_conf_05',
    dimension: FitDimension.SCHWARTZ_CONFORMITY,
    textEn: 'I prefer to break rules I disagree with.',
    textPtBr: 'Prefiro romper regras com as quais discordo.',
  },

  // ── Schwartz — Tradition (5) ────────────────────────────────────
  {
    key: 'sw_trad_01',
    dimension: FitDimension.SCHWARTZ_TRADITION,
    textEn: 'Maintaining cultural traditions is meaningful to me.',
    textPtBr: 'Manter tradições culturais é significativo para mim.',
  },
  {
    key: 'sw_trad_02',
    dimension: FitDimension.SCHWARTZ_TRADITION,
    textEn: 'I respect long-standing institutions.',
    textPtBr: 'Respeito instituições antigas e estabelecidas.',
  },
  {
    key: 'sw_trad_03',
    dimension: FitDimension.SCHWARTZ_TRADITION,
    textEn: 'I prefer modern ways over traditional ones.',
    textPtBr: 'Prefiro formas modernas em vez de tradicionais.',
  },
  {
    key: 'sw_trad_04',
    dimension: FitDimension.SCHWARTZ_TRADITION,
    textEn: 'I uphold customs my family taught me.',
    textPtBr: 'Mantenho costumes que minha família me ensinou.',
  },
  {
    key: 'sw_trad_05',
    dimension: FitDimension.SCHWARTZ_TRADITION,
    textEn: 'Living modestly aligns with my values.',
    textPtBr: 'Viver com modéstia alinha-se aos meus valores.',
  },

  // ── Schwartz — Benevolence (5) ──────────────────────────────────
  {
    key: 'sw_bene_01',
    dimension: FitDimension.SCHWARTZ_BENEVOLENCE,
    textEn: 'Helping colleagues succeed is important to me.',
    textPtBr: 'Ajudar colegas a terem sucesso é importante para mim.',
  },
  {
    key: 'sw_bene_02',
    dimension: FitDimension.SCHWARTZ_BENEVOLENCE,
    textEn: 'I act with loyalty to those close to me.',
    textPtBr: 'Ajo com lealdade para com pessoas próximas.',
  },
  {
    key: 'sw_bene_03',
    dimension: FitDimension.SCHWARTZ_BENEVOLENCE,
    textEn: 'I avoid getting involved in others’ problems.',
    textPtBr: 'Evito me envolver em problemas dos outros.',
  },
  {
    key: 'sw_bene_04',
    dimension: FitDimension.SCHWARTZ_BENEVOLENCE,
    textEn: 'Honesty in relationships is non-negotiable for me.',
    textPtBr: 'Honestidade nas relações é inegociável para mim.',
  },
  {
    key: 'sw_bene_05',
    dimension: FitDimension.SCHWARTZ_BENEVOLENCE,
    textEn: 'I forgive people who hurt me.',
    textPtBr: 'Perdoo quem me machuca.',
  },

  // ── Schwartz — Universalism (5) ─────────────────────────────────
  {
    key: 'sw_univ_01',
    dimension: FitDimension.SCHWARTZ_UNIVERSALISM,
    textEn: 'I want my work to make a positive social impact.',
    textPtBr: 'Quero que meu trabalho gere impacto social positivo.',
  },
  {
    key: 'sw_univ_02',
    dimension: FitDimension.SCHWARTZ_UNIVERSALISM,
    textEn: 'Environmental sustainability shapes my choices.',
    textPtBr: 'Sustentabilidade ambiental influencia minhas escolhas.',
  },
  {
    key: 'sw_univ_03',
    dimension: FitDimension.SCHWARTZ_UNIVERSALISM,
    textEn: 'Equality among people is a priority.',
    textPtBr: 'Igualdade entre as pessoas é uma prioridade.',
  },
  {
    key: 'sw_univ_04',
    dimension: FitDimension.SCHWARTZ_UNIVERSALISM,
    textEn: 'I focus mainly on my own circle, not the wider world.',
    textPtBr: 'Foco principalmente no meu círculo, não no mundo amplo.',
  },
  {
    key: 'sw_univ_05',
    dimension: FitDimension.SCHWARTZ_UNIVERSALISM,
    textEn: 'I respect cultures that differ from mine.',
    textPtBr: 'Respeito culturas diferentes da minha.',
  },

  // ── SDT — Autonomy (7) ──────────────────────────────────────────
  {
    key: 'sdt_auto_01',
    dimension: FitDimension.SDT_AUTONOMY,
    textEn: 'I want to choose how I do my work.',
    textPtBr: 'Quero escolher como faço meu trabalho.',
  },
  {
    key: 'sdt_auto_02',
    dimension: FitDimension.SDT_AUTONOMY,
    textEn: 'Detailed micromanagement frustrates me.',
    textPtBr: 'Microgerenciamento detalhado me frustra.',
  },
  {
    key: 'sdt_auto_03',
    dimension: FitDimension.SDT_AUTONOMY,
    textEn: 'I prefer when goals are set, not the path.',
    textPtBr: 'Prefiro quando metas são definidas, mas não o caminho.',
  },
  {
    key: 'sdt_auto_04',
    dimension: FitDimension.SDT_AUTONOMY,
    textEn: 'I value flexible schedules over fixed hours.',
    textPtBr: 'Valorizo horários flexíveis em vez de horários fixos.',
  },
  {
    key: 'sdt_auto_05',
    dimension: FitDimension.SDT_AUTONOMY,
    textEn: 'Clear instructions matter more than freedom.',
    textPtBr: 'Instruções claras importam mais do que liberdade.',
  },
  {
    key: 'sdt_auto_06',
    dimension: FitDimension.SDT_AUTONOMY,
    textEn: 'I take ownership of decisions in my role.',
    textPtBr: 'Assumo a responsabilidade pelas decisões da minha função.',
  },
  {
    key: 'sdt_auto_07',
    dimension: FitDimension.SDT_AUTONOMY,
    textEn: 'I disengage when my autonomy is restricted.',
    textPtBr: 'Desengajo quando minha autonomia é restringida.',
  },

  // ── SDT — Competence (7) ────────────────────────────────────────
  {
    key: 'sdt_comp_01',
    dimension: FitDimension.SDT_COMPETENCE,
    textEn: 'Mastering new skills energises me.',
    textPtBr: 'Dominar novas habilidades me energiza.',
  },
  {
    key: 'sdt_comp_02',
    dimension: FitDimension.SDT_COMPETENCE,
    textEn: 'I seek feedback to improve my work.',
    textPtBr: 'Busco feedback para melhorar meu trabalho.',
  },
  {
    key: 'sdt_comp_03',
    dimension: FitDimension.SDT_COMPETENCE,
    textEn: 'Tasks I find easy bore me quickly.',
    textPtBr: 'Tarefas fáceis me entediam rapidamente.',
  },
  {
    key: 'sdt_comp_04',
    dimension: FitDimension.SDT_COMPETENCE,
    textEn: 'I avoid challenges where I might fail.',
    textPtBr: 'Evito desafios em que posso falhar.',
  },
  {
    key: 'sdt_comp_05',
    dimension: FitDimension.SDT_COMPETENCE,
    textEn: 'I take pride in producing high-quality work.',
    textPtBr: 'Tenho orgulho de produzir trabalho de alta qualidade.',
  },
  {
    key: 'sdt_comp_06',
    dimension: FitDimension.SDT_COMPETENCE,
    textEn: 'I enjoy difficult problems more than routine ones.',
    textPtBr: 'Aproveito problemas difíceis mais do que tarefas rotineiras.',
  },
  {
    key: 'sdt_comp_07',
    dimension: FitDimension.SDT_COMPETENCE,
    textEn: 'I keep learning even outside formal training.',
    textPtBr: 'Continuo aprendendo mesmo fora de treinamentos formais.',
  },

  // ── SDT — Relatedness (6) ───────────────────────────────────────
  {
    key: 'sdt_rela_01',
    dimension: FitDimension.SDT_RELATEDNESS,
    textEn: 'Strong workplace relationships matter to me.',
    textPtBr: 'Relacionamentos fortes no trabalho são importantes para mim.',
  },
  {
    key: 'sdt_rela_02',
    dimension: FitDimension.SDT_RELATEDNESS,
    textEn: 'I feel motivated when my team appreciates me.',
    textPtBr: 'Sinto-me motivado quando minha equipe me valoriza.',
  },
  {
    key: 'sdt_rela_03',
    dimension: FitDimension.SDT_RELATEDNESS,
    textEn: 'Working alone for long periods drains me.',
    textPtBr: 'Trabalhar sozinho por longos períodos me esgota.',
  },
  {
    key: 'sdt_rela_04',
    dimension: FitDimension.SDT_RELATEDNESS,
    textEn: 'I separate personal life from work relationships.',
    textPtBr: 'Separo vida pessoal das relações de trabalho.',
  },
  {
    key: 'sdt_rela_05',
    dimension: FitDimension.SDT_RELATEDNESS,
    textEn: 'I check on colleagues’ wellbeing.',
    textPtBr: 'Costumo verificar o bem-estar dos meus colegas.',
  },
  {
    key: 'sdt_rela_06',
    dimension: FitDimension.SDT_RELATEDNESS,
    textEn: 'A sense of belonging matters more than salary.',
    textPtBr: 'Senso de pertencimento importa mais do que salário.',
  },
];

export async function seedFitQuestions(prisma: PrismaClient): Promise<void> {
  if (Q.length !== 100) {
    throw new Error(
      `seedFitQuestions: expected 100 questions, got ${Q.length}. Stratification is broken.`,
    );
  }

  // Deactivate any pre-existing rows that aren't in the current pool so
  // sampling never returns orphaned items. Active state is the live
  // contract; we never delete answered rows (FK to FitAnswer).
  const keys = Q.map((q) => q.key);
  await prisma.fitQuestion.updateMany({
    where: { key: { notIn: keys } },
    data: { isActive: false },
  });

  for (const q of Q) {
    await prisma.fitQuestion.upsert({
      where: { key: q.key },
      update: {
        dimension: q.dimension,
        textEn: q.textEn,
        textPtBr: q.textPtBr,
        scaleType: 'likert5',
        weight: new Prisma.Decimal(1),
        isActive: true,
      },
      create: {
        key: q.key,
        dimension: q.dimension,
        textEn: q.textEn,
        textPtBr: q.textPtBr,
        scaleType: 'likert5',
        weight: new Prisma.Decimal(1),
        isActive: true,
      },
    });
  }
  console.log(`✅ Seeded ${Q.length} fit questions across 18 dimensions`);
}
