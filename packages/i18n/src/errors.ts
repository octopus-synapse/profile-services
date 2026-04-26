/**
 * Error-message dictionary.
 *
 * One entry per concrete `DomainException.code` string literal declared in
 * `src/**\/*.exceptions.ts`. The `i18n-catalog-parity` architecture test
 * enforces that every literal code has an entry here in BOTH locales and
 * that no orphan keys exist.
 *
 * Template placeholders use `{name}` syntax. Values are interpolated by
 * `I18nService.translate(code, params, locale)` from own-enumerable fields
 * on the exception instance.
 */

import type { LocalizedDictionary } from './types';

export type ErrorCode = keyof typeof ERROR_DICTIONARY;

export const ERROR_DICTIONARY = {
  ACCOUNT_ALREADY_ACTIVE: {
    en: 'Account is already active',
    'pt-BR': 'A conta já está ativa',
  },
  ACCOUNT_ALREADY_EXISTS: {
    en: 'An account with this email already exists',
    'pt-BR': 'Já existe uma conta com este e-mail',
  },
  ACCOUNT_DEACTIVATED: {
    en: 'Account is deactivated',
    'pt-BR': 'A conta está desativada',
  },
  ACCOUNT_LOCKED: {
    en: 'Account is temporarily locked. Try again in a few minutes.',
    'pt-BR': 'A conta está temporariamente bloqueada. Tente novamente em alguns minutos.',
  },
  AGGREGATION_BACKEND_UNAVAILABLE: {
    en: 'Analytics backend is temporarily unavailable',
    'pt-BR': 'O backend de analytics está temporariamente indisponível',
  },
  AI_EMPTY_INPUT: {
    en: 'AI input is empty',
    'pt-BR': 'A entrada enviada para a IA está vazia',
  },
  AI_EMPTY_RESPONSE: {
    en: 'AI returned an empty response',
    'pt-BR': 'A IA retornou uma resposta vazia',
  },
  AI_INVALID_OUTPUT: {
    en: 'AI output shape is invalid',
    'pt-BR': 'O formato da resposta da IA é inválido',
  },
  AI_NOT_CONFIGURED: {
    en: 'AI features are not configured on this instance.',
    'pt-BR': 'Os recursos de IA não estão configurados nesta instância.',
  },
  ALREADY_BLOCKED: {
    en: 'This user is already blocked',
    'pt-BR': 'Este usuário já está bloqueado',
  },
  ALREADY_CONNECTED: {
    en: 'Already connected with this user',
    'pt-BR': 'Você já está conectado com este usuário',
  },
  ALREADY_ENDORSED: {
    en: 'You have already endorsed this skill for this user',
    'pt-BR': 'Você já recomendou esta habilidade para este usuário',
  },
  ALREADY_FOLLOWING: {
    en: 'Already following this user',
    'pt-BR': 'Você já segue este usuário',
  },
  ANALYTICS_CONSENT_REQUIRED: {
    en: 'User has not granted analytics consent',
    'pt-BR': 'O usuário não autorizou a coleta de analytics',
  },
  APPLICATION_NOT_OWNED: {
    en: 'You do not own this application',
    'pt-BR': 'Você não é o dono desta candidatura',
  },
  AUDIT_LOG_FAILED: {
    en: 'Failed to record audit log entry',
    'pt-BR': 'Falha ao gravar entrada no log de auditoria',
  },
  AUTHENTICATION_REQUIRED: {
    en: 'Authentication required',
    'pt-BR': 'Autenticação necessária',
  },
  AUTO_APPLY_ALL_PICKS_FAILED: {
    en: 'Auto-apply failed for every selected job',
    'pt-BR': 'O auto-apply falhou para todas as vagas selecionadas',
  },
  AUTO_APPLY_ALREADY_RUNNING: {
    en: 'An auto-apply job is already running for this user',
    'pt-BR': 'Já existe um auto-apply em andamento para este usuário',
  },
  AUTOMATION_ITEM_NOT_OWNED: {
    en: 'You do not own this item',
    'pt-BR': 'Você não é o dono deste item',
  },
  AUTOMATION_WORKER_UNAVAILABLE: {
    en: 'Automation workers are temporarily unavailable',
    'pt-BR': 'Os workers de automação estão temporariamente indisponíveis',
  },
  BADGE_ALREADY_AWARDED: {
    en: 'Badge has already been awarded',
    'pt-BR': 'Esta conquista já foi concedida',
  },
  BADGE_CRITERIA_NOT_MET: {
    en: 'Badge criteria not met',
    'pt-BR': 'Os critérios da conquista não foram atingidos',
  },
  BANNER_ELEMENT_NOT_FOUND: {
    en: 'Banner element not found',
    'pt-BR': 'Elemento do banner não encontrado',
  },
  BLOCK_NOT_FOUND: {
    en: 'This user is not blocked',
    'pt-BR': 'Este usuário não está bloqueado',
  },
  BUNDLE_ASSEMBLY_PARTIAL: {
    en: 'Bundle assembly finished with partial results',
    'pt-BR': 'A montagem do bundle terminou com resultado parcial',
  },
  BUSINESS_RULE_VIOLATION: {
    en: 'Business rule violation',
    'pt-BR': 'Regra de negócio violada',
  },
  CANNOT_APPLY_TO_OWN_JOB: {
    en: 'You cannot apply to your own job',
    'pt-BR': 'Você não pode se candidatar à sua própria vaga',
  },
  CANNOT_BLOCK_SELF: {
    en: 'You cannot block yourself',
    'pt-BR': 'Você não pode bloquear a si mesmo',
  },
  CANNOT_CONNECT_WITH_SELF: {
    en: 'Cannot connect with yourself',
    'pt-BR': 'Você não pode se conectar consigo mesmo',
  },
  CANNOT_DELETE_ANOTHER_USERS_COMMENT: {
    en: 'Cannot delete another user comment',
    'pt-BR': 'Você não pode apagar o comentário de outro usuário',
  },
  CANNOT_DELETE_OTHERS_COMMENT: {
    en: 'You can only delete your own comments',
    'pt-BR': 'Você só pode apagar os seus próprios comentários',
  },
  CANNOT_DELETE_OTHERS_POST: {
    en: 'You can only delete your own posts',
    'pt-BR': 'Você só pode apagar os seus próprios posts',
  },
  CANNOT_DELETE_OWN_ACCOUNT_AS_ADMIN: {
    en: 'Cannot delete your own account through the admin interface',
    'pt-BR': 'Você não pode apagar a sua própria conta pela interface de admin',
  },
  CANNOT_ENDORSE_SELF: {
    en: 'You cannot endorse your own skills',
    'pt-BR': 'Você não pode recomendar suas próprias habilidades',
  },
  CANNOT_FOLLOW_SELF: {
    en: 'Cannot follow yourself',
    'pt-BR': 'Você não pode seguir a si mesmo',
  },
  CANNOT_MESSAGE_SELF: {
    en: 'Cannot send message to yourself',
    'pt-BR': 'Você não pode mandar mensagem para si mesmo',
  },
  CANNOT_MODIFY_OTHERS_JOB: {
    en: "You cannot modify another user's job posting",
    'pt-BR': 'Você não pode modificar a vaga de outro usuário',
  },
  CANNOT_RECOMMEND_SELF: {
    en: 'You cannot write a recommendation for yourself',
    'pt-BR': 'Você não pode escrever uma recomendação para si mesmo',
  },
  CANNOT_SEND_MESSAGE_TO_USER: {
    en: 'Cannot send message to this user',
    'pt-BR': 'Não é possível enviar mensagem para este usuário',
  },
  COLLABORATOR_ALREADY_INVITED: {
    en: 'This user is already a collaborator',
    'pt-BR': 'Este usuário já é um colaborador',
  },
  COLLABORATOR_LIMIT_REACHED: {
    en: 'Collaborator limit reached',
    'pt-BR': 'Limite de colaboradores atingido',
  },
  COMMENT_NOT_OWNED: {
    en: 'You can only modify your own comments',
    'pt-BR': 'Você só pode modificar os seus próprios comentários',
  },
  COMMENT_THREAD_CLOSED: {
    en: 'This comment thread is closed',
    'pt-BR': 'Esta thread de comentários está fechada',
  },
  CONFIGURATION_MISSING: {
    en: 'Configuration is missing',
    'pt-BR': 'Configuração ausente',
  },
  CONFLICT: {
    en: 'Conflict',
    'pt-BR': 'Conflito',
  },
  CONNECTION_NOT_ACCEPTED: {
    en: 'Connection is not accepted',
    'pt-BR': 'A conexão não foi aceita',
  },
  CONNECTION_NOT_PENDING: {
    en: 'Connection request is not pending',
    'pt-BR': 'O pedido de conexão não está pendente',
  },
  CONNECTION_REQUEST_EXISTS: {
    en: 'Connection request already exists',
    'pt-BR': 'Já existe um pedido de conexão',
  },
  CONNECTION_REQUEST_PENDING: {
    en: 'Connection request already pending',
    'pt-BR': 'Já existe um pedido de conexão pendente',
  },
  CONSENT_REQUIRED: {
    en: 'Consent is required for this action',
    'pt-BR': 'É necessário consentimento para esta ação',
  },
  CURATED_SELECTOR_ALL_SCORING_FAILED: {
    en: 'All scoring strategies failed for the curated selector',
    'pt-BR': 'Todas as estratégias de scoring falharam para o seletor curado',
  },
  DATE_RANGE_TOO_LARGE: {
    en: 'Date range is too large',
    'pt-BR': 'Intervalo de datas muito grande',
  },
  DELETION_REQUIRES_CONFIRMATION: {
    en: 'Account deletion requires explicit confirmation',
    'pt-BR': 'A exclusão da conta exige confirmação explícita',
  },
  DSL_CYCLIC_REFERENCE: {
    en: 'DSL has a cyclic reference',
    'pt-BR': 'A DSL possui uma referência cíclica',
  },
  DSL_ERROR_EXPRESSION: {
    en: 'DSL expression raised an error',
    'pt-BR': 'A expressão da DSL gerou um erro',
  },
  DSL_EVALUATION_LIMIT_EXCEEDED: {
    en: 'DSL evaluation exceeded the instruction limit',
    'pt-BR': 'A avaliação da DSL excedeu o limite de instruções',
  },
  DSL_EXPECTED_TOKEN: {
    en: 'DSL expected a different token',
    'pt-BR': 'A DSL esperava um token diferente',
  },
  DSL_MIGRATION_LOOP: {
    en: 'DSL migration path contains a loop',
    'pt-BR': 'O caminho de migração da DSL possui um loop',
  },
  DSL_MIGRATION_PATH_NOT_FOUND: {
    en: 'DSL migration path not found',
    'pt-BR': 'Caminho de migração da DSL não encontrado',
  },
  DSL_MIGRATION_RESULT_VERSION_MISMATCH: {
    en: 'DSL migration produced an unexpected version',
    'pt-BR': 'A migração da DSL produziu uma versão inesperada',
  },
  DSL_NORMALIZED_MISSING: {
    en: 'Validation succeeded but the normalized DSL is missing',
    'pt-BR': 'A validação passou mas a DSL normalizada não foi produzida',
  },
  DSL_PARSE_ERROR: {
    en: 'DSL failed to parse',
    'pt-BR': 'Falha ao fazer parse da DSL',
  },
  DSL_RESUME_NO_ACTIVE_STYLE: {
    en: 'Resume has no active style. Apply a style before rendering.',
    'pt-BR': 'O currículo não tem estilo ativo. Aplique um estilo antes de renderizar.',
  },
  DSL_TYPE_MISMATCH: {
    en: 'DSL type mismatch',
    'pt-BR': 'Tipo incompatível na DSL',
  },
  DSL_UNEXPECTED_TOKEN: {
    en: 'DSL encountered an unexpected token',
    'pt-BR': 'Token inesperado na DSL',
  },
  DSL_UNKNOWN_FUNCTION: {
    en: 'DSL references an unknown function',
    'pt-BR': 'A DSL referencia uma função desconhecida',
  },
  DSL_UNKNOWN_OPERATOR: {
    en: 'DSL references an unknown operator',
    'pt-BR': 'A DSL referencia um operador desconhecido',
  },
  DSL_UNSUPPORTED_VERSION: {
    en: 'DSL version is not supported',
    'pt-BR': 'Versão da DSL não suportada',
  },
  DSL_VALIDATION_FAILED: {
    en: 'Invalid DSL',
    'pt-BR': 'DSL inválida',
  },
  DUPLICATED_SECTION_FIELD_KEY: {
    en: 'Duplicated section field key',
    'pt-BR': 'Chave de campo da seção duplicada',
  },
  EMAIL_ALREADY_VERIFIED: {
    en: 'Email is already verified',
    'pt-BR': 'O e-mail já foi verificado',
  },
  EMAIL_IN_USE: {
    en: 'Email is already in use',
    'pt-BR': 'Este e-mail já está em uso',
  },
  EMAIL_INVALID_FORMAT: {
    en: 'Invalid email format',
    'pt-BR': 'Formato de e-mail inválido',
  },
  EMAIL_NOT_VERIFIED: {
    en: 'Email address must be verified to access this resource',
    'pt-BR': 'É preciso verificar o e-mail para acessar este recurso',
  },
  ENTITY_NOT_FOUND: {
    en: '{entityType} not found',
    'pt-BR': '{entityType} não encontrado',
  },
  EXPORT_ENGINE_FAILED: {
    en: 'Export engine failed',
    'pt-BR': 'O motor de exportação falhou',
  },
  EXPORT_PAYLOAD_TOO_LARGE: {
    en: 'Export payload is too large',
    'pt-BR': 'Payload de exportação muito grande',
  },
  EXPORT_THEME_INVALID: {
    en: 'Export theme is invalid',
    'pt-BR': 'Tema de exportação inválido',
  },
  EXTERNAL_DATA_PARSE_FAILED: {
    en: 'Failed to parse external data',
    'pt-BR': 'Falha ao interpretar os dados externos',
  },
  EXTERNAL_HANDLE_INVALID: {
    en: 'External handle is invalid',
    'pt-BR': 'Identificador externo inválido',
  },
  FEATURE_DISABLED: {
    en: 'This feature is disabled',
    'pt-BR': 'Este recurso está desativado',
  },
  FILE_REQUIRED: {
    en: 'File is required for this operation',
    'pt-BR': 'Arquivo obrigatório para esta operação',
  },
  FILE_TOO_LARGE: {
    en: 'File is too large',
    'pt-BR': 'Arquivo muito grande',
  },
  FILE_UPLOAD_UNAVAILABLE: {
    en: 'File upload service is currently unavailable',
    'pt-BR': 'O serviço de upload de arquivos está indisponível no momento',
  },
  FORBIDDEN: {
    en: 'Forbidden',
    'pt-BR': 'Acesso negado',
  },
  GITHUB_API_REQUEST_FAILED: {
    en: 'GitHub API request failed',
    'pt-BR': 'A requisição para a API do GitHub falhou',
  },
  GITHUB_NOT_CONNECTED: {
    en: 'GitHub account is not connected',
    'pt-BR': 'Conta do GitHub não está conectada',
  },
  GITHUB_SUMMARY_FETCH_FAILED: {
    en: 'Failed to fetch GitHub summary',
    'pt-BR': 'Falha ao buscar o resumo do GitHub',
  },
  GITHUB_SYNC_FAILED: {
    en: 'Failed to sync GitHub data',
    'pt-BR': 'Falha ao sincronizar dados do GitHub',
  },
  GITHUB_USERNAME_MISSING: {
    en: 'No GitHub username found in the resume',
    'pt-BR': 'Nenhum usuário do GitHub encontrado no currículo',
  },
  IMPORT_CANNOT_BE_CANCELLED: {
    en: 'This import cannot be cancelled',
    'pt-BR': 'Esta importação não pode ser cancelada',
  },
  IMPORT_CANNOT_BE_RETRIED: {
    en: 'This import cannot be retried',
    'pt-BR': 'Esta importação não pode ser reexecutada',
  },
  IMPORT_NOT_FOUND: {
    en: 'Import not found',
    'pt-BR': 'Importação não encontrada',
  },
  INTEGRATION_AUTH_FAILED: {
    en: 'Integration authentication failed',
    'pt-BR': 'Falha na autenticação da integração',
  },
  INTEGRATION_NOT_CONFIGURED: {
    en: 'Integration is not configured',
    'pt-BR': 'Integração não configurada',
  },
  INTEGRATION_RATE_LIMITED: {
    en: 'Integration is being rate limited',
    'pt-BR': 'A integração está com rate-limit',
  },
  INTEGRATION_RESPONSE_INVALID: {
    en: 'Integration response is invalid',
    'pt-BR': 'Resposta da integração inválida',
  },
  INTEGRATION_TIMEOUT: {
    en: 'Integration request timed out',
    'pt-BR': 'A integração estourou o tempo limite',
  },
  INTERNAL_AUTH_NOT_CONFIGURED: {
    en: 'Internal API token not configured. Set INTERNAL_API_TOKEN environment variable.',
    'pt-BR': 'Token interno não configurado. Defina a variável de ambiente INTERNAL_API_TOKEN.',
  },
  INTERNAL_TOKEN_INVALID: {
    en: 'Invalid internal token',
    'pt-BR': 'Token interno inválido',
  },
  INTERNAL_TOKEN_MISSING: {
    en: 'Internal token is missing',
    'pt-BR': 'Token interno ausente',
  },
  INVALID_2FA_CODE: {
    en: 'Invalid two-factor authentication code',
    'pt-BR': 'Código de autenticação de dois fatores inválido',
  },
  INVALID_CREDENTIALS: {
    en: 'Invalid email or password',
    'pt-BR': 'E-mail ou senha inválidos',
  },
  INVALID_CURRENT_PASSWORD: {
    en: 'Current password is incorrect',
    'pt-BR': 'Senha atual incorreta',
  },
  INVALID_DATE_RANGE: {
    en: 'End date must be after start date',
    'pt-BR': 'A data final precisa ser posterior à data inicial',
  },
  INVALID_FILE_TYPE: {
    en: 'Invalid file type',
    'pt-BR': 'Tipo de arquivo inválido',
  },
  INVALID_IMPORT_DATA: {
    en: 'Invalid import data',
    'pt-BR': 'Dados de importação inválidos',
  },
  INVALID_METRICS_API_KEY: {
    en: 'Invalid metrics API key',
    'pt-BR': 'Chave de API de métricas inválida',
  },
  INVALID_PERSONAL_INFO: {
    en: 'Personal information is invalid',
    'pt-BR': 'Informações pessoais inválidas',
  },
  INVALID_PROFESSIONAL_PROFILE: {
    en: 'Professional profile is invalid',
    'pt-BR': 'Perfil profissional inválido',
  },
  INVALID_REFRESH_TOKEN: {
    en: 'Invalid or expired refresh token',
    'pt-BR': 'Refresh token inválido ou expirado',
  },
  INVALID_RESET_TOKEN: {
    en: 'Password reset token is invalid or has expired',
    'pt-BR': 'Token de redefinição de senha inválido ou expirado',
  },
  INVALID_SECTION_TYPE_DEFINITION: {
    en: 'Invalid section type definition',
    'pt-BR': 'Definição do tipo de seção inválida',
  },
  INVALID_SESSION: {
    en: 'Invalid session',
    'pt-BR': 'Sessão inválida',
  },
  INVALID_SKILL_CATEGORY: {
    en: 'Invalid skill category',
    'pt-BR': 'Categoria de habilidade inválida',
  },
  INVALID_TEST_SUITE: {
    en: 'Invalid test suite',
    'pt-BR': 'Conjunto de testes inválido',
  },
  INVALID_TOKEN: {
    en: 'Invalid token',
    'pt-BR': 'Token inválido',
  },
  INVALID_TOTP_TOKEN: {
    en: 'Invalid two-factor authentication token',
    'pt-BR': 'Token de autenticação de dois fatores inválido',
  },
  INVALID_USER_ROLE: {
    en: 'Invalid user role',
    'pt-BR': 'Papel de usuário inválido',
  },
  INVALID_USERNAME: {
    en: 'Invalid username',
    'pt-BR': 'Nome de usuário inválido',
  },
  INVALID_VERIFICATION_TOKEN: {
    en: 'Invalid verification token',
    'pt-BR': 'Token de verificação inválido',
  },
  JOB_IMPORT_FETCH_FAILED: {
    en: 'Could not fetch the URL within the allowed window',
    'pt-BR': 'Não foi possível acessar a URL dentro do tempo permitido',
  },
  JOB_IMPORT_INVALID_URL: {
    en: 'The URL provided is not a valid HTTP/HTTPS URL',
    'pt-BR': 'A URL informada não é uma URL HTTP/HTTPS válida',
  },
  JOB_IMPORT_PAGE_TOO_THIN: {
    en: 'The page did not contain enough text to extract a job posting',
    'pt-BR': 'A página não tinha texto suficiente para extrair uma vaga',
  },
  LAST_ADMIN_CANNOT_BE_REMOVED: {
    en: 'Cannot remove admin role from the last admin user',
    'pt-BR': 'Não é possível remover o papel de admin do último administrador',
  },
  LAST_MANAGER_CANNOT_BE_DELETED: {
    en: 'Cannot delete the last user with management permissions',
    'pt-BR': 'Não é possível apagar o último usuário com permissão de gestão',
  },
  LIMIT_EXCEEDED: {
    en: 'Limit exceeded',
    'pt-BR': 'Limite excedido',
  },
  MEC_CSV_BLOCKED: {
    en: 'Received HTML instead of CSV — Cloudflare may still be blocking',
    'pt-BR': 'Recebemos HTML no lugar de CSV — o Cloudflare pode estar bloqueando',
  },
  MEC_CSV_DOWNLOAD_FAILED: {
    en: 'Failed to download MEC CSV',
    'pt-BR': 'Falha ao baixar o CSV do MEC',
  },
  MEC_CSV_EMPTY: {
    en: 'CSV file is empty or has no data rows',
    'pt-BR': 'O arquivo CSV está vazio ou sem linhas de dados',
  },
  MEC_CSV_NO_RESPONSE: {
    en: 'No response received from the MEC CSV source',
    'pt-BR': 'Nenhuma resposta recebida da fonte do CSV do MEC',
  },
  MEC_SYNC_IN_PROGRESS: {
    en: 'Sync already in progress. Wait for the current sync to complete.',
    'pt-BR': 'Sincronização em andamento. Aguarde a atual terminar.',
  },
  METRICS_NOT_CONFIGURED: {
    en: 'Metrics endpoint is not configured',
    'pt-BR': 'O endpoint de métricas não está configurado',
  },
  MISSING_ANY_REQUIRED_PERMISSION: {
    en: 'Missing at least one required permission',
    'pt-BR': 'Falta pelo menos uma das permissões necessárias',
  },
  MISSING_REQUIRED_PERMISSIONS: {
    en: 'Missing required permissions',
    'pt-BR': 'Permissões necessárias ausentes',
  },
  MISSING_REQUIRED_ROLES: {
    en: 'Missing required roles',
    'pt-BR': 'Papéis necessários ausentes',
  },
  NO_PRIMARY_RESUME: {
    en: 'User has no primary resume to compute fit score against',
    'pt-BR': 'O usuário não tem currículo principal para calcular o fit score',
  },
  NOT_A_COLLABORATOR: {
    en: 'Not a collaborator on this resume',
    'pt-BR': 'Você não é colaborador deste currículo',
  },
  NOT_CONNECTION_REQUESTER: {
    en: 'Only the requester can withdraw a sent request',
    'pt-BR': 'Apenas quem enviou o pedido pode cancelá-lo',
  },
  NOT_CONNECTION_TARGET: {
    en: 'You are not the target of this connection',
    'pt-BR': 'Você não é o destinatário desta conexão',
  },
  NOT_CONVERSATION_PARTICIPANT: {
    en: 'Not a participant of this conversation',
    'pt-BR': 'Você não participa desta conversa',
  },
  NOT_JOB_OWNER: {
    en: 'Only the job owner can perform this action',
    'pt-BR': 'Apenas o dono da vaga pode realizar esta ação',
  },
  NOT_PART_OF_CONNECTION: {
    en: 'You are not part of this connection',
    'pt-BR': 'Você não faz parte desta conexão',
  },
  NOTIFICATION_DELIVERY_FAILED: {
    en: 'Notification delivery failed',
    'pt-BR': 'Falha ao entregar a notificação',
  },
  NOTIFICATION_NOT_OWNED: {
    en: 'You can only act on your own notifications',
    'pt-BR': 'Você só pode agir nas suas próprias notificações',
  },
  ONBOARDING_ALREADY_AT_FIRST_STEP: {
    en: 'Already at the first step',
    'pt-BR': 'Você já está no primeiro passo',
  },
  ONBOARDING_ALREADY_AT_LAST_STEP: {
    en: 'Already at the last step',
    'pt-BR': 'Você já está no último passo',
  },
  ONBOARDING_ALREADY_COMPLETED: {
    en: 'Onboarding is already completed for this user',
    'pt-BR': 'Este usuário já concluiu o onboarding',
  },
  ONBOARDING_COMPLETION_IN_PROGRESS: {
    en: 'Onboarding completion already in progress',
    'pt-BR': 'A conclusão do onboarding já está em andamento',
  },
  ONBOARDING_DATA_VALIDATION_FAILED: {
    en: 'Invalid onboarding data',
    'pt-BR': 'Dados de onboarding inválidos',
  },
  ONBOARDING_GENERIC_VALIDATION: {
    en: 'Onboarding validation failed',
    'pt-BR': 'A validação do onboarding falhou',
  },
  ONBOARDING_INCOMPLETE: {
    en: 'Onboarding is incomplete',
    'pt-BR': 'Onboarding incompleto',
  },
  ONBOARDING_INVALID_SECTION_TYPE: {
    en: 'Invalid section type for onboarding',
    'pt-BR': 'Tipo de seção inválido para o onboarding',
  },
  ONBOARDING_SESSION_EXPIRED: {
    en: 'Onboarding session has expired',
    'pt-BR': 'A sessão do onboarding expirou',
  },
  ONBOARDING_STEP_OUT_OF_ORDER: {
    en: 'Onboarding step attempted out of order',
    'pt-BR': 'Passo do onboarding executado fora da ordem',
  },
  ONBOARDING_UNKNOWN_STEP: {
    en: 'Unknown onboarding step',
    'pt-BR': 'Passo do onboarding desconhecido',
  },
  ONLY_ADMINS_CAN_DO_THIS: {
    en: 'Only admins can perform this action',
    'pt-BR': 'Apenas administradores podem realizar esta ação',
  },
  ONLY_RESUME_OWNER_CAN_INVITE: {
    en: 'Only the resume owner can invite collaborators',
    'pt-BR': 'Apenas o dono do currículo pode convidar colaboradores',
  },
  ONLY_RESUME_OWNER_CAN_UPDATE_ROLES: {
    en: 'Only the resume owner can update roles',
    'pt-BR': 'Apenas o dono do currículo pode atualizar papéis',
  },
  ONLY_RESUME_OWNER_OR_SELF_CAN_REMOVE: {
    en: 'Only the owner can remove collaborators, or you can remove yourself',
    'pt-BR': 'Apenas o dono pode remover colaboradores, ou você pode se remover',
  },
  OWNERSHIP_ACCESS_DENIED: {
    en: 'You do not own this resource',
    'pt-BR': 'Você não é o dono deste recurso',
  },
  OWNERSHIP_MISSING_PARAM: {
    en: 'Ownership check is missing a required parameter',
    'pt-BR': 'Verificação de propriedade sem um parâmetro obrigatório',
  },
  OWNERSHIP_RESOURCE_MISSING: {
    en: 'Resource not found',
    'pt-BR': 'Recurso não encontrado',
  },
  OWNERSHIP_UNKNOWN_MODEL: {
    en: 'Unknown model for ownership check',
    'pt-BR': 'Modelo desconhecido para a verificação de propriedade',
  },
  PASSWORD_SAME_AS_CURRENT: {
    en: 'New password must be different from current password',
    'pt-BR': 'A nova senha precisa ser diferente da senha atual',
  },
  PASSWORD_WEAK: {
    en: 'Password does not meet security requirements',
    'pt-BR': 'A senha não atende aos requisitos de segurança',
  },
  PDF_BUFFER_REQUIRED: {
    en: 'PDF file buffer is required',
    'pt-BR': 'O buffer do PDF é obrigatório',
  },
  PDF_NO_TEXT: {
    en: 'PDF does not contain extractable text',
    'pt-BR': 'O PDF não contém texto que possa ser extraído',
  },
  PDF_TOO_LARGE: {
    en: 'PDF file exceeds the maximum allowed size',
    'pt-BR': 'O PDF ultrapassa o tamanho máximo permitido',
  },
  POLL_ALREADY_VOTED: {
    en: 'You have already voted on this poll',
    'pt-BR': 'Você já votou nesta enquete',
  },
  POLL_CLOSED: {
    en: 'This poll is closed to new votes',
    'pt-BR': 'Esta enquete está fechada para novos votos',
  },
  POST_ALREADY_REPORTED: {
    en: 'You have already reported this post',
    'pt-BR': 'Você já denunciou este post',
  },
  POST_ALREADY_REPOSTED: {
    en: 'You have already reposted this post',
    'pt-BR': 'Você já repostou esta publicação',
  },
  POST_BOOKMARK_NOT_FOUND: {
    en: 'Bookmark not found',
    'pt-BR': 'Marcador não encontrado',
  },
  POST_LIKE_NOT_FOUND: {
    en: 'Like not found',
    'pt-BR': 'Curtida não encontrada',
  },
  POST_NOT_FOUND: {
    en: 'Post not found',
    'pt-BR': 'Post não encontrado',
  },
  PRIMARY_RESUME_REQUIRED: {
    en: 'A primary resume is required for this operation',
    'pt-BR': 'Um currículo principal é obrigatório para esta operação',
  },
  PROGRAMMING_LANGUAGE_INVALID: {
    en: 'Invalid programming language',
    'pt-BR': 'Linguagem de programação inválida',
  },
  RAGE_APPLY_LIMIT_REACHED: {
    en: 'Daily rage-apply limit reached',
    'pt-BR': 'Limite diário do rage-apply atingido',
  },
  RAGE_APPLY_MIN_FIT_INVALID: {
    en: 'minFit must be between 0 and 100',
    'pt-BR': 'minFit precisa estar entre 0 e 100',
  },
  RATE_LIMITED: {
    en: 'Too many requests. Slow down.',
    'pt-BR': 'Muitas requisições. Diminua o ritmo.',
  },
  RECOMMENDATION_ALREADY_WRITTEN: {
    en: 'You have already written a recommendation for this user',
    'pt-BR': 'Você já escreveu uma recomendação para este usuário',
  },
  REPORT_ALREADY_SUBMITTED: {
    en: 'You have already reported this item',
    'pt-BR': 'Você já denunciou este item',
  },
  REPORT_NOT_REVIEWABLE: {
    en: 'This report is not in a reviewable state',
    'pt-BR': 'Esta denúncia não está em estado de revisão',
  },
  REPOSITORY_NOT_INITIALIZED: {
    en: 'Repository is not initialized',
    'pt-BR': 'Repositório não inicializado',
  },
  RESUME_ACCESS_DENIED: {
    en: 'Access denied to this resume',
    'pt-BR': 'Acesso ao currículo negado',
  },
  RESUME_EXPORT_UNAVAILABLE: {
    en: 'Resume export is temporarily unavailable',
    'pt-BR': 'A exportação de currículos está temporariamente indisponível',
  },
  RESUME_NOT_FOUND: {
    en: 'Resume not found',
    'pt-BR': 'Currículo não encontrado',
  },
  RESUME_NOT_OWNED: {
    en: 'You can only modify your own resume',
    'pt-BR': 'Você só pode modificar o seu próprio currículo',
  },
  RESUME_SECTION_INVALID: {
    en: 'Resume section is invalid',
    'pt-BR': 'Seção do currículo inválida',
  },
  RESUME_SHARE_ACCESS_DENIED: {
    en: 'You do not have access to this share',
    'pt-BR': 'Você não tem acesso a este compartilhamento',
  },
  RESUME_SHARE_ALIAS_ACCESS_DENIED: {
    en: 'You do not have access to this alias',
    'pt-BR': 'Você não tem acesso a este alias',
  },
  RESUME_SHARE_EXPIRED: {
    en: 'This share link has expired',
    'pt-BR': 'Este link de compartilhamento expirou',
  },
  RESUME_SHARE_PASSWORD_INVALID: {
    en: 'Invalid password for this share link',
    'pt-BR': 'Senha inválida para este link de compartilhamento',
  },
  RESUME_SHARE_PASSWORD_REQUIRED: {
    en: 'This share link requires a password',
    'pt-BR': 'Este link de compartilhamento exige senha',
  },
  RESUME_SHARE_REVOKED: {
    en: 'This share link has been revoked',
    'pt-BR': 'Este link de compartilhamento foi revogado',
  },
  RESUME_SHARE_SLUG_INVALID: {
    en: 'Invalid slug format. Use alphanumeric characters and hyphens only.',
    'pt-BR': 'Formato de slug inválido. Use apenas letras, números e hífens.',
  },
  RESUME_SHARE_SLUG_TAKEN: {
    en: 'This slug is already taken',
    'pt-BR': 'Este slug já está em uso',
  },
  RESUME_SLOT_LIMIT_REACHED: {
    en: 'Resume slot limit reached',
    'pt-BR': 'Limite de currículos atingido',
  },
  RESUME_SNAPSHOT_NOT_SERIALIZABLE: {
    en: 'Snapshot contains a non-JSON-serializable value',
    'pt-BR': 'O snapshot contém um valor que não pode ser serializado em JSON',
  },
  RESUME_TAILOR_INPUT_REQUIRED: {
    en: 'Tailor input is required (job id or pasted description)',
    'pt-BR': 'É necessário informar a entrada do tailor (id da vaga ou descrição colada)',
  },
  RESUME_TAILOR_UNAVAILABLE: {
    en: 'Resume tailoring is temporarily unavailable',
    'pt-BR': 'O ajuste de currículo está temporariamente indisponível',
  },
  RESUME_VARIANT_NOT_FOUND: {
    en: 'Resume variant not found',
    'pt-BR': 'Variante do currículo não encontrada',
  },
  RESUME_VERSION_NOT_FOUND: {
    en: 'Resume version not found',
    'pt-BR': 'Versão do currículo não encontrada',
  },
  SCREEN_RENDER_FAILED: {
    en: 'Failed to render screen',
    'pt-BR': 'Falha ao renderizar a tela',
  },
  SECTION_FIELD_KEY_REQUIRED: {
    en: 'Section field key is required',
    'pt-BR': 'A chave do campo da seção é obrigatória',
  },
  SECTION_ITEM_CONTENT_INVALID: {
    en: 'Section item content is invalid',
    'pt-BR': 'Conteúdo do item da seção inválido',
  },
  SECTION_ITEM_INVALID: {
    en: 'Section item is invalid',
    'pt-BR': 'Item da seção inválido',
  },
  SECTION_ITEM_LIMIT_EXCEEDED: {
    en: 'Section item limit exceeded',
    'pt-BR': 'Limite de itens da seção excedido',
  },
  SECTION_NOT_FOUND_IN_RESUME: {
    en: 'Section not found in this resume',
    'pt-BR': 'Seção não encontrada neste currículo',
  },
  SECTION_TYPE_ALREADY_EXISTS: {
    en: 'Section type already exists',
    'pt-BR': 'Este tipo de seção já existe',
  },
  SECTION_TYPE_IN_USE: {
    en: 'Section type is in use and cannot be removed',
    'pt-BR': 'Este tipo de seção está em uso e não pode ser removido',
  },
  SECTION_TYPE_INVALID: {
    en: 'Section type is invalid',
    'pt-BR': 'Tipo de seção inválido',
  },
  SECTION_TYPE_SLUG_VERSION_TAKEN: {
    en: 'A section type with this slug and version already exists',
    'pt-BR': 'Já existe um tipo de seção com este slug e versão',
  },
  SESSION_EXPIRED: {
    en: 'Session has expired. Log in again.',
    'pt-BR': 'Sessão expirada. Faça login novamente.',
  },
  SESSION_USER_NOT_FOUND: {
    en: 'User not found after session creation',
    'pt-BR': 'Usuário não encontrado após a criação da sessão',
  },
  SHADOW_PROFILE_ALREADY_CLAIMED: {
    en: 'Shadow profile already claimed by another user',
    'pt-BR': 'Este shadow profile já foi reivindicado por outro usuário',
  },
  SHADOW_PROFILE_NOT_FOUND: {
    en: 'Shadow profile not found',
    'pt-BR': 'Shadow profile não encontrado',
  },
  SHARE_ALIAS_NOT_FOUND: {
    en: 'Alias not found',
    'pt-BR': 'Alias não encontrado',
  },
  SHARE_ANALYTICS_NOT_AUTHORIZED: {
    en: 'Not authorized to view share analytics',
    'pt-BR': 'Sem autorização para ver analytics de compartilhamento',
  },
  SHARE_NOT_FOUND: {
    en: 'Share not found',
    'pt-BR': 'Compartilhamento não encontrado',
  },
  SHARE_PASSWORD_INVALID: {
    en: 'Invalid password',
    'pt-BR': 'Senha inválida',
  },
  SHARE_PASSWORD_REQUIRED: {
    en: 'Password required',
    'pt-BR': 'Senha obrigatória',
  },
  SKILL_ALREADY_EXISTS: {
    en: 'Skill already exists',
    'pt-BR': 'Esta habilidade já existe',
  },
  SKILL_IN_USE: {
    en: 'Cannot delete skill — it is still referenced by resumes or jobs',
    'pt-BR':
      'Não é possível apagar a habilidade — ela ainda é referenciada por currículos ou vagas',
  },
  SKILL_SECTION_TYPE_NOT_CONFIGURED: {
    en: 'Skill section type is not configured',
    'pt-BR': 'Tipo de seção de habilidades não configurado',
  },
  SKILL_SLUG_TAKEN: {
    en: 'Skill slug is already taken',
    'pt-BR': 'O slug da habilidade já está em uso',
  },
  STEP_NOT_COMPLETED: {
    en: 'Step has not been completed',
    'pt-BR': 'Este passo ainda não foi concluído',
  },
  STORAGE_NOT_CONFIGURED: {
    en: 'Storage backend is not configured',
    'pt-BR': 'O backend de armazenamento não está configurado',
  },
  STORAGE_OBJECT_NOT_FOUND: {
    en: 'Storage object not found',
    'pt-BR': 'Objeto do storage não encontrado',
  },
  STORAGE_UPLOAD_FAILED: {
    en: 'Storage upload failed',
    'pt-BR': 'Falha ao enviar para o storage',
  },
  SUCCESS_STORY_ALREADY_PUBLISHED: {
    en: 'Success story already published',
    'pt-BR': 'Caso de sucesso já publicado',
  },
  SYNC_COOLDOWN_ACTIVE: {
    en: 'Sync is in cooldown. Try again shortly.',
    'pt-BR': 'Sincronização em cooldown. Tente novamente em breve.',
  },
  SYSTEM_SECTION_TYPE_IMMUTABLE: {
    en: 'Cannot modify key, semanticKind, or definition of system section types',
    'pt-BR': 'Não é possível modificar key, semanticKind ou definição de tipos de seção do sistema',
  },
  SYSTEM_SECTION_TYPE_UNDELETABLE: {
    en: 'Cannot delete system section types',
    'pt-BR': 'Não é possível apagar tipos de seção do sistema',
  },
  TECH_AREA_IN_USE: {
    en: 'Tech area is in use and cannot be removed',
    'pt-BR': 'Área de tecnologia em uso e não pode ser removida',
  },
  TECH_AREA_INVALID: {
    en: 'Tech area is invalid',
    'pt-BR': 'Área de tecnologia inválida',
  },
  TECH_NICHE_IN_USE: {
    en: 'Tech niche is in use and cannot be removed',
    'pt-BR': 'Nicho de tecnologia em uso e não pode ser removido',
  },
  TECH_NICHE_INVALID: {
    en: 'Tech niche is invalid',
    'pt-BR': 'Nicho de tecnologia inválido',
  },
  TOKEN_INVALID: {
    en: 'Token is invalid',
    'pt-BR': 'Token inválido',
  },
  TOKEN_VERIFICATION_FAILED: {
    en: 'Unable to verify token validity — please try again',
    'pt-BR': 'Não foi possível verificar a validade do token — tente novamente',
  },
  TRANSLATION_BACKEND_UNAVAILABLE: {
    en: 'Translation backend is temporarily unavailable',
    'pt-BR': 'O backend de tradução está temporariamente indisponível',
  },
  TRANSLATION_PAYLOAD_TOO_LARGE: {
    en: 'Translation payload is too large',
    'pt-BR': 'Payload de tradução muito grande',
  },
  TWO_FACTOR_ALREADY_ENABLED: {
    en: 'Two-factor authentication is already enabled',
    'pt-BR': 'A autenticação de dois fatores já está ativada',
  },
  TWO_FACTOR_NOT_SETUP: {
    en: 'Two-factor authentication setup not found',
    'pt-BR': 'Configuração de autenticação de dois fatores não encontrada',
  },
  TYPST_ATS_TEMPLATES_NOT_FOUND: {
    en: 'Typst ATS templates not found',
    'pt-BR': 'Templates de ATS do Typst não encontrados',
  },
  TYPST_COMPILATION_FAILED: {
    en: 'Typst compilation failed',
    'pt-BR': 'Falha na compilação do Typst',
  },
  TYPST_TEMPLATES_NOT_FOUND: {
    en: 'Typst templates not found',
    'pt-BR': 'Templates do Typst não encontrados',
  },
  TYPST_USER_ID_REQUIRED: {
    en: 'userId is required for Typst PDF generation',
    'pt-BR': 'userId é obrigatório para gerar PDFs via Typst',
  },
  TYPST_WASM_RENDERER_NOT_IMPLEMENTED: {
    en: 'TypstWasmPdfRenderer is not yet implemented. Use TypstCompilerService as fallback.',
    'pt-BR':
      'TypstWasmPdfRenderer ainda não foi implementado. Use o TypstCompilerService como fallback.',
  },
  UNAUTHORIZED: {
    en: 'Unauthorized',
    'pt-BR': 'Não autorizado',
  },
  UNIQUE_CONSTRAINT_VIOLATED: {
    en: 'A unique constraint was violated',
    'pt-BR': 'Uma restrição de unicidade foi violada',
  },
  UNKNOWN_EVENT: {
    en: 'Unknown event',
    'pt-BR': 'Evento desconhecido',
  },
  UNKNOWN_NOTIFICATION_TYPE: {
    en: 'Unknown notification type',
    'pt-BR': 'Tipo de notificação desconhecido',
  },
  UNKNOWN_SCREEN: {
    en: 'Unknown screen',
    'pt-BR': 'Tela desconhecida',
  },
  UNKNOWN_SECTION_TYPE: {
    en: 'Unknown section type',
    'pt-BR': 'Tipo de seção desconhecido',
  },
  UNSUPPORTED_EXPORT_FORMAT: {
    en: 'Unsupported export format',
    'pt-BR': 'Formato de exportação não suportado',
  },
  UNSUPPORTED_LOCALE_PAIR: {
    en: 'Unsupported locale pair',
    'pt-BR': 'Par de locales não suportado',
  },
  UPLOAD_CONTENT_INVALID: {
    en: 'Upload content is invalid',
    'pt-BR': 'Conteúdo do upload inválido',
  },
  UPLOAD_EXTENSION_MISMATCH: {
    en: 'Upload extension does not match the declared type',
    'pt-BR': 'A extensão do upload não bate com o tipo declarado',
  },
  UPLOAD_FILE_TOO_LARGE: {
    en: 'Upload file is too large',
    'pt-BR': 'Arquivo de upload muito grande',
  },
  UPLOAD_FILENAME_UNSAFE: {
    en: 'Upload filename is unsafe',
    'pt-BR': 'Nome de arquivo do upload não é seguro',
  },
  UPLOAD_INVALID_FILE_TYPE: {
    en: 'Invalid upload file type',
    'pt-BR': 'Tipo de arquivo do upload inválido',
  },
  UPLOAD_STORAGE_UNAVAILABLE: {
    en: 'File storage backend is temporarily unavailable',
    'pt-BR': 'O backend de armazenamento está temporariamente indisponível',
  },
  USER_ROLES_NOT_AVAILABLE: {
    en: 'User roles not available. Ensure AuthorizationModule is imported.',
    'pt-BR': 'Papéis do usuário indisponíveis. Garanta que o AuthorizationModule esteja importado.',
  },
  USERNAME_BAD_UNDERSCORES: {
    en: 'Username cannot contain consecutive underscores or end with an underscore',
    'pt-BR': 'O nome de usuário não pode ter underscores consecutivos nem terminar com underscore',
  },
  USERNAME_COOLDOWN_ACTIVE: {
    en: 'Username cooldown active. Try again later.',
    'pt-BR': 'Cooldown do nome de usuário ativo. Tente novamente mais tarde.',
  },
  USERNAME_INVALID_FORMAT: {
    en: 'Invalid username format',
    'pt-BR': 'Formato de nome de usuário inválido',
  },
  USERNAME_MUST_BE_LOWERCASE: {
    en: 'Username must be lowercase',
    'pt-BR': 'O nome de usuário precisa estar em minúsculas',
  },
  USERNAME_RESERVED: {
    en: 'This username is reserved',
    'pt-BR': 'Este nome de usuário está reservado',
  },
  USERNAME_TAKEN: {
    en: 'Username already in use',
    'pt-BR': 'Nome de usuário já está em uso',
  },
  VALIDATION_ERROR: {
    en: 'Validation failed',
    'pt-BR': 'Falha de validação',
  },
  VERIFICATION_TOKEN_ALREADY_SENT: {
    en: 'Verification token was already sent. Wait a moment before retrying.',
    'pt-BR': 'Token de verificação já foi enviado. Aguarde um pouco antes de tentar de novo.',
  },
  WEBHOOK_DELIVERY_FAILED: {
    en: 'Webhook delivery failed',
    'pt-BR': 'Falha na entrega do webhook',
  },
  AUTHENTICATED_USER_MISSING: {
    en: 'Authenticated user not present on request',
    'pt-BR': 'Usuário autenticado não está presente na requisição',
  },
  CHAT_CONVERSATION_NOT_FOUND: {
    en: 'Conversation not found',
    'pt-BR': 'Conversa não encontrada',
  },
  COLLABORATOR_COMMENT_NOT_FOUND: {
    en: 'Comment not found',
    'pt-BR': 'Comentário não encontrado',
  },
  COLLABORATOR_PARENT_COMMENT_NOT_FOUND: {
    en: 'Parent comment not found',
    'pt-BR': 'Comentário pai não encontrado',
  },
  COLLABORATOR_SELF_INVITE: {
    en: 'Cannot add yourself as a collaborator',
    'pt-BR': 'Você não pode adicionar a si mesmo como colaborador',
  },
  CONSENT_VERSION_MISMATCH: {
    en: 'Consent version mismatch — please accept the latest Terms of Service and Privacy Policy',
    'pt-BR':
      'Versão de consentimento incompatível — aceite os Termos de Uso e Política de Privacidade atuais',
  },
  EXPORT_BANNER_GENERATION_FAILED: {
    en: 'Failed to generate banner. Please try again later.',
    'pt-BR': 'Falha ao gerar o banner. Tente novamente mais tarde.',
  },
  EXPORT_DOCX_GENERATION_FAILED: {
    en: 'Failed to generate DOCX. Please try again later.',
    'pt-BR': 'Falha ao gerar o DOCX. Tente novamente mais tarde.',
  },
  EXPORT_PDF_GENERATION_FAILED: {
    en: 'Failed to generate PDF. Please try again later.',
    'pt-BR': 'Falha ao gerar o PDF. Tente novamente mais tarde.',
  },
  EXPORT_PIPELINE_FAILED: {
    en: 'Failed to generate export. Please try again later.',
    'pt-BR': 'Falha ao gerar a exportação. Tente novamente mais tarde.',
  },
  FEATURE_FLAG_DEPRECATED: {
    en: 'This feature flag is deprecated and cannot be toggled',
    'pt-BR': 'Esta feature flag foi descontinuada e não pode ser alterada',
  },
  FEATURE_FLAG_DISABLED: {
    en: 'Not Found',
    'pt-BR': 'Não encontrado',
  },
  FEATURE_FLAG_INVALID_INPUT: {
    en: 'Invalid feature-flag input',
    'pt-BR': 'Entrada inválida para feature flag',
  },
  FEATURE_FLAG_NOT_FOUND: {
    en: 'Feature flag not found',
    'pt-BR': 'Feature flag não encontrada',
  },
  FEATURE_FLAG_PARENT_DISABLED: {
    en: 'Cannot enable this flag while a parent flag is disabled',
    'pt-BR': 'Não é possível habilitar essa flag enquanto a flag pai estiver desabilitada',
  },
  FIT_PROFILE_REQUIRED: {
    en: 'Fit profile is required for this action',
    'pt-BR': 'É necessário ter um perfil de fit para esta ação',
  },
  ID_REQUIRED: {
    en: 'ID is required',
    'pt-BR': 'ID é obrigatório',
  },
  IMPORT_FILE_MISSING: {
    en: 'Missing file (multipart field "file")',
    'pt-BR': 'Arquivo ausente (campo multipart "file")',
  },
  IMPORT_MISSING_BASICS: {
    en: 'Missing basics section',
    'pt-BR': 'Seção "basics" ausente',
  },
  IMPORT_MISSING_BASICS_NAME: {
    en: 'Name is required in basics section',
    'pt-BR': 'Nome é obrigatório na seção "basics"',
  },
  INVALID_ID_FORMAT: {
    en: 'ID must be a valid CUID string',
    'pt-BR': 'O ID precisa ser uma string CUID válida',
  },
  INVALID_JSON_BODY: {
    en: 'Invalid request body — must be valid JSON',
    'pt-BR': 'Corpo da requisição inválido — precisa ser JSON válido',
  },
  INVALID_LIMIT_PARAMETER: {
    en: 'Invalid limit parameter — must be a positive integer',
    'pt-BR': 'Parâmetro "limit" inválido — precisa ser um inteiro positivo',
  },
  JOB_FIT_PROFILE_NOT_SET: {
    en: 'Job fit profile has not been set for this job',
    'pt-BR': 'O perfil de fit ainda não foi definido para esta vaga',
  },
  JOB_MATCH_AUTHENTICATED_USER_MISSING: {
    en: 'Authenticated user is missing on the request',
    'pt-BR': 'Usuário autenticado ausente na requisição',
  },
  JOB_MATCH_FIT_PROFILE_REQUIRED: {
    en: 'Fit profile is required to compute matches',
    'pt-BR': 'É necessário ter um perfil de fit para calcular matches',
  },
  JOB_MATCH_JOB_NOT_FOUND: {
    en: 'Job not found',
    'pt-BR': 'Vaga não encontrada',
  },
  JOB_MATCH_RESUME_NOT_FOUND: {
    en: 'Resume not found',
    'pt-BR': 'Currículo não encontrado',
  },
  ONBOARDING_NOT_COMPLETED: {
    en: 'Onboarding must be completed before accessing this resource.',
    'pt-BR': 'É preciso concluir o onboarding antes de acessar este recurso.',
  },
  ONBOARDING_SECTION_PERSISTENCE_FAILED: {
    en: 'Failed to save resume sections',
    'pt-BR': 'Falha ao salvar as seções do currículo',
  },
  PUBLIC_RESUME_NOT_FOUND: {
    en: 'Resume not found',
    'pt-BR': 'Currículo não encontrado',
  },
  QR_URL_REQUIRED: {
    en: 'URL is required',
    'pt-BR': 'URL é obrigatória',
  },
  RESUME_QUALITY_AUTHENTICATED_USER_MISSING: {
    en: 'Authenticated user not present on request',
    'pt-BR': 'Usuário autenticado não está presente na requisição',
  },
  RESUME_QUALITY_BELOW_THRESHOLD: {
    en: 'Resume quality score is below the required threshold',
    'pt-BR': 'A qualidade do currículo está abaixo do mínimo exigido',
  },
  RESUME_QUALITY_SCORE_UNAVAILABLE: {
    en: 'Resume quality has not been computed yet. Trigger a recompute first.',
    'pt-BR': 'A qualidade do currículo ainda não foi calculada. Solicite um recálculo primeiro.',
  },
  RESUME_QUALITY_SNAPSHOT_MISSING: {
    en: 'No quality snapshot yet — recompute first',
    'pt-BR': 'Ainda não há snapshot de qualidade — recalcule primeiro',
  },
  ROUTE_NOT_FOUND: {
    en: 'Route not found',
    'pt-BR': 'Rota não encontrada',
  },
  SESSION_NOT_FOUND: {
    en: 'Session not found or already revoked',
    'pt-BR': 'Sessão não encontrada ou já revogada',
  },
  SHARE_LINK_EXPIRED: {
    en: 'Share link expired',
    'pt-BR': 'Link de compartilhamento expirado',
  },
  SPOKEN_LANGUAGE_NOT_FOUND: {
    en: 'Language not found',
    'pt-BR': 'Idioma não encontrado',
  },
  UNKNOWN_ENUM: {
    en: 'Unknown enum',
    'pt-BR': 'Enum desconhecido',
  },
  URL_REQUIRED: {
    en: 'URL is required',
    'pt-BR': 'URL é obrigatória',
  },
  WEBHOOK_NOT_FOUND: {
    en: 'Webhook not found',
    'pt-BR': 'Webhook não encontrado',
  },
  FIT_QUESTION_NOT_FOUND: {
    en: 'Question not found',
    'pt-BR': 'Pergunta não encontrada',
  },
  RESUME_NOT_FOUND_FOR_STYLE_APPLY: {
    en: 'Resume not found',
    'pt-BR': 'Currículo não encontrado',
  },
  STYLE_BELOW_ATS_THRESHOLD: {
    en: 'Style score is below the ATS-safety threshold',
    'pt-BR': 'Pontuação do estilo está abaixo do limite ATS',
  },
  STYLE_NOT_EDITABLE: {
    en: 'This style is system-managed and cannot be edited or deleted',
    'pt-BR': 'Esse estilo é gerenciado pelo sistema e não pode ser editado nem excluído',
  },
  STYLE_NOT_FOUND: {
    en: 'Resume style not found',
    'pt-BR': 'Estilo do currículo não encontrado',
  },
  STYLE_SCORE_REGRESSION: {
    en: 'Style score is monotonic and cannot regress',
    'pt-BR': 'A pontuação do estilo é monotônica e não pode regredir',
  },
} as const satisfies LocalizedDictionary;
