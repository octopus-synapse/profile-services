/**
 * Puppeteer Mock for Testing
 * Provides mocked browser, page, and element handles
 */

import { mock, type Mock } from 'bun:test';

type MockFn = Mock<(...args: any[]) => any>;

export interface MockPage {
  setViewport: MockFn;
  goto: MockFn;
  waitForSelector: MockFn;
  waitForFunction: MockFn;
  evaluate: MockFn;
  evaluateHandle: MockFn;
  setContent: MockFn;
  emulateMediaType: MockFn;
  pdf: MockFn;
  screenshot: MockFn;
  addStyleTag: MockFn;
  content: MockFn;
  $: MockFn;
  close: MockFn;
}

export interface MockBrowser {
  newPage: MockFn;
  close: MockFn;
}

export interface MockElementHandle {
  screenshot: MockFn;
}

export const createMockPage = (): MockPage => ({
  setViewport: mock(() => Promise.resolve(undefined)),
  goto: mock(() => Promise.resolve(undefined)),
  waitForSelector: mock(() => Promise.resolve(undefined)),
  waitForFunction: mock(() => Promise.resolve(undefined)),
  evaluate: mock(() =>
    Promise.resolve({
      linkTags: ['<link rel="stylesheet" href="/styles.css">'],
      styleTags: ['<style>body { margin: 0; }</style>'],
      resumeHTML: '<div id="resume">Resume Content</div>',
      cssVars: '--accent: #000;',
    }),
  ),
  evaluateHandle: mock(() => Promise.resolve(undefined)),
  setContent: mock(() => Promise.resolve(undefined)),
  emulateMediaType: mock(() => Promise.resolve(undefined)),
  pdf: mock(() => Promise.resolve(Buffer.from('mock-pdf-content'))),
  screenshot: mock(() => Promise.resolve(undefined)),
  addStyleTag: mock(() => Promise.resolve(undefined)),
  content: mock(() =>
    Promise.resolve('<html><body><div id="banner"></div></body></html>'),
  ),
  $: mock(() => Promise.resolve(null)),
  close: mock(() => Promise.resolve(undefined)),
});

export const createMockBrowser = (mockPage: MockPage): MockBrowser => ({
  newPage: mock(() => Promise.resolve(mockPage)),
  close: mock(() => Promise.resolve(undefined)),
});

export const createMockElementHandle = (): MockElementHandle => ({
  screenshot: mock(() => Promise.resolve(Buffer.from('mock-screenshot'))),
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
