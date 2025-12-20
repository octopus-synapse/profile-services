# ProFile Backend Services

Backend API para o sistema ProFile - Plataforma de gerenciamento de currículos e perfis profissionais.

## 🚀 Stack Tecnológica

- **Framework**: NestJS (Node.js)
- **Linguagem**: TypeScript
- **ORM**: Prisma
- **Banco de Dados**: PostgreSQL
- **Cache**: Redis
- **Autenticação**: JWT + Passport
- **Validação**: class-validator, Zod
- **Email**: SendGrid
- **Storage**: MinIO (S3-compatible)
- **Documentação**: Swagger/OpenAPI
- **Testes**: Jest
- **PDF Generation**: Puppeteer
- **Document Processing**: docx

## 📋 Pré-requisitos

- Node.js 20 ou superior
- Docker e Docker Compose
- PostgreSQL 16
- Redis 7
- MinIO self-hosted (ver backend/docs/MINIO_SETUP.md)
- Conta SendGrid (para emails)

## 🛠️ Instalação

### Desenvolvimento Local

1. Clone o repositório:

```bash
git clone https://github.com/YOUR_USERNAME/profile-services.git
cd profile-services
```

2. Instale as dependências:

```bash
npm install
```

3. Configure as variáveis de ambiente:

```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. Inicie os serviços com Docker:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

5. Execute as migrations:

```bash
npm run prisma:migrate
```

6. (Opcional) Popule o banco com dados de exemplo:

```bash
npm run prisma:seed
```

7. Inicie o servidor de desenvolvimento:

```bash
npm run start:dev
```

A API estará disponível em `http://localhost:3001`

## 🐳 Docker

### Development

```bash
# Iniciar todos os serviços (Postgres, Redis, Backend)
docker-compose -f docker-compose.dev.yml up -d

# Ver logs
docker-compose -f docker-compose.dev.yml logs -f

# Parar serviços
docker-compose -f docker-compose.dev.yml down
```

### Production

```bash
# Build e iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f backend

# Parar
docker-compose down
```

## 📚 Documentação da API

A documentação interativa da API está disponível via Swagger:

- **Desenvolvimento**: http://localhost:3001/api/docs
- **Produção**: https://api.yourdomain.com/api/docs

## 🧪 Testes

```bash
# Testes unitários
npm run test

# Testes com coverage
npm run test:cov

# Testes e2e
npm run test:e2e

# Testes em modo watch
npm run test:watch
```

## 🗄️ Banco de Dados

### Prisma Commands

```bash
# Gerar Prisma Client
npm run prisma:generate

# Criar nova migration
npm run prisma:migrate

# Aplicar migrations
npx prisma migrate deploy

# Abrir Prisma Studio
npm run prisma:studio

# Seed do banco
npm run prisma:seed
```

## 📦 Scripts Disponíveis

| Script                | Descrição                                     |
| --------------------- | --------------------------------------------- |
| `npm run build`       | Build da aplicação para produção              |
| `npm run start`       | Inicia a aplicação                            |
| `npm run start:dev`   | Inicia em modo desenvolvimento com hot-reload |
| `npm run start:debug` | Inicia em modo debug                          |
| `npm run start:prod`  | Inicia a aplicação compilada                  |
| `npm run lint`        | Executa o linter e corrige problemas          |
| `npm run format`      | Formata o código com Prettier                 |
| `npm run test`        | Executa testes unitários                      |
| `npm run test:e2e`    | Executa testes e2e                            |
| `npm run test:cov`    | Executa testes com coverage                   |

## 🏗️ Estrutura do Projeto

