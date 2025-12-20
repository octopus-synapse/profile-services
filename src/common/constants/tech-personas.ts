/**
 * 🎭 TECH PERSONAS - Definições de personalidade por área de TI
 *
 * Cada persona tem características únicas que definem:
 * - Cores e estilo visual
 * - Skills categories relevantes
 * - Achievements típicos
 * - Seções prioritárias no resume
 */

export enum TechPersona {
  DEVOPS = 'devops',
  SECURITY = 'security',
  DATA = 'data',
  FULLSTACK = 'fullstack',
  MOBILE = 'mobile',
  AI_ML = 'ai-ml',
  QA = 'qa',
  UX_UI = 'ux-ui',
  BACKEND = 'backend',
  FRONTEND = 'frontend',
  CLOUD = 'cloud',
  GAME_DEV = 'game-dev',
}

interface PersonaConfig {
  id: TechPersona;
  name: string;
  description: string;
  icon: string; // Emoji ou icon name
  primaryColor: string; // Cor principal
  accentColor: string; // Cor de destaque
  gradient: [string, string]; // Gradiente único

  // Skills categories relevantes
  skillCategories: string[];

  // Achievement types que fazem sentido
  achievementTypes: string[];

  // Seções que devem ser destacadas
  prioritySections: string[];

  // Keywords para suggestions
  keywords: string[];
}

