import * as $ from 'jquery';
import * as scope from './gui/oscilloscope';
import * as gui from './gui/gui';
import {terminal} from './gui/gui';
import * as sliders from './gui/sliders';
import {maxBPS, maxBurstOfftime, maxBurstOntime, maxOntime} from "./network/commands";
import * as connection from "./network/connection";
import {connect} from "./network/connection";
import * as midi from "./midi/midi";
import * as midi_server from "./midi/midi_server";
import * as sid from "./sid/sid";
import * as menu from './gui/menu';
import * as telemetry from './network/telemetry';
import * as gauges from "./gui/gauges";
import {NUM_GAUGES} from "./gui/gauges";
import * as nano from "./nano";

export let config: SimpleIni;
export const simulated = false;

export function init() {
    document.addEventListener('DOMContentLoaded', () => {
        readini("config.ini");

        $(function () {
            $('#toolbar').w2toolbar({
                name: 'toolbar',
                items: [
                    {
                        type: 'menu', id: 'mnu_command', text: 'Commands', icon: 'fa fa-table', items: [
                            {text: 'TR Start', icon: 'fa fa-bolt', id: 'transient'},
                            {text: 'Save EEPROM-Config', icon: 'fa fa-microchip'},
                            {text: 'Load EEPROM-Config', icon: 'fa fa-microchip'},
                            { text: 'Settings', id: 'settings', icon: 'fa fa-table'},
                            {text: 'Start MIDI server', id: 'startStopMidi', icon: 'fa fa-table'}
                        ]
                    },

                    {
                        type: 'menu-radio', id: 'trigger_radio', icon: 'fa fa-star',
                        text: function (item) {
                            let el = this.get('trigger_radio:' + item.selected);
                            const triggerId = item.selected.substr(7);
                            scope.setTrigger(Number(triggerId));
                            return 'Trigger: ' + el.text;
                        },
                        selected: 'waveoff-1',
                        items: [
                            {id: 'waveoff-1', text: 'Off'},
                            {id: 'waveoid0', text: 'Wave 0'},
                            {id: 'waveoid1', text: 'Wave 1'},
                            {id: 'waveoid2', text: 'Wave 2'},
                            {id: 'waveoid3', text: 'Wave 3'},
                            {id: 'waveoid4', text: 'Wave 4'},
                            {id: 'waveoid5', text: 'Wave 5'}
                        ]
                    },
                    {
                        type: 'menu', id: 'mnu_midi', text: 'MIDI-File: none', icon: 'fa fa-table', items: [
                            {text: 'Play', icon: 'fa fa-bolt'},
                            {text: 'Stop', icon: 'fa fa-bolt'}
                        ]
                    },

                    {
                        type: 'menu', id: 'mnu_script', text: 'Script: none', icon: 'fa fa-table', items: [
                            {text: 'Start', icon: 'fa fa-bolt'},
                            {text: 'Stop', icon: 'fa fa-bolt'}
                        ]
                    },
                    {type: 'spacer'},
                    {type: 'button', id: 'kill_set', text: 'KILL SET', icon: 'fa fa-power-off'},
                    {type: 'button', id: 'kill_reset', text: 'KILL RESET', icon: 'fa fa-power-off'},
                    {
                        type: 'html', id: 'port',
                        html: function (item) {
                            return '<div style="padding: 3px 10px;">' +
                                ' Port:' +
                                '    <input size="20" placeholder="COM1" onchange="let el = w2ui.toolbar.set(\'port\', { value: this.value });" ' +
                                '         style="padding: 3px; border-radius: 2px; border: 1px solid silver" value="' + (item.value || '') + '"/>' +
                                '</div>';
                        }
                     },
                    {type: 'button', id: 'connect', text: 'Connect', icon: 'fa fa-plug'},
                    {type: 'button', id: 'cls', text: 'Clear Term', icon: 'fa fa-terminal'}
                ],
                onClick: menu.onCtrlMenuClick
            });
            console.log("Done toolbar");
        });

        let html_gauges = '';
        for (let i = 0; i < NUM_GAUGES; i++) {
            html_gauges += '<div id="gauge' + i + '" style= "width: 100px; height: 100px"></div>'
        }


        let pstyle = 'background-color: #F5F6F7;  padding: 5px;';
        $('#layout').w2layout({
            name: 'layout',
            panels: [
                {
                    type: 'top', size: 50, overflow: "hidden", resizable: false, style: pstyle, content:
                        '<div id="toolbar" style="padding: 4px; border: 1px solid #dfdfdf; border-radius: 3px"></div>'
                },
                {
                    type: 'main', style: pstyle, content:
                        '<div class="scopeview">' +
                        '<article>' +
                        '<canvas id="backCanvas" style= "position: absolute; left: 0; top: 0; width: 75%; background: black; z-index: 0;"></canvas>' +
                        '<canvas id="waveCanvas" style= "position: absolute; left: 0; top: 0;width: 75%; z-index: 1;"></canvas>' +
                        '</article>' +
                        '<aside>' +
                        '<div id="ontime">Ontime<br><br>' +
                        '<input type="range" id="slider" min="0" max="' + maxOntime + '" value="0" class="slider-gray" data-show-value="true">' +
                        '<input type="checkbox" id="relativeSelect"><label for="relativeSelect">Relative</label>' +
                        '<br><span id="total">0</span> µs (<span id="relative">100</span>% of <span id="absolute"><b>0</b></span> µs)</div>' +
                        '<br><br>Offtime<br><br>' +
                        '<input type="range" id="slider1" min="20" max="' + maxBPS + '" value="1" class="slider-gray" data-show-value="true"><label id="slider1_disp">20 Hz</label>' +
                        '<br><br>Burst On<br><br>' +
                        '<input type="range" id="slider2" min="0" max="' + maxBurstOntime + '" value="0" class="slider-gray" data-show-value="true"><label id="slider2_disp">0 ms</label>' +
                        '<br><br>Burst Off<br><br>' +
                        '<input type="range" id="slider3" min="0" max="' + maxBurstOfftime + '" value="500" class="slider-gray" data-show-value="true"><label id="slider3_disp">500 ms</label>' +
                        '<br><br>MIDI Input: <select id="midiIn"></select>' +
                        '<br>MIDI Output: <select id="midiOut"></select>' +
                        '</aside>' +
                        '</div>'
                },
                {
                    type: 'right', size: 120, resizable: false, style: pstyle, content:
                        (html_gauges)
                },

                {
                    type: 'preview', size: '50%', resizable: true, style: pstyle, content:
                        '<div id="terminal" style="position:relative; width:100%; height:100%"></div>'
                },

            ]
        });
        w2ui['layout'].on({type: 'resize', execute: 'after'}, function () {
            scope.onResize();
        });
        terminal.decorate(document.querySelector('#terminal'));
        terminal.installKeyboard();
        telemetry.init();

        chrome.serial.onReceiveError.addListener((info) => gui.terminal.io.println(info.error));

        gui.init();
        sliders.init();

        scope.init();
        midi.init();
        midi_server.init();
        setInterval(update, 20);
    });
}


function readini(file: string) {
	chrome.runtime.getPackageDirectoryEntry(function (root) {
		root.getFile(file, {}, function (fileEntry) {
			fileEntry.file(function (file) {
				let reader = new FileReader();
				reader.onloadend = event_read_ini;
				reader.readAsText(file);
			}, () => {
			});
		}, () => {
		});
	});
}

function event_read_ini(){
    let inicontent=this.result;
    config = new SimpleIni(function() {
       return inicontent;
    });

    if(config.general.port) {
        w2ui['toolbar'].get('port').value = config.general.port;
        w2ui['toolbar'].refresh();
    }
    if(config.general.autoconnect=="true"){
        connect(config.general.port);
    }

}

//Called every 20 ms
function update(){
    connection.update();

    nano.update();
    gauges.refresh_all();

    sid.update();
}
