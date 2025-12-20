export const getBaseTemplate = (content: string, title: string) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f4f7fa;
      color: #1f2937;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
    }
    .email-header {
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      padding: 32px 24px;
      text-align: center;
    }
    .email-header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
    }
    .email-body {
      padding: 40px 32px;
    }
    .email-footer {
      background-color: #f9fafb;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .email-footer p {
      margin: 8px 0;
      font-size: 13px;
      color: #6b7280;
    }
    .email-footer a {
      color: #3B82F6;
      text-decoration: none;
    }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background-color: #3B82F6;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      transition: background-color 0.2s;
    }
    .btn:hover {
      background-color: #2563EB;
    }
    .text-muted {
      color: #6b7280;
      font-size: 14px;
      line-height: 1.6;
    }
    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 24px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>ProFile</h1>
    </div>
    <div class="email-body">
      ${content}
    </div>
    <div class="email-footer">
      <p>&copy; ${new Date().getFullYear()} ProFile. Todos os direitos reservados.</p>
      <p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">Acessar ProFile</a> |
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/help">Ajuda</a>
      </p>
    </div>
  </div>
</body>
</html>
`;
