export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown';

export interface ParsedUserAgent {
  deviceType: DeviceType;
  os: string | null;
  browser: string | null;
}

const BOT_PATTERNS = [
  /bot\b/i,
  /crawler/i,
  /spider/i,
  /facebookexternalhit/i,
  /slackbot/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /telegram/i,
  /discord/i,
  /headlesschrome/i,
];

export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  if (!ua) {
    return { deviceType: 'unknown', os: null, browser: null };
  }

  const os = detectOs(ua);
  const browser = detectBrowser(ua);
  const deviceType = detectDeviceType(ua, os);

  return { deviceType, os, browser };
}

function detectOs(ua: string): string | null {
  if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS';
  if (/Windows/.test(ua)) return 'Windows';
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Linux/.test(ua)) return 'Linux';
  return null;
}

function detectBrowser(ua: string): string | null {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
  return null;
}

function detectDeviceType(ua: string, os: string | null): DeviceType {
  for (const pattern of BOT_PATTERNS) {
    if (pattern.test(ua)) return 'bot';
  }

  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (os === 'Android' && !/Mobile/i.test(ua)) return 'tablet';
  if (/Mobile|iPhone|iPod|Android/i.test(ua)) return 'mobile';
  if (os) return 'desktop';

  return 'unknown';
}