```
profile-services/
├── src/
│   ├── auth/                 # Autenticação e autorização
│   │   ├── guards/          # Guards do Passport
│   │   ├── strategies/      # Estratégias JWT e Local
│   │   └── dto/             # DTOs de autenticação
│   ├── users/               # Módulo de usuários
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   └── entities/
│   ├── resumes/             # Módulo de currículos
│   │   ├── controllers/
│   │   ├── services/
│   │   └── dto/
│   ├── export/              # Exportação de documentos (PDF, DOCX)
│   ├── upload/              # Upload de arquivos (S3)
│   ├── onboarding/          # Onboarding de novos usuários
│   ├── integrations/        # Integrações externas
│   ├── common/              # Código compartilhado
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── pipes/
│   │   └── utils/
│   ├── prisma/              # Serviço Prisma
│   └── main.ts              # Entry point
├── prisma/
│   ├── schema.prisma        # Schema do banco
│   ├── migrations/          # Migrations
│   └── seed.ts             # Seed data
├── test/                    # Testes e2e
├── scripts/                 # Scripts utilitários
│   └── setup-alpine-vm.sh  # Setup da VM Alpine
├── .github/
│   └── workflows/          # GitHub Actions CI/CD
│       ├── ci.yml
│       ├── cd.yml
│       └── rollback.yml
├── Dockerfile
├── docker-compose.yml
├── docker-compose.dev.yml
├── DEPLOYMENT.md           # Guia de deployment
├── SECRETS.md             # Configuração de secrets
└── README.md
```

## 🔐 Segurança

- ✅ Helmet.js para headers de segurança
- ✅ Rate limiting (Throttler)
- ✅ CORS configurado
- ✅ Validação de input (class-validator)
- ✅ Sanitização de dados
- ✅ JWT para autenticação
- ✅ Bcrypt para hash de senhas
- ✅ Secrets gerenciados via environment variables

## 🚀 Deploy

Para deployment em produção, consulte:

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Guia completo de deployment
- **[SECRETS.md](./SECRETS.md)** - Configuração de secrets

### Deploy Rápido

```bash
# 1. Configure os secrets no GitHub (ver SECRETS.md)
# 2. Push para a branch main
git push origin main

# O CI/CD executará automaticamente:
# - Build da aplicação
# - Testes
# - Build da imagem Docker
# - Deploy na VM Alpine Linux
```

## 📊 Endpoints Principais

### Autenticação

- `POST /auth/signup` - Registro de usuário
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh token
- `POST /auth/forgot-password` - Recuperação de senha
- `POST /auth/reset-password` - Reset de senha
- `POST /auth/verify-email` - Verificação de email

### Usuários

- `GET /users/me` - Perfil do usuário logado
- `PATCH /users/me` - Atualizar perfil
- `DELETE /users/me` - Deletar conta

### Currículos

- `GET /resumes` - Listar currículos
- `POST /resumes` - Criar currículo
- `GET /resumes/:id` - Buscar currículo
- `PATCH /resumes/:id` - Atualizar currículo
- `DELETE /resumes/:id` - Deletar currículo

### Exportação

- `POST /export/pdf/:resumeId` - Exportar para PDF
- `POST /export/docx/:resumeId` - Exportar para DOCX

### Upload

- `POST /upload/image` - Upload de imagem
- `POST /upload/document` - Upload de documento

### Health Check

- `GET /api/health` - Status da aplicação

## 🔧 Variáveis de Ambiente

Consulte [.env.example](./.env.example) para todas as variáveis disponíveis.

### Variáveis Essenciais

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key

# SendGrid
SENDGRID_API_KEY=your-api-key
SENDGRID_EMAIL_FROM=noreply@yourdomain.com

# MinIO S3-compatible storage
MINIO_ENDPOINT=http://your-vm-ip:9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=profile-uploads
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Convenções de Código

- Use TypeScript strict mode
- Siga o guia de estilo do ESLint configurado
- Escreva testes para novas features
- Documente endpoints complexos
- Use commits semânticos (feat, fix, docs, etc.)

## 🐛 Troubleshooting

### Problema: Erro de conexão com o banco

```bash
# Verifique se o PostgreSQL está rodando
docker-compose ps postgres

# Verifique a variável DATABASE_URL
echo $DATABASE_URL
```

### Problema: Prisma Client não atualizado

```bash
# Regenere o Prisma Client
npm run prisma:generate
```

### Problema: Porta já em uso

```bash
# Verifique qual processo está usando a porta
lsof -i :3001

# Mude a porta no .env
PORT=3002
```

## 📄 Licença

Este projeto está sob a licença [UNLICENSED](./LICENSE).

## 👥 Equipe

- Desenvolvedor Principal - [@ilelo](https://github.com/ilelo)

## 📞 Suporte

Para suporte e dúvidas:

- Abra uma issue no GitHub
- Consulte a documentação em `/api/docs`
- Entre em contato com a equipe de desenvolvimento
