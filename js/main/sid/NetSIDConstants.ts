export enum Command {
    FLUSH = 0,
    TRY_SET_SID_COUNT = 1,
    MUTE = 2,
    TRY_RESET = 3,
    TRY_DELAY = 4,
    TRY_WRITE = 5,
    TRY_READ = 6,
    GET_VERSION = 7,
    TRY_SET_SAMPLING = 8,
    SET_CLOCKING = 9,
    GET_CONFIG_COUNT = 10,
    GET_CONFIG_INFO = 11,
    SET_SID_POSITION = 12,
    SET_SID_LEVEL = 13,
    SET_SID_MODEL = 14,
    SET_DELAY = 15,
    SET_FADE_IN = 16,
    SET_FADE_OUT = 17,
    SET_SID_HEADER = 18
}

export enum ReplyCode {
    OK = 0,
    BUSY = 1,
    ERR = 2,
    READ = 3,
    VERSION = 4,
    COUNT = 5,
    INFO = 6
}
