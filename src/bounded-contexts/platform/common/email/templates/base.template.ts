export const getBaseTemplate = (
  content: string,
  title: string,
  frontendUrl = 'http://localhost:3000',
) => {
  return `
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
      background-color: #f4f4f7;
      color: #1f2937;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }
    .email-header {
      background-color: #ffffff;
      padding: 32px 24px 16px;
      text-align: center;
      border-bottom: 1px solid #e5e7eb;
    }
    .brand-name {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.3px;
      margin: 0;
    }
    .email-body {
      padding: 32px 32px 24px;
      background-color: #ffffff;
    }
    .email-footer {
      background-color: #f9fafb;
      padding: 20px 32px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .email-footer p {
      margin: 4px 0;
      font-size: 13px;
      color: #6b7280;
    }
    .email-footer a {
      color: #2563eb;
      text-decoration: none;
    }
    .email-footer a:hover {
      text-decoration: underline;
    }
    .btn {
      display: inline-block;
      padding: 12px 28px;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 15px;
      margin: 20px 0;
    }
    .btn:hover {
      background-color: #1d4ed8;
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
    h2 {
      color: #111827;
      font-size: 22px;
      margin: 0 0 16px;
      font-weight: 700;
    }
    h3 {
      color: #111827;
      font-size: 17px;
      margin: 24px 0 12px;
      font-weight: 600;
    }
    p {
      color: #374151;
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 16px;
    }
    a {
      color: #2563eb;
    }
    .warning-box {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 14px 16px;
      margin-top: 24px;
      border-radius: 4px;
    }
    .warning-box p {
      margin: 0;
      font-size: 14px;
      color: #92400e;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <p class="brand-name">Patch Careers</p>
    </div>
    <div class="email-body">
      ${content}
    </div>
    <div class="email-footer">
      <p>&copy; ${new Date().getFullYear()} Patch Careers. Todos os direitos reservados.</p>
      <p>
        <a href="${frontendUrl}">Acessar Patch Careers</a> &middot;
        <a href="${frontendUrl}/help">Ajuda</a>
      </p>
    </div>
  </div>
</body>
</html>
`;
};
