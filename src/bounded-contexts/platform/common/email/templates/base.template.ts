export const getBaseTemplate = (content: string, title: string) => {
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

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
      background-color: #030303;
      color: #e4e4e7;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #0a0a0a;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    }
    .email-header {
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
      padding: 40px 24px;
      text-align: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .logo-container {
      display: inline-block;
      margin-bottom: 16px;
    }
    .email-body {
      padding: 40px 32px;
      background-color: #0a0a0a;
    }
    .email-footer {
      background-color: #030303;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    .email-footer p {
      margin: 8px 0;
      font-size: 13px;
      color: #71717a;
      font-family: 'Courier New', monospace;
    }
    .email-footer a {
      color: #06b6d4;
      text-decoration: none;
      transition: color 0.2s;
    }
    .email-footer a:hover {
      color: #22d3ee;
    }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background-color: #ffffff;
      color: #000000 !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 16px;
      margin: 20px 0;
      transition: background-color 0.2s;
      font-family: 'Courier New', monospace;
    }
    .btn:hover {
      background-color: #e4e4e7;
    }
    .text-muted {
      color: #71717a;
      font-size: 14px;
      line-height: 1.6;
      font-family: 'Courier New', monospace;
    }
    .divider {
      height: 1px;
      background-color: rgba(255, 255, 255, 0.1);
      margin: 24px 0;
    }
    h2 {
      color: #ffffff;
      font-size: 24px;
      margin-bottom: 16px;
      font-weight: 700;
    }
    p {
      color: #e4e4e7;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 16px;
    }
    .warning-box {
      background-color: rgba(245, 158, 11, 0.1);
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin-top: 24px;
      border-radius: 4px;
    }
    .warning-box p {
      margin: 0;
      font-size: 14px;
      color: #fbbf24;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div class="logo-container">
        <svg viewBox="0 0 240 90" width="180" height="68" xmlns="http://www.w3.org/2000/svg" style="display: block;">
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="white" floodOpacity="0.1" />
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="white" floodOpacity="0.05" />
            </filter>
            <linearGradient id="capShine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="capShadow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2a2a2a" stopOpacity="1" />
              <stop offset="40%" stopColor="#1a1a1a" stopOpacity="1" />
              <stop offset="100%" stopColor="#0a0a0a" stopOpacity="1" />
            </linearGradient>
            <radialGradient id="capTopGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="white" stopOpacity="0.4" />
              <stop offset="70%" stopColor="white" stopOpacity="0.1" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path d="M 38 22 L 38 18 Q 38 10 48 10 L 198 10 Q 212 10 218 18 Q 224 26 224 34 L 224 56 Q 224 64 218 72 Q 212 80 198 80 L 48 80 Q 38 80 38 72 L 38 68" fill="white" stroke="white" stroke-width="8" stroke-linejoin="round" filter="url(#shadow)" />
          <path d="M 40 56 Q 70 46 100 56 T 160 56 T 222 56 L 222 72 Q 222 78 214 80 L 48 80 Q 40 80 40 72 Z" fill="black" />
          <ellipse cx="27" cy="60" rx="14" ry="5" fill="rgba(0,0,0,0.3)" filter="blur(2px)" />
          <ellipse cx="27" cy="28" rx="13" ry="4" fill="#1a1a1a" stroke="rgba(255,255,255,0.2)" stroke-width="8" filter="drop-shadow(0 2px 3px rgba(255,255,255,0.1))" />
          <rect x="14" y="28" width="26" height="32" fill="url(#capShadow)" filter="drop-shadow(0 4px 6px rgba(255,255,255,0.15))" />
          <rect x="16" y="30" width="22" height="28" fill="url(#capShine)" opacity="0.3" />
          <g fill="rgba(100,100,100,0.8)" filter="drop-shadow(0 1px 1px rgba(255,255,255,0.2))">
            <rect x="11" y="30" width="3" height="4" />
            <rect x="11" y="36" width="3" height="4" />
            <rect x="11" y="42" width="3" height="4" />
            <rect x="11" y="48" width="3" height="4" />
            <rect x="11" y="54" width="3" height="4" />
          </g>
          <g fill="rgba(100,100,100,0.8)" filter="drop-shadow(0 1px 1px rgba(255,255,255,0.2))">
            <rect x="40" y="30" width="3" height="4" />
            <rect x="40" y="36" width="3" height="4" />
            <rect x="40" y="42" width="3" height="4" />
            <rect x="40" y="48" width="3" height="4" />
            <rect x="40" y="54" width="3" height="4" />
          </g>
          <g stroke="rgba(255,255,255,0.6)" stroke-width="1.5" fill="none">
            <ellipse cx="27" cy="35" rx="10" ry="2.5" opacity="0.4" filter="drop-shadow(0 1px 1px rgba(255,255,255,0.3))" />
            <ellipse cx="27" cy="42" rx="10" ry="2.5" opacity="0.4" filter="drop-shadow(0 1px 1px rgba(255,255,255,0.3))" />
            <ellipse cx="27" cy="49" rx="10" ry="2.5" opacity="0.4" filter="drop-shadow(0 1px 1px rgba(255,255,255,0.3))" />
          </g>
          <ellipse cx="27" cy="60" rx="13" ry="4" fill="#0a0a0a" stroke="rgba(255,255,255,0.15)" stroke-width="1" filter="drop-shadow(0 2px 3px rgba(255,255,255,0.1))" />
          <ellipse cx="27" cy="28" rx="13" ry="4" fill="#0a0a0a" filter="drop-shadow(0 0 4px rgba(255,255,255,0.3))" />
          <ellipse cx="27" cy="26" rx="9" ry="3" fill="url(#capTopGlow)" />
          <ellipse cx="27" cy="27" rx="9" ry="2.5" fill="#3a3a3a" />
          <ellipse cx="27" cy="26.5" rx="5" ry="1.5" fill="white" opacity="0.8" filter="blur(0.5px)" />
          <path d="M 18 32 L 18 56" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-linecap="round" />
          <path d="M 36 32 L 36 56" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-linecap="round" />
          <text x="132" y="50" font-family="Arial Black, Arial, sans-serif" font-size="38" font-weight="900" text-anchor="middle" fill="white" letter-spacing="2">PATCH</text>
        </svg>
      </div>
    </div>
    <div class="email-body">
      ${content}
    </div>
    <div class="email-footer">
      <p>&copy; ${new Date().getFullYear()} ProFile. Todos os direitos reservados.</p>
      <p>
        <a href="${frontendUrl}">Acessar ProFile</a> |
        <a href="${frontendUrl}/help">Ajuda</a>
      </p>
    </div>
  </div>
</body>
</html>
`;
};
