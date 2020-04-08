declare class SimpleIni_Part1 {
    constructor(param: () => any);

    get(key: string): string;
}

declare class SimpleIni_Part2 {
    [key: string]: SimpleIni & string;
}

type SimpleIni = SimpleIni_Part2 & SimpleIni_Part1;


declare function SimpleIni(f: Function): void;