export class Base64 {
  public static encode(text: string): string {
    return Buffer.from(text).toString('base64url');
  }
  public static decode(base64: string): string {
    return Buffer.from(base64, 'base64url').toString('utf8');
  }
}
