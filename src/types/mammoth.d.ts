declare module "mammoth" {
  export interface Result {
    value: string;
    messages: Array<{
      type: string;
      message: string;
    }>;
  }

  export interface Options {
    path?: string;
    buffer?: Buffer;
  }

  export function extractRawText(options: Options): Promise<Result>;
  export function convertToHtml(options: Options): Promise<Result>;
}
