export class TTConfig {
    // The type of connection to use for autoconnect: none, eth, min or serial
    public autoconnect: string;
    // Ethernet
    public remote_ip: string;
    public telnetPort: number;
    public midiPort: number;
    public sidPort: number;
    // Serial
    public serial_port: string;
    public baudrate: number;
    public productID: string;
    public vendorID: string;

    public udConfigPages: { [option: string]: number };
}
