/**
 * Puppeteer Mock for Testing
 * Provides mocked browser, page, and element handles
 */

export interface MockPage {
  setViewport: jest.Mock;
  goto: jest.Mock;
  waitForSelector: jest.Mock;
  waitForFunction: jest.Mock;
  evaluate: jest.Mock;
  evaluateHandle: jest.Mock;
  setContent: jest.Mock;
  emulateMediaType: jest.Mock;
  pdf: jest.Mock;
  screenshot: jest.Mock;
  addStyleTag: jest.Mock;
  content: jest.Mock;
  $: jest.Mock;
  close: jest.Mock;
}

export interface MockBrowser {
  newPage: jest.Mock<Promise<MockPage>>;
  close: jest.Mock;
}

export interface MockElementHandle {
  screenshot: jest.Mock;
}

export const createMockPage = (): MockPage => ({
  setViewport: jest.fn().mockResolvedValue(undefined),
  goto: jest.fn().mockResolvedValue(undefined),
  waitForSelector: jest.fn().mockResolvedValue(undefined),
  waitForFunction: jest.fn().mockResolvedValue(undefined),
  evaluate: jest.fn().mockResolvedValue({
    linkTags: ['<link rel="stylesheet" href="/styles.css">'],
    styleTags: ['<style>body { margin: 0; }</style>'],
    resumeHTML: '<div id="resume">Resume Content</div>',
    cssVars: '--accent: #000;',
  }),
  evaluateHandle: jest.fn().mockResolvedValue(undefined),
  setContent: jest.fn().mockResolvedValue(undefined),
  emulateMediaType: jest.fn().mockResolvedValue(undefined),
  pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
  screenshot: jest.fn().mockResolvedValue(undefined),
  addStyleTag: jest.fn().mockResolvedValue(undefined),
  content: jest
    .fn()
    .mockResolvedValue('<html><body><div id="banner"></div></body></html>'),
  $: jest.fn().mockResolvedValue(null),
  close: jest.fn().mockResolvedValue(undefined),
});

export const createMockBrowser = (mockPage: MockPage): MockBrowser => ({
  newPage: jest.fn().mockResolvedValue(mockPage),
  close: jest.fn().mockResolvedValue(undefined),
});

export const createMockElementHandle = (): MockElementHandle => ({
  screenshot: jest.fn().mockResolvedValue(Buffer.from('mock-screenshot')),
});

/**
 * Creates a full Puppeteer mock setup
 */
export const createPuppeteerMocks = () => {
  const mockPage = createMockPage();
  const mockBrowser = createMockBrowser(mockPage);
  const mockElementHandle = createMockElementHandle();

  return {
    mockPage,
    mockBrowser,
    mockElementHandle,
  };
};
