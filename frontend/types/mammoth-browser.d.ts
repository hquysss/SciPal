declare module 'mammoth/mammoth.browser.js' {
  type ConversionResult = {
    value: string;
    messages: Array<{ type: 'warning' | 'error'; message: string }>;
  };

  const mammoth: {
    extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<ConversionResult>;
    convertToMarkdown(input: { arrayBuffer: ArrayBuffer }): Promise<ConversionResult>;
  };

  export default mammoth;
}
