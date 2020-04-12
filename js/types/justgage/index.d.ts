declare interface Config {
    title: string;
}

declare class JustGage {
    constructor(options: any);

    refresh(val: any, max?: any, config?: any);

    txtLabel: JQuery;
}
