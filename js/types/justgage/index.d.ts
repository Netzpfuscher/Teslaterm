declare interface Config {
    title: string;
}

declare interface JustGage {
    new (options: any): JustGage;
    refresh(val: any, max?: any, config?: any);
    txtLabel: JQuery;
}