export const TECH_PERSONAS: Record<TechPersona, PersonaConfig> = {
  [TechPersona.DEVOPS]: {
    id: TechPersona.DEVOPS,
    name: 'DevOps Engineer',
    description: 'Infrastructure, Automation, CI/CD',
    icon: '⚙️',
    primaryColor: '#FF6B6B',
    accentColor: '#FFA500',
    gradient: ['#FF6B6B', '#FF8E53'],
    skillCategories: [
      'Infrastructure as Code',
      'CI/CD',
      'Containers & Orchestration',
      'Cloud Platforms',
      'Monitoring & Observability',
      'Configuration Management',
      'Scripting & Automation',
    ],
    achievementTypes: [
      'infrastructure_scale',
      'deployment_frequency',
      'uptime_achievement',
      'cost_optimization',
    ],
    prioritySections: ['openSource', 'certifications', 'talks', 'experiences'],
    keywords: [
      'kubernetes',
      'docker',
      'terraform',
      'ansible',
      'jenkins',
      'gitlab-ci',
      'aws',
      'azure',
      'gcp',
      'prometheus',
      'grafana',
      'elk',
      'datadog',
      'helm',
      'argocd',
      'istio',
      'vault',
      'consul',
    ],
  },

  [TechPersona.SECURITY]: {
    id: TechPersona.SECURITY,
    name: 'Security Specialist',
    description: 'Cybersecurity, Pentesting, Ethical Hacking',
    icon: '🛡️',
    primaryColor: '#DC2626',
    accentColor: '#B91C1C',
    gradient: ['#DC2626', '#7C2D12'],
    skillCategories: [
      'Penetration Testing',
      'Vulnerability Assessment',
      'Security Tools',
      'Cryptography',
      'Network Security',
      'Application Security',
      'Incident Response',
    ],
    achievementTypes: [
      'cve_discovered',
      'bug_bounty_total',
      'ctf_wins',
      'hall_of_fame',
    ],
    prioritySections: [
      'bugBounties',
      'certifications',
      'publications',
      'achievements',
    ],
    keywords: [
      'oscp',
      'ceh',
      'cissp',
      'burp-suite',
      'metasploit',
      'nmap',
      'wireshark',
      'owasp',
      'xss',
      'sql-injection',
      'csrf',
      'pentesting',
      'red-team',
      'blue-team',
      'soc',
      'siem',
      'ids',
      'ips',
      'forensics',
    ],
  },

  [TechPersona.DATA]: {
    id: TechPersona.DATA,
    name: 'Data Scientist',
    description: 'Data Analysis, Machine Learning, Big Data',
    icon: '📊',
    primaryColor: '#8B5CF6',
    accentColor: '#A78BFA',
    gradient: ['#8B5CF6', '#EC4899'],
    skillCategories: [
      'Data Analysis',
      'Machine Learning',
      'Data Visualization',
      'Big Data Technologies',
      'Statistical Analysis',
      'Data Engineering',
      'Programming Languages',
    ],
    achievementTypes: [
      'kaggle_medal',
      'paper_published',
      'dataset_created',
      'model_deployed',
    ],
    prioritySections: [
      'publications',
      'projects',
      'achievements',
      'certifications',
    ],
    keywords: [
      'python',
      'r',
      'sql',
      'pandas',
      'numpy',
      'scikit-learn',
      'tensorflow',
      'pytorch',
      'keras',
      'spark',
      'hadoop',
      'tableau',
      'powerbi',
      'jupyter',
      'kaggle',
      'statistics',
      'regression',
      'classification',
    ],
  },

  [TechPersona.AI_ML]: {
    id: TechPersona.AI_ML,
    name: 'AI/ML Engineer',
    description: 'Artificial Intelligence, Deep Learning, NLP',
    icon: '🤖',
    primaryColor: '#06B6D4',
    accentColor: '#0891B2',
    gradient: ['#06B6D4', '#8B5CF6'],
    skillCategories: [
      'Deep Learning',
      'Natural Language Processing',
      'Computer Vision',
      'Reinforcement Learning',
      'ML Frameworks',
      'MLOps',
      'Research',
    ],
    achievementTypes: [
      'paper_citations',
      'model_performance',
      'research_contribution',
      'open_source_ml_lib',
    ],
    prioritySections: [
      'publications',
      'openSource',
      'projects',
      'achievements',
    ],
    keywords: [
      'tensorflow',
      'pytorch',
      'transformers',
      'bert',
      'gpt',
      'llm',
      'computer-vision',
      'nlp',
      'deep-learning',
      'neural-networks',
      'gan',
      'cnn',
      'rnn',
      'lstm',
      'attention',
      'mlflow',
      'kubeflow',
    ],
  },

  [TechPersona.FULLSTACK]: {
    id: TechPersona.FULLSTACK,
    name: 'Full Stack Developer',
    description: 'Frontend, Backend, Databases, APIs',
    icon: '💻',
    primaryColor: '#10B981',
    accentColor: '#059669',
    gradient: ['#10B981', '#3B82F6'],
    skillCategories: [
      'Frontend Frameworks',
      'Backend Technologies',
      'Databases',
      'API Development',
      'DevOps Basics',
      'UI/UX',
      'Testing',
    ],
    achievementTypes: [
      'github_stars',
      'npm_downloads',
      'open_source_contribution',
      'hackathon_win',
    ],
    prioritySections: ['projects', 'openSource', 'experiences', 'hackathons'],
    keywords: [
      'react',
      'vue',
      'angular',
      'nodejs',
      'express',
      'nestjs',
      'typescript',
      'javascript',
      'mongodb',
      'postgresql',
      'redis',
      'graphql',
      'rest',
      'docker',
      'git',
      'aws',
      'vercel',
      'nextjs',
      'tailwind',
    ],
  },

  [TechPersona.MOBILE]: {
    id: TechPersona.MOBILE,
    name: 'Mobile Developer',
    description: 'iOS, Android, React Native, Flutter',
    icon: '📱',
    primaryColor: '#F59E0B',
    accentColor: '#D97706',
    gradient: ['#F59E0B', '#EF4444'],
    skillCategories: [
      'Mobile Frameworks',
      'Native Development',
      'Cross-Platform',
      'App Architecture',
      'UI/UX',
      'App Store Optimization',
      'Testing',
    ],
    achievementTypes: [
      'app_downloads',
      'app_rating',
      'featured_app',
      'app_revenue',
    ],
    prioritySections: [
      'projects',
      'experiences',
      'achievements',
      'certifications',
    ],
    keywords: [
      'react-native',
      'flutter',
      'swift',
      'kotlin',
      'ios',
      'android',
      'swiftui',
      'jetpack-compose',
      'firebase',
      'realm',
      'sqlite',
      'push-notifications',
      'in-app-purchases',
      'app-store',
      'play-store',
    ],
  },

  [TechPersona.QA]: {
    id: TechPersona.QA,
    name: 'QA Engineer',
    description: 'Test Automation, Quality Assurance, Testing',
    icon: '🧪',
    primaryColor: '#14B8A6',
    accentColor: '#0D9488',
    gradient: ['#14B8A6', '#06B6D4'],
    skillCategories: [
      'Test Automation',
      'Manual Testing',
      'Performance Testing',
      'Security Testing',
      'Test Frameworks',
      'CI/CD Integration',
      'Bug Tracking',
    ],
    achievementTypes: [
      'bugs_found',
      'test_coverage',
      'automation_rate',
      'quality_improvement',
    ],
    prioritySections: ['experiences', 'certifications', 'projects', 'skills'],
    keywords: [
      'selenium',
      'cypress',
      'playwright',
      'jest',
      'junit',
      'testng',
      'jmeter',
      'postman',
      'rest-assured',
      'appium',
      'cucumber',
      'bdd',
      'tdd',
      'continuous-testing',
      'qa-automation',
    ],
  },

  [TechPersona.UX_UI]: {
    id: TechPersona.UX_UI,
    name: 'UX/UI Designer',
    description: 'User Experience, Interface Design, Prototyping',
    icon: '🎨',
    primaryColor: '#EC4899',
    accentColor: '#DB2777',
    gradient: ['#EC4899', '#F59E0B'],
    skillCategories: [
      'UI Design',
      'UX Research',
      'Prototyping',
      'Design Systems',
      'User Testing',
      'Interaction Design',
      'Design Tools',
    ],
    achievementTypes: [
      'design_awards',
      'case_studies',
      'user_satisfaction',
      'design_system_adoption',
    ],
    prioritySections: ['projects', 'awards', 'experiences', 'certifications'],
    keywords: [
      'figma',
      'sketch',
      'adobe-xd',
      'prototyping',
      'wireframing',
      'user-research',
      'usability-testing',
      'design-systems',
      'accessibility',
      'responsive-design',
      'interaction-design',
    ],
  },

  [TechPersona.BACKEND]: {
    id: TechPersona.BACKEND,
    name: 'Backend Developer',
    description: 'APIs, Databases, Microservices, Architecture',
    icon: '⚡',
    primaryColor: '#3B82F6',
    accentColor: '#2563EB',
    gradient: ['#3B82F6', '#8B5CF6'],
    skillCategories: [
      'Programming Languages',
      'Frameworks',
      'Databases',
      'API Design',
      'Microservices',
      'System Design',
      'Performance Optimization',
    ],
    achievementTypes: [
      'system_performance',
      'scalability_achievement',
      'api_usage',
      'open_source_library',
    ],
    prioritySections: [
      'experiences',
      'openSource',
      'projects',
      'certifications',
    ],
    keywords: [
      'nodejs',
      'python',
      'java',
      'go',
      'rust',
      'c#',
      'spring-boot',
      'django',
      'fastapi',
      'express',
      'nestjs',
      'postgresql',
      'mongodb',
      'redis',
      'rabbitmq',
      'kafka',
      'grpc',
      'microservices',
      'ddd',
    ],
  },

  [TechPersona.FRONTEND]: {
    id: TechPersona.FRONTEND,
    name: 'Frontend Developer',
    description: 'React, Vue, Angular, Web Performance',
    icon: '🌐',
    primaryColor: '#6366F1',
    accentColor: '#4F46E5',
    gradient: ['#6366F1', '#EC4899'],
    skillCategories: [
      'JavaScript Frameworks',
      'CSS/Styling',
      'State Management',
      'Build Tools',
      'Web Performance',
      'Accessibility',
      'Testing',
    ],
    achievementTypes: [
      'npm_package',
      'lighthouse_score',
      'github_stars',
      'performance_improvement',
    ],
    prioritySections: ['projects', 'openSource', 'experiences', 'achievements'],
    keywords: [
      'react',
      'vue',
      'angular',
      'typescript',
      'javascript',
      'nextjs',
      'tailwind',
      'css',
      'sass',
      'webpack',
      'vite',
      'redux',
      'zustand',
      'testing-library',
      'jest',
      'cypress',
      'web-performance',
      'pwa',
    ],
  },

  [TechPersona.CLOUD]: {
    id: TechPersona.CLOUD,
    name: 'Cloud Architect',
    description: 'AWS, Azure, GCP, Cloud Native',
    icon: '☁️',
    primaryColor: '#0EA5E9',
    accentColor: '#0284C7',
    gradient: ['#0EA5E9', '#8B5CF6'],
    skillCategories: [
      'Cloud Platforms',
      'Cloud Architecture',
      'Serverless',
      'Infrastructure as Code',
      'Cloud Security',
      'Cost Optimization',
      'Multi-Cloud',
    ],
    achievementTypes: [
      'cost_savings',
      'cloud_migration',
      'architecture_design',
      'cloud_certifications',
    ],
    prioritySections: ['certifications', 'experiences', 'projects', 'talks'],
    keywords: [
      'aws',
      'azure',
      'gcp',
      'lambda',
      'ec2',
      's3',
      'cloudformation',
      'terraform',
      'serverless',
      'kubernetes',
      'ecs',
      'fargate',
      'cloud-native',
      'well-architected',
      'cloud-security',
      'finops',
    ],
  },

  [TechPersona.GAME_DEV]: {
    id: TechPersona.GAME_DEV,
    name: 'Game Developer',
    description: 'Unity, Unreal, Game Design, Graphics',
    icon: '🎮',
    primaryColor: '#A855F7',
    accentColor: '#9333EA',
    gradient: ['#A855F7', '#EC4899'],
    skillCategories: [
      'Game Engines',
      'Graphics Programming',
      'Game Design',
      'Physics',
      'AI for Games',
      'Multiplayer',
      'Optimization',
    ],
    achievementTypes: [
      'game_downloads',
      'game_awards',
      'jam_wins',
      'player_count',
    ],
    prioritySections: ['projects', 'hackathons', 'awards', 'experiences'],
    keywords: [
      'unity',
      'unreal-engine',
      'c#',
      'c++',
      'godot',
      '3d-modeling',
      'shader',
      'physics',
      'multiplayer',
      'steam',
      'mobile-games',
      'game-jam',
      'procedural-generation',
      'ai',
      'networking',
    ],
  },
};

/**
 * Helper para obter config de uma persona
 */
export function getPersonaConfig(persona: TechPersona): PersonaConfig {
  return TECH_PERSONAS[persona];
}

/**
 * Sugerir persona baseado em skills e job title
 */
export function suggestPersona(
  jobTitle: string,
  skills: string[],
): TechPersona {
  const jobLower = jobTitle.toLowerCase();
  const skillsLower = skills.map((s) => s.toLowerCase());

  // Lógica de detecção baseada em keywords
  for (const [persona, config] of Object.entries(TECH_PERSONAS)) {
    const matchingKeywords = config.keywords.filter(
      (keyword) =>
        jobLower.includes(keyword) ||
        skillsLower.some((skill) => skill.includes(keyword)),
    );

    if (matchingKeywords.length > 3) {
      return persona as TechPersona;
    }
  }

  return TechPersona.FULLSTACK; // Default
}
