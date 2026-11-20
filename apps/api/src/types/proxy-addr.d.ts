// proxy-addr (dependensi Express, ter-hoist) tak punya @types — cukup `compile`.
declare module 'proxy-addr' {
  export function compile(
    val: string | string[],
  ): (addr: string, i: number) => boolean;
}
