export function debounce<T extends (...args: any[]) => void>(
    func: T,
    timeout: number = 300
  ): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout>;
  
    return function (...args: Parameters<T>): void {
      clearTimeout(timer);
      timer = setTimeout(() => {
        func.apply(args);
      }, timeout);
    };
  }