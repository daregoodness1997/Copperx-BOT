export class Logger {
  static info(...args: any[]): void {
    console.log(...args);
  }

  static error(...args: any[]): void {
    console.error(...args);
  }
}
